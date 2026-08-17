"""yiliu-home 书签同步 API — SQLite + 单密码 token 认证"""
import os, json, time, secrets, asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from collections import defaultdict, deque

import aiosqlite
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ── 配置 ─────────────────────────────────────────
DB_PATH = os.environ.get("YILIU_DB", "/app/data/yiliu.db")
SEED_PATH = os.environ.get("YILIU_SEED", "/app/seed.json")
PASSWORD = os.environ.get("YILIU_PASSWORD")
TOKEN_TTL = 24 * 3600  # 24h

# ── 简易限速（内存，每 IP 一个 deque） ────────────
_auth_attempts: dict[str, deque] = defaultdict(lambda: deque(maxlen=20))
RATE_LIMIT = 5  # 次/分钟

def check_rate(ip: str):
    now = time.time()
    dq = _auth_attempts[ip]
    cutoff = now - 60
    while dq and dq[0] < cutoff:
        dq.popleft()
    if len(dq) >= RATE_LIMIT:
        raise HTTPException(429, "请求太频繁，稍后再试")
    dq.append(now)

# ── token 存储（内存；重启失效） ────────────────
_valid_tokens: dict[str, float] = {}  # token -> expires_at (Unix epoch)

# ── 数据库 ───────────────────────────────────────
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bookmarks (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                name      TEXT NOT NULL,
                url       TEXT NOT NULL UNIQUE,
                grp       TEXT NOT NULL DEFAULT '常用',
                icon        TEXT DEFAULT '',
                description TEXT DEFAULT '',
                tags        TEXT DEFAULT '[]',
                is_pinned   INTEGER DEFAULT 0,
                sort        INTEGER DEFAULT 0,
                is_custom INTEGER DEFAULT 0,
                created   TEXT DEFAULT (datetime('now')),
                updated   TEXT DEFAULT (datetime('now'))
            )
        """)
        async with db.execute("PRAGMA table_info(bookmarks)") as cur:
            columns = {row[1] for row in await cur.fetchall()}
        for name, definition in {
            "description": "TEXT DEFAULT ''",
            "tags": "TEXT DEFAULT '[]'",
            "is_pinned": "INTEGER DEFAULT 0",
        }.items():
            if name not in columns:
                await db.execute(f"ALTER TABLE bookmarks ADD COLUMN {name} {definition}")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_bm_grp ON bookmarks(grp)")
        # ── 任务 / 习惯 / 便签表 ──
        await db.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                title        TEXT NOT NULL,
                priority     TEXT NOT NULL DEFAULT 'normal',
                status       TEXT NOT NULL DEFAULT 'todo',
                due_date     TEXT,
                tags         TEXT NOT NULL DEFAULT '[]',
                sort_order   INTEGER NOT NULL DEFAULT 0,
                created_at   TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
                completed_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS habits (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                frequency   TEXT NOT NULL DEFAULT 'daily',
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS habit_checks (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id   INTEGER NOT NULL,
                check_date TEXT NOT NULL,
                UNIQUE(habit_id, check_date)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                key        TEXT NOT NULL UNIQUE,
                content    TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        # 初始化 scratch 便签
        await db.execute("INSERT OR IGNORE INTO notes (key, content) VALUES ('scratch', '')")
        await db.commit()
        # 种子导入
        async with db.execute("SELECT COUNT(*) FROM bookmarks") as cur:
            count = (await cur.fetchone())[0]
        if count == 0 and os.path.exists(SEED_PATH):
            with open(SEED_PATH, encoding="utf-8") as f:
                seed = json.load(f)
            for item in seed:
                await db.execute(
                    "INSERT OR IGNORE INTO bookmarks (name,url,grp,icon,sort,is_custom) VALUES (?,?,?,?,?,?)",
                    (item["name"], item["url"], item["grp"], item.get("icon",""), item.get("sort",0), item.get("is_custom",0)),
                )
            await db.commit()
            print(f"[seed] 导入 {len(seed)} 条书签")

def row_to_dict(row):
    return {
        "id": row["id"], "name": row["name"], "url": row["url"], "grp": row["grp"],
        "icon": row["icon"], "description": row["description"],
        "tags": json.loads(row["tags"] or "[]"),
        "is_pinned": bool(row["is_pinned"]), "sort": row["sort"],
        "is_custom": bool(row["is_custom"]),
        "created": row["created"], "updated": row["updated"],
    }

def task_to_dict(row):
    return {
        "id": row["id"], "title": row["title"], "priority": row["priority"],
        "status": row["status"], "due_date": row["due_date"],
        "tags": json.loads(row["tags"] or "[]"),
        "sort_order": row["sort_order"],
        "created_at": row["created_at"], "updated_at": row["updated_at"],
        "completed_at": row["completed_at"],
    }

def compute_streak(dates):
    """dates: 'YYYY-MM-DD' 列表；返回截至今天/昨天的连续打卡天数"""
    if not dates:
        return 0
    days = sorted({datetime.strptime(d, "%Y-%m-%d").date() for d in dates}, reverse=True)
    today = datetime.now().date()
    if (today - days[0]).days > 1:
        return 0
    streak = 1
    for i in range(1, len(days)):
        if (days[i - 1] - days[i]).days == 1:
            streak += 1
        else:
            break
    return streak

async def habit_with_checks(db, row):
    async with db.execute(
        "SELECT check_date FROM habit_checks WHERE habit_id=? ORDER BY check_date",
        (row["id"],),
    ) as cur:
        history = [r[0] for r in await cur.fetchall()]
    return {
        "id": row["id"], "title": row["title"], "description": row["description"],
        "frequency": row["frequency"], "created_at": row["created_at"],
        "history": history, "streak": compute_streak(history),
    }

# ── 认证依赖 ─────────────────────────────────────
async def require_auth(request: Request):
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "未认证")
    token = auth[7:]
    expires_at = _valid_tokens.get(token, 0)
    if expires_at <= time.time():
        _valid_tokens.pop(token, None)
        raise HTTPException(401, "token 失效，请重新登录")

# ── FastAPI ──────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    if not PASSWORD:
        raise RuntimeError("缺少必填环境变量 YILIU_PASSWORD")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    await init_db()
    print(f"[yiliu-api] 启动完成，DB={DB_PATH}")
    yield

app = FastAPI(lifespan=lifespan)

# ── 模型 ─────────────────────────────────────────
class PasswordReq(BaseModel):
    password: str

class BookmarkCreate(BaseModel):
    name: str
    url: str
    grp: str = "常用"
    icon: str = ""
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    is_pinned: bool = False
    sort: int = 0

class BookmarkUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    grp: str | None = None
    icon: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    is_pinned: bool | None = None
    sort: int | None = None

class ImportReq(BaseModel):
    bookmarks: list[dict]

class TaskCreate(BaseModel):
    title: str
    priority: str = "normal"
    status: str = "todo"
    due_date: str | None = None
    tags: list[str] = Field(default_factory=list)
    sort_order: int = 0

class TaskUpdate(BaseModel):
    title: str | None = None
    priority: str | None = None
    status: str | None = None
    due_date: str | None = None
    tags: list[str] | None = None
    sort_order: int | None = None

class HabitCreate(BaseModel):
    title: str
    description: str = ""
    frequency: str = "daily"

class HabitUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    frequency: str | None = None

class HabitCheckReq(BaseModel):
    checked: bool
    date: str | None = None

class NoteUpdate(BaseModel):
    content: str = ""

def ok(data=None, **extra):
    d = {"code": 0, "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}
    d.update(extra)
    return d

# ── 路由 ─────────────────────────────────────────
@app.post("/api/auth")
async def login(req: PasswordReq, request: Request):
    check_rate(request.client.host)
    if req.password != PASSWORD:
        raise HTTPException(403, "密码不对")
    token = secrets.token_hex(32)
    _valid_tokens[token] = time.time() + TOKEN_TTL
    return ok({"token": token, "expires_in": TOKEN_TTL})

@app.get("/api/bookmarks")
async def list_bookmarks(_: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM bookmarks ORDER BY sort, id") as cur:
            rows = await cur.fetchall()
    return ok([row_to_dict(r) for r in rows])

@app.post("/api/bookmarks")
async def create_bookmark(bm: BookmarkCreate, _: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cur = await db.execute(
                "INSERT INTO bookmarks (name,url,grp,icon,description,tags,is_pinned,sort,is_custom) VALUES (?,?,?,?,?,?,?,?,1)",
                (bm.name, bm.url, bm.grp, bm.icon, bm.description, json.dumps(bm.tags, ensure_ascii=False), int(bm.is_pinned), bm.sort),
            )
            await db.commit()
            return ok({"id": cur.lastrowid})
        except aiosqlite.IntegrityError:
            raise HTTPException(409, "网址已存在")

@app.put("/api/bookmarks/{bid}")
async def update_bookmark(bid: int, bm: BookmarkUpdate, _: None = Depends(require_auth)):
    fields, values = [], []
    for f in ("name", "url", "grp", "icon", "description", "is_pinned", "sort"):
        v = getattr(bm, f)
        if v is not None:
            if f == "is_pinned":
                v = int(v)
            fields.append(f"{f}=?")
            values.append(v)
    if bm.tags is not None:
        fields.append("tags=?")
        values.append(json.dumps(bm.tags, ensure_ascii=False))
    if not fields:
        raise HTTPException(400, "没有要更新的字段")
    fields.append("updated=datetime('now')")
    values.append(bid)
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cur = await db.execute(f"UPDATE bookmarks SET {','.join(fields)} WHERE id=?", values)
            await db.commit()
        except aiosqlite.IntegrityError:
            raise HTTPException(409, "网址已存在")
        if cur.rowcount == 0:
            raise HTTPException(404, "书签不存在")
    return ok()

@app.delete("/api/bookmarks/{bid}")
async def delete_bookmark(bid: int, _: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("DELETE FROM bookmarks WHERE id=?", (bid,))
        await db.commit()
        if cur.rowcount == 0:
            raise HTTPException(404, "书签不存在")
    return ok()

@app.post("/api/bookmarks/import")
async def import_bookmarks(req: ImportReq, _: None = Depends(require_auth)):
    inserted = 0
    skipped = 0
    errors = []
    async with aiosqlite.connect(DB_PATH) as db:
        for index, item in enumerate(req.bookmarks):
            try:
                cur = await db.execute(
                    "INSERT OR IGNORE INTO bookmarks (name,url,grp,icon,sort,is_custom) VALUES (?,?,?,?,?,?)",
                    (item["name"], item["url"], item.get("grp","常用"), item.get("icon",""), item.get("sort",0), item.get("is_custom",0)),
                )
                if cur.rowcount == 1:
                    inserted += 1
                else:
                    skipped += 1
            except (KeyError, TypeError) as error:
                errors.append({"index": index, "error": str(error)})
        await db.commit()
    return ok({"inserted": inserted, "skipped": skipped, "errors": errors})

@app.get("/api/bootstrap")
async def bootstrap(_: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM bookmarks ORDER BY sort, id") as cur:
            bookmarks = [row_to_dict(r) for r in await cur.fetchall()]
        async with db.execute("SELECT * FROM tasks ORDER BY sort_order, id") as cur:
            tasks = [task_to_dict(r) for r in await cur.fetchall()]
        habits = []
        async with db.execute("SELECT * FROM habits ORDER BY id") as cur:
            for row in await cur.fetchall():
                habits.append(await habit_with_checks(db, row))
        async with db.execute("SELECT * FROM notes WHERE key='scratch'") as cur:
            note_row = await cur.fetchone()
        note = {"key": note_row["key"], "content": note_row["content"], "updated_at": note_row["updated_at"]} if note_row else None
    return ok({"bookmarks": bookmarks, "tasks": tasks, "habits": habits, "note": note})

# ── 任务 ─────────────────────────────────────────
@app.get("/api/tasks")
async def list_tasks(_: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM tasks ORDER BY sort_order, id") as cur:
            rows = await cur.fetchall()
    return ok([task_to_dict(r) for r in rows])

@app.post("/api/tasks")
async def create_task(t: TaskCreate, _: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "INSERT INTO tasks (title,priority,status,due_date,tags,sort_order) VALUES (?,?,?,?,?,?)",
            (t.title, t.priority, t.status, t.due_date, json.dumps(t.tags, ensure_ascii=False), t.sort_order),
        )
        await db.commit()
        async with db.execute("SELECT * FROM tasks WHERE id=?", (cur.lastrowid,)) as cur2:
            row = await cur2.fetchone()
    return ok(task_to_dict(row))

@app.delete("/api/tasks/completed")
async def clear_completed_tasks(_: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("DELETE FROM tasks WHERE status='done'")
        await db.commit()
    return ok({"deleted": cur.rowcount})

@app.put("/api/tasks/{tid}")
async def update_task(tid: int, t: TaskUpdate, _: None = Depends(require_auth)):
    fields, values = [], []
    for f in ("title", "priority", "status", "due_date", "sort_order"):
        v = getattr(t, f)
        if v is not None:
            fields.append(f"{f}=?")
            values.append(v)
    if t.tags is not None:
        fields.append("tags=?")
        values.append(json.dumps(t.tags, ensure_ascii=False))
    if t.status == "done":
        fields.append("completed_at=datetime('now')")
    elif t.status == "todo":
        fields.append("completed_at=NULL")
    if not fields:
        raise HTTPException(400, "没有要更新的字段")
    fields.append("updated_at=datetime('now')")
    values.append(tid)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(f"UPDATE tasks SET {','.join(fields)} WHERE id=?", values)
        await db.commit()
        if cur.rowcount == 0:
            raise HTTPException(404, "任务不存在")
        async with db.execute("SELECT * FROM tasks WHERE id=?", (tid,)) as cur2:
            row = await cur2.fetchone()
    return ok(task_to_dict(row))

@app.delete("/api/tasks/{tid}")
async def delete_task(tid: int, _: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("DELETE FROM tasks WHERE id=?", (tid,))
        await db.commit()
        if cur.rowcount == 0:
            raise HTTPException(404, "任务不存在")
    return ok()

# ── 习惯 ─────────────────────────────────────────
@app.get("/api/habits")
async def list_habits(_: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM habits ORDER BY id") as cur:
            rows = await cur.fetchall()
        habits = []
        for row in rows:
            habits.append(await habit_with_checks(db, row))
    return ok(habits)

@app.post("/api/habits")
async def create_habit(h: HabitCreate, _: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "INSERT INTO habits (title,description,frequency) VALUES (?,?,?)",
            (h.title, h.description, h.frequency),
        )
        await db.commit()
        async with db.execute("SELECT * FROM habits WHERE id=?", (cur.lastrowid,)) as cur2:
            row = await cur2.fetchone()
        return ok(await habit_with_checks(db, row))

@app.put("/api/habits/{hid}")
async def update_habit(hid: int, h: HabitUpdate, _: None = Depends(require_auth)):
    fields, values = [], []
    for f in ("title", "description", "frequency"):
        v = getattr(h, f)
        if v is not None:
            fields.append(f"{f}=?")
            values.append(v)
    if not fields:
        raise HTTPException(400, "没有要更新的字段")
    values.append(hid)
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(f"UPDATE habits SET {','.join(fields)} WHERE id=?", values)
        await db.commit()
        if cur.rowcount == 0:
            raise HTTPException(404, "习惯不存在")
    return ok()

@app.delete("/api/habits/{hid}")
async def delete_habit(hid: int, _: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM habit_checks WHERE habit_id=?", (hid,))
        cur = await db.execute("DELETE FROM habits WHERE id=?", (hid,))
        await db.commit()
        if cur.rowcount == 0:
            raise HTTPException(404, "习惯不存在")
    return ok()

@app.post("/api/habits/{hid}/check")
async def check_habit(hid: int, req: HabitCheckReq, _: None = Depends(require_auth)):
    check_date = req.date or datetime.now().date().isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT id FROM habits WHERE id=?", (hid,)) as cur:
            if await cur.fetchone() is None:
                raise HTTPException(404, "习惯不存在")
        if req.checked:
            await db.execute(
                "INSERT OR IGNORE INTO habit_checks (habit_id, check_date) VALUES (?,?)",
                (hid, check_date),
            )
        else:
            await db.execute(
                "DELETE FROM habit_checks WHERE habit_id=? AND check_date=?",
                (hid, check_date),
            )
        await db.commit()
        async with db.execute("SELECT * FROM habits WHERE id=?", (hid,)) as cur:
            row = await cur.fetchone()
        return ok(await habit_with_checks(db, row))

# ── 便签 ─────────────────────────────────────────
@app.get("/api/note")
async def get_note(_: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM notes WHERE key='scratch'") as cur:
            row = await cur.fetchone()
        if row is None:
            raise HTTPException(404, "便签不存在")
    return ok({"key": row["key"], "content": row["content"], "updated_at": row["updated_at"]})

@app.put("/api/note")
async def update_note(req: NoteUpdate, _: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("INSERT OR IGNORE INTO notes (key, content) VALUES ('scratch', ?)", (req.content,))
        await db.execute("UPDATE notes SET content=?, updated_at=datetime('now') WHERE key='scratch'", (req.content,))
        await db.commit()
        async with db.execute("SELECT * FROM notes WHERE key='scratch'") as cur:
            row = await cur.fetchone()
    return ok({"key": row["key"], "content": row["content"], "updated_at": row["updated_at"]})

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ── 同源静态前端 ──────────────────────────────────
# 注意：用绝对路径解析，避免 --app-dir 启动时 __file__ 为相对路径导致目录错位
_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_ROOT = os.environ.get("YILIU_WEB_ROOT", os.path.abspath(os.path.join(_SERVER_DIR, "..")))

PUBLIC_FILES = {
    "index.html",
    "auth.js",
    "styles.css",
    "manifest.json",
    "sw.js",
    "nav.html",
    "index-v2.html",
}

if os.path.exists(WEB_ROOT):
    src_dir = os.path.join(WEB_ROOT, "src")
    if os.path.exists(src_dir):
        app.mount("/src", StaticFiles(directory=src_dir), name="src")

    icons_dir = os.path.join(WEB_ROOT, "icons")
    if os.path.exists(icons_dir):
        app.mount("/icons", StaticFiles(directory=icons_dir), name="icons")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(WEB_ROOT, "index.html"))

    @app.get("/{file_name}")
    async def serve_public_file(file_name: str):
        if file_name not in PUBLIC_FILES:
            raise HTTPException(404, "资源不存在")
        return FileResponse(os.path.join(WEB_ROOT, file_name))

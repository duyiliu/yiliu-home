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

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ── 同源静态前端 ──────────────────────────────────
# 注意：用绝对路径解析，避免 --app-dir 启动时 __file__ 为相对路径导致目录错位
_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_ROOT = os.environ.get("YILIU_WEB_ROOT", os.path.abspath(os.path.join(_SERVER_DIR, "..")))

PUBLIC_FILES = {
    "index.html",
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

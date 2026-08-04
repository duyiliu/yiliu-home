"""yiliu-home 书签同步 API — SQLite + 单密码 token 认证"""
import os, json, time, secrets, asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from collections import defaultdict, deque

import aiosqlite
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── 配置 ─────────────────────────────────────────
DB_PATH = os.environ.get("YILIU_DB", "/app/data/yiliu.db")
SEED_PATH = os.environ.get("YILIU_SEED", "/app/seed.json")
PASSWORD = os.environ.get("YILIU_PASSWORD", "Ws00350425")
ALLOWED_ORIGIN = os.environ.get("YILIU_ORIGIN", "https://home.duyiliu.top")
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

# ── token 存储（内存；重启失效，前端自动重登） ────
_valid_tokens: set[str] = set()

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
                icon      TEXT DEFAULT '',
                sort      INTEGER DEFAULT 0,
                is_custom INTEGER DEFAULT 0,
                created   TEXT DEFAULT (datetime('now')),
                updated   TEXT DEFAULT (datetime('now'))
            )
        """)
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
        "id": row[0], "name": row[1], "url": row[2], "grp": row[3],
        "icon": row[4], "sort": row[5], "is_custom": row[6],
        "created": row[7], "updated": row[8],
    }

# ── 认证依赖 ─────────────────────────────────────
async def require_auth(request: Request):
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "未认证")
    token = auth[7:]
    if token not in _valid_tokens:
        raise HTTPException(401, "token 失效，请重新登录")

# ── FastAPI ──────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    await init_db()
    print(f"[yiliu-api] 启动完成，DB={DB_PATH}")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN, "http://localhost:8000", "http://127.0.0.1:8000", "null"],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── 模型 ─────────────────────────────────────────
class PasswordReq(BaseModel):
    password: str

class BookmarkCreate(BaseModel):
    name: str
    url: str
    grp: str = "常用"
    icon: str = ""
    sort: int = 0

class BookmarkUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    grp: str | None = None
    icon: str | None = None
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
    _valid_tokens.add(token)
    return ok({"token": token, "expires_in": TOKEN_TTL})

@app.get("/api/bookmarks")
async def list_bookmarks(_: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM bookmarks ORDER BY sort, id") as cur:
            rows = await cur.fetchall()
    return ok([dict(r) for r in rows])

@app.post("/api/bookmarks")
async def create_bookmark(bm: BookmarkCreate, _: None = Depends(require_auth)):
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cur = await db.execute(
                "INSERT INTO bookmarks (name,url,grp,icon,sort,is_custom) VALUES (?,?,?,?,?,1)",
                (bm.name, bm.url, bm.grp, bm.icon, bm.sort),
            )
            await db.commit()
            return ok({"id": cur.lastrowid})
        except aiosqlite.IntegrityError:
            raise HTTPException(409, "网址已存在")

@app.put("/api/bookmarks/{bid}")
async def update_bookmark(bid: int, bm: BookmarkUpdate, _: None = Depends(require_auth)):
    fields, values = [], []
    for f in ("name", "url", "grp", "icon", "sort"):
        v = getattr(bm, f)
        if v is not None:
            fields.append(f"{f}=?")
            values.append(v)
    if not fields:
        raise HTTPException(400, "没有要更新的字段")
    fields.append("updated=datetime('now')")
    values.append(bid)
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(f"UPDATE bookmarks SET {','.join(fields)} WHERE id=?", values)
        await db.commit()
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
    async with aiosqlite.connect(DB_PATH) as db:
        for item in req.bookmarks:
            try:
                await db.execute(
                    "INSERT OR IGNORE INTO bookmarks (name,url,grp,icon,sort,is_custom) VALUES (?,?,?,?,?,?)",
                    (item["name"], item["url"], item.get("grp","常用"), item.get("icon",""), item.get("sort",0), item.get("is_custom",0)),
                )
                inserted += db.total_changes  # 近似
            except Exception:
                pass
        await db.commit()
    return ok({"inserted": inserted})

@app.get("/api/health")
async def health():
    return {"status": "ok"}

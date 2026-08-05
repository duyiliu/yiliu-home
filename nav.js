/* 一流导航 · 导航页逻辑（动静分离版）
 * - GitHub Pages 静态壳 + VM152 SQLite API
 * - 本地缓存兜底，离线照常可用
 * - 编辑：API 优先 + 本地双写
 */

const API_BASE = "https://nav-api.duyiliu.top";
const CACHE_KEY = "yiliu.home.nav.cache";
const TOKEN_KEY = "yiliu.home.nav.token";
const NAV_PASSWORD_HASH = "1e395ce2ed739e5d69e000b8f0a7959505aba94472f72c0972a98a0b1260a444"; // sha256("Ws00350425")

const $ = (s) => document.querySelector(s);

// ---------- API 层 ----------
function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function apiLogin(password) {
  const res = await fetch(`${API_BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(`auth ${res.status}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error("auth failed");
  setToken(json.data.token);
  return json.data.token;
}

async function apiCall(method, path, body) {
  const token = getToken();
  if (!token) throw new Error("no token");
  const opts = { method, headers: { "Authorization": `Bearer ${token}` } };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    // token 失效，清掉触发重登
    localStorage.removeItem(TOKEN_KEY);
    throw new Error("token expired");
  }
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}`);
  return res.json();
}

async function fetchBookmarks() {
  const json = await apiCall("GET", "/api/bookmarks");
  return json.data || [];
}

// ---------- 状态 ----------
const state = {
  bookmarks: [],       // 当前内存中的全量书签
  activeGroup: "全部",
  query: "",
  online: false,
};

// ---------- 本地缓存 ----------
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); }
  catch { return []; }
}
function saveCache(items) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(items));
}

// ---------- Toast 通知 ----------
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---------- 状态管理 ----------
function updateState(patch) {
  Object.assign(state, patch);
  if (patch.bookmarks !== undefined) {
    saveCache(state.bookmarks);
  }
  renderAll();
}

// ---------- 渲染 ----------
function groupCounts(items) {
  const counts = {};
  for (const b of items) counts[b.grp || "常用"] = (counts[b.grp || "常用"] || 0) + 1;
  return counts;
}

function renderGroups(items) {
  const counts = groupCounts(items);
  const groups = ["全部", ...Object.keys(counts)];
  const list = $("#groupList");
  list.innerHTML = "";
  for (const g of groups) {
    const item = document.createElement("div");
    item.className = "group-item" + (g === state.activeGroup ? " is-active" : "");
    item.innerHTML = `<span class="g-name">${escapeHtml(g)}</span><span class="g-count">${g === "全部" ? items.length : counts[g]}</span>`;
    item.addEventListener("click", () => {
      state.activeGroup = g;
      renderGroups(items);
      renderGrid(items);
    });
    list.appendChild(item);
  }
}

function renderGrid(items) {
  const grid = $("#linkGrid");
  const empty = $("#emptyState");
  grid.innerHTML = "";

  // 清理旧标题
  document.querySelectorAll(".nav-section-head").forEach((h) => {
    if (h.nextElementSibling !== grid) h.remove();
  });

  const visible = items.filter((b) => {
    const inGroup = state.activeGroup === "全部" || (b.grp || "常用") === state.activeGroup;
    if (!inGroup) return false;
    if (!state.query) return true;
    const q = state.query.toLowerCase().replace(/\s+/g, "");
    const name = (b.name || "").toLowerCase().replace(/\s+/g, "");
    const url = (b.url || "").toLowerCase();
    const group = (b.grp || "").toLowerCase();
    return name.includes(q) || url.includes(q) || group.includes(q);
  });
  empty.classList.toggle("hidden", visible.length > 0);

  if (state.activeGroup !== "全部" && visible.length > 0) {
    const head = document.createElement("div");
    head.className = "nav-section-head";
    head.innerHTML = `<h2>${escapeHtml(state.activeGroup)}</h2><span class="section-count">${visible.length}</span>`;
    grid.parentNode.insertBefore(head, grid);
  }

  for (const b of visible) {
    const card = document.createElement("article");
    card.className = "bk-card" + (b.is_custom ? " is-custom" : "");
    let host = "";
    try { host = new URL(b.url).hostname.replace(/^www\./, ""); } catch {}
    card.innerHTML = `
      <div class="bk-card-icon">
        <img src="https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}" alt="" loading="lazy"
             onerror="this.classList.add('hidden')" />
        <span class="icon-fallback">${escapeHtml((b.name || "?").slice(0, 1).toUpperCase())}</span>
      </div>
      <div class="bk-card-body">
        <span class="bk-card-title" title="${escapeAttr(b.name)}">${escapeHtml(b.name)}</span>
        <span class="bk-card-host" title="${escapeAttr(b.url)}">${escapeHtml(host || b.url)}</span>
      </div>
      <div class="bk-card-actions">
        <a class="nav-open-btn" href="${escapeAttr(b.url)}" target="_blank" rel="noreferrer noopener" title="打开">↗</a>
        <button class="nav-edit-btn" type="button" title="编辑">✎</button>
        <button class="nav-del-btn" type="button" title="删除">×</button>
      </div>
    `;
    card.querySelector(".nav-edit-btn").addEventListener("click", () => editBookmark(b));
    card.querySelector(".nav-del-btn").addEventListener("click", () => removeBookmark(b));
    grid.appendChild(card);
  }
}

function renderAll() {
  const items = state.bookmarks;
  $("#navCount").textContent = `${items.length} 条`;
  renderGroups(items);
  renderGrid(items);
  const customCount = items.filter((b) => b.is_custom).length;
  $("#dataInfo").textContent = state.online
    ? `已同步 ${items.length} 条 · 自定义 ${customCount} 条`
    : `离线模式 · 本地缓存 ${items.length} 条`;
}

// ---------- 同步状态指示 ----------
function setSyncStatus(text, cls) {
  const el = $("#syncStatus");
  if (!el) return;
  el.textContent = text;
  el.className = "status-pill " + (cls || "is-idle");
}

// ---------- 增删 ----------
async function removeBookmark(b) {
  if (!confirm(`从导航删除「${b.name}」？`)) return;

  // 乐观删除：先从内存和缓存移除
  updateState({ bookmarks: state.bookmarks.filter((x) => x.id !== b.id) });

  if (state.online && b.id) {
    try {
      await apiCall("DELETE", `/api/bookmarks/${b.id}`);
    } catch (e) {
      showToast(`删除同步失败：${e.message}`, 'error');
      setSyncStatus("同步失败", "is-error");
    }
  }
}

async function editBookmark(b) {
  const name = prompt("名称", b.name);
  if (name === null || !name.trim()) return;
  const url = prompt("网址", b.url);
  if (url === null || !url.trim()) return;
  const grp = prompt("分组", b.grp || "常用");
  if (grp === null) return;
  const changes = { name: name.trim(), url: url.trim(), grp: grp.trim() || "常用" };
  const index = state.bookmarks.findIndex((x) => x.id === b.id);
  if (index >= 0) {
    const updated = [...state.bookmarks];
    updated[index] = { ...b, ...changes };
    updateState({ bookmarks: updated });
  }
  if (state.online && b.id) {
    try {
      setSyncStatus("同步中…", "is-syncing");
      await apiCall("PUT", `/api/bookmarks/${b.id}`, changes);
      setSyncStatus("已同步", "is-online");
    } catch (e) {
      showToast(`编辑同步失败：${e.message}`, 'error');
      setSyncStatus("同步失败", "is-error");
    }
  }
}

function openAddPanel() {
  $("#addPanel").classList.remove("hidden");
  $("#addName").focus();
  const counts = groupCounts(state.bookmarks);
  const dl = $("#groupOptions");
  dl.innerHTML = "";
  for (const g of Object.keys(counts)) {
    const opt = document.createElement("option");
    opt.value = g;
    dl.appendChild(opt);
  }
}
function closeAddPanel() {
  $("#addPanel").classList.add("hidden");
}

async function handleAdd(event) {
  event.preventDefault();
  const name = $("#addName").value.trim();
  const url = $("#addUrl").value.trim();
  const grp = $("#addGroup").value.trim() || "常用";
  if (!name || !url) return;

  $("#addForm").reset();
  closeAddPanel();

  if (state.online) {
    try {
      setSyncStatus("同步中…", "is-syncing");
      const json = await apiCall("POST", "/api/bookmarks", { name, url, grp, icon: "", sort: 0 });
      const newBm = { id: json.data.id, name, url, grp, icon: "", sort: 0, is_custom: 1 };
      updateState({ bookmarks: [...state.bookmarks, newBm] });
      setSyncStatus("已同步", "is-online");
      return;
    } catch (e) {
      showToast(`添加同步失败：${e.message}`, 'error');
      setSyncStatus("同步失败", "is-error");
    }
  }

  // 离线降级：暂存本地，待下次同步
  const tempId = Date.now();
  updateState({ 
    bookmarks: [...state.bookmarks, { id: tempId, name, url, grp, icon: "", sort: 0, is_custom: 1, _offline: true }]
  });
}

// ---------- 搜索 ----------
function handleSearch() {
  state.query = $("#navSearch").value.trim();
  renderGrid(state.bookmarks);
}

// ---------- 离线同步队列 ----------
async function syncOfflineQueue() {
  const pending = state.bookmarks.filter(b => b._offline);
  if (pending.length === 0) return;
  
  let synced = 0, failed = 0;
  const updated = [...state.bookmarks];
  
  for (const bm of pending) {
    try {
      const json = await apiCall("POST", "/api/bookmarks", {
        name: bm.name, url: bm.url, grp: bm.grp, icon: bm.icon || "", sort: bm.sort || 0
      });
      // 用服务器 ID 替换本地临时 ID
      const index = updated.findIndex(b => b.id === bm.id);
      if (index >= 0) {
        updated[index] = { ...bm, id: json.data.id, _offline: undefined };
      }
      synced++;
    } catch (e) {
      if (e.message.includes('409')) {
        // URL 已存在，从本地移除重复项
        const index = updated.findIndex(b => b.id === bm.id);
        if (index >= 0) updated.splice(index, 1);
      }
      failed++;
    }
  }
  
  if (synced > 0 || failed > 0) {
    updateState({ bookmarks: updated });
    showToast(`离线书签同步完成：成功 ${synced} 条${failed > 0 ? `，失败 ${failed} 条` : ''}`, synced > 0 ? 'success' : 'error');
  }
}

// ---------- 初始化同步 ----------
async function syncFromServer() {
  // 兼容旧版：曾把密码存 localStorage 的会话迁入 sessionStorage 后清除。
  const legacyPwd = localStorage.getItem("yiliu.home.nav.password");
  if (legacyPwd) {
    sessionStorage.setItem("yiliu.home.nav.password", legacyPwd);
    localStorage.removeItem("yiliu.home.nav.password");
  }
  let pwd = sessionStorage.getItem("yiliu.home.nav.password");
  if (!pwd && !getToken()) {
    // 旧版已解锁状态没有保存密码；仅首次升级时询问一次。
    pwd = prompt("请输入访问密码以同步云端书签：") || "";
    if (pwd) {
      const hash = await sha256Hex(pwd);
      if (hash !== NAV_PASSWORD_HASH) {
        setSyncStatus("密码不对", "is-error");
        return;
      }
      sessionStorage.setItem("yiliu.home.nav.password", pwd);
    }
  }
  if (!pwd && !getToken()) {
    setSyncStatus("本地存储", "is-idle");
    return;
  }
  setSyncStatus("同步中…", "is-syncing");
  try {
    if (!getToken()) {
      await apiLogin(pwd);
    }
    const items = await fetchBookmarks();
    updateState({ bookmarks: items, online: true });
    setSyncStatus("已同步", "is-online");
    
    // 同步离线队列
    await syncOfflineQueue();
  } catch (e) {
    showToast(`同步失败：${e.message}`, 'error');
    state.online = false;
    setSyncStatus(e.message.includes("token") ? "请重登" : "离线模式", "is-error");
  }
}

// ---------- 工具 ----------
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(v) { return escapeHtml(v).replaceAll("`", "&#096;"); }

// ---------- 启动 ----------
document.addEventListener("DOMContentLoaded", () => {
  $("#navSearch").addEventListener("input", handleSearch);
  $("#addButton").addEventListener("click", openAddPanel);
  $("#addClose").addEventListener("click", closeAddPanel);
  $("#addCancel").addEventListener("click", closeAddPanel);
  $("#addForm").addEventListener("submit", handleAdd);
  $("#backHome").addEventListener("click", () => (location.href = "index.html"));

  // 1. 先渲染本地缓存（秒开）
  state.bookmarks = loadCache();
  if (state.bookmarks.length === 0) {
    setSyncStatus("本地存储", "is-idle");
  } else {
    renderAll();
  }

  // 2. 等前端口令解锁后，后台同步
  //    auth.js 解锁后会在 localStorage 标记 auth=1
  //    如果还没解锁，监听解锁完成再同步
  function trySync() {
    if (localStorage.getItem("yiliu.home.auth") === "1") {
      syncFromServer();
    } else {
      setTimeout(trySync, 1000);
    }
  }
  trySync();
});

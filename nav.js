/* 一流导航 · 导航页逻辑 */
const NAV_STORE_KEY = "yiliu.home.nav";
const NAV_DATA_KEY = "yiliu.home.nav.data";

const $ = (s) => document.querySelector(s);

// ---------- 数据 ----------
function loadNavStore() {
  const raw = localStorage.getItem(NAV_STORE_KEY);
  if (!raw) return { custom: [], deletedIds: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { custom: [], deletedIds: [] };
  }
}
function saveNavStore(store) {
  localStorage.setItem(NAV_STORE_KEY, JSON.stringify(store));
}

function allBookmarks(store) {
  const base = (window.NAV_BOOKMARKS || []).filter((b) => !store.deletedIds.includes(b.url));
  return [...base, ...store.custom];
}

function groupCounts(items) {
  const counts = {};
  for (const b of items) counts[b.group || "常用"] = (counts[b.group || "常用"] || 0) + 1;
  return counts;
}

// ---------- 状态 ----------
const state = {
  store: loadNavStore(),
  activeGroup: "全部",
  query: "",
};

// ---------- 渲染 ----------
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
  const visible = items.filter((b) => {
    const inGroup = state.activeGroup === "全部" || (b.group || "常用") === state.activeGroup;
    if (!inGroup) return false;
    if (!state.query) return true;
    const q = state.query.toLowerCase().replace(/\s+/g, "");
    const name = (b.name || "").toLowerCase().replace(/\s+/g, "");
    const url = (b.url || "").toLowerCase();
    const group = (b.group || "").toLowerCase();
    return name.includes(q) || url.includes(q) || group.includes(q);
  });
  empty.classList.toggle("hidden", visible.length > 0);

  // 分组标题
  if (state.activeGroup !== "全部" && visible.length > 0) {
    const head = document.createElement("div");
    head.className = "nav-section-head";
    head.innerHTML = `<h2>${escapeHtml(state.activeGroup)}</h2><span class="section-count">${visible.length}</span>`;
    grid.parentNode.insertBefore(head, grid);
  }

  for (const b of visible) {
    const card = document.createElement("article");
    card.className = "nav-card" + (b.isCustom ? " is-custom" : "");
    let host = "";
    try {
      host = new URL(b.url).hostname.replace(/^www\./, "");
    } catch {}
    card.innerHTML = `
      <div class="nav-card-icon">
        <img src="https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}" alt="" loading="lazy"
             onerror="this.style.display='none'" />
      </div>
      <div class="nav-card-body">
        <span class="nav-card-title" title="${escapeAttr(b.name)}">${escapeHtml(b.name)}</span>
        <span class="nav-card-host" title="${escapeAttr(b.url)}">${escapeHtml(host || b.url)}</span>
      </div>
      <div class="nav-card-actions">
        <a class="nav-open-btn" href="${escapeAttr(b.url)}" target="_blank" rel="noreferrer noopener" title="打开">↗</a>
        <button class="nav-del-btn" type="button" title="删除">×</button>
      </div>
    `;
    card.querySelector(".nav-del-btn").addEventListener("click", () => removeBookmark(b));
    grid.appendChild(card);
  }

  // 清理旧标题
  document.querySelectorAll(".nav-section-head").forEach((h) => {
    if (h.nextElementSibling !== grid) h.remove();
  });
}

function renderAll() {
  const items = allBookmarks(state.store);
  $("#navCount").textContent = `${items.length} 条`;
  renderGroups(items);
  renderGrid(items);
  $("#dataInfo").textContent = `静态 ${(window.NAV_BOOKMARKS || []).length} 条 · 自定义 ${state.store.custom.length} 条`;
}

// ---------- 增删 ----------
function removeBookmark(b) {
  if (!confirm(`从导航删除「${b.name}」？`)) return;
  if (b.isCustom) {
    state.store.custom = state.store.custom.filter((c) => c.url !== b.url);
  } else {
    if (!state.store.deletedIds.includes(b.url)) state.store.deletedIds.push(b.url);
  }
  saveNavStore(state.store);
  renderAll();
}

function openAddPanel() {
  $("#addPanel").classList.remove("hidden");
  $("#addName").focus();
  // 填充分组 datalist
  const counts = groupCounts(allBookmarks(state.store));
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
function handleAdd(event) {
  event.preventDefault();
  const name = $("#addName").value.trim();
  const url = $("#addUrl").value.trim();
  const group = $("#addGroup").value.trim() || "常用";
  if (!name || !url) return;
  state.store.custom.push({ group, name, url, isCustom: true });
  saveNavStore(state.store);
  $("#addForm").reset();
  closeAddPanel();
  renderAll();
}

// ---------- 搜索 ----------
function handleSearch() {
  state.query = $("#navSearch").value.trim();
  renderGrid(allBookmarks(state.store));
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
function escapeAttr(v) {
  return escapeHtml(v).replaceAll("`", "&#096;");
}

// ---------- 启动 ----------
document.addEventListener("DOMContentLoaded", () => {
  $("#navSearch").addEventListener("input", handleSearch);
  $("#addButton").addEventListener("click", openAddPanel);
  $("#addClose").addEventListener("click", closeAddPanel);
  $("#addCancel").addEventListener("click", closeAddPanel);
  $("#addForm").addEventListener("submit", handleAdd);
  $("#backHome").addEventListener("click", () => (location.href = "index.html"));
  renderAll();
});

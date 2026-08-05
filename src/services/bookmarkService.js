/**
 * 书签服务 — SQLite API 为唯一权威，本地 store 只保存最近一次成功快照
 *
 * 读写规则：
 * - 读：API 优先，成功后更新 store 与持久化；失败时保留最近快照并标记离线
 * - 写：必须 API 成功后才提交本地状态；未登录或离线时写操作直接报错（离线只读），
 *   不做本地待同步队列，避免与服务端产生冲突合并成本
 * - 认证：单密码换取 24h token，存 sessionStorage（关闭标签页即失效，不落 localStorage）
 *
 * 本地数据模型（camelCase，视图层直接使用）与 API 模型（snake_case）在此边界内互转。
 */
import store from '../store.js';
import { normalizeUrl, getFaviconUrl, validateBookmark } from '../utils/helpers.js';
import { getPendingLinks, clearPendingLinks } from '../core/migration.js';

// 本地调试可用 window.YILIU_API_BASE 覆盖（需在模块加载前设置）
const API_BASE = window.YILIU_API_BASE || 'https://nav-api.duyiliu.top';
const TOKEN_KEY = 'yiliu.home.v2.token';

export const SyncStatus = {
  IDLE: 'idle',       // 未登录，无同步
  SYNCING: 'syncing', // 拉取/推送中
  ONLINE: 'online',   // 与服务器一致
  OFFLINE: 'offline', // 请求失败，展示最近快照（只读）
};

// ---------- 认证 ----------

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * 密码登录，成功换取 token
 */
export async function login(password) {
  const res = await fetch(`${API_BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.status === 403) throw new Error('密码不对');
  if (!res.ok) throw new Error(`登录失败（${res.status}）`);
  const json = await res.json();
  if (json.code !== 0) throw new Error('登录失败');
  setToken(json.data.token);
  return json.data.token;
}

/**
 * 退出登录，清除 token
 */
export function logout() {
  setToken('');
  store.setState((state) => ({
    ...state,
    ui: { ...state.ui, syncStatus: SyncStatus.IDLE },
  }));
}

/**
 * 是否已持有 token（是否已登录）
 */
export function isLoggedIn() {
  return !!getToken();
}

// ---------- API 调用 ----------

async function apiCall(method, path, body) {
  const token = getToken();
  if (!token) throw new Error('未登录，请先同步');
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    setToken('');
    throw new Error('登录已过期，请重新同步');
  }
  if (!res.ok) {
    // 服务端 FastAPI 错误响应为 {"detail": "..."}
    const detail = await res.json().then((j) => j.detail).catch(() => '');
    throw new Error(detail || `${method} ${path} 失败（${res.status}）`);
  }
  return res.json();
}

// ---------- 模型映射 ----------

function faviconFor(url) {
  try {
    return `https://www.google.com/s2/favicons?sz=32&domain=${new URL(url).hostname}`;
  } catch {
    return '';
  }
}

/** API 行 -> 本地模型 */
function toLocal(serverBm) {
  return {
    id: serverBm.id,
    title: serverBm.name,
    url: serverBm.url,
    category: serverBm.grp || '常用',
    description: serverBm.description || '',
    favicon: serverBm.icon || faviconFor(serverBm.url),
    tags: Array.isArray(serverBm.tags) ? serverBm.tags : [],
    isPinned: !!serverBm.is_pinned,
    sortOrder: serverBm.sort || 0,
    isCustom: !!serverBm.is_custom,
    createdAt: serverBm.created || new Date().toISOString(),
    updatedAt: serverBm.updated || new Date().toISOString(),
  };
}

/** 本地模型 -> API 负载 */
function toServer(localBm) {
  return {
    name: localBm.title,
    url: localBm.url,
    grp: localBm.category || '常用',
    icon: localBm.favicon || '',
    description: localBm.description || '',
    tags: localBm.tags || [],
    is_pinned: !!localBm.isPinned,
    sort: localBm.sortOrder || 0,
  };
}

// ---------- 状态同步 ----------

function setSync(status) {
  store.setState((state) => ({
    ...state,
    ui: { ...state.ui, syncStatus: status },
  }));
}

/**
 * 初始化：已持有 token 则后台拉取；否则保持当前本地快照
 */
export async function init() {
  if (!getToken()) {
    setSync(SyncStatus.IDLE);
    return;
  }
  try {
    await fetchAll();
  } catch {
    // 拉取失败保留快照，标记离线
    setSync(SyncStatus.OFFLINE);
  }
}

/**
 * 从服务器全量拉取，成功后覆盖本地快照
 */
export async function fetchAll() {
  setSync(SyncStatus.SYNCING);
  await importPendingLinks();
  const json = await apiCall('GET', '/api/bookmarks');
  const bookmarks = (json.data || []).map(toLocal);
  store.setState((state) => ({
    ...state,
    bookmarks,
    meta: { ...state.meta, lastSync: json.updated_at || new Date().toISOString() },
  }));
  setSync(SyncStatus.ONLINE);
  return bookmarks;
}

/**
 * 把迁移时暂存的 V1 links 导入服务端（URL 唯一，幂等）。
 * 成功后才清除队列；失败保留，下次同步重试。
 */
async function importPendingLinks() {
  const pending = getPendingLinks();
  if (pending.length === 0) return;
  await apiCall('POST', '/api/bookmarks/import', { bookmarks: pending });
  clearPendingLinks();
}

// ---------- 本地查询（纯函数，作用于服务端快照） ----------

const bookmarkService = {
  getAll() {
    return store.getState().bookmarks || [];
  },

  getById(id) {
    return this.getAll().find((b) => b.id === id);
  },

  getByCategory(category) {
    if (category === '全部') return this.getAll();
    return this.getAll().filter((b) => b.category === category);
  },

  getCategories() {
    const categories = new Set(['全部']);
    this.getAll().forEach((b) => {
      if (b.category) categories.add(b.category);
    });
    return Array.from(categories);
  },

  search(query) {
    if (!query) return this.getAll();
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter((b) =>
      b.title.toLowerCase().includes(lowerQuery) ||
      b.url.toLowerCase().includes(lowerQuery) ||
      b.description?.toLowerCase().includes(lowerQuery) ||
      b.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  getStats() {
    const bookmarks = this.getAll();
    return {
      total: bookmarks.length,
      pinned: bookmarks.filter((b) => b.isPinned).length,
      categories: this.getCategories().length - 1, // 排除"全部"
      tagged: bookmarks.filter((b) => b.tags && b.tags.length > 0).length,
    };
  },

  // ---------- 写操作（API 成功后才提交本地；离线/未登录直接报错） ----------

  /**
   * 添加书签
   */
  async add(data) {
    const errors = validateBookmark(data);
    if (errors.length > 0) {
      throw new Error(`验证失败: ${errors.join(', ')}`);
    }

    const url = normalizeUrl(data.url);
    const favicon = await getFaviconUrl(url);

    const local = {
      id: `local-${Date.now().toString(36)}`,
      title: data.title.trim(),
      url,
      category: data.category?.trim() || '常用',
      description: data.description?.trim() || '',
      favicon,
      tags: data.tags || [],
      isPinned: false,
      sortOrder: Date.now(),
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const json = await apiCall('POST', '/api/bookmarks', toServer(local));
    const created = { ...local, id: json.data.id };
    store.setState((state) => ({
      ...state,
      bookmarks: [...state.bookmarks, created],
    }));
    return created;
  },

  /**
   * 更新书签
   */
  async update(id, updates) {
    const current = this.getById(id);
    if (!current) throw new Error('书签不存在');

    const next = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await apiCall('PUT', `/api/bookmarks/${id}`, toServer(next));
    store.setState((state) => ({
      ...state,
      bookmarks: state.bookmarks.map((b) => (b.id === id ? next : b)),
    }));
    return next;
  },

  /**
   * 删除书签
   */
  async delete(id) {
    const bookmark = this.getById(id);
    if (!bookmark) return;

    await apiCall('DELETE', `/api/bookmarks/${id}`);
    store.setState((state) => ({
      ...state,
      bookmarks: state.bookmarks.filter((b) => b.id !== id),
    }));
  },

  /**
   * 置顶/取消置顶
   */
  async togglePin(id) {
    const bookmark = this.getById(id);
    if (!bookmark) return;
    await this.update(id, { isPinned: !bookmark.isPinned });
  },
};

export default bookmarkService;
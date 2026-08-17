/**
 * 书签服务 — 视图层查询统计 + 异步 CRUD
 *
 * - 认证/HTTP 统一收敛到 apiClient（login/isLoggedIn/logout/fetchAll 为兼容
 *   旧视图临时 re-export，书签页稍后删除二次登录后即可移除）
 * - 写操作必须 API 成功后才提交内存 store；不做本地待同步队列与离线快照保护
 * - 数据映射（snake_case <-> camelCase）统一在 apiClient
 */
import store from '../store.js';
import { normalizeUrl, getFaviconUrl, validateBookmark } from '../utils/helpers.js';
import { apiCall, bootstrap, isLoggedIn, toLocalBookmark, toServerBookmark } from './apiClient.js';

// 兼容旧视图的命名导出（BookmarksView 仍在用）；书签页移除二次登录后可删除
export { login, logout, fetchAll, isLoggedIn } from './apiClient.js';

/** 书签同步状态（视图展示用） */
export const SyncStatus = {
  IDLE: 'idle',       // 未登录，无同步
  SYNCING: 'syncing', // 拉取/推送中
  ONLINE: 'online',   // 与服务器一致
  OFFLINE: 'offline', // 请求失败，展示最近快照（只读）
};

/**
 * 初始化（app.js 调用）：已持有 token 则后台全量拉取；否则保持当前本地快照
 */
export async function init() {
  if (!isLoggedIn()) {
    store.setState((state) => ({
      ...state,
      ui: { ...state.ui, syncStatus: SyncStatus.IDLE },
    }));
    return;
  }
  try {
    await bootstrap();
  } catch {
    store.setState((state) => ({
      ...state,
      ui: { ...state.ui, syncStatus: SyncStatus.OFFLINE },
    }));
  }
}

// ---------- 本地查询（纯函数，作用于 store 快照） ----------

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

  // ---------- 写操作（API 成功后才提交 store；未登录直接报错） ----------

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

    const json = await apiCall('POST', '/api/bookmarks', toServerBookmark(local));
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

    await apiCall('PUT', `/api/bookmarks/${id}`, toServerBookmark(next));
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
    if (!bookmark) {
      throw new Error('书签不存在或已被删除');
    }

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
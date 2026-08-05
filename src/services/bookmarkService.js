/**
 * 书签管理服务
 */

import store from '../store.js';
import { generateId, normalizeUrl, getFaviconUrl, validateBookmark } from '../utils/helpers.js';

const bookmarkService = {
  /**
   * 获取所有书签
   */
  getAll() {
    return store.getState().bookmarks || [];
  },

  /**
   * 获取单个书签
   */
  getById(id) {
    return this.getAll().find(b => b.id === id);
  },

  /**
   * 添加书签
   */
  async add(data) {
    // 验证
    const errors = validateBookmark(data);
    if (errors.length > 0) {
      throw new Error(`验证失败: ${errors.join(', ')}`);
    }

    const url = normalizeUrl(data.url);
    const favicon = await getFaviconUrl(url);

    const bookmark = {
      id: generateId(),
      title: data.title.trim(),
      url,
      category: data.category?.trim() || '常用',
      description: data.description?.trim() || '',
      favicon,
      tags: data.tags || [],
      isPinned: false,
      sortOrder: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.setState(state => ({
      ...state,
      bookmarks: [...state.bookmarks, bookmark],
    }));

    return bookmark;
  },

  /**
   * 更新书签
   */
  update(id, updates) {
    store.setState(state => ({
      ...state,
      bookmarks: state.bookmarks.map(b =>
        b.id === id
          ? { ...b, ...updates, updatedAt: new Date().toISOString() }
          : b
      ),
    }));
  },

  /**
   * 删除书签
   */
  delete(id) {
    const bookmark = this.getById(id);
    if (bookmark) {
      this._pushToUndoStack({ type: 'deleteBookmark', data: bookmark });
    }

    store.setState(state => ({
      ...state,
      bookmarks: state.bookmarks.filter(b => b.id !== id),
    }));
  },

  /**
   * 置顶/取消置顶
   */
  togglePin(id) {
    const bookmark = this.getById(id);
    if (!bookmark) return;

    this.update(id, { isPinned: !bookmark.isPinned });
  },

  /**
   * 按分类获取
   */
  getByCategory(category) {
    if (category === '全部') return this.getAll();
    return this.getAll().filter(b => b.category === category);
  },

  /**
   * 获取所有分类
   */
  getCategories() {
    const categories = new Set(['全部']);
    this.getAll().forEach(b => {
      if (b.category) categories.add(b.category);
    });
    return Array.from(categories);
  },

  /**
   * 搜索书签
   */
  search(query) {
    if (!query) return this.getAll();

    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(b =>
      b.title.toLowerCase().includes(lowerQuery) ||
      b.url.toLowerCase().includes(lowerQuery) ||
      b.description?.toLowerCase().includes(lowerQuery) ||
      b.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * 获取统计
   */
  getStats() {
    const bookmarks = this.getAll();
    const categories = this.getCategories().length - 1; // 排除"全部"

    return {
      total: bookmarks.length,
      pinned: bookmarks.filter(b => b.isPinned).length,
      categories,
      tagged: bookmarks.filter(b => b.tags && b.tags.length > 0).length,
    };
  },

  _pushToUndoStack(action) {
    store.setState(state => ({
      ...state,
      undoStack: [...(state.undoStack || []), action].slice(-20),
    }));
  },
};

export default bookmarkService;

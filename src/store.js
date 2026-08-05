/**
 * 全局 Store 实例
 */

import Store from './core/Store.js';
import { debouncedPersistMiddleware, validatorMiddleware } from './core/middlewares.js';

// 初始状态
const initialState = {
  // 用户数据
  bookmarks: [],  // 统一的书签（原 links + nav bookmarks）
  tasks: [],
  habits: [],
  sources: [],
  notes: {
    id: 'scratch-note',
    kind: 'scratch',
    title: '草稿',
    body: '',
    updatedAt: new Date().toISOString(),
  },

  // UI 状态
  ui: {
    activeView: 'dashboard',  // 'dashboard' | 'bookmarks' | 'stats' | 'settings'
    theme: 'auto',            // 'light' | 'dark' | 'auto'
    sidebarCollapsed: false,
    bookmarkViewMode: 'grid', // 'grid' | 'list'
    selectedDate: null,
    searchQuery: '',
    filters: {
      bookmarkCategory: '全部',
      taskStatus: 'all',
    },
  },

  // 运行时状态
  weather: null,

  // 历史记录（撤销/重做）
  history: {
    undoStack: [],
    redoStack: [],
  },

  // 元数据
  meta: {
    version: '2.0.0',
    lastSync: null,
    installDate: new Date().toISOString(),
    migratedFrom: null,
  }
};

// 尝试从 localStorage 恢复状态
function loadPersistedState() {
  try {
    const saved = localStorage.getItem('yiliu.home.state.v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...initialState,
        ...parsed,
        // 合并 UI 状态（保留默认值）
        ui: { ...initialState.ui, ...parsed.ui },
        meta: { ...initialState.meta, ...parsed.meta },
      };
    }
  } catch (error) {
    console.error('[Store] Failed to load persisted state:', error);
  }

  return initialState;
}

// 创建 store 实例
const store = new Store(loadPersistedState());

// 注册中间件
store.use(validatorMiddleware);
store.use(debouncedPersistMiddleware);

// 开发环境：暴露到全局
if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
  window.__STORE__ = store;
  window.__STATE__ = () => store.getState();
  console.log('[Store] Debug mode enabled. Access via window.__STORE__');
}

export default store;

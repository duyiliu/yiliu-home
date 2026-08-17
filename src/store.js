/**
 * 全局 Store 实例（纯内存，不做任何本地持久化）
 *
 * 数据全部以服务端数据库为准：登录后由 apiClient.bootstrap() 全量拉取写入。
 * 刷新页面后从 initialState 重新开始，等待重新认证。
 */

import Store from './core/Store.js';
import { validatorMiddleware } from './core/middlewares.js';

// 初始状态
const initialState = {
  // 用户数据
  bookmarks: [],  // 统一的书签
  tasks: [],
  habits: [],
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
    syncStatus: 'idle', // 书签同步状态：idle | syncing | online | offline（运行时状态，不持久化）
  },

  // 运行时状态
  weather: null,

  // 元数据
  meta: {
    version: '2.0.0',
    lastSync: null,
    installDate: new Date().toISOString(),
    migratedFrom: null,
  }
};

// 创建 store 实例（纯内存，直接使用 initialState）
const store = new Store(initialState);

// 注册中间件（仅校验，无持久化）
store.use(validatorMiddleware);

// 开发环境：暴露到全局
// 注意先判断 typeof window，否则 Node/非浏览器环境 import 本模块会直接 ReferenceError
if (import.meta.env?.DEV || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
  window.__STORE__ = store;
  window.__STATE__ = () => store.getState();
  console.log('[Store] Debug mode enabled. Access via window.__STORE__');
}

export default store;
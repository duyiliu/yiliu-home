/**
 * 测试辅助：把全局单例 store 重置为干净初始状态
 *
 * services / migration 测试共享 src/store.js 的单例，测试之间必须重置。
 * 用 updater 函数形式返回全新对象，绕过对象合并语义。
 */
import store from '../../src/store.js';

export function resetStore() {
  store.setState(() => ({
    bookmarks: [],
    tasks: [],
    habits: [],
    sources: [],
    notes: null,
    ui: {
      activeView: 'dashboard',
      theme: 'auto',
      sidebarCollapsed: false,
      bookmarkViewMode: 'grid',
      selectedDate: null,
      searchQuery: '',
      filters: { bookmarkCategory: '全部', taskStatus: 'all' },
      syncStatus: 'idle',
    },
    weather: null,
    meta: { version: '2.0.0', lastSync: null, installDate: null, migratedFrom: null },
  }));
}

export { store };
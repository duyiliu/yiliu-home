/**
 * 应用入口文件
 *
 * 初始化顺序：
 * 1. 数据迁移
 * 2. 认证检查
 * 3. 路由初始化
 * 4. 全局搜索
 * 5. 应用启动
 */

import { migrateData } from './core/migration.js';
import router from './router.js';
import Toast from './components/base/Toast.js';
import SearchBar from './components/SearchBar.js';
import searchService from './services/searchService.js';
import { init as initBookmarks } from './services/bookmarkService.js';
import store from './store.js';

// 等待 DOM 加载
document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] Starting...');

  // 步骤 1: 数据迁移
  const migrated = migrateData();
  if (migrated) {
    Toast.success('数据已从旧版本迁移到新架构', 4000);
  }

  // 步骤 2: 认证检查
  const isAuthenticated = checkAuth();
  if (!isAuthenticated) {
    // 如果未认证，显示锁屏
    // 这里暂时跳过，auth.js 会处理
    console.log('[App] Auth check: using existing auth.js');
  }

  // 步骤 3: 路由初始化已在 import 时完成
  console.log('[App] Router initialized');

  // 步骤 4: 初始化全局搜索
  initGlobalSearch();

  // 步骤 5: 显示启动信息
  console.log('%c[App] V2 Architecture Ready', 'color: #6d8169; font-weight: bold; font-size: 14px');
  console.log('📦 Store:', window.__STORE__);
  console.log('🛣️ Router:', router);
  console.log('🔍 Global search: Press Ctrl+K');

  // 步骤 6: 书签同步初始化（已登录则后台拉取）
  initBookmarks();

  // 欢迎提示
  Toast.info('欢迎使用一流工作台 V2 - 按 Ctrl+K 搜索', 3000);
});

/**
 * 检查认证状态
 */
function checkAuth() {
  return localStorage.getItem('yiliu.home.auth') === '1';
}

/**
 * 初始化全局搜索
 */
function initGlobalSearch() {
  // 创建搜索栏容器
  const searchContainer = document.createElement('div');
  searchContainer.id = 'global-search';
  document.body.appendChild(searchContainer);

  // 创建搜索栏实例
  const searchBar = new SearchBar({
    onSearch: (query) => {
      const results = searchService.search(query);

      // 格式化结果
      const formatted = [
        ...results.tasks.map(t => ({
          type: 'task',
          id: t.id,
          title: t.title,
          subtitle: `优先级: ${t.priority}`,
        })),
        ...results.bookmarks.map(b => ({
          type: 'bookmark',
          id: b.id,
          title: b.title,
          subtitle: b.url,
        })),
        ...results.habits.map(h => ({
          type: 'habit',
          id: h.id,
          title: h.title,
          subtitle: `连续 ${h.streak} 天`,
        })),
      ];

      return formatted;
    },
    onSelect: (item) => {
      // 根据类型跳转
      if (item.type === 'bookmark') {
        const bookmarks = store.getState().bookmarks || [];
        const bookmark = bookmarks.find(b => b.id === item.id);
        if (bookmark) {
          window.open(bookmark.url, '_blank');
        }
      } else if (item.type === 'task') {
        router.push('/');
        Toast.info('已跳转到任务列表');
      } else if (item.type === 'habit') {
        router.push('/');
        Toast.info('已跳转到习惯打卡');
      }
    },
  });

  // 渲染搜索栏
  searchContainer.appendChild(searchBar.render());

  // 全局快捷键：Ctrl+K / Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchBar.open();
    }
  });

  console.log('[App] Global search initialized. Press Ctrl+K to search.');
}

/**
 * 全局错误处理
 */
window.addEventListener('error', (event) => {
  console.error('[App] Global error:', event.error);
  Toast.error('发生错误，请刷新页面');
});

/**
 * 未捕获的 Promise 错误
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('[App] Unhandled rejection:', event.reason);
  Toast.error('操作失败，请重试');
});

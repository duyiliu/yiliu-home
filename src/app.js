/**
 * 应用入口文件
 *
 * 启动状态机：
 * 1. DOMContentLoaded：绑定锁屏 UI、注册认证事件
 * 2. 有 session token → bootstrap() 成功后启动应用；失败则清会话回锁屏
 * 3. 无 token → 停在锁屏
 * 4. 锁屏提交 → auth.js 内 login + bootstrap 成功 → 派发 yiliu:authenticated → 启动应用
 * 5. 任意 401 / yiliu:auth-expired → 清会话回锁屏
 *
 * router 惰性创建（initRouter），仅在认证通过后初始化，避免 import 时提前渲染。
 */

import { initRouter } from './router.js';
import Toast from './components/base/Toast.js';
import SearchBar from './components/SearchBar.js';
import searchService from './services/searchService.js';
import { isLoggedIn, bootstrap, logout, AUTH_EXPIRED_EVENT } from './services/apiClient.js';
import { initAuthUI, showLockScreen, showAuthenticatedApp, AUTHENTICATED_EVENT } from '../auth.js?v=13';
import store from './store.js';

let router = null;
let started = false;

// 等待 DOM 加载
document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] Starting...');

  initAuthUI();
  window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  window.addEventListener(AUTHENTICATED_EVENT, onAuthenticated);

  if (isLoggedIn()) {
    // 有会话 token：先 bootstrap，成功再启动
    bootstrap()
      .then(() => {
        showAuthenticatedApp();
        startApp();
      })
      .catch((err) => {
        console.error('[App] Bootstrap failed:', err);
        logout();
        showLockScreen();
      });
  } else {
    // 无 token：停在锁屏
    showLockScreen();
  }
});

/** 认证成功（锁屏提交成功）后启动应用 */
function onAuthenticated() {
  startApp();
}

/** 401 / 认证失效：清除会话并回锁屏 */
function onAuthExpired() {
  logout();
  showLockScreen();
}

/** 启动业务应用（幂等） */
function startApp() {
  if (started) return;
  started = true;

  // 路由惰性初始化（此时才首次渲染）
  router = initRouter();

  // 初始化全局搜索
  initGlobalSearch();

  console.log('%c[App] V2 Architecture Ready', 'color: #6d8169; font-weight: bold; font-size: 14px');
  console.log('📦 Store:', window.__STORE__);
  console.log('🛣️ Router:', router);
  console.log('🔍 Global search: Press Ctrl+K');

  // 欢迎提示
  Toast.info('欢迎使用一流工作台 V2 - 按 Ctrl+K 搜索', 3000);
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
        ...results.tasks.map((t) => ({
          type: 'task',
          id: t.id,
          title: t.title,
          subtitle: `优先级: ${t.priority}`,
        })),
        ...results.bookmarks.map((b) => ({
          type: 'bookmark',
          id: b.id,
          title: b.title,
          subtitle: b.url,
        })),
        ...results.habits.map((h) => ({
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
        const bookmark = bookmarks.find((b) => b.id === item.id);
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
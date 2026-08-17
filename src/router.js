/**
 * 路由配置
 *
 * 惰性初始化：Router 构造时即绑定事件并渲染首屏，因此这里不直接创建实例，
 * 而是导出 initRouter()，由 app.js 在认证通过后调用（避免 import 时提前渲染）。
 *
 * default 导出为惰性代理：视图组件（如 DashboardView）以 `import router from
 * '../router.js'` 的方式调用 router.push 时，代理会确保实例已创建。
 */

import Router from './core/Router.js';
import { isLoggedIn } from './services/apiClient.js';
import DashboardView from './views/DashboardView.js';
import BookmarksView from './views/BookmarksView.js';
import StatsView from './views/StatsView.js';
import SettingsView from './views/SettingsView.js';

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: {
      title: '仪表盘',
      icon: '🏠',
    },
  },
  {
    path: '/bookmarks',
    name: 'bookmarks',
    component: BookmarksView,
    meta: {
      title: '导航站',
      icon: '📑',
    },
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsView,
    meta: {
      title: '统计',
      icon: '📊',
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: {
      title: '设置',
      icon: '⚙️',
    },
  },
];

let router = null;

/** 认证兜底：未登录时回到锁屏 */
function showLockFallback() {
  const lock = document.getElementById('lockScreen');
  if (lock) lock.classList.remove('is-unlocked');
  const shell = document.getElementById('appShell');
  if (shell) shell.classList.remove('is-visible');
}

/**
 * 创建并返回路由实例（幂等；仅应在认证通过后调用）
 */
export function initRouter() {
  if (router) return router;

  router = new Router(routes);

  // 全局前置守卫：认证兜底，未登录阻止导航并回锁屏
  router.beforeEach((to) => {
    if (!isLoggedIn()) {
      console.warn('[Router] Guard: not authenticated, blocked:', to.path);
      showLockFallback();
      return false;
    }

    // 更新页面标题
    document.title = `${to.meta.title} - 一流工作台`;

    console.log(`[Router] Navigating to: ${to.path}`);

    return true;
  });

  // 全局后置钩子
  router.afterEach((to) => {
    // 滚动到顶部
    window.scrollTo(0, 0);
  });

  return router;
}

/**
 * 惰性代理：视图组件 import 的 router 对象在首次访问属性时才确保实例已创建
 */
export default new Proxy({}, {
  get: (_target, prop) => initRouter()[prop],
});
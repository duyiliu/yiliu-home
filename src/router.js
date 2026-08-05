/**
 * 路由配置
 */

import Router from './core/Router.js';
import DashboardView from './views/DashboardView.js';
import BookmarksView from './views/BookmarksView.js';
import StatsView from './views/StatsView.js';
import SettingsView from './views/SettingsView.js';

// 创建路由实例
const router = new Router([
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
]);

// 全局前置守卫
router.beforeEach((to, from) => {
  // 更新页面标题
  document.title = `${to.meta.title} - 一流工作台`;

  console.log(`[Router] Navigating to: ${to.path}`);

  return true;
});

// 全局后置钩子
router.afterEach((to) => {
  // 滚动到顶部
  window.scrollTo(0, 0);

  // 关闭所有打开的模态框、下拉菜单等
  // ...
});

export default router;

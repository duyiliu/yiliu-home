/**
 * 前端路由系统
 *
 * 基于 History API 实现单页应用路由
 */

class Router {
  constructor(routes = []) {
    this.routes = routes;
    this.currentRoute = null;
    this.hooks = {
      beforeEach: [],
      afterEach: [],
    };

    this._init();
  }

  /**
   * 初始化路由
   */
  _init() {
    // 监听浏览器前进/后退
    window.addEventListener('popstate', () => {
      this.render();
    });

    // 拦截链接点击
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        this.push(href);
      }
    });

    // 首次渲染
    this.render();
  }

  /**
   * 导航到新路由
   */
  push(path) {
    if (path === window.location.pathname) return;

    window.history.pushState(null, '', path);
    this.render();
  }

  /**
   * 替换当前路由
   */
  replace(path) {
    window.history.replaceState(null, '', path);
    this.render();
  }

  /**
   * 返回上一页
   */
  back() {
    window.history.back();
  }

  /**
   * 渲染当前路由
   */
  async render() {
    const path = window.location.pathname;
    const route = this._matchRoute(path);

    if (!route) {
      console.error('[Router] Route not found:', path);
      this.replace('/');
      return;
    }

    // 执行 beforeEach 钩子
    for (const hook of this.hooks.beforeEach) {
      const result = await hook(route, this.currentRoute);
      if (result === false) return; // 取消导航
    }

    // 卸载旧视图
    if (this.currentRoute?.instance) {
      this.currentRoute.instance.destroy?.();
    }

    // 渲染新视图
    const container = document.getElementById('app');
    if (!container) {
      console.error('[Router] Container #app not found');
      return;
    }

    container.innerHTML = '';

    try {
      const ViewClass = route.component;
      const instance = new ViewClass(container, route.params);
      instance.render();

      this.currentRoute = {
        ...route,
        instance,
      };

      // 执行 afterEach 钩子
      this.hooks.afterEach.forEach(hook => hook(route));

      // 更新导航高亮
      this._updateActiveNav(path);

    } catch (error) {
      console.error('[Router] Failed to render view:', error);
    }
  }

  /**
   * 匹配路由
   */
  _matchRoute(path) {
    for (const route of this.routes) {
      const params = this._extractParams(route.path, path);
      if (params) {
        return { ...route, params };
      }
    }
    return null;
  }

  /**
   * 提取路由参数
   */
  _extractParams(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // 动态参数
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  /**
   * 更新导航高亮
   */
  _updateActiveNav(path) {
    document.querySelectorAll('[data-link]').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('is-active', href === path);
    });
  }

  /**
   * 注册钩子
   */
  beforeEach(hook) {
    this.hooks.beforeEach.push(hook);
  }

  afterEach(hook) {
    this.hooks.afterEach.push(hook);
  }
}

export default Router;

/**
 * 视图基类
 * 所有视图继承此类
 */

class BaseView {
  constructor(container, params = {}) {
    this.container = container;
    this.params = params;
    this.subscriptions = [];
  }

  /**
   * 渲染视图（子类实现）
   */
  render() {
    throw new Error('render() must be implemented');
  }

  /**
   * 销毁视图
   */
  destroy() {
    // 取消所有订阅
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // 清空容器
    this.container.innerHTML = '';
  }

  /**
   * 订阅 store（自动管理生命周期）
   */
  subscribe(store, listener) {
    const unsubscribe = store.subscribe(listener);
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * 创建元素
   */
  createElement(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content) el.textContent = content;
    return el;
  }

  /**
   * 查询元素
   */
  $(selector) {
    return this.container.querySelector(selector);
  }

  /**
   * 查询多个元素
   */
  $$(selector) {
    return Array.from(this.container.querySelectorAll(selector));
  }
}

export default BaseView;

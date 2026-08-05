/**
 * 组件基类
 * 提供统一的生命周期和工具方法
 */

class Component {
  constructor(props = {}) {
    this.props = props;
    this.el = null;
    this.children = [];
  }

  /**
   * 渲染组件（返回 DOM 元素）
   * 子类必须实现
   */
  render() {
    throw new Error('render() must be implemented');
  }

  /**
   * 更新组件（重新渲染）
   */
  update(newProps) {
    this.props = { ...this.props, ...newProps };

    if (this.el && this.el.parentNode) {
      const newEl = this.render();
      this.el.parentNode.replaceChild(newEl, this.el);
      this.el = newEl;
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.children.forEach(child => child.destroy?.());
    this.children = [];

    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
  }

  /**
   * 创建元素
   */
  createElement(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);

    // 设置属性
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value);
      } else if (key.startsWith('on')) {
        // 事件监听
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, value);
      } else if (key === 'checked' || key === 'disabled') {
        el[key] = value;
      } else {
        el.setAttribute(key, value);
      }
    });

    // 添加子元素
    children.flat().forEach(child => {
      if (child === null || child === undefined) return;

      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });

    return el;
  }
}

export default Component;

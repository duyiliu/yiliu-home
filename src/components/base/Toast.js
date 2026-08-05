/**
 * Toast 通知（单例模式）
 *
 * 使用：
 * Toast.show('保存成功', 'success');
 * Toast.error('操作失败');
 */

class Toast {
  static container = null;
  static queue = [];

  static init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        bottom: 40px;
        right: 40px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  static show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      padding: 14px 20px;
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      box-shadow: 0 8px 28px rgba(82, 62, 43, 0.16);
      font-size: 14px;
      font-weight: 700;
      transform: translateX(120%);
      opacity: 0;
      transition: all 300ms cubic-bezier(0.33, 1, 0.68, 1);
      pointer-events: auto;
    `;

    // 类型样式
    const styles = {
      success: { background: '#6d8169', color: 'white', border: 'none' },
      error: { background: '#bf4f3c', color: 'white', border: 'none' },
      warning: { background: '#e8b35e', color: 'white', border: 'none' },
      info: { background: '#302820', color: '#fffaf3', border: 'none' },
    };

    if (styles[type]) {
      Object.assign(toast.style, styles[type]);
    }

    this.container.appendChild(toast);

    // 入场动画
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    // 自动关闭
    setTimeout(() => {
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);

    return toast;
  }

  static success(message, duration) {
    return this.show(message, 'success', duration);
  }

  static error(message, duration) {
    return this.show(message, 'error', duration);
  }

  static warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  static info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

export default Toast;

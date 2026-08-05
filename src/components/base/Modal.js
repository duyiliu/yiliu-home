/**
 * Modal 模态框组件
 */

class Modal {
  constructor(props) {
    this.props = props;
    this.el = null;
  }

  render() {
    const { title, content, footer, onClose } = this.props;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(47, 41, 35, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 200ms ease;
    `;

    // 创建模态框
    const modal = document.createElement('div');
    modal.style.cssText = `
      width: min(480px, 90vw);
      max-height: 85vh;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 24px;
      box-shadow: 0 24px 64px rgba(82, 62, 43, 0.24);
      display: flex;
      flex-direction: column;
      animation: slideUp 300ms cubic-bezier(0.33, 1, 0.68, 1);
    `;

    // Header
    const header = document.createElement('header');
    header.style.cssText = `
      padding: 24px 24px 16px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = 'margin: 0; font-size: 22px;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      width: 32px;
      height: 32px;
      padding: 0;
      display: grid;
      place-items: center;
      font-size: 24px;
      background: transparent;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      transition: background 150ms ease;
    `;
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.background = 'var(--color-surface-2)';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.background = 'transparent';
    });
    closeBtn.addEventListener('click', onClose);

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    `;
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }

    // Footer
    let footerEl = null;
    if (footer && footer.length > 0) {
      footerEl = document.createElement('footer');
      footerEl.style.cssText = `
        padding: 16px 24px 24px;
        border-top: 1px solid var(--color-border);
        display: flex;
        gap: 12px;
      `;
      footer.forEach(btn => footerEl.appendChild(btn));
    }

    // 组装
    modal.appendChild(header);
    modal.appendChild(body);
    if (footerEl) modal.appendChild(footerEl);

    overlay.appendChild(modal);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) onClose();
    });

    // ESC 关闭
    this._escHandler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', this._escHandler);

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    this.el = overlay;
    return overlay;
  }

  destroy() {
    document.removeEventListener('keydown', this._escHandler);
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
  }
}

export default Modal;

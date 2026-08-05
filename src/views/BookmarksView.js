/**
 * 导航站视图（完整版）
 */

import BaseView from './BaseView.js';
import store from '../store.js';
import bookmarkService, { login, fetchAll, isLoggedIn, SyncStatus } from '../services/bookmarkService.js';
import BookmarkGrid from '../components/BookmarkGrid.js';
import Toast from '../components/base/Toast.js';
import Modal from '../components/base/Modal.js';

const SYNC_LABELS = {
  [SyncStatus.IDLE]: '未同步（本地快照）',
  [SyncStatus.SYNCING]: '同步中…',
  [SyncStatus.ONLINE]: '已同步',
  [SyncStatus.OFFLINE]: '离线模式 · 只读',
};

class BookmarksView extends BaseView {
  constructor(container, params) {
    super(container, params);
    this.bookmarkGrid = null;
    this.currentCategory = '全部';
  }

  render() {
    this.container.innerHTML = `
      <div class="page-shell">
        <main class="app-layout">
          <aside class="left-rail">
            <section class="profile-card panel-card">
              <h2>📑 导航站</h2>
              <p>统一的书签管理，已从旧版本迁移并增强。</p>
              <div id="bookmark-stats" style="margin-top: 16px;"></div>
            </section>

            <nav class="nav-card panel-card">
              <a href="/" data-link><span>H</span>总览首页</a>
              <a class="is-active" href="/bookmarks" data-link><span>📑</span>导航站</a>
              <a href="/stats" data-link><span>📊</span>统计</a>
              <a href="/settings" data-link><span>⚙️</span>设置</a>
            </nav>

            <section class="panel-card" style="padding: 20px;">
              <h3 style="margin-bottom: 12px; font-size: 16px;">分类</h3>
              <div id="category-list"></div>
            </section>
          </aside>

          <section class="center-column">
            <article class="widget panel-card">
              <div class="widget-head">
                <div>
                  <h2>我的书签</h2>
                  <p id="current-category-label">全部书签</p>
                </div>
                <div class="widget-actions" style="display: flex; gap: 8px; align-items: center;">
                  <span id="bookmark-sync-status" class="status-pill is-idle">未同步（本地快照）</span>
                  <button id="sync-bookmarks-btn" class="ghost-button small" type="button">登录同步</button>
                  <button id="add-bookmark-btn" class="dark-button small">+ 添加书签</button>
                </div>
              </div>

              <div id="search-bar" style="margin-bottom: 16px;">
                <input
                  type="search"
                  id="bookmark-search"
                  placeholder="搜索书签标题、网址..."
                  style="width: 100%;"
                />
              </div>

              <div id="bookmark-grid-container"></div>
            </article>
          </section>
        </main>
      </div>
    `;

    // 渲染各部分
    this.renderSyncStatus();
    this.renderBookmarkGrid();
    this.renderStats();
    this.renderCategories();

    // 绑定事件
    this.bindEvents();

    // 订阅变化
    this.subscribe(store, (state, prevState) => {
      if (state.bookmarks !== prevState.bookmarks) {
        this.renderBookmarkGrid();
        this.renderStats();
        this.renderCategories();
      }
      if (state.ui.syncStatus !== prevState.ui.syncStatus) {
        this.renderSyncStatus();
      }
    });
  }

  bindEvents() {
    // 添加书签按钮
    const addBtn = this.$('#add-bookmark-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddBookmarkModal());
    }

    // 登录/同步按钮
    const syncBtn = this.$('#sync-bookmarks-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        if (isLoggedIn()) {
          this.refreshBookmarks();
        } else {
          this.showLoginModal();
        }
      });
    }

    // 搜索
    const searchInput = this.$('#bookmark-search');
    if (searchInput) {
      let searchTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });
    }
  }

  renderBookmarkGrid() {
    const container = this.$('#bookmark-grid-container');
    if (!container) return;

    // 销毁旧的
    if (this.bookmarkGrid) {
      this.bookmarkGrid.destroy();
    }

    const bookmarks = this.currentCategory === '全部'
      ? bookmarkService.getAll()
      : bookmarkService.getByCategory(this.currentCategory);

    this.bookmarkGrid = new BookmarkGrid({
      bookmarks,
      onDelete: (id) => this.handleDelete(id),
      onPin: (id) => this.handlePin(id),
    });

    container.innerHTML = '';
    container.appendChild(this.bookmarkGrid.render());
  }

  renderSyncStatus() {
    const el = this.$('#bookmark-sync-status');
    const btn = this.$('#sync-bookmarks-btn');
    if (!el) return;

    const status = store.getState().ui.syncStatus || SyncStatus.IDLE;
    const cls = status === SyncStatus.ONLINE ? 'is-online'
      : status === SyncStatus.SYNCING ? 'is-syncing'
      : status === SyncStatus.OFFLINE ? 'is-offline'
      : 'is-idle';
    el.textContent = SYNC_LABELS[status] || '未同步';
    el.className = `status-pill ${cls}`;
    if (btn) btn.textContent = isLoggedIn() ? '重新同步' : '登录同步';
  }

  async handleDelete(id) {
    try {
      await bookmarkService.delete(id);
      Toast.info('书签已删除');
    } catch (error) {
      Toast.error(`删除失败：${error.message}`);
    }
  }

  async handlePin(id) {
    try {
      await bookmarkService.togglePin(id);
      Toast.success('已更新');
    } catch (error) {
      Toast.error(`操作失败：${error.message}`);
    }
  }

  async refreshBookmarks() {
    try {
      await fetchAll();
      Toast.success('已同步');
    } catch (error) {
      Toast.error(`同步失败：${error.message}`);
    }
  }

  showLoginModal() {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <form id="login-form" style="display: grid; gap: 16px;">
        <label style="display: grid; gap: 6px;">
          <span style="font-weight: 700;">访问密码</span>
          <input type="password" id="login-password" placeholder="请输入访问密码" required style="width: 100%;" />
        </label>
        <p style="margin: 0; font-size: 12px; color: var(--color-text-secondary);">
          登录后将书签同步到云端（SQLite），本地保留最近快照。
        </p>
      </form>
    `;

    const submitBtn = document.createElement('button');
    submitBtn.className = 'dark-button';
    submitBtn.textContent = '登录并同步';
    submitBtn.style.cssText = 'width: 100%;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'ghost-button';
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'width: 100%;';

    const modal = new Modal({
      title: '登录同步',
      content: modalContent,
      footer: [submitBtn, cancelBtn],
      onClose: () => modal.destroy(),
    });

    document.body.appendChild(modal.render());

    submitBtn.addEventListener('click', async () => {
      const password = document.getElementById('login-password').value;
      if (!password) {
        Toast.error('请输入密码');
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = '登录中…';
      try {
        await login(password);
        await fetchAll();
        Toast.success('已登录并同步');
        modal.destroy();
      } catch (error) {
        Toast.error(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = '登录并同步';
      }
    });

    cancelBtn.addEventListener('click', () => modal.destroy());

    modalContent.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitBtn.click();
    });

    setTimeout(() => document.getElementById('login-password')?.focus(), 100);
  }

  renderStats() {
    const stats = this.$('#bookmark-stats');
    if (!stats) return;

    const data = bookmarkService.getStats();

    stats.innerHTML = `
      <div style="display: grid; gap: 8px; font-size: 13px; color: var(--color-text-secondary);">
        <div><strong>总数：</strong>${data.total}</div>
        <div><strong>分类：</strong>${data.categories}</div>
        <div><strong>置顶：</strong>${data.pinned}</div>
      </div>
    `;
  }

  renderCategories() {
    const list = this.$('#category-list');
    if (!list) return;

    const categories = bookmarkService.getCategories();

    list.innerHTML = categories.map(cat => {
      const isActive = cat === this.currentCategory;
      return `
        <button
          class="category-btn ${isActive ? 'is-active' : ''}"
          data-category="${this.escapeHtml(cat)}"
          style="
            display: block;
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 4px;
            text-align: left;
            background: ${isActive ? 'var(--color-primary)' : 'var(--color-surface-2)'};
            color: ${isActive ? 'white' : 'var(--color-text)'};
            border: 1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'};
            border-radius: 8px;
            font-weight: ${isActive ? '700' : '400'};
            cursor: pointer;
            transition: all 150ms ease;
          "
        >
          ${this.escapeHtml(cat)}
        </button>
      `;
    }).join('');

    // 绑定分类切换事件
    list.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentCategory = e.target.dataset.category;
        this.renderCategories();
        this.renderBookmarkGrid();
        this.updateCategoryLabel();
      });
    });
  }

  updateCategoryLabel() {
    const label = this.$('#current-category-label');
    if (label) {
      label.textContent = this.currentCategory === '全部'
        ? '全部书签'
        : `${this.currentCategory} 分类`;
    }
  }

  handleSearch(query) {
    const container = this.$('#bookmark-grid-container');
    if (!container) return;

    if (this.bookmarkGrid) {
      this.bookmarkGrid.destroy();
    }

    const bookmarks = bookmarkService.search(query);

    this.bookmarkGrid = new BookmarkGrid({
      bookmarks,
      onDelete: (id) => this.handleDelete(id),
      onPin: (id) => this.handlePin(id),
    });

    container.innerHTML = '';
    container.appendChild(this.bookmarkGrid.render());
  }

  showAddBookmarkModal() {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <form id="add-bookmark-form" style="display: grid; gap: 16px;">
        <label style="display: grid; gap: 6px;">
          <span style="font-weight: 700;">标题</span>
          <input type="text" id="modal-title" placeholder="GitHub" required style="width: 100%;" />
        </label>
        <label style="display: grid; gap: 6px;">
          <span style="font-weight: 700;">网址</span>
          <input type="url" id="modal-url" placeholder="https://github.com" required style="width: 100%;" />
        </label>
        <label style="display: grid; gap: 6px;">
          <span style="font-weight: 700;">分类</span>
          <input type="text" id="modal-category" placeholder="开发" value="${this.currentCategory === '全部' ? '常用' : this.currentCategory}" style="width: 100%;" />
        </label>
        <label style="display: grid; gap: 6px;">
          <span style="font-weight: 700;">描述（可选）</span>
          <input type="text" id="modal-description" placeholder="代码仓库与协作" style="width: 100%;" />
        </label>
      </form>
    `;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'dark-button';
    saveBtn.textContent = '保存';
    saveBtn.style.cssText = 'width: 100%;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'ghost-button';
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'width: 100%;';

    const modal = new Modal({
      title: '添加书签',
      content: modalContent,
      footer: [saveBtn, cancelBtn],
      onClose: () => modal.destroy(),
    });

    document.body.appendChild(modal.render());

    // 保存
    saveBtn.addEventListener('click', async () => {
      const title = document.getElementById('modal-title').value.trim();
      const url = document.getElementById('modal-url').value.trim();
      const category = document.getElementById('modal-category').value.trim();
      const description = document.getElementById('modal-description').value.trim();

      if (!title || !url) {
        Toast.error('标题和网址不能为空');
        return;
      }

      try {
        await bookmarkService.add({ title, url, category, description });
        Toast.success('书签已添加');
        modal.destroy();
      } catch (error) {
        Toast.error(error.message);
      }
    });

    // 取消
    cancelBtn.addEventListener('click', () => modal.destroy());

    // 回车提交
    modalContent.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      saveBtn.click();
    });

    // 自动聚焦
    setTimeout(() => document.getElementById('modal-title')?.focus(), 100);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  destroy() {
    if (this.bookmarkGrid) {
      this.bookmarkGrid.destroy();
      this.bookmarkGrid = null;
    }
    super.destroy();
  }
}

export default BookmarksView;

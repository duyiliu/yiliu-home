/**
 * 仪表盘视图（完整版）
 */

import BaseView from './BaseView.js';
import store from '../store.js';
import taskService from '../services/taskService.js';
import habitService from '../services/habitService.js';
import weatherService from '../services/weatherService.js';
import TaskList from '../components/TaskList.js';
import HabitTracker from '../components/HabitTracker.js';
import Calendar from '../components/Calendar.js';
import Weather from '../components/Weather.js';
import Toast from '../components/base/Toast.js';
import Modal from '../components/base/Modal.js';

class DashboardView extends BaseView {
  constructor(container, params) {
    super(container, params);
    this.taskList = null;
    this.habitTracker = null;
    this.calendar = null;
    this.weather = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="page-shell">
        <main class="app-layout">
          <aside class="left-rail">
            <section class="profile-card panel-card">
              <div class="profile-icon">流</div>
              <h2>duyiliu</h2>
              <p>把常用工具、任务和信息流统一收进一个安静的个人首页。</p>
              <div class="metric-grid" aria-label="个人概览">
                <div><strong id="linkMetric">0</strong><span>快捷入口</span></div>
                <div><strong id="taskMetric">0</strong><span>今日重点</span></div>
                <div><strong id="habitMetric">0/0</strong><span>习惯连续</span></div>
                <div><strong id="sourceMetric">0</strong><span>信息更新</span></div>
              </div>
            </section>

            <nav class="nav-card panel-card" aria-label="首页导航">
              <a class="is-active" href="/" data-link><span>H</span>总览首页</a>
              <a href="/bookmarks" data-link><span>📑</span>导航站</a>
              <a href="/stats" data-link><span>📊</span>统计</a>
            </nav>

            <section class="quote-card panel-card">
              <p class="quote-text">"少一点装饰，多一点秩序。让首页像一个可以马上开始工作的安静书桌。"</p>
              <span class="quote-author">— 一流工作台</span>
              <div><span class="dot"></span><strong>V2 架构</strong><em>模块化重构</em></div>
            </section>
          </aside>

          <section class="center-column">
            <section class="hero-card panel-card">
              <div class="eyebrow">V2 Architecture · Fully Operational</div>
              <h1>今天要处理什么？</h1>
              <p>全新架构已完全启用。模块化、组件化、状态管理、路由系统全部就绪。</p>
              <div class="prompt-row">
                <button type="button" id="quick-add-task">添加今日任务</button>
                <button type="button" onclick="window.open('https://github.com/', '_blank')">打开 GitHub</button>
                <button type="button" id="view-bookmarks">查看导航站</button>
              </div>
            </section>

            <article class="widget tasks-widget panel-card">
              <div class="widget-head">
                <div><h2>今日重点</h2><p>清单式留白，信息不挤压。</p></div>
                <button id="clearDoneButton" class="ghost-button small" type="button">Clear done</button>
              </div>
              <form id="taskForm" class="inline-form task-form">
                <input id="taskInput" type="text" placeholder="添加一件推进事项" required />
                <select id="taskPriority" aria-label="优先级">
                  <option value="high">High</option>
                  <option value="normal" selected>Normal</option>
                  <option value="low">Low</option>
                </select>
                <button type="submit">Add</button>
              </form>
              <div id="task-list-container"></div>
            </article>
          </section>

          <aside class="right-rail">
            <article class="widget note-widget panel-card">
              <div class="widget-head">
                <div><h2>随手记</h2><p>轻量记录</p></div>
                <span id="noteSaved" class="mini-pill">未同步</span>
              </div>
              <textarea id="noteBody" placeholder="首页设计方向、交互建议、命令片段..." spellcheck="false"></textarea>
            </article>

            <article class="widget panel-card">
              <div class="widget-head">
                <div><h2>习惯打卡</h2></div>
              </div>
              <div id="habit-tracker-container"></div>
            </article>

            <article class="widget panel-card">
              <div class="widget-head">
                <div><h2>日历</h2></div>
              </div>
              <div id="calendar-container"></div>
            </article>

            <article class="widget panel-card">
              <div class="widget-head">
                <div><h2>天气</h2></div>
              </div>
              <div id="weather-container"></div>
            </article>

            <article class="widget panel-card">
              <div class="widget-head">
                <div><h2>系统状态</h2></div>
              </div>
              <div id="system-status"></div>
            </article>
          </aside>
        </main>
      </div>
    `;

    // 渲染任务列表
    this.renderTaskList();

    // 渲染习惯打卡
    this.renderHabitTracker();

    // 渲染日历
    this.renderCalendar();

    // 渲染天气
    this.renderWeather();

    // 渲染指标
    this.renderMetrics();

    // 渲染系统状态
    this.renderSystemStatus();

    // 渲染笔记
    this.renderNote();

    // 绑定事件
    this.bindEvents();

    // 订阅状态变化
    this.subscribe(store, (state, prevState) => {
      if (state.tasks !== prevState.tasks) {
        this.renderTaskList();
        this.renderMetrics();
      }
      if (state.bookmarks !== prevState.bookmarks) {
        this.renderMetrics();
      }
      if (state.habits !== prevState.habits) {
        this.renderHabitTracker();
        this.renderMetrics();
      }
      if (state.weather !== prevState.weather) {
        this.renderWeather();
      }
      if (state.notes !== prevState.notes) {
        this.renderNote();
      }
    });
  }

  bindEvents() {
    // 任务表单提交
    const taskForm = this.$('#taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddTask();
      });
    }

    // 清空已完成
    const clearBtn = this.$('#clearDoneButton');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClearDone());
    }

    // 快捷添加任务
    const quickAddBtn = this.$('#quick-add-task');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        this.$('#taskInput')?.focus();
      });
    }

    // 查看导航站
    const viewBookmarksBtn = this.$('#view-bookmarks');
    if (viewBookmarksBtn) {
      viewBookmarksBtn.addEventListener('click', () => {
        window.history.pushState(null, '', '/bookmarks');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }

    // 笔记自动保存
    const noteBody = this.$('#noteBody');
    if (noteBody) {
      let saveTimer;
      noteBody.addEventListener('input', (e) => {
        clearTimeout(saveTimer);
        this.updateNoteSaved('保存中...');

        saveTimer = setTimeout(() => {
          this.handleNoteSave(e.target.value);
        }, 650);
      });
    }
  }

  handleAddTask() {
    const input = this.$('#taskInput');
    const priority = this.$('#taskPriority');

    if (!input || !input.value.trim()) return;

    try {
      taskService.add({
        title: input.value.trim(),
        priority: priority?.value || 'normal',
      });

      input.value = '';
      Toast.success('任务已添加');
    } catch (error) {
      Toast.error(error.message);
    }
  }

  handleClearDone() {
    const count = taskService.clearCompleted();
    if (count > 0) {
      Toast.info(`已清理 ${count} 个已完成任务`);
    } else {
      Toast.info('没有已完成的任务');
    }
  }

  handleNoteSave(content) {
    store.setState(state => ({
      ...state,
      notes: {
        ...state.notes,
        body: content,
        updatedAt: new Date().toISOString(),
      }
    }));

    this.updateNoteSaved('已保存');
  }

  updateNoteSaved(text) {
    const saved = this.$('#noteSaved');
    if (saved) {
      saved.textContent = text;
      saved.className = text === '已保存' ? 'mini-pill is-ok' : 'mini-pill';
    }
  }

  renderTaskList() {
    const container = this.$('#task-list-container');
    if (!container) return;

    // 销毁旧的任务列表
    if (this.taskList) {
      this.taskList.destroy();
    }

    const state = store.getState();
    this.taskList = new TaskList({
      tasks: state.tasks || [],
      onToggle: (id) => {
        taskService.toggle(id);
        Toast.success('状态已更新');
      },
      onDelete: (id) => {
        taskService.delete(id);
        Toast.info('任务已删除，按 Ctrl+Z 撤销');
      },
    });

    container.innerHTML = '';
    container.appendChild(this.taskList.render());
  }

  renderMetrics() {
    const state = store.getState();

    const linkMetric = this.$('#linkMetric');
    const taskMetric = this.$('#taskMetric');
    const habitMetric = this.$('#habitMetric');
    const sourceMetric = this.$('#sourceMetric');

    if (linkMetric) linkMetric.textContent = state.bookmarks?.length || 0;
    if (taskMetric) {
      const openTasks = state.tasks?.filter(t => t.status === 'todo').length || 0;
      taskMetric.textContent = openTasks;
    }
    if (habitMetric) habitMetric.textContent = `0/${state.habits?.length || 0}`;
    if (sourceMetric) sourceMetric.textContent = state.sources?.length || 0;
  }

  renderSystemStatus() {
    const status = this.$('#system-status');
    if (!status) return;

    const state = store.getState();
    const stats = taskService.getStats();
    const migrated = localStorage.getItem('yiliu.home.migrated');

    status.innerHTML = `
      <div style="display: grid; gap: 12px; font-size: 13px;">
        <div>
          <strong>架构版本：</strong>
          <span style="color: var(--color-success);">V2.0.0</span>
        </div>
        <div>
          <strong>数据迁移：</strong>
          <span>${migrated === 'v2' ? '✓ 已完成' : '未迁移'}</span>
        </div>
        <div>
          <strong>任务完成率：</strong>
          <span>${stats.completionRate}%</span>
        </div>
        <div>
          <strong>今日完成：</strong>
          <span>${stats.todayCompleted} 个</span>
        </div>
        <div>
          <strong>书签数：</strong>
          <span>${state.bookmarks?.length || 0}</span>
        </div>
        <div>
          <strong>存储大小：</strong>
          <span>${this.getStorageSize()}</span>
        </div>
      </div>
    `;
  }

  renderNote() {
    const noteBody = this.$('#noteBody');
    if (!noteBody) return;

    const state = store.getState();
    const content = state.notes?.body || '';

    if (noteBody.value !== content) {
      noteBody.value = content;
    }

    if (state.notes?.updatedAt) {
      this.updateNoteSaved('已保存');
    }
  }

  renderHabitTracker() {
    const container = this.$('#habit-tracker-container');
    if (!container) return;

    // 销毁旧组件
    if (this.habitTracker) {
      this.habitTracker.destroy();
    }

    const state = store.getState();
    this.habitTracker = new HabitTracker({
      habits: state.habits || [],
      onCheck: (id, checked) => {
        try {
          habitService.check(id, checked);
          Toast.success(checked ? '打卡成功！' : '已取消打卡');
        } catch (error) {
          Toast.error(error.message);
        }
      },
      onAdd: () => {
        this.showAddHabitModal();
      },
      onDelete: (id) => {
        if (confirm('确定删除这个习惯吗？')) {
          habitService.delete(id);
          Toast.info('习惯已删除');
        }
      },
    });

    container.innerHTML = '';
    container.appendChild(this.habitTracker.render());
  }

  renderCalendar() {
    const container = this.$('#calendar-container');
    if (!container) return;

    // 销毁旧组件
    if (this.calendar) {
      this.calendar.destroy();
    }

    const state = store.getState();

    // 获取任务和习惯的事件
    const events = [];

    // 添加有截止日期的任务
    (state.tasks || []).forEach(task => {
      if (task.dueDate) {
        events.push({ date: task.dueDate, type: 'task' });
      }
    });

    // 添加习惯打卡记录
    (state.habits || []).forEach(habit => {
      (habit.history || []).forEach(date => {
        events.push({ date, type: 'habit' });
      });
    });

    this.calendar = new Calendar({
      selectedDate: state.ui?.selectedDate || null,
      events,
      onDateSelect: (date) => {
        store.setState(state => ({
          ...state,
          ui: {
            ...state.ui,
            selectedDate: date.toISOString(),
          },
        }));
        Toast.info(`已选择 ${date.toLocaleDateString()}`);
      },
    });

    container.innerHTML = '';
    container.appendChild(this.calendar.render());
  }

  renderWeather() {
    const container = this.$('#weather-container');
    if (!container) return;

    // 销毁旧组件
    if (this.weather) {
      this.weather.destroy();
    }

    const state = store.getState();
    const weatherData = state.weather;
    const loading = false; // TODO: 添加加载状态
    const error = null;

    this.weather = new Weather({
      weather: weatherData,
      loading,
      error,
      onRefresh: async () => {
        try {
          Toast.info('正在获取天气...');
          await weatherService.fetch('自动');
          Toast.success('天气已更新');
        } catch (error) {
          Toast.error('获取天气失败：' + error.message);
        }
      },
    });

    container.innerHTML = '';
    container.appendChild(this.weather.render());
  }

  showAddHabitModal() {
    const form = document.createElement('form');
    form.innerHTML = `
      <div style="display: grid; gap: 16px;">
        <div>
          <label>习惯名称</label>
          <input type="text" name="title" placeholder="例如：每日阅读" required style="width: 100%; padding: 8px; margin-top: 4px;" />
        </div>
        <div>
          <label>频率</label>
          <select name="frequency" style="width: 100%; padding: 8px; margin-top: 4px;">
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <div>
          <label>描述（可选）</label>
          <textarea name="description" placeholder="添加一些说明..." style="width: 100%; padding: 8px; margin-top: 4px; min-height: 60px;"></textarea>
        </div>
      </div>
    `;

    const footer = document.createElement('div');
    footer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn';
    cancelBtn.textContent = '取消';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = '添加';

    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);

    const modal = new Modal({
      title: '添加习惯',
      content: form,
      footer,
      onClose: () => modal.close(),
    });

    cancelBtn.onclick = () => modal.close();

    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(form);

      try {
        habitService.add({
          title: formData.get('title'),
          frequency: formData.get('frequency'),
          description: formData.get('description'),
        });
        Toast.success('习惯已添加');
        modal.close();
      } catch (error) {
        Toast.error(error.message);
      }
    };

    modal.open();
  }

  getStorageSize() {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return `${(total / 1024).toFixed(2)} KB`;
    } catch {
      return '未知';
    }
  }

  destroy() {
    if (this.taskList) {
      this.taskList.destroy();
      this.taskList = null;
    }
    if (this.habitTracker) {
      this.habitTracker.destroy();
      this.habitTracker = null;
    }
    if (this.calendar) {
      this.calendar.destroy();
      this.calendar = null;
    }
    if (this.weather) {
      this.weather.destroy();
      this.weather = null;
    }
    super.destroy();
  }
}

export default DashboardView;

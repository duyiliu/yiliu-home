import BaseView from './BaseView.js';
import taskService from '../services/taskService.js';
import bookmarkService from '../services/bookmarkService.js';
import habitService from '../services/habitService.js';

/**
 * StatsView - 统计视图
 * 显示各类数据的统计信息和图表
 */
class StatsView extends BaseView {
  constructor(container, params) {
    super(container, params);
  }

  render() {
    const container = document.createElement('div');
    container.className = 'stats-view';

    // 页面标题
    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = '<h1>📊 数据统计</h1>';

    // 统计卡片网格
    const grid = document.createElement('div');
    grid.className = 'stats-grid';

    // 任务统计
    const taskStats = taskService.getStats();
    grid.appendChild(this.createStatsCard('任务统计', [
      { label: '总任务数', value: taskStats.total },
      { label: '已完成', value: taskStats.completed },
      { label: '待办中', value: taskStats.todo },
      { label: '完成率', value: taskStats.completionRate },
    ], '✓'));

    // 书签统计
    const bookmarkStats = bookmarkService.getStats();
    grid.appendChild(this.createStatsCard('书签统计', [
      { label: '总书签数', value: bookmarkStats.total },
      { label: '已置顶', value: bookmarkStats.pinned },
      { label: '分类数', value: bookmarkStats.categories },
    ], '🔖'));

    // 习惯统计
    const habitStats = habitService.getStats();
    grid.appendChild(this.createStatsCard('习惯统计', [
      { label: '总习惯数', value: habitStats.total },
      { label: '今日完成', value: habitStats.completedToday },
      { label: '总打卡数', value: habitStats.totalChecks },
      { label: '最长连续', value: `${habitStats.maxStreak}天` },
    ], '🎯'));

    // 分类统计（书签）
    const categoryChart = this.createCategoryChart();

    // 优先级统计（任务）
    const priorityChart = this.createPriorityChart();

    container.appendChild(header);
    container.appendChild(grid);
    container.appendChild(categoryChart);
    container.appendChild(priorityChart);

    this.container.appendChild(container);
  }

  createStatsCard(title, items, icon) {
    const card = document.createElement('div');
    card.className = 'stats-card';

    const header = document.createElement('div');
    header.className = 'stats-card-header';
    header.innerHTML = `<span class="stats-icon">${icon}</span><h3>${title}</h3>`;

    const list = document.createElement('div');
    list.className = 'stats-list';

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'stats-item';
      row.innerHTML = `
        <span class="stats-label">${item.label}</span>
        <span class="stats-value">${item.value}</span>
      `;
      list.appendChild(row);
    });

    card.appendChild(header);
    card.appendChild(list);

    return card;
  }

  createCategoryChart() {
    const section = document.createElement('div');
    section.className = 'stats-section';

    const header = document.createElement('h2');
    header.textContent = '书签分类分布';
    section.appendChild(header);

    const bookmarks = bookmarkService.getAll();
    const categoryCount = {};

    bookmarks.forEach(b => {
      const cat = b.category || '未分类';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const chart = document.createElement('div');
    chart.className = 'chart-bars';

    const maxCount = Math.max(...Object.values(categoryCount), 1);

    Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = (count / maxCount) * 100;

        const bar = document.createElement('div');
        bar.className = 'chart-bar-item';
        bar.innerHTML = `
          <div class="chart-bar-label">${category}</div>
          <div class="chart-bar-wrapper">
            <div class="chart-bar-fill" style="width: ${percentage}%"></div>
            <span class="chart-bar-value">${count}</span>
          </div>
        `;

        chart.appendChild(bar);
      });

    section.appendChild(chart);
    return section;
  }

  createPriorityChart() {
    const section = document.createElement('div');
    section.className = 'stats-section';

    const header = document.createElement('h2');
    header.textContent = '任务优先级分布';
    section.appendChild(header);

    const tasks = taskService.getAll();
    const priorityCount = {
      high: 0,
      normal: 0,
      low: 0,
    };

    tasks.forEach(t => {
      if (t.status === 'todo') {
        priorityCount[t.priority] = (priorityCount[t.priority] || 0) + 1;
      }
    });

    const chart = document.createElement('div');
    chart.className = 'chart-bars';

    const priorityLabels = {
      high: '高优先级',
      normal: '普通',
      low: '低优先级',
    };

    const maxCount = Math.max(...Object.values(priorityCount), 1);

    Object.entries(priorityCount).forEach(([priority, count]) => {
      const percentage = (count / maxCount) * 100;

      const bar = document.createElement('div');
      bar.className = 'chart-bar-item';
      bar.innerHTML = `
        <div class="chart-bar-label">${priorityLabels[priority]}</div>
        <div class="chart-bar-wrapper">
          <div class="chart-bar-fill priority-${priority}" style="width: ${percentage}%"></div>
          <span class="chart-bar-value">${count}</span>
        </div>
      `;

      chart.appendChild(bar);
    });

    section.appendChild(chart);
    return section;
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    super.destroy();
  }
}

export default StatsView;

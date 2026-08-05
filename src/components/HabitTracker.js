import Component from './base/Component.js';

/**
 * HabitTracker 习惯打卡组件
 * 显示习惯列表和打卡历史
 */
class HabitTracker extends Component {
  render() {
    const { habits = [], onCheck, onAdd, onDelete } = this.props;

    const container = this.createElement('div', { className: 'habit-tracker' });

    // 标题和添加按钮
    const header = this.createElement('div', { className: 'habit-header' },
      this.createElement('h3', {}, '习惯打卡'),
      this.createElement('button', {
        className: 'btn btn-primary btn-sm',
        onclick: onAdd,
      }, '+ 添加习惯')
    );

    // 习惯列表
    const list = this.createElement('div', { className: 'habit-list' });

    if (habits.length === 0) {
      list.appendChild(
        this.createElement('div', { className: 'empty-state' },
          this.createElement('p', {}, '还没有习惯，点击上方按钮添加吧！')
        )
      );
    } else {
      habits.forEach(habit => {
        const item = this.createHabitItem(habit, onCheck, onDelete);
        list.appendChild(item);
      });
    }

    container.appendChild(header);
    container.appendChild(list);

    return container;
  }

  createHabitItem(habit, onCheck, onDelete) {
    const { id, title, frequency, history = [], streak = 0 } = habit;

    const today = new Date().toDateString();
    const isCheckedToday = history.some(date =>
      new Date(date).toDateString() === today
    );

    const item = this.createElement('div', { className: 'habit-item' });

    // 左侧：复选框和标题
    const left = this.createElement('div', { className: 'habit-left' },
      this.createElement('input', {
        type: 'checkbox',
        checked: isCheckedToday,
        onchange: (e) => onCheck(id, e.target.checked),
      }),
      this.createElement('div', { className: 'habit-info' },
        this.createElement('div', { className: 'habit-title' }, title),
        this.createElement('div', { className: 'habit-frequency' },
          this.getFrequencyText(frequency)
        )
      )
    );

    // 右侧：连续天数和删除按钮
    const right = this.createElement('div', { className: 'habit-right' },
      this.createElement('div', { className: 'habit-streak' },
        this.createElement('span', { className: 'streak-number' }, streak),
        this.createElement('span', { className: 'streak-label' }, '天')
      ),
      this.createElement('button', {
        className: 'btn-icon btn-delete',
        onclick: () => onDelete(id),
        title: '删除习惯',
      }, '🗑️')
    );

    // 打卡历史（最近7天）
    const historyBar = this.createHistoryBar(history);

    item.appendChild(left);
    item.appendChild(right);
    item.appendChild(historyBar);

    return item;
  }

  createHistoryBar(history) {
    const bar = this.createElement('div', { className: 'habit-history' });

    // 最近7天
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dateStr = date.toDateString();
      const isChecked = history.some(h =>
        new Date(h).toDateString() === dateStr
      );

      const dot = this.createElement('div', {
        className: `history-dot ${isChecked ? 'checked' : ''}`,
        title: this.formatDate(date),
      });

      bar.appendChild(dot);
    }

    return bar;
  }

  getFrequencyText(frequency) {
    const map = {
      'daily': '每天',
      'weekly': '每周',
      'custom': '自定义',
    };
    return map[frequency] || frequency;
  }

  formatDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
}

export default HabitTracker;

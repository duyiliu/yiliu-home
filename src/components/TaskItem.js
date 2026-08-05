/**
 * 任务项组件
 */

import Component from './base/Component.js';

class TaskItem extends Component {
  render() {
    const { task, onToggle, onDelete } = this.props;

    this.el = this.createElement(
      'label',
      {
        className: `task-item ${task.status === 'done' ? 'is-done' : ''}`,
        dataset: { id: task.id },
      },

      // Checkbox
      this.createElement('input', {
        type: 'checkbox',
        checked: task.status === 'done',
        onChange: (e) => {
          e.stopPropagation();
          onToggle?.(task.id);
        },
      }),

      // Title
      this.createElement('span', { className: 'task-title' }, task.title),

      // Priority tag
      this.createElement(
        'em',
        { className: `priority-tag is-${task.priority}` },
        this.getPriorityText(task.priority)
      ),

      // Delete button
      this.createElement(
        'button',
        {
          type: 'button',
          className: 'delete-badge',
          'aria-label': '删除',
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.(task.id);
          },
        },
        '×'
      )
    );

    return this.el;
  }

  getPriorityText(priority) {
    const map = {
      high: '高优先级',
      normal: '中优先级',
      low: '低优先级',
    };
    return map[priority] || '普通';
  }
}

export default TaskItem;

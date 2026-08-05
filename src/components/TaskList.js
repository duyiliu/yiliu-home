/**
 * 任务列表组件
 */

import Component from './base/Component.js';
import TaskItem from './TaskItem.js';

class TaskList extends Component {
  render() {
    const { tasks = [], onToggle, onDelete } = this.props;

    // 清空旧的子组件
    this.children.forEach(child => child.destroy?.());
    this.children = [];

    // 创建容器
    this.el = this.createElement('div', { className: 'task-list' });

    if (tasks.length === 0) {
      this.el.className = 'task-list empty-state';
      this.el.textContent = '还没有待办事项';
      return this.el;
    }

    // 排序：高优先级 > 普通 > 低优先级，未完成在前
    const sorted = [...tasks].sort((a, b) => {
      // 未完成的在前
      if (a.status !== b.status) {
        return a.status === 'todo' ? -1 : 1;
      }

      // 优先级排序
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // 渲染任务项
    sorted.forEach(task => {
      const item = new TaskItem({
        task,
        onToggle,
        onDelete,
      });

      this.children.push(item);
      this.el.appendChild(item.render());
    });

    return this.el;
  }
}

export default TaskList;

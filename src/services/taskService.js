/**
 * 任务管理服务
 */

import store from '../store.js';
import { generateId, validateTask } from '../utils/helpers.js';

const taskService = {
  /**
   * 获取所有任务
   */
  getAll() {
    return store.getState().tasks;
  },

  /**
   * 获取单个任务
   */
  getById(id) {
    return store.getState().tasks.find(t => t.id === id);
  },

  /**
   * 添加任务
   */
  add(taskData) {
    // 验证数据
    const errors = validateTask(taskData);
    if (errors.length > 0) {
      throw new Error(`验证失败: ${errors.join(', ')}`);
    }

    const newTask = {
      id: generateId(),
      title: taskData.title.trim(),
      priority: taskData.priority || 'normal',
      status: 'todo',
      dueDate: taskData.dueDate || null,
      tags: taskData.tags || [],
      sortOrder: Date.now(),
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    store.setState(state => ({
      ...state,
      tasks: [...state.tasks, newTask],
    }));

    return newTask;
  },

  /**
   * 更新任务
   */
  update(id, updates) {
    const task = this.getById(id);
    if (!task) {
      throw new Error(`任务不存在: ${id}`);
    }

    store.setState(state => ({
      ...state,
      tasks: state.tasks.map(t =>
        t.id === id
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      ),
    }));

    return this.getById(id);
  },

  /**
   * 切换任务状态
   */
  toggle(id) {
    const task = this.getById(id);
    if (!task) return null;

    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    const completedAt = newStatus === 'done' ? new Date().toISOString() : null;

    return this.update(id, { status: newStatus, completedAt });
  },

  /**
   * 删除任务
   */
  delete(id) {
    const task = this.getById(id);
    if (!task) return;

    // 保存到撤销栈
    this._pushToUndoStack({ type: 'deleteTask', data: task });

    store.setState(state => ({
      ...state,
      tasks: state.tasks.filter(t => t.id !== id),
    }));
  },

  /**
   * 批量删除已完成任务
   */
  clearCompleted() {
    const completed = this.getAll().filter(t => t.status === 'done');

    store.setState(state => ({
      ...state,
      tasks: state.tasks.filter(t => t.status !== 'done'),
    }));

    return completed.length;
  },

  /**
   * 获取统计数据
   */
  getStats() {
    const tasks = this.getAll();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const todo = total - completed;

    // 今日完成数
    const today = new Date().toDateString();
    const todayCompleted = tasks.filter(t =>
      t.status === 'done' &&
      t.completedAt &&
      new Date(t.completedAt).toDateString() === today
    ).length;

    // 过期任务数
    const now = new Date();
    const overdue = tasks.filter(t =>
      t.status === 'todo' &&
      t.dueDate &&
      new Date(t.dueDate) < now
    ).length;

    return {
      total,
      completed,
      todo,
      todayCompleted,
      overdue,
      completionRate: total > 0 ? (completed / total * 100).toFixed(1) : 0,
    };
  },

  /**
   * 搜索任务
   */
  search(query) {
    if (!query) return this.getAll();

    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      task.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * 保存到撤销栈
   */
  _pushToUndoStack(action) {
    store.setState(state => ({
      ...state,
      undoStack: [...(state.undoStack || []), {
        ...action,
        timestamp: Date.now(),
      }].slice(-20), // 只保留最近 20 条
    }));
  },
};

export default taskService;

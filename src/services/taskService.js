/**
 * 任务管理服务 — 查询统计（同步，读 store）+ CRUD（异步，API 成功后才更新 store）
 */
import store from '../store.js';
import { generateId, validateTask } from '../utils/helpers.js';
import { apiCall, toServerTask } from './apiClient.js';

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
    return store.getState().tasks.find((t) => t.id === id);
  },

  /**
   * 添加任务（API 成功后才提交 store）
   */
  async add(taskData) {
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

    const json = await apiCall('POST', '/api/tasks', toServerTask(newTask));
    const created = { ...newTask, id: json.data.id };
    store.setState((state) => ({
      ...state,
      tasks: [...state.tasks, created],
    }));
    return created;
  },

  /**
   * 更新任务（API 成功后才提交 store）
   */
  async update(id, updates) {
    const task = this.getById(id);
    if (!task) {
      throw new Error(`任务不存在: ${id}`);
    }

    const next = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await apiCall('PUT', `/api/tasks/${id}`, toServerTask(next));
    store.setState((state) => ({
      ...state,
      tasks: state.tasks.map((t) => (t.id === id ? next : t)),
    }));
    return this.getById(id);
  },

  /**
   * 切换任务状态
   */
  async toggle(id) {
    const task = this.getById(id);
    if (!task) return null;

    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    const completedAt = newStatus === 'done' ? new Date().toISOString() : null;

    return this.update(id, { status: newStatus, completedAt });
  },

  /**
   * 删除任务
   */
  async delete(id) {
    const task = this.getById(id);
    if (!task) return;

    await apiCall('DELETE', `/api/tasks/${id}`);
    store.setState((state) => ({
      ...state,
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  /**
   * 批量删除已完成任务
   */
  async clearCompleted() {
    const completed = this.getAll().filter((t) => t.status === 'done');

    await Promise.all(completed.map((t) => apiCall('DELETE', `/api/tasks/${t.id}`)));
    store.setState((state) => ({
      ...state,
      tasks: state.tasks.filter((t) => t.status !== 'done'),
    }));

    return completed.length;
  },

  /**
   * 获取统计数据
   */
  getStats() {
    const tasks = this.getAll();
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const todo = total - completed;

    // 今日完成数
    const today = new Date().toDateString();
    const todayCompleted = tasks.filter((t) =>
      t.status === 'done' &&
      t.completedAt &&
      new Date(t.completedAt).toDateString() === today
    ).length;

    // 过期任务数
    const now = new Date();
    const overdue = tasks.filter((t) =>
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
    return this.getAll().filter((task) =>
      task.title.toLowerCase().includes(lowerQuery) ||
      task.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },
};

export default taskService;
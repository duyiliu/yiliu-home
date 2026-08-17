/**
 * HabitService - 习惯管理服务
 *
 * 查询统计同步读 store；CRUD/打卡异步，API 成功后才更新 store。
 * 打卡后 history/streak 以服务端响应为准（streak 由服务端计算）。
 */
import store from '../store.js';
import { generateId } from '../utils/helpers.js';
import { apiCall, toServerHabit } from './apiClient.js';

const habitService = {
  /**
   * 获取所有习惯
   */
  getAll() {
    const state = store.getState();
    return state.habits || [];
  },

  /**
   * 根据 ID 获取习惯
   */
  getById(id) {
    const habits = this.getAll();
    return habits.find((h) => h.id === id);
  },

  /**
   * 添加习惯（API 成功后才提交 store）
   */
  async add(habitData) {
    const { title, frequency = 'daily', description } = habitData;

    if (!title || !title.trim()) {
      throw new Error('习惯名称不能为空');
    }

    const newHabit = {
      id: generateId(),
      title: title.trim(),
      description: description?.trim() || '',
      frequency,
      history: [],
      streak: 0,
      createdAt: new Date().toISOString(),
    };

    const json = await apiCall('POST', '/api/habits', toServerHabit(newHabit));
    const created = { ...newHabit, id: json.data.id };
    store.setState((state) => ({
      ...state,
      habits: [...(state.habits || []), created],
    }));
    return created;
  },

  /**
   * 更新习惯（API 成功后才提交 store）
   */
  async update(id, updates) {
    const habits = this.getAll();
    const index = habits.findIndex((h) => h.id === id);

    if (index === -1) {
      throw new Error('习惯不存在');
    }

    const next = {
      ...habits[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await apiCall('PUT', `/api/habits/${id}`, toServerHabit(next));
    store.setState((state) => ({
      ...state,
      habits: state.habits.map((h) => (h.id === id ? next : h)),
    }));
    return next;
  },

  /**
   * 删除习惯（API 成功后才提交 store）
   */
  async delete(id) {
    await apiCall('DELETE', `/api/habits/${id}`);
    store.setState((state) => ({
      ...state,
      habits: state.habits.filter((h) => h.id !== id),
    }));
  },

  /**
   * 打卡/取消打卡：提交服务端，history/streak 以服务端响应为准
   */
  async check(id, checked) {
    const habit = this.getById(id);
    if (!habit) {
      throw new Error('习惯不存在');
    }

    const json = await apiCall('POST', `/api/habits/${id}/check`, { checked: !!checked });
    const server = json.data || {};
    const history = Array.isArray(server.history)
      ? server.history
      : toggleToday(habit.history, checked);
    const streak = typeof server.streak === 'number'
      ? server.streak
      : this.calculateStreak(history);

    const next = {
      ...habit,
      history,
      streak,
      updatedAt: new Date().toISOString(),
    };
    store.setState((state) => ({
      ...state,
      habits: state.habits.map((h) => (h.id === id ? next : h)),
    }));
    return next;
  },

  /**
   * 计算连续天数（服务端未返回 streak 时的本地兜底）
   */
  calculateStreak(history) {
    if (history.length === 0) return 0;

    // 按日期排序
    const sorted = history
      .map((date) => new Date(date))
      .sort((a, b) => b - a);

    // 检查是否包含今天
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = new Date(sorted[0]);
    lastDate.setHours(0, 0, 0, 0);

    // 如果最后一次打卡不是今天或昨天，连续天数为 0
    const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 1) return 0;

    // 计算连续天数
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const current = new Date(sorted[i]);
      current.setHours(0, 0, 0, 0);

      const prev = new Date(sorted[i - 1]);
      prev.setHours(0, 0, 0, 0);

      const diff = Math.floor((prev - current) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  },

  /**
   * 获取统计信息
   */
  getStats() {
    const habits = this.getAll();

    const total = habits.length;
    const totalChecks = habits.reduce((sum, h) => sum + h.history.length, 0);
    const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

    // 今天完成的习惯数
    const today = new Date().toDateString();
    const completedToday = habits.filter((h) =>
      h.history.some((date) => new Date(date).toDateString() === today)
    ).length;

    return {
      total,
      totalChecks,
      maxStreak,
      completedToday,
    };
  },
};

/** 本地兜底：按日期增删今天的打卡记录 */
function toggleToday(history, checked) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const todayStr = today.toISOString();

  if (checked) {
    const exists = history.some((date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === todayTime;
    });
    return exists ? history : [...history, todayStr];
  }
  return history.filter((date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() !== todayTime;
  });
}

export default habitService;
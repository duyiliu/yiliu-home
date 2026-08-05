import store from '../store.js';
import { generateId } from '../utils/helpers.js';

/**
 * HabitService - 习惯管理服务
 */
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
    return habits.find(h => h.id === id);
  },

  /**
   * 添加习惯
   */
  add(habitData) {
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

    store.setState(state => ({
      ...state,
      habits: [...(state.habits || []), newHabit],
    }));

    return newHabit;
  },

  /**
   * 更新习惯
   */
  update(id, updates) {
    const habits = this.getAll();
    const index = habits.findIndex(h => h.id === id);

    if (index === -1) {
      throw new Error('习惯不存在');
    }

    const updatedHabits = [...habits];
    updatedHabits[index] = {
      ...updatedHabits[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    store.setState(state => ({
      ...state,
      habits: updatedHabits,
    }));

    return updatedHabits[index];
  },

  /**
   * 删除习惯
   */
  delete(id) {
    const habits = this.getAll();
    const filtered = habits.filter(h => h.id !== id);

    store.setState(state => ({
      ...state,
      habits: filtered,
    }));
  },

  /**
   * 打卡/取消打卡
   */
  check(id, checked) {
    const habit = this.getById(id);
    if (!habit) {
      throw new Error('习惯不存在');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    let newHistory = [...habit.history];

    if (checked) {
      // 添加打卡记录（避免重复）
      if (!newHistory.some(date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      })) {
        newHistory.push(todayStr);
      }
    } else {
      // 移除今天的打卡记录
      newHistory = newHistory.filter(date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() !== today.getTime();
      });
    }

    // 计算连续天数
    const streak = this.calculateStreak(newHistory);

    this.update(id, {
      history: newHistory,
      streak,
    });
  },

  /**
   * 计算连续天数
   */
  calculateStreak(history) {
    if (history.length === 0) return 0;

    // 按日期排序
    const sorted = history
      .map(date => new Date(date))
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
    const completedToday = habits.filter(h =>
      h.history.some(date => new Date(date).toDateString() === today)
    ).length;

    return {
      total,
      totalChecks,
      maxStreak,
      completedToday,
    };
  },
};

export default habitService;

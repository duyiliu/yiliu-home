import store from '../store.js';

/**
 * SearchService - 全局搜索服务
 * 支持搜索任务、书签、习惯等
 */
const searchService = {
  /**
   * 全局搜索
   */
  search(query) {
    if (!query || !query.trim()) {
      return {
        tasks: [],
        bookmarks: [],
        habits: [],
        total: 0,
      };
    }

    const state = store.getState();
    const lowerQuery = query.toLowerCase().trim();

    // 搜索任务
    const tasks = (state.tasks || []).filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery) ||
      task.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    // 搜索书签
    const bookmarks = (state.bookmarks || []).filter(bookmark =>
      bookmark.title.toLowerCase().includes(lowerQuery) ||
      bookmark.url.toLowerCase().includes(lowerQuery) ||
      bookmark.description?.toLowerCase().includes(lowerQuery) ||
      bookmark.category?.toLowerCase().includes(lowerQuery) ||
      bookmark.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    // 搜索习惯
    const habits = (state.habits || []).filter(habit =>
      habit.title.toLowerCase().includes(lowerQuery) ||
      habit.description?.toLowerCase().includes(lowerQuery)
    );

    return {
      tasks,
      bookmarks,
      habits,
      total: tasks.length + bookmarks.length + habits.length,
    };
  },

  /**
   * 搜索任务
   */
  searchTasks(query) {
    const state = store.getState();
    const lowerQuery = query.toLowerCase().trim();

    return (state.tasks || []).filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery) ||
      task.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * 搜索书签
   */
  searchBookmarks(query) {
    const state = store.getState();
    const lowerQuery = query.toLowerCase().trim();

    return (state.bookmarks || []).filter(bookmark =>
      bookmark.title.toLowerCase().includes(lowerQuery) ||
      bookmark.url.toLowerCase().includes(lowerQuery) ||
      bookmark.description?.toLowerCase().includes(lowerQuery) ||
      bookmark.category?.toLowerCase().includes(lowerQuery) ||
      bookmark.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * 搜索习惯
   */
  searchHabits(query) {
    const state = store.getState();
    const lowerQuery = query.toLowerCase().trim();

    return (state.habits || []).filter(habit =>
      habit.title.toLowerCase().includes(lowerQuery) ||
      habit.description?.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * 获取搜索建议（基于历史数据）
   */
  getSuggestions(query, limit = 5) {
    const results = this.search(query);

    // 合并所有结果并取前 N 个
    const all = [
      ...results.tasks.map(t => ({ type: 'task', title: t.title, id: t.id })),
      ...results.bookmarks.map(b => ({ type: 'bookmark', title: b.title, id: b.id })),
      ...results.habits.map(h => ({ type: 'habit', title: h.title, id: h.id })),
    ];

    return all.slice(0, limit);
  },
};

export default searchService;

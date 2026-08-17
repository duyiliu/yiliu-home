/**
 * 笔记服务 — 单笔记读写
 *
 * store.notes 为单个对象（scratch note）；save 异步 PUT /api/note，
 * API 成功后以服务端返回更新 store。
 */
import store from '../store.js';
import { apiCall, toLocalNote, toServerNote } from './apiClient.js';

const noteService = {
  /**
   * 获取当前笔记
   */
  get() {
    return store.getState().notes;
  },

  /**
   * 保存笔记（API 成功后才提交 store）
   */
  async save(note) {
    const json = await apiCall('PUT', '/api/note', toServerNote(note));
    const saved = json.data ? toLocalNote(json.data) : { ...note, updatedAt: new Date().toISOString() };
    store.setState((state) => ({
      ...state,
      notes: saved,
    }));
    return saved;
  },
};

export default noteService;
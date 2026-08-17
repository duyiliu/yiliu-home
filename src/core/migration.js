/**
 * 数据迁移脚本
 * 从 V1 (旧版) 迁移到 V2 (新架构)
 */

import store from '../store.js';
import { generateId } from '../utils/helpers.js';

/**
 * 迁移入口函数
 */
export function migrateData() {
  // 检查是否已迁移
  const migrated = localStorage.getItem('yiliu.home.migrated');
  if (migrated === 'v2') {
    console.log('[Migration] Already migrated to v2');
    return false;
  }

  console.log('[Migration] Starting data migration from v1 to v2...');

  try {
    // 加载旧数据
    const oldData = loadOldData();

    if (!oldData) {
      console.log('[Migration] No old data found, using defaults');
      markAsMigrated();
      return false;
    }

    // 转换数据
    const newData = transformData(oldData);
    queueLinksForImport(oldData.links);

    // 保存到新 store
    store.setState(state => ({
      ...state,
      ...newData,
      meta: {
        ...state.meta,
        migratedFrom: 'v1',
        migratedAt: new Date().toISOString(),
      }
    }));

    // 备份旧数据
    backupOldData(oldData);

    // 标记已迁移
    markAsMigrated();

    console.log('[Migration] Migration completed successfully');
    return true;

  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    return false;
  }
}

/**
 * 加载旧数据
 */
function loadOldData() {
  const oldKey = 'yiliu.home.data';
  const oldDataStr = localStorage.getItem(oldKey);

  if (!oldDataStr) return null;

  try {
    return JSON.parse(oldDataStr);
  } catch (error) {
    console.error('[Migration] Failed to parse old data:', error);
    return null;
  }
}

/**
 * 转换数据结构
 */
function transformData(oldData) {
  const newData = {
    bookmarks: [],
    tasks: [],
    habits: [],
    sources: [],
    notes: null,
  };

  // 转换 links -> bookmarks
  if (Array.isArray(oldData.links)) {
    newData.bookmarks = oldData.links.map(link => ({
      id: link.id || generateId(),
      title: link.title,
      url: link.url,
      category: link.category || '常用',
      description: link.description || '',
      favicon: link.favicon || '',
      tags: [],
      isPinned: false,
      sortOrder: link.sort_order || 0,
      createdAt: link.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  // 转换 tasks（字段基本一致）
  if (Array.isArray(oldData.tasks)) {
    newData.tasks = oldData.tasks.map(task => ({
      id: task.id || generateId(),
      title: task.title,
      priority: task.priority || 'normal',
      status: task.done ? 'done' : 'todo',
      dueDate: task.due_date || null,
      tags: task.tags || [],
      sortOrder: task.sort_order || 0,
      createdAt: task.created_at || new Date().toISOString(),
      completedAt: task.completed_at || null,
    }));
  }

  // 转换 habits（字段基本一致）
  if (Array.isArray(oldData.habits)) {
    newData.habits = oldData.habits.map(habit => ({
      id: habit.id || generateId(),
      title: habit.title,
      description: habit.description || '',
      frequency: 'daily',
      history: habit.history || [],
      streak: habit.streak || 0,
      createdAt: habit.created_at || new Date().toISOString(),
    }));
  }

  // 转换 sources（字段基本一致）
  if (Array.isArray(oldData.sources)) {
    newData.sources = oldData.sources;
  }

  // 转换 note
  if (oldData.note) {
    newData.notes = oldData.note;
  }

  return newData;
}

/**
 * 备份旧数据
 */
function backupOldData(oldData) {
  const backupKey = 'yiliu.home.data.v1.backup';
  const backup = {
    data: oldData,
    backupAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(backupKey, JSON.stringify(backup));
    console.log('[Migration] Old data backed up successfully');
  } catch (error) {
    console.error('[Migration] Failed to backup old data:', error);
  }
}

/**
 * 标记已迁移
 */
function markAsMigrated() {
  localStorage.setItem('yiliu.home.migrated', 'v2');
}

/**
 * 把 V1 links 暂存为待导入队列（登录后由 bookmarkService 幂等导入服务端）
 * 已导入成功的队列会由 bookmarkService 清除，避免重复导入
 */
export const LINKS_PENDING_KEY = 'yiliu.home.links.pending';

export function queueLinksForImport(links) {
  if (!Array.isArray(links) || links.length === 0) return;
  try {
    const pending = links
      .filter((l) => l && l.url)
      .map((l) => ({
        name: l.title || l.name || '',
        url: l.url,
        grp: l.category || l.grp || '常用',
      }));
    if (pending.length > 0) {
      localStorage.setItem(LINKS_PENDING_KEY, JSON.stringify(pending));
    }
  } catch (error) {
    console.error('[Migration] Failed to queue links for import:', error);
  }
}

/**
 * 读取待导入队列（不移除）
 */
export function getPendingLinks() {
  try {
    return JSON.parse(localStorage.getItem(LINKS_PENDING_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * 清除待导入队列（导入成功后调用）
 */
export function clearPendingLinks() {
  localStorage.removeItem(LINKS_PENDING_KEY);
}

/**
 * 保留仍需重试的导入项；空数组表示全部导入成功。
 */
export function replacePendingLinks(links) {
  if (!Array.isArray(links) || links.length === 0) {
    clearPendingLinks();
    return;
  }
  localStorage.setItem(LINKS_PENDING_KEY, JSON.stringify(links));
}

/**
 * 统一 API 客户端 — 认证、HTTP 调用、bootstrap 全量拉取与 snake_case/camelCase 映射
 *
 * - token 统一存 sessionStorage（key: yiliu.home.v2.token），不使用 localStorage
 * - apiCall 自动附加 Bearer；401 时清除 token 并派发认证失效事件（window 事件，
 *   app 层可监听 AUTH_EXPIRED_EVENT 做跳转/提示）
 * - bootstrap 拉取 /api/bootstrap，把服务端 snake_case 映射为 store 的
 *   camelCase bookmarks/tasks/habits/notes，并一次性 store.setState
 */
import store from '../store.js';

const API_BASE = typeof window !== 'undefined' && window.YILIU_API_BASE ? window.YILIU_API_BASE : '';
const TOKEN_KEY = 'yiliu.home.v2.token';

/** 认证失效事件名（401 时在 window 上派发） */
export const AUTH_EXPIRED_EVENT = 'yiliu:auth-expired';

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

// ---------- 认证 ----------

/**
 * 密码登录，成功换取 token
 */
export async function login(password) {
  const res = await fetch(`${API_BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.status === 403) throw new Error('密码不对');
  if (!res.ok) throw new Error(`登录失败（${res.status}）`);
  const json = await res.json();
  if (json.code !== 0) throw new Error('登录失败');
  setToken(json.data.token);
  return json.data.token;
}

/**
 * 退出登录，清除 token
 */
export function logout() {
  setToken('');
  store.setState((state) => ({
    ...state,
    ui: { ...state.ui, syncStatus: 'idle' },
  }));
}

/**
 * 是否已持有 token（是否已登录）
 */
export function isLoggedIn() {
  return !!getToken();
}

// ---------- HTTP 调用 ----------

/**
 * 统一请求：自动 Bearer；401 清 token 并派发认证失效事件
 */
export async function apiCall(method, path, body) {
  const token = getToken();
  if (!token) throw new Error('未登录，请先同步');
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    setToken('');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { method, path } }));
    }
    throw new Error('登录已过期，请重新登录');
  }
  if (!res.ok) {
    // 服务端 FastAPI 错误响应为 {"detail": "..."}
    const detail = await res.json().then((j) => j.detail).catch(() => '');
    throw new Error(detail || `${method} ${path} 失败（${res.status}）`);
  }
  return res.json();
}

// ---------- 模型映射（API snake_case <-> store camelCase） ----------

function faviconFor(url) {
  try {
    return `https://www.google.com/s2/favicons?sz=32&domain=${new URL(url).hostname}`;
  } catch {
    return '';
  }
}

/** 书签：API 行 -> 本地模型 */
export function toLocalBookmark(serverBm) {
  return {
    id: serverBm.id,
    title: serverBm.name,
    url: serverBm.url,
    category: serverBm.grp || '常用',
    description: serverBm.description || '',
    favicon: serverBm.icon || faviconFor(serverBm.url),
    tags: Array.isArray(serverBm.tags) ? serverBm.tags : [],
    isPinned: !!serverBm.is_pinned,
    sortOrder: serverBm.sort || 0,
    isCustom: !!serverBm.is_custom,
    createdAt: serverBm.created || new Date().toISOString(),
    updatedAt: serverBm.updated || new Date().toISOString(),
  };
}

/** 书签：本地模型 -> API 负载 */
export function toServerBookmark(localBm) {
  return {
    name: localBm.title,
    url: localBm.url,
    grp: localBm.category || '常用',
    icon: localBm.favicon || '',
    description: localBm.description || '',
    tags: localBm.tags || [],
    is_pinned: !!localBm.isPinned,
    sort: localBm.sortOrder || 0,
  };
}

/** 任务：API 行 -> 本地模型 */
export function toLocalTask(serverTask) {
  return {
    id: serverTask.id,
    title: serverTask.title,
    priority: serverTask.priority || 'normal',
    status: serverTask.status || 'todo',
    dueDate: serverTask.due_date || null,
    tags: Array.isArray(serverTask.tags) ? serverTask.tags : [],
    sortOrder: serverTask.sort_order || 0,
    createdAt: serverTask.created_at || new Date().toISOString(),
    completedAt: serverTask.completed_at || null,
    updatedAt: serverTask.updated_at || new Date().toISOString(),
  };
}

/** 任务：本地模型 -> API 负载 */
export function toServerTask(localTask) {
  return {
    title: localTask.title,
    priority: localTask.priority,
    status: localTask.status,
    due_date: localTask.dueDate || null,
    tags: localTask.tags || [],
    sort_order: localTask.sortOrder || 0,
  };
}

/** 习惯：API 行 -> 本地模型 */
export function toLocalHabit(serverHabit) {
  return {
    id: serverHabit.id,
    title: serverHabit.title,
    description: serverHabit.description || '',
    frequency: serverHabit.frequency || 'daily',
    history: Array.isArray(serverHabit.history) ? serverHabit.history : [],
    streak: serverHabit.streak || 0,
    createdAt: serverHabit.created || new Date().toISOString(),
    updatedAt: serverHabit.updated || new Date().toISOString(),
  };
}

/** 习惯：本地模型 -> API 负载 */
export function toServerHabit(localHabit) {
  return {
    title: localHabit.title,
    description: localHabit.description || '',
    frequency: localHabit.frequency || 'daily',
  };
}

/** 笔记：API 行 -> 本地模型（store.notes 为单个对象） */
export function toLocalNote(serverNote) {
  return {
    id: 'scratch-note',
    kind: 'scratch',
    title: '草稿',
    body: serverNote.content || '',
    updatedAt: serverNote.updated_at || new Date().toISOString(),
  };
}

/** 笔记：本地模型 -> API 负载 */
export function toServerNote(localNote) {
  return {
    content: localNote.body || '',
  };
}

// ---------- bootstrap 全量拉取 ----------

/**
 * 从 /api/bootstrap 全量拉取，snake_case -> camelCase 后一次写入 store
 */
export async function bootstrap() {
  const json = await apiCall('GET', '/api/bootstrap');
  const data = json.data || {};
  const bookmarks = (data.bookmarks || []).map(toLocalBookmark);
  const tasks = (data.tasks || []).map(toLocalTask);
  const habits = (data.habits || []).map(toLocalHabit);
  const notes = data.note ? toLocalNote(data.note) : store.getState().notes;

  store.setState((state) => ({
    ...state,
    bookmarks,
    tasks,
    habits,
    notes,
    ui: { ...state.ui, syncStatus: 'online' },
    meta: { ...state.meta, lastSync: json.updated_at || new Date().toISOString() },
  }));

  return { bookmarks, tasks, habits, notes };
}

/**
 * 兼容旧接口：全量拉取后返回书签列表
 */
export async function fetchAll() {
  const result = await bootstrap();
  return result.bookmarks;
}
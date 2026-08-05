/**
 * 工具函数
 */

/**
 * 生成唯一 ID
 */
export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 标准化 URL
 */
export function normalizeUrl(url) {
  const trimmed = url.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * 判断是否为 URL
 */
export function isUrl(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
         /^(localhost|\d{1,3}(\.\d{1,3}){3}|[\w-]+\.[\w.-]+)/i.test(value);
}

/**
 * 获取 Favicon URL
 */
export async function getFaviconUrl(url) {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return `https://www.google.com/s2/favicons?sz=32&domain=${urlObj.hostname}`;
  } catch {
    return '';
  }
}

/**
 * 转义 HTML
 */
export function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * 防抖
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流
 */
export function throttle(fn, delay = 300) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 格式化日期
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 获取相对时间
 */
export function getRelativeTime(date) {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diff = now - target;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < week) return `${Math.floor(diff / day)} 天前`;
  if (diff < month) return `${Math.floor(diff / week)} 周前`;
  if (diff < year) return `${Math.floor(diff / month)} 个月前`;
  return `${Math.floor(diff / year)} 年前`;
}

/**
 * 验证任务数据
 */
export function validateTask(data) {
  const errors = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('任务标题不能为空');
  }

  if (data.title && data.title.length > 200) {
    errors.push('任务标题过长（最多200字符）');
  }

  if (data.priority && !['high', 'normal', 'low'].includes(data.priority)) {
    errors.push('无效的优先级');
  }

  return errors;
}

/**
 * 验证书签数据
 */
export function validateBookmark(data) {
  const errors = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('书签标题不能为空');
  }

  if (!data.url || data.url.trim().length === 0) {
    errors.push('书签 URL 不能为空');
  }

  if (data.url && !isUrl(data.url)) {
    errors.push('无效的 URL 格式');
  }

  return errors;
}

/**
 * 本地存储封装
 */
export const storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('[Storage] Failed to save:', error);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },
};

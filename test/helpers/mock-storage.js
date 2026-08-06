/**
 * 内存版 localStorage / sessionStorage + window mock
 *
 * 必须在 import 任何（直接或间接）依赖全局 localStorage / window 的业务模块之前
 * 先 import 本文件：ES Module 的兄弟 import 按声明顺序求值，因此把它放在测试文件
 * 的第一个 import 即可保证全局注入先于业务模块顶层代码执行。
 */
function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    },
    get length() {
      return data.size;
    },
  };
}

export const memoryStorage = createMemoryStorage();
export const memorySessionStorage = createMemoryStorage();

/** 清空两个 mock 存储（各测试文件的 beforeEach 调用） */
export function resetStorages() {
  memoryStorage.clear();
  memorySessionStorage.clear();
}

// 全局注入（store.js 顶层会读 window.location.hostname，bookmarkService 顶层会读 window.YILIU_API_BASE）
globalThis.localStorage = memoryStorage;
globalThis.sessionStorage = memorySessionStorage;
globalThis.window = {
  location: { hostname: 'test.local', hash: '', search: '' },
  history: { replaceState() {}, back() {} },
  addEventListener() {},
  removeEventListener() {},
};
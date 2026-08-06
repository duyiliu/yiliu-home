import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/mock-storage.js';
import { memoryStorage, resetStorages } from './helpers/mock-storage.js';
import {
  persistMiddleware,
  loggerMiddleware,
  validatorMiddleware,
  debouncedPersistMiddleware,
} from '../src/core/middlewares.js';

const STORE_KEY = 'yiliu.home.state.v2';

describe('persistMiddleware', () => {
  beforeEach(() => {
    resetStorages();
  });

  test('把领域数据与 ui 写入 localStorage，并剥离运行时状态 syncStatus', () => {
    const nextState = {
      bookmarks: [{ id: 'b1' }],
      tasks: [{ id: 't1' }],
      habits: [{ id: 'h1' }],
      sources: [{ id: 's1' }],
      notes: 'note',
      ui: { theme: 'dark', syncStatus: 'syncing', activeView: 'dashboard' },
      meta: { version: '2.0.0' },
      weather: { temp: '25°C' }, // 运行时字段不应被持久化
    };
    const result = persistMiddleware({}, nextState);

    assert.equal(result, nextState); // 透传 nextState
    const saved = JSON.parse(memoryStorage.getItem(STORE_KEY));
    assert.deepEqual(saved.bookmarks, [{ id: 'b1' }]);
    assert.deepEqual(saved.tasks, [{ id: 't1' }]);
    assert.deepEqual(saved.habits, [{ id: 'h1' }]);
    assert.deepEqual(saved.sources, [{ id: 's1' }]);
    assert.equal(saved.notes, 'note');
    assert.deepEqual(saved.ui, { theme: 'dark', activeView: 'dashboard' });
    assert.equal('syncStatus' in saved.ui, false);
    assert.deepEqual(saved.meta, { version: '2.0.0' });
    assert.equal('weather' in saved, false);
  });

  test('localStorage 写入失败时静默返回 nextState（不抛错）', () => {
    const original = memoryStorage.setItem;
    memoryStorage.setItem = () => {
      throw new Error('quota exceeded');
    };
    try {
      const result = persistMiddleware({}, { tasks: [] });
      assert.equal(result.tasks.length, 0);
    } finally {
      memoryStorage.setItem = original;
    }
  });
});

describe('validatorMiddleware', () => {
  test('tasks 非数组时回退 prevState', () => {
    const prev = { tasks: [{ id: 't1' }], bookmarks: [] };
    const next = { tasks: 'oops', bookmarks: [] };
    assert.equal(validatorMiddleware(prev, next), prev);
  });

  test('bookmarks 非数组时回退 prevState', () => {
    const prev = { tasks: [], bookmarks: [{ id: 'b1' }] };
    const next = { tasks: [], bookmarks: null };
    assert.equal(validatorMiddleware(prev, next), prev);
  });

  test('合法状态透传 nextState', () => {
    const next = { tasks: [], bookmarks: [] };
    assert.equal(validatorMiddleware({}, next), next);
  });
});

describe('loggerMiddleware', () => {
  test('非 localhost 环境下不打印、透传 nextState', (t) => {
    t.mock.method(console, 'group', () => {});
    t.mock.method(console, 'log', () => {});
    const next = { tasks: [] };
    const result = loggerMiddleware({}, next);
    assert.equal(result, next);
    assert.equal(console.group.mock.calls.length, 0);
  });
});

describe('debouncedPersistMiddleware', () => {
  beforeEach(() => {
    resetStorages();
  });

  test('150ms 防抖后写入 localStorage', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const nextState = { tasks: [{ id: 't1' }], bookmarks: [], habits: [], sources: [], notes: null, ui: { syncStatus: 'idle' }, meta: {} };
    const result = debouncedPersistMiddleware({}, nextState);
    assert.equal(result, nextState);
    assert.equal(memoryStorage.getItem(STORE_KEY), null);

    t.mock.timers.tick(149);
    assert.equal(memoryStorage.getItem(STORE_KEY), null);
    t.mock.timers.tick(1);
    assert.ok(memoryStorage.getItem(STORE_KEY));
    const saved = JSON.parse(memoryStorage.getItem(STORE_KEY));
    assert.deepEqual(saved.tasks, [{ id: 't1' }]);
  });

  test('连续调用会重置定时器（只保存最后一次）', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    debouncedPersistMiddleware({}, { tasks: [{ id: 'a' }], bookmarks: [], habits: [], sources: [], notes: null, ui: {}, meta: {} });
    debouncedPersistMiddleware({}, { tasks: [{ id: 'b' }], bookmarks: [], habits: [], sources: [], notes: null, ui: {}, meta: {} });
    t.mock.timers.tick(150);
    const saved = JSON.parse(memoryStorage.getItem(STORE_KEY));
    assert.deepEqual(saved.tasks, [{ id: 'b' }]);
  });
});
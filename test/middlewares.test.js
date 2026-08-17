import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/mock-storage.js';
import {
  loggerMiddleware,
  validatorMiddleware,
} from '../src/core/middlewares.js';

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

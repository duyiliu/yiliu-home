import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Store from '../src/core/Store.js';

describe('Store', () => {
  let store;

  beforeEach(() => {
    store = new Store({ tasks: [], user: { name: 'a' } });
  });

  test('getState 返回初始状态', () => {
    assert.deepEqual(store.getState(), { tasks: [], user: { name: 'a' } });
  });

  test('getState 返回的是内部引用（同步可见）', () => {
    const state = store.getState();
    state.tasks.push('x');
    assert.equal(store.getState().tasks.length, 1);
  });

  test('setState 用对象做浅合并', () => {
    store.setState({ tasks: ['t1'] });
    assert.deepEqual(store.getState(), { tasks: ['t1'], user: { name: 'a' } });
  });

  test('setState 支持 updater 函数形式（接收 prevState）', () => {
    store.setState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, 't1'],
    }));
    store.setState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, 't2'],
    }));
    assert.deepEqual(store.getState().tasks, ['t1', 't2']);
  });

  test('updater 返回原引用时跳过更新且不通知', () => {
    let notified = 0;
    store.subscribe(() => notified++);
    store.setState((prev) => prev);
    assert.equal(notified, 0);
    assert.equal(store.getState().tasks.length, 0);
  });

  test('setState 通知订阅者并传入 (state, prevState)', () => {
    let seen = null;
    store.subscribe((state, prevState) => {
      seen = { state, prevState };
    });
    store.setState({ tasks: ['t1'] });
    assert.deepEqual(seen.state.tasks, ['t1']);
    assert.deepEqual(seen.prevState.tasks, []);
  });

  test('subscribe 返回的取消订阅函数生效', () => {
    let notified = 0;
    const unsubscribe = store.subscribe(() => notified++);
    store.setState({ tasks: ['a'] });
    assert.equal(notified, 1);
    unsubscribe();
    store.setState({ tasks: ['b'] });
    assert.equal(notified, 1);
  });

  test('同一 listener 订阅多次则通知多次', () => {
    let notified = 0;
    const listener = () => notified++;
    store.subscribe(listener);
    store.subscribe(listener);
    store.setState({ tasks: ['a'] });
    assert.equal(notified, 2);
  });

  test('listener 抛错不影响其他 listener', (t) => {
    t.mock.method(console, 'error', () => {});
    let notified = 0;
    store.subscribe(() => {
      throw new Error('boom');
    });
    store.subscribe(() => notified++);
    store.setState({ tasks: ['a'] });
    assert.equal(notified, 1);
  });

  test('use 注册的中间件按注册顺序执行并影响最终状态', () => {
    const calls = [];
    store.use((prev, next) => {
      calls.push(`first:${next.tasks?.length ?? 0}`);
      return { ...next, a: 1 };
    });
    store.use((prev, next) => {
      calls.push(`second:${next.a}`);
      return { ...next, b: 2 };
    });
    store.setState({ tasks: ['t'] });
    assert.deepEqual(calls, ['first:1', 'second:1']);
    assert.equal(store.getState().a, 1);
    assert.equal(store.getState().b, 2);
  });

  test('中间件返回 prevState 时状态被回退', () => {
    store.use((prev) => prev);
    store.setState({ tasks: ['t'] });
    assert.deepEqual(store.getState().tasks, []);
  });

  test('多个中间件链式传递中间状态', () => {
    store.use((prev, next) => ({ ...next, step1: true }));
    store.use((prev, next) => ({ ...next, step2: next.step1 === true }));
    store.setState({ tasks: ['t'] });
    assert.equal(store.getState().step1, true);
    assert.equal(store.getState().step2, true);
  });

  test('batch 执行 updater 后状态已更新', () => {
    store.batch(() => {
      store.setState({ tasks: ['t1'] });
      store.setState({ tasks: ['t1', 't2'] });
    });
    assert.deepEqual(store.getState().tasks, ['t1', 't2']);
  });
});
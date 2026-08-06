import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import eventBus from '../src/core/EventBus.js';

describe('EventBus（全局单例）', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  test('on/emit：handler 被调用且参数透传', () => {
    let received = null;
    eventBus.on('task:created', (data) => {
      received = data;
    });
    const payload = { id: 1, title: 'x' };
    eventBus.emit('task:created', payload);
    assert.equal(received, payload);
  });

  test('emit 未注册的事件不报错', () => {
    eventBus.emit('nope', {});
  });

  test('off(event, handler) 只移除指定 handler', () => {
    let calls = [];
    const h1 = (d) => calls.push(`h1:${d}`);
    const h2 = (d) => calls.push(`h2:${d}`);
    eventBus.on('evt', h1);
    eventBus.on('evt', h2);
    eventBus.off('evt', h1);
    eventBus.emit('evt', 'x');
    assert.deepEqual(calls, ['h2:x']);
  });

  test('off(event) 不带 handler 时删除整个事件', () => {
    let calls = 0;
    eventBus.on('evt', () => calls++);
    eventBus.off('evt');
    eventBus.emit('evt');
    assert.equal(calls, 0);
  });

  test('on 返回的取消函数可取消监听', () => {
    let calls = 0;
    const off = eventBus.on('evt', () => calls++);
    eventBus.emit('evt');
    off();
    eventBus.emit('evt');
    assert.equal(calls, 1);
  });

  test('重复订阅同一 handler 会触发多次', () => {
    let calls = 0;
    const handler = () => calls++;
    eventBus.on('evt', handler);
    eventBus.on('evt', handler);
    eventBus.emit('evt');
    assert.equal(calls, 2);
  });

  test('once 只触发一次', () => {
    let calls = 0;
    eventBus.once('evt', () => calls++);
    eventBus.emit('evt');
    eventBus.emit('evt');
    assert.equal(calls, 1);
  });

  test('handler 抛错不影响同一事件的其它 handler', (t) => {
    t.mock.method(console, 'error', () => {});
    let calls = [];
    eventBus.on('evt', () => {
      throw new Error('boom');
    });
    eventBus.on('evt', (d) => calls.push(d));
    eventBus.emit('evt', 'ok');
    assert.deepEqual(calls, ['ok']);
  });

  test('clear 清空所有事件', () => {
    let calls = 0;
    eventBus.on('a', () => calls++);
    eventBus.on('b', () => calls++);
    eventBus.clear();
    eventBus.emit('a');
    eventBus.emit('b');
    assert.equal(calls, 0);
  });
});
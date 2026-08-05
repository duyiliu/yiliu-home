/**
 * EventBus - 事件总线
 * 用于组件间通信
 */
class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * 监听事件
   */
  on(event, handler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);

    // 返回取消监听函数
    return () => this.off(event, handler);
  }

  /**
   * 移除事件监听
   */
  off(event, handler) {
    if (!this.events[event]) return;

    if (handler) {
      this.events[event] = this.events[event].filter(h => h !== handler);
    } else {
      delete this.events[event];
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (!this.events[event]) return;

    this.events[event].forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in ${event} handler:`, error);
      }
    });
  }

  /**
   * 单次监听
   */
  once(event, handler) {
    const wrappedHandler = (data) => {
      handler(data);
      this.off(event, wrappedHandler);
    };

    this.on(event, wrappedHandler);
  }

  /**
   * 清空所有事件
   */
  clear() {
    this.events = {};
  }
}

// 创建全局实例
const eventBus = new EventBus();

export default eventBus;

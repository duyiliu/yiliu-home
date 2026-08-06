/**
 * 状态管理器
 *
 * 单向数据流 + 发布订阅模式
 *
 * 使用示例：
 * const store = new Store({ tasks: [], bookmarks: [] });
 * store.subscribe((state, prevState) => { ... });
 * store.setState({ tasks: [...state.tasks, newTask] });
 */

class Store {
  constructor(initialState = {}) {
    this._state = initialState;
    this._listeners = [];
    this._middlewares = [];
  }

  /**
   * 获取当前状态（只读）
   */
  getState() {
    return this._state;
  }

  /**
   * 更新状态
   * @param {Function|Object} updater - 更新函数或对象
   */
  setState(updater) {
    const prevState = this._state;

    // 支持函数式更新和对象合并
    const nextState = typeof updater === 'function'
      ? updater(prevState)
      : { ...prevState, ...updater };

    // 执行中间件
    const finalState = this._applyMiddlewares(prevState, nextState);

    // 浅比较，如果没变化则跳过
    if (finalState === prevState) return;

    this._state = finalState;
    this._notify(finalState, prevState);
  }

  /**
   * 订阅状态变化
   * 同一 listener 重复订阅会通知多次（与 EventBus 语义一致），取消时仅移除最近一次注册。
   * @param {Function} listener - 监听器 (state, prevState) => void
   * @returns {Function} 取消订阅函数
   */
  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      const index = this._listeners.indexOf(listener);
      if (index !== -1) this._listeners.splice(index, 1);
    };
  }

  /**
   * 添加中间件
   * @param {Function} middleware - (prevState, nextState) => nextState
   */
  use(middleware) {
    this._middlewares.push(middleware);
  }

  /**
   * 通知所有监听器
   */
  _notify(state, prevState) {
    // 复制快照再遍历，避免通知过程中订阅/取消订阅改变数组导致跳过
    this._listeners.slice().forEach(listener => {
      try {
        listener(state, prevState);
      } catch (error) {
        console.error('[Store] Listener error:', error);
      }
    });
  }

  /**
   * 应用中间件
   */
  _applyMiddlewares(prevState, nextState) {
    return this._middlewares.reduce(
      (state, middleware) => middleware(prevState, state),
      nextState
    );
  }

  /**
   * 批量更新（减少触发次数）
   */
  batch(updater) {
    this._batching = true;
    updater();
    this._batching = false;
    if (this._pendingUpdate) {
      this._notify(this._state, this._pendingUpdate);
      this._pendingUpdate = null;
    }
  }
}

export default Store;

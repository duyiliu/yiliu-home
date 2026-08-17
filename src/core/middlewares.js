/**
 * Store 中间件
 */

/**
 * 日志中间件 - 开发环境打印状态变化
 */
export function loggerMiddleware(prevState, nextState) {
  if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
    console.group('%c[Store] State Update', 'color: #6d8169; font-weight: bold');
    console.log('Prev:', prevState);
    console.log('Next:', nextState);
    console.groupEnd();
  }
  return nextState;
}

/**
 * 验证中间件 - 确保数据完整性
 */
export function validatorMiddleware(prevState, nextState) {
  // 验证必需字段
  if (!Array.isArray(nextState.tasks)) {
    console.error('[Validator] Invalid tasks array, reverting');
    return prevState;
  }

  if (!Array.isArray(nextState.bookmarks)) {
    console.error('[Validator] Invalid bookmarks array, reverting');
    return prevState;
  }

  return nextState;
}
/**
 * 认证 UI 控制模块（ES Module，由 src/app.js 统一加载，避免重复初始化）
 *
 * 职责：
 * - 绑定锁屏表单（密码输入、解锁按钮、错误提示）
 * - 提交时调用 login(password) + bootstrap()：密码校验在服务端完成，
 *   token 由 apiClient 存入 sessionStorage（不写 localStorage、不保存明文密码）
 * - 成功后隐藏锁屏、显示业务壳 #appShell，并派发 yiliu:authenticated
 * - 失败时在锁屏内展示错误并触发抖动动画
 */
import { login, bootstrap } from './src/services/apiClient.js';

export const AUTHENTICATED_EVENT = 'yiliu:authenticated';

let lockEl = null;
let inputEl = null;
let submitEl = null;
let errorEl = null;
let submitting = false;

function showError(message) {
  if (errorEl) errorEl.textContent = message || '';
}

function shake() {
  if (!inputEl) return;
  inputEl.classList.remove('shake');
  void inputEl.offsetWidth; // 重启动画
  inputEl.classList.add('shake');
}

async function handleSubmit() {
  if (!inputEl || submitting) return;
  const value = inputEl.value.trim();
  if (!value) return;

  submitting = true;
  if (submitEl) submitEl.disabled = true;
  showError('');

  try {
    await login(value); // 服务端校验密码并换取 token
    await bootstrap();  // 登录后立即全量拉取数据写入 store
    inputEl.value = '';
    unlock();
    window.dispatchEvent(new CustomEvent(AUTHENTICATED_EVENT));
  } catch (err) {
    showError(err.message || '解锁失败，请重试');
    inputEl.select();
    shake();
  } finally {
    submitting = false;
    if (submitEl) submitEl.disabled = false;
  }
}

/** 隐藏锁屏并显示业务壳 */
function unlock() {
  if (lockEl) lockEl.classList.add('is-unlocked');
  const shell = document.getElementById('appShell');
  if (shell) shell.classList.add('is-visible');
}

export function showAuthenticatedApp() {
  unlock();
}

/** 回到锁屏（隐藏业务壳） */
export function showLockScreen() {
  if (lockEl) lockEl.classList.remove('is-unlocked');
  const shell = document.getElementById('appShell');
  if (shell) shell.classList.remove('is-visible');
  if (inputEl) inputEl.focus();
}

/** 绑定锁屏表单（幂等，可在 DOMContentLoaded 后调用） */
export function initAuthUI() {
  if (lockEl) return;
  lockEl = document.getElementById('lockScreen');
  inputEl = document.getElementById('lockPassword');
  submitEl = document.getElementById('lockSubmit');
  errorEl = document.getElementById('lockError');
  if (!lockEl || !inputEl || !submitEl) return;

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
  submitEl.addEventListener('click', handleSubmit);
}
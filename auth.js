/* 前端口令锁：单密码访问控制（防君子不防恶意；个人主页够用）
 * 改密码：把 PASSWORD_HASH 换成新密码的 SHA-256 hex（node -e "console.log(require('crypto').createHash('sha256').update('新密码').digest('hex'))"）
 */
const AUTH_KEY = "yiliu.home.auth";
const PASSWORD_HASH = "1e395ce2ed739e5d69e000b8f0a7959505aba94472f72c0972a98a0b1260a444"; // sha256("Ws00350425")

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function unlock() {
  const lock = document.getElementById("lockScreen");
  if (lock) lock.classList.add("is-unlocked");
}

async function handleUnlock() {
  const input = document.getElementById("lockPassword");
  const error = document.getElementById("lockError");
  const value = input.value.trim();
  if (!value) return;
  const hash = await sha256Hex(value);
  if (hash === PASSWORD_HASH) {
    localStorage.setItem(AUTH_KEY, "1");
    // 仅当前浏览会话供导航 API 登录用；不把明文密码持久化到 localStorage。
    sessionStorage.setItem("yiliu.home.nav.password", value);
    input.value = "";
    error.textContent = "";
    unlock();
  } else {
    error.textContent = "密码不对，再试一次。";
    input.select();
    input.classList.remove("shake");
    void input.offsetWidth; // restart shake animation
    input.classList.add("shake");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const lock = document.getElementById("lockScreen");
  if (!lock) return;
  if (localStorage.getItem(AUTH_KEY) === "1") {
    lock.classList.add("is-unlocked");
    return;
  }
  const input = document.getElementById("lockPassword");
  const button = document.getElementById("lockSubmit");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleUnlock();
  });
  button.addEventListener("click", handleUnlock);
  setTimeout(() => input.focus(), 50);
});

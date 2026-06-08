const CONFIG_KEY = "yiliu.home.supabase.config";
const SESSION_KEY = "yiliu.home.supabase.session";
const TIMER_KEY = "yiliu.home.focus.seconds";

const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=%s",
  baidu: "https://www.baidu.com/s?wd=%s",
  github: "https://github.com/search?q=%s&type=repositories",
  mdn: "https://developer.mozilla.org/zh-CN/search?q=%s",
  juejin: "https://juejin.cn/search?query=%s",
};

const PREFIX_ENGINES = {
  g: "google",
  bd: "baidu",
  gh: "github",
  mdn: "mdn",
  jj: "juejin",
};

const DEFAULT_LINKS = [
  ["快科技", "https://www.kkj.cn/", "信息", "科技资讯与数码硬件", "#ff7a7a", 1],
  ["OSChina", "https://www.oschina.net/", "开发", "开源中国社区", "#8ff0a4", 2],
  ["邮箱", "https://mail.google.com/", "工作流", "处理收件箱与日程邀请", "#f3c969", 10],
  ["日历", "https://calendar.google.com/", "工作流", "查看会议和时间块", "#74e6d6", 20],
  ["Notion", "https://www.notion.so/", "工作流", "项目文档和知识库", "#ffffff", 30],
  ["GitHub", "https://github.com/", "开发", "代码仓库、PR 和 Issue", "#9ea8ff", 40],
  ["Vercel", "https://vercel.com/dashboard", "开发", "部署状态与项目监控", "#ffffff", 50],
  ["MDN", "https://developer.mozilla.org/zh-CN/", "开发", "Web API 与兼容性查询", "#74e6d6", 60],
  ["掘金", "https://juejin.cn/", "信息", "中文技术趋势与实践", "#4c8dff", 70],
  ["少数派", "https://sspai.com/", "信息", "效率工具与数字生活", "#ff6b6b", 80],
  ["阮一峰周刊", "https://www.ruanyifeng.com/blog/", "信息", "技术与互联网观察", "#f3c969", 90],
];

const DEFAULT_TASKS = [
  ["写下今天最重要的 1 件事", "high", 10],
  ["检查日历、邮箱和未读消息", "normal", 20],
];

const DEFAULT_SOURCES = [
  ["OSChina", "https://www.oschina.net/", "link", "技术", "开源中国社区", 1],
  ["快科技", "https://www.kkj.cn/", "link", "技术", "科技资讯与数码硬件", 2],
  ["Hacker News", "https://news.ycombinator.com/rss", "rss", "技术", "海外技术社区热门讨论", 10],
  ["GitHub Blog", "https://github.blog/feed/", "rss", "技术", "GitHub 官方更新", 20],
  ["阮一峰网络日志", "https://www.ruanyifeng.com/blog/atom.xml", "rss", "中文", "科技爱好者周刊与文章", 30],
  ["Solidot", "https://www.solidot.org/index.rss", "rss", "中文", "开源、科学与技术新闻", 40],
  ["Product Hunt", "https://www.producthunt.com/", "link", "产品", "新产品和工具发现", 50],
];

const FAMOUS_QUOTES = [
  { text: "所谓极客，就是找到自己热爱的事物，并为之付出极致的专注。", author: "极客精神" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Simple is better than complex. Complex is better than complicated.", author: "Zen of Python" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Programs must be written for people to read, and only secondarily for machines to execute.", author: "Harold Abelson" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "One of my most productive days was throwing away 1000 lines of code.", author: "Ken Thompson" },
  { text: "Code is poetry.", author: "WordPress" }
];

function getStaticSupabaseConfig() {
  const supabase = window.YILIU_HOME_CONFIG?.supabase;
  if (!supabase?.url || !supabase?.anonKey) return null;
  return {
    url: normalizeSupabaseUrl(supabase.url),
    anonKey: supabase.anonKey.trim(),
  };
}

function getInitialSupabaseConfig() {
  return getStaticSupabaseConfig() || loadJson(CONFIG_KEY);
}

function hasStaticSupabaseConfig() {
  return Boolean(getStaticSupabaseConfig());
}

const state = {
  config: getInitialSupabaseConfig(),
  session: loadJson(SESSION_KEY),
  links: [],
  tasks: [],
  sources: [],
  feedItems: [],
  note: null,
  activeLinkCategory: "全部",
  habits: [],
  noteSaveTimer: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  renderClock();
  setInterval(renderClock, 1000);
  renderRandomQuote();
  initWeather();
  boot();
});

function bindEvents() {
  $("#searchForm").addEventListener("submit", handleSearch);
  $("#configForm").addEventListener("submit", saveConfig);
  $("#authForm").addEventListener("submit", signIn);
  $("#signUpButton").addEventListener("click", signUp);
  $("#taskForm").addEventListener("submit", createTask);
  $("#linkForm").addEventListener("submit", createLink);
  $("#sourceForm").addEventListener("submit", createSource);
  $("#toggleLinkForm").addEventListener("click", () => toggle("#linkForm"));
  $("#toggleSourceForm").addEventListener("click", () => toggle("#sourceForm"));
  $("#refreshFeedsButton").addEventListener("click", refreshFeeds);
  $("#clearDoneButton").addEventListener("click", clearDoneTasks);
  $("#noteBody").addEventListener("input", scheduleNoteSave);
  $("#settingsToggle").addEventListener("click", () => toggle("#settingsPanel"));
  $("#settingsClose").addEventListener("click", () => toggle("#settingsPanel", false));
  $("#showSetupButton").addEventListener("click", () => {
    toggle("#settingsPanel", false);
    toggle("#setupPanel", true);
  });
  $("#signOutButton").addEventListener("click", signOut);

  $("#prevMonthBtn").addEventListener("click", handlePrevMonth);
  $("#nextMonthBtn").addEventListener("click", handleNextMonth);
  $("#toggleHabitForm").addEventListener("click", () => toggle("#habitForm"));
  $("#habitForm").addEventListener("submit", createHabit);
  $("#weatherDisplay").addEventListener("click", handleWeatherClick);

  document.addEventListener("keydown", (event) => {
    const active = document.activeElement;
    const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(active?.tagName);
    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      $("#searchInput").focus();
    }
    if (event.key.toLowerCase() === "n" && !isTyping) {
      event.preventDefault();
      $("#taskInput").focus();
    }
  });
}

async function boot() {
  renderConfigState();
  renderConfigFormState();
  if (!state.config?.url || !state.config?.anonKey) {
    setStatus("未连接 Supabase", "idle");
    toggle("#setupPanel", true);
    return;
  }

  $("#supabaseUrl").value = state.config.url;
  $("#supabaseAnonKey").value = state.config.anonKey;

  if (!state.session?.access_token) {
    setStatus("等待登录", "idle");
    toggle("#setupPanel", true);
    return;
  }

  try {
    await ensureSession();
    await loadDashboard();
    toggle("#setupPanel", false);
    setStatus("已同步", "ok");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "连接失败", "error");
    toggle("#setupPanel", true);
  }
}

function renderClock() {
  const now = new Date();
  const clock = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
  }).format(now);
  const date = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
  $("#clockLabel").textContent = clock;
  $("#weekdayLabel").textContent = weekday;
  $("#dateLabel").textContent = date;
}

function renderConfigState() {
  const urlNode = $("#settingsUrl");
  const userNode = $("#settingsUser");
  const sessionNode = $("#sessionLabel");
  
  if (urlNode) urlNode.textContent = state.config?.url || "未配置";
  if (userNode) userNode.textContent = state.session?.user?.email || "未登录";
  if (sessionNode) sessionNode.textContent = state.session?.user?.email || "等待连接";
}

function renderConfigFormState() {
  const configForm = $("#configForm");
  const urlInput = $("#supabaseUrl");
  const anonKeyInput = $("#supabaseAnonKey");
  const fixedConfig = getStaticSupabaseConfig();

  if (!configForm || !urlInput || !anonKeyInput) return;

  if (fixedConfig) {
    state.config = fixedConfig;
    urlInput.value = fixedConfig.url;
    anonKeyInput.value = fixedConfig.anonKey;
    configForm.classList.add("hidden");
    return;
  }

  configForm.classList.remove("hidden");
}

function setStatus(message, type = "idle") {
  const node = $("#syncStatus");
  node.textContent = message;
  node.className = `status-pill is-${type}`;
}

async function saveConfig(event) {
  event.preventDefault();
  if (hasStaticSupabaseConfig()) {
    state.config = getStaticSupabaseConfig();
    renderConfigState();
    renderConfigFormState();
    setStatus("Supabase 项目配置已内置，请直接登录", "ok");
    return;
  }
  const url = normalizeSupabaseUrl($("#supabaseUrl").value);
  const anonKey = $("#supabaseAnonKey").value.trim();
  if (!url || !anonKey) return;
  state.config = { url, anonKey };
  state.session = null;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  localStorage.removeItem(SESSION_KEY);
  renderConfigState();
  setStatus("连接已保存，请登录", "ok");
}

async function signIn(event) {
  event.preventDefault();
  await authenticate("token?grant_type=password", "登录成功");
}

async function signUp() {
  await authenticate("signup", "账号已创建");
}

async function authenticate(path, successMessage) {
  if (!state.config?.url || !state.config?.anonKey) {
    setStatus("请先保存 Supabase 连接", "error");
    return;
  }
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  if (!email || !password) return;

  setBusy(true);
  try {
    const payload = await authFetch(path, { email, password });
    if (payload.access_token) {
      saveSession(payload);
      await loadDashboard();
      toggle("#setupPanel", false);
      setStatus(successMessage, "ok");
      return;
    }
    setStatus("账号已创建。若开启邮件确认，请先确认邮件后再登录", "ok");
  } catch (error) {
    console.error(error);
    setStatus(friendlyAuthError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function signOut() {
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
  state.links = [];
  state.tasks = [];
  state.sources = [];
  state.feedItems = [];
  state.note = null;
  renderAll();
  renderConfigState();
  toggle("#settingsPanel", false);
  toggle("#setupPanel", true);
  setStatus("已退出", "idle");
}

async function authFetch(path, body) {
  const response = await fetch(`${state.config.url}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: state.config.anonKey,
      Authorization: `Bearer ${state.config.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

function friendlyAuthError(error) {
  const message = String(error?.message || error || "认证失败");
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "账号或密码不正确。若是首次使用，请先创建账号；若已创建，请确认邮箱后再登录";
  }
  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return "邮箱还未确认。请先点击 Supabase 发出的确认邮件，或在 Auth 设置里关闭 Confirm email";
  }
  if (lower.includes("signup disabled")) {
    return "当前 Supabase 项目禁用了注册。请到 Authentication 设置里开启 Email 注册";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "账号已经存在，请直接登录；如果忘记密码，需要在 Supabase Auth 里重置密码";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "无法连接 Supabase。请检查 Project URL、anon key、网络和浏览器是否拦截请求";
  }
  return message;
}

function saveSession(payload) {
  const expiresAt = Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600);
  state.session = { ...payload, expires_at: expiresAt };
  localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  renderConfigState();
}

async function ensureSession() {
  if (!state.session?.access_token) {
    throw new Error("请先登录 Supabase");
  }
  const expiresSoon = Number(state.session.expires_at || 0) - Math.floor(Date.now() / 1000) < 90;
  if (!expiresSoon) return;
  if (!state.session.refresh_token) {
    throw new Error("登录已过期，请重新登录");
  }
  const refreshed = await authFetch("token?grant_type=refresh_token", {
    refresh_token: state.session.refresh_token,
  });
  saveSession(refreshed);
}

async function rest(path, options = {}) {
  await ensureSession();
  const method = options.method || "GET";
  const headers = {
    apikey: state.config.anonKey,
    Authorization: `Bearer ${state.session.access_token}`,
    "Content-Type": "application/json",
  };
  if (method !== "GET") {
    headers.Prefer = options.prefer || "return=representation";
  }
  const response = await fetch(`${state.config.url}/rest/v1/${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text ? { message: text } : null;
  }
  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.hint || response.statusText;
    throw new Error(message);
  }
  return payload;
}

async function loadDashboard() {
  setStatus("同步中", "idle");
  const [links, tasks, sources, notes, feedItems] = await Promise.all([
    rest("links?select=*&order=category.asc,sort_order.asc,title.asc"),
    rest("tasks?select=*&order=done.asc,sort_order.asc,created_at.desc"),
    rest("sources?select=*&order=category.asc,sort_order.asc,title.asc"),
    rest("notes?select=*&kind=in.(scratch,habits)"),
    rest("feed_items?select=*&order=fetched_at.desc&limit=30"),
  ]);

  state.links = links || [];
  state.tasks = tasks || [];
  state.sources = sources || [];
  state.feedItems = feedItems || [];
  state.note = notes?.find(n => n.kind === "scratch") || null;
  
  const habitsNote = notes?.find(n => n.kind === "habits") || null;
  state.habits = habitsNote?.body ? JSON.parse(habitsNote.body).habits : [];

  const isFirstUse = !state.links.length && !state.tasks.length && !state.sources.length && !state.note && !state.habits.length;
  if (isFirstUse) {
    await seedMissingData();
    return loadDashboard();
  }

  await checkAndAddTargetLinks();

  renderAll();
  setStatus("已同步", "ok");
}

async function checkAndAddTargetLinks() {
  if (!state.session?.user?.id) return;
  const hasKkj = state.links.some(link => 
    (link.title || "").toLowerCase().includes("快科技") || 
    (link.url || "").toLowerCase().includes("kkj.cn")
  );
  const hasOsc = state.links.some(link => 
    (link.title || "").toLowerCase().includes("oschina") || 
    (link.title || "").toLowerCase().includes("开源中国") || 
    (link.url || "").toLowerCase().includes("oschina.net")
  );
  const newLinks = [];
  const userId = state.session.user.id;
  if (!hasKkj) {
    newLinks.push({
      user_id: userId,
      title: "快科技",
      url: "https://www.kkj.cn/",
      category: "信息",
      description: "科技资讯与数码硬件",
      accent: "#ff7a7a",
      sort_order: 1
    });
  }
  if (!hasOsc) {
    newLinks.push({
      user_id: userId,
      title: "OSChina",
      url: "https://www.oschina.net/",
      category: "开发",
      description: "开源中国社区",
      accent: "#8ff0a4",
      sort_order: 2
    });
  }
  if (newLinks.length > 0) {
    try {
      await rest("links", {
        method: "POST",
        body: newLinks
      });
      const updatedLinks = await rest("links?select=*&order=category.asc,sort_order.asc,title.asc");
      state.links = updatedLinks || [];
    } catch (e) {
      console.error(e);
    }
  }
}

async function seedMissingData() {
  const userId = state.session.user.id;
  const jobs = [];
  if (!state.links.length) {
    jobs.push(
      rest("links", {
        method: "POST",
        body: DEFAULT_LINKS.map(([title, url, category, description, accent, sort_order]) => ({
          user_id: userId,
          title,
          url,
          category,
          description,
          accent,
          sort_order,
        })),
      })
    );
  }
  if (!state.tasks.length) {
    jobs.push(
      rest("tasks", {
        method: "POST",
        body: DEFAULT_TASKS.map(([title, priority, sort_order]) => ({
          user_id: userId,
          title,
          priority,
          sort_order,
        })),
      })
    );
  }
  if (!state.sources.length) {
    jobs.push(
      rest("sources", {
        method: "POST",
        body: DEFAULT_SOURCES.map(([title, url, kind, category, description, sort_order]) => ({
          user_id: userId,
          title,
          url,
          kind,
          category,
          description,
          sort_order,
        })),
      })
    );
  }
  if (!state.note) {
    jobs.push(saveNote("临时想法、会议链接、命令片段都可以先放这里。"));
  }
  if (!state.habits || !state.habits.length) {
    const defaultHabits = [
      { id: "1", title: "每日阅读 30m", history: [], streak: 0 },
      { id: "2", title: "每日专注编程", history: [], streak: 0 }
    ];
    jobs.push(saveHabits(defaultHabits));
  }
  await Promise.all(jobs);
}

function renderAll() {
  renderConfigState();
  renderMetrics();
  renderTasks();
  renderLinks();
  renderSources();
  renderFeedItems();
  renderNote();
  renderCalendar();
  renderHabits();
}

function renderMetrics() {
  const openTasks = state.tasks.filter((task) => !task.done).length;
  $("#taskMetric").textContent = String(openTasks);
  $("#linkMetric").textContent = String(state.links.length);
  $("#sourceMetric").textContent = String(state.sources.length);
  
  const todayStr = getTodayString();
  const completedHabits = (state.habits || []).filter(h => (h.history || []).includes(todayStr)).length;
  const totalHabits = (state.habits || []).length;
  const habitNode = $("#habitMetric");
  if (habitNode) {
    habitNode.textContent = `${completedHabits}/${totalHabits}`;
  }
}

function renderTasks() {
  const list = $("#taskList");
  list.className = "task-list";
  list.innerHTML = "";
  if (!state.tasks.length) {
    list.className = "task-list empty-state";
    list.textContent = "还没有待办。";
    return;
  }

  for (const task of state.tasks) {
    const template = $("#taskTemplate").content.firstElementChild.cloneNode(true);
    template.dataset.id = task.id;
    template.classList.toggle("is-done", Boolean(task.done));
    const checkbox = template.querySelector("input");
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener("change", () => updateTask(task.id, { done: checkbox.checked }));
    template.querySelector("span").textContent = task.title;
    const priorityNode = template.querySelector("em");
    priorityNode.textContent = priorityText(task.priority);
    priorityNode.className = `priority-tag is-${task.priority}`;
    template.querySelector("button").addEventListener("click", () => deleteRow("tasks", task.id));
    list.appendChild(template);
  }
}

function renderLinks() {
  const targetTitles = ["快科技", "oschina", "开源中国", "osc", "mydrivers", "驱动之家"];
  state.links.sort((a, b) => {
    const aTitle = (a.title || "").toLowerCase();
    const bTitle = (b.title || "").toLowerCase();
    const aIndex = targetTitles.findIndex(t => aTitle.includes(t));
    const bIndex = targetTitles.findIndex(t => bTitle.includes(t));
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    const aCat = a.category || "常用";
    const bCat = b.category || "常用";
    if (aCat !== bCat) return aCat.localeCompare(bCat, "zh");
    if (a.sort_order !== b.sort_order) return (a.sort_order || 0) - (b.sort_order || 0);
    return aTitle.localeCompare(bTitle, "zh");
  });

  const categories = ["全部", ...new Set(state.links.map((link) => link.category || "常用"))];
  const filter = $("#linkFilters");
  filter.innerHTML = "";
  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.className = category === state.activeLinkCategory ? "is-active" : "";
    button.addEventListener("click", () => {
      state.activeLinkCategory = category;
      renderLinks();
    });
    filter.appendChild(button);
  }

  const visible = state.activeLinkCategory === "全部"
    ? state.links
    : state.links.filter((link) => link.category === state.activeLinkCategory);
  const grid = $("#linkGrid");
  grid.className = "link-grid";
  grid.innerHTML = "";
  if (!visible.length) {
    grid.className = "link-grid empty-state";
    grid.textContent = "没有这个分组的入口。";
    return;
  }

  for (const link of visible) {
    const card = document.createElement("article");
    card.className = "link-card";
    
    let faviconUrl = "";
    try {
      const normalized = normalizeUrl(link.url);
      const urlObj = new URL(normalized);
      faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${urlObj.hostname}`;
    } catch (e) {
      faviconUrl = "";
    }
    
    card.innerHTML = `
      <a href="${escapeAttr(link.url)}" target="_blank" rel="noreferrer">
        ${faviconUrl ? `<img class="link-favicon" src="${faviconUrl}" alt="" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a19a8e\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'10\'/%3E%3Cline x1=\'2\' y1=\'12\' x2=\'22\' y2=\'12\'/%3E%3Cpath d=\'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\'/%3E%3C/svg%3E\''" />` : ""}
        <strong>${escapeHtml(link.title)}</strong>
      </a>
      <button type="button" class="delete-badge" aria-label="删除">&times;</button>
    `;
    card.querySelector("button").addEventListener("click", () => deleteRow("links", link.id));
    grid.appendChild(card);
  }
}

function renderSources() {
  const targetTitles = ["快科技", "oschina", "开源中国", "osc", "mydrivers", "驱动之家"];
  state.sources.sort((a, b) => {
    const aTitle = (a.title || "").toLowerCase();
    const bTitle = (b.title || "").toLowerCase();
    const aIndex = targetTitles.findIndex(t => aTitle.includes(t));
    const bIndex = targetTitles.findIndex(t => bTitle.includes(t));
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    const aCat = a.category || "资讯";
    const bCat = b.category || "资讯";
    if (aCat !== bCat) return aCat.localeCompare(bCat, "zh");
    if (a.sort_order !== b.sort_order) return (a.sort_order || 0) - (b.sort_order || 0);
    return aTitle.localeCompare(bTitle, "zh");
  });

  const list = $("#sourceList");
  list.className = "source-list";
  list.innerHTML = "";
  if (!state.sources.length) {
    list.className = "source-list empty-state";
    list.textContent = "还没有信息源。";
    return;
  }
  for (const source of state.sources) {
    const item = document.createElement("article");
    item.className = "source-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(source.title)}</strong>
        <span>${escapeHtml(source.category || "资讯")} · ${escapeHtml(source.kind || "link")}</span>
        <p>${escapeHtml(source.description || "关注的信息入口")}</p>
      </div>
      <div class="source-actions">
        <a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer">打开</a>
        <button type="button" class="delete-badge" aria-label="删除">&times;</button>
      </div>
    `;
    item.querySelector("button").addEventListener("click", () => deleteRow("sources", source.id));
    list.appendChild(item);
  }
}

function renderFeedItems() {
  const list = $("#feedList");
  list.className = "feed-list";
  list.innerHTML = "";
  if (!state.feedItems.length) {
    list.className = "feed-list empty-state";
    list.textContent = "还没有内容。点击刷新 RSS，或先部署 refresh-feeds Edge Function。";
    return;
  }
  for (const item of state.feedItems) {
    const article = document.createElement("article");
    article.className = "feed-item";
    article.innerHTML = `
      <a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(item.title)}</strong>
      </a>
      <div class="feed-meta">
        <span>${escapeHtml(item.source_title || "RSS")}</span>
        <span>${escapeHtml(item.source_category || "资讯")}</span>
        <time>${escapeHtml(item.published_at || "刚刚抓取")}</time>
      </div>
      ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
    `;
    list.appendChild(article);
  }
}

function renderNote() {
  const body = state.note?.body || "";
  if ($("#noteBody").value !== body) {
    $("#noteBody").value = body;
  }
  const savedNode = $("#noteSaved");
  if (state.note?.updated_at) {
    savedNode.textContent = "已同步";
    savedNode.className = "mini-pill is-ok";
  } else {
    savedNode.textContent = "未同步";
    savedNode.className = "mini-pill";
  }
}

async function createTask(event) {
  event.preventDefault();
  const title = $("#taskInput").value.trim();
  if (!title) return;
  await mutate(() =>
    rest("tasks", {
      method: "POST",
      body: {
        user_id: state.session.user.id,
        title,
        priority: $("#taskPriority").value,
        sort_order: Date.now(),
      },
    })
  );
  $("#taskInput").value = "";
}

async function updateTask(id, patch) {
  const payload = { ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, "done")) {
    payload.completed_at = patch.done ? new Date().toISOString() : null;
  }
  await mutate(() => rest(`tasks?id=eq.${id}`, { method: "PATCH", body: payload }));
}

async function clearDoneTasks() {
  const done = state.tasks.filter((task) => task.done);
  await mutate(() => Promise.all(done.map((task) => rest(`tasks?id=eq.${task.id}`, { method: "DELETE" }))));
}

async function createLink(event) {
  event.preventDefault();
  await mutate(() =>
    rest("links", {
      method: "POST",
      body: {
        user_id: state.session.user.id,
        title: $("#linkTitle").value.trim(),
        url: normalizeUrl($("#linkUrl").value),
        category: $("#linkCategory").value.trim() || "常用",
        accent: randomAccent(),
        sort_order: Date.now(),
      },
    })
  );
  $("#linkForm").reset();
  $("#linkCategory").value = "常用";
  toggle("#linkForm", false);
}

async function createSource(event) {
  event.preventDefault();
  await mutate(() =>
    rest("sources", {
      method: "POST",
      body: {
        user_id: state.session.user.id,
        title: $("#sourceTitle").value.trim(),
        url: normalizeUrl($("#sourceUrl").value),
        category: $("#sourceCategory").value.trim() || "资讯",
        kind: $("#sourceKind").value,
        sort_order: Date.now(),
      },
    })
  );
  $("#sourceForm").reset();
  $("#sourceCategory").value = "技术";
  toggle("#sourceForm", false);
}

async function refreshFeeds() {
  if (!state.session?.access_token) {
    setStatus("请先登录", "error");
    toggle("#setupPanel", true);
    return;
  }
  setBusy(true);
  setStatus("刷新 RSS 中", "idle");
  try {
    await invokeFunction("refresh-feeds");
    await loadDashboard();
    setStatus("RSS 已刷新", "ok");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "RSS 刷新失败", "error");
  } finally {
    setBusy(false);
  }
}

async function invokeFunction(name, body = {}) {
  await ensureSession();
  const response = await fetch(`${state.config.url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: state.config.anonKey,
      Authorization: `Bearer ${state.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function deleteRow(table, id) {
  await mutate(() => rest(`${table}?id=eq.${id}`, { method: "DELETE" }));
}

async function mutate(operation) {
  if (!state.session?.access_token) {
    setStatus("请先登录", "error");
    toggle("#setupPanel", true);
    return;
  }
  setBusy(true);
  try {
    await operation();
    await loadDashboard();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "操作失败", "error");
  } finally {
    setBusy(false);
  }
}

function scheduleNoteSave() {
  const savedNode = $("#noteSaved");
  savedNode.textContent = "保存中";
  savedNode.className = "mini-pill";
  clearTimeout(state.noteSaveTimer);
  const value = $("#noteBody").value;
  state.noteSaveTimer = setTimeout(() => saveNote(value).catch((error) => {
    console.error(error);
    savedNode.textContent = "保存失败";
    savedNode.className = "mini-pill is-error";
  }), 650);
}

async function saveNote(body) {
  if (!state.session?.user?.id) return null;
  const payload = await rest("notes?on_conflict=user_id,kind", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      user_id: state.session.user.id,
      kind: "scratch",
      title: "随手记",
      body,
      updated_at: new Date().toISOString(),
    },
  });
  state.note = payload?.[0] || state.note;
  const savedNode = $("#noteSaved");
  savedNode.textContent = "已同步";
  savedNode.className = "mini-pill is-ok";
  return payload;
}

function handleSearch(event) {
  event.preventDefault();
  let query = $("#searchInput").value.trim();
  if (!query) return;

  const prefix = query.match(/^([a-z]{1,4}):\s*(.+)$/i);
  let engine = $("#searchEngine").value;
  if (prefix && PREFIX_ENGINES[prefix[1].toLowerCase()]) {
    engine = PREFIX_ENGINES[prefix[1].toLowerCase()];
    query = prefix[2].trim();
  }

  const url = looksLikeUrl(query) ? normalizeUrl(query) : SEARCH_ENGINES[engine].replace("%s", encodeURIComponent(query));
  window.open(url, "_blank", "noopener,noreferrer");
}



function setBusy(isBusy) {
  $$('button').forEach((button) => {
    button.disabled = isBusy;
  });
}

function loadJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function toggle(selector, forced) {
  const node = $(selector);
  const shouldShow = typeof forced === "boolean" ? forced : node.classList.contains("hidden");
  node.classList.toggle("hidden", !shouldShow);
}

function normalizeSupabaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeUrl(value) {
  const url = value.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function looksLikeUrl(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^(localhost|\d{1,3}(\.\d{1,3}){3}|[\w-]+\.[\w.-]+)/i.test(value);
}

function priorityText(priority) {
  if (priority === "high") return "高优先级";
  if (priority === "low") return "低优先级";
  return "中优先级";
}

function randomAccent() {
  const colors = ["#74e6d6", "#f3c969", "#ff7a7a", "#8ba4ff", "#8ff0a4"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function renderRandomQuote() {
  const quote = FAMOUS_QUOTES[Math.floor(Math.random() * FAMOUS_QUOTES.length)];
  const textNode = $(".quote-text");
  const authorNode = $(".quote-author");
  if (textNode && authorNode) {
    textNode.textContent = `“ ${quote.text} ”`;
    authorNode.textContent = `— ${quote.author}`;
  }
}

// ==========================================
// WEATHER COMPONENT
// ==========================================
async function fetchWeather(city = "") {
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather request failed");
    const data = await res.json();
    const current = data.current_condition?.[0];
    const area = data.nearest_area?.[0];
    
    const temp = current?.temp_C || "--";
    const desc = current?.lang_zh?.[0]?.value || current?.weatherDesc?.[0]?.value || "";
    const areaName = area?.areaName?.[0]?.value || "";
    
    const emoji = getWeatherEmoji(current?.weatherCode, desc);
    
    state.weather = {
      city: city || areaName || "本地",
      temp: temp,
      desc: desc,
      emoji: emoji,
      time: Date.now()
    };
    localStorage.setItem("yiliu.home.weather", JSON.stringify(state.weather));
    renderWeather();
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    if (!state.weather) {
      state.weather = {
        city: city || "北京",
        temp: "22",
        desc: "晴",
        emoji: "☀️",
        time: 0
      };
    }
    renderWeather();
  }
}

function getWeatherEmoji(code, desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("晴") || d.includes("sunny") || d.includes("clear")) return "☀️";
  if (d.includes("雨") || d.includes("rain") || d.includes("shower") || d.includes("drizzle")) return "🌧️";
  if (d.includes("云") || d.includes("cloud") || d.includes("overcast") || d.includes("cloudy")) return "☁️";
  if (d.includes("阴")) return "⛅";
  if (d.includes("雪") || d.includes("snow")) return "❄️";
  if (d.includes("雷") || d.includes("thunder")) return "⚡";
  if (d.includes("雾") || d.includes("fog") || d.includes("mist")) return "🌫️";
  return "☀️";
}

function renderWeather() {
  const iconNode = $("#weatherIcon");
  const tempNode = $("#weatherTemp");
  const locNode = $("#weatherLoc");
  if (state.weather && iconNode && tempNode && locNode) {
    iconNode.textContent = state.weather.emoji || "☀️";
    tempNode.textContent = `${state.weather.temp}°C`;
    locNode.textContent = `${state.weather.city} · ${state.weather.desc}`;
  }
}

function initWeather() {
  const cached = loadJson("yiliu.home.weather");
  const customCity = localStorage.getItem("yiliu.home.weather.city") || "";
  if (cached && (Date.now() - cached.time < 30 * 60 * 1000) && cached.city === (customCity || cached.city)) {
    state.weather = cached;
    renderWeather();
  } else {
    fetchWeather(customCity);
  }
}

function handleWeatherClick() {
  const currentCity = localStorage.getItem("yiliu.home.weather.city") || "";
  const input = prompt("请输入城市英文/拼音 (例如: Hangzhou, Beijing, Tokyo):", currentCity);
  if (input === null) return;
  const trimmed = input.trim();
  localStorage.setItem("yiliu.home.weather.city", trimmed);
  fetchWeather(trimmed);
}

// ==========================================
// CALENDAR COMPONENT
// ==========================================
state.currentCalendarDate = new Date();
state.selectedCalendarDate = null;

function renderCalendar() {
  const year = state.currentCalendarDate.getFullYear();
  const month = state.currentCalendarDate.getMonth();
  
  $("#calendarMonthLabel").textContent = `${year}年${month + 1}月`;
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const grid = $("#calendarGrid");
  grid.innerHTML = "";
  
  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day is-empty";
    grid.appendChild(emptyCell);
  }
  
  const today = new Date();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    cell.textContent = String(day);
    
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cell.dataset.date = dateStr;
    
    if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
      cell.classList.add("is-today");
    }
    
    if (state.selectedCalendarDate === dateStr) {
      cell.classList.add("is-selected");
    }
    
    const completedCount = getCompletedTasksCountForDate(dateStr);
    if (completedCount > 0) {
      const dot = document.createElement("span");
      dot.className = "calendar-dot";
      cell.appendChild(dot);
    }
    
    cell.addEventListener("click", () => {
      state.selectedCalendarDate = dateStr;
      $$(".calendar-day").forEach(c => c.classList.remove("is-selected"));
      cell.classList.add("is-selected");
      renderCalendarDayDetails(dateStr);
    });
    
    grid.appendChild(cell);
  }
  
  if (state.selectedCalendarDate) {
    renderCalendarDayDetails(state.selectedCalendarDate);
  } else {
    $("#calendarDayDetails").classList.add("hidden");
  }
}

function getCompletedTasksCountForDate(dateStr) {
  return state.tasks.filter(task => {
    if (!task.done || !task.completed_at) return false;
    const compDate = new Date(task.completed_at);
    const y = compDate.getFullYear();
    const m = String(compDate.getMonth() + 1).padStart(2, "0");
    const d = String(compDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}` === dateStr;
  }).length;
}

function renderCalendarDayDetails(dateStr) {
  const container = $("#calendarDayDetails");
  const list = $("#calendarDetailsList");
  const title = $("#calendarDetailsDate");
  
  const completed = state.tasks.filter(task => {
    if (!task.done || !task.completed_at) return false;
    const compDate = new Date(task.completed_at);
    const y = compDate.getFullYear();
    const m = String(compDate.getMonth() + 1).padStart(2, "0");
    const d = String(compDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}` === dateStr;
  });
  
  const parts = dateStr.split("-");
  title.textContent = `${Number(parts[1])}月${Number(parts[2])}日 任务动态`;
  
  list.innerHTML = "";
  if (completed.length === 0) {
    const li = document.createElement("li");
    li.textContent = "这天没有已完成的任务。";
    li.style.color = "var(--muted)";
    li.style.fontStyle = "italic";
    list.appendChild(li);
  } else {
    for (const task of completed) {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${escapeHtml(task.title)}</span>
        <em>${priorityText(task.priority)}</em>
      `;
      list.appendChild(li);
    }
  }
  container.classList.remove("hidden");
}

function handlePrevMonth() {
  const current = state.currentCalendarDate;
  state.currentCalendarDate = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  renderCalendar();
}

function handleNextMonth() {
  const current = state.currentCalendarDate;
  state.currentCalendarDate = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  renderCalendar();
}

// ==========================================
// HABIT TRACKER COMPONENT
// ==========================================
async function saveHabits(habitsList) {
  if (!state.session?.user?.id) return null;
  const payload = await rest("notes?on_conflict=user_id,kind", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      user_id: state.session.user.id,
      kind: "habits",
      title: "习惯打卡",
      body: JSON.stringify({ habits: habitsList }),
      updated_at: new Date().toISOString(),
    },
  });
  const habitsNote = payload?.[0] || null;
  state.habits = habitsNote?.body ? JSON.parse(habitsNote.body).habits : state.habits;
  renderHabits();
  return payload;
}

function renderHabits() {
  const list = $("#habitsList");
  list.className = "habits-list";
  list.innerHTML = "";
  if (!state.habits || !state.habits.length) {
    list.className = "habits-list empty-state";
    list.textContent = "还没有习惯打卡。点击 New habit 新建！";
    return;
  }
  
  const todayStr = getTodayString();
  
  for (const habit of state.habits) {
    const isCheckedToday = (habit.history || []).includes(todayStr);
    const card = document.createElement("div");
    card.className = `habit-item ${isCheckedToday ? "is-checked" : ""}`;
    
    let dotsHtml = "";
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDateString(date);
      const done = (habit.history || []).includes(dateStr);
      dotsHtml += `<span class="habit-dot ${done ? "is-done" : ""}" title="${dateStr}"></span>`;
    }
    
    card.innerHTML = `
      <div class="habit-left">
        <div class="habit-title-row">
          <span class="habit-title">${escapeHtml(habit.title)}</span>
          <span class="habit-streak" title="连续打卡天数">🔥 ${habit.streak || 0}</span>
        </div>
        <div class="habit-history-dots">
          ${dotsHtml}
        </div>
      </div>
      <button class="habit-check-btn" type="button" aria-label="打卡">
        <svg viewBox="0 0 24 24"><path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="habit-delete-btn" type="button">删除</button>
    `;
    
    card.querySelector(".habit-check-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleHabitCheck(habit.id);
    });
    
    card.addEventListener("click", () => {
      toggleHabitCheck(habit.id);
    });
    
    card.querySelector(".habit-delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`确定删除习惯“${habit.title}”吗？`)) {
        deleteHabit(habit.id);
      }
    });
    
    list.appendChild(card);
  }
}

function getTodayString() {
  const d = new Date();
  return formatDateString(d);
}

function formatDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function toggleHabitCheck(habitId) {
  if (!state.session?.access_token) {
    setStatus("请先登录", "error");
    toggle("#setupPanel", true);
    return;
  }
  
  const todayStr = getTodayString();
  const updated = state.habits.map(habit => {
    if (habit.id !== habitId) return habit;
    
    let history = [...(habit.history || [])];
    const idx = history.indexOf(todayStr);
    if (idx !== -1) {
      history.splice(idx, 1);
    } else {
      history.push(todayStr);
    }
    
    const streak = calculateStreak(history);
    return { ...habit, history, streak };
  });
  
  setBusy(true);
  try {
    await saveHabits(updated);
  } catch (err) {
    console.error("Failed to check habit:", err);
    setStatus("打卡更新失败", "error");
  } finally {
    setBusy(false);
  }
}

function calculateStreak(history) {
  if (!history || history.length === 0) return 0;
  const datesSet = new Set(history);
  let streak = 0;
  let checkDate = new Date();
  
  let dateStr = formatDateString(checkDate);
  if (!datesSet.has(dateStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
    dateStr = formatDateString(checkDate);
  }
  
  while (datesSet.has(dateStr)) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    dateStr = formatDateString(checkDate);
  }
  
  return streak;
}

async function createHabit(event) {
  event.preventDefault();
  const title = $("#habitTitle").value.trim();
  if (!title) return;
  
  const newHabit = {
    id: String(Date.now()),
    title: title,
    history: [],
    streak: 0
  };
  
  const updated = [...state.habits, newHabit];
  
  setBusy(true);
  try {
    await saveHabits(updated);
    $("#habitTitle").value = "";
    toggle("#habitForm", false);
  } catch (err) {
    console.error("Failed to create habit:", err);
    setStatus("习惯创建失败", "error");
  } finally {
    setBusy(false);
  }
}

async function deleteHabit(habitId) {
  const updated = state.habits.filter(habit => habit.id !== habitId);
  setBusy(true);
  try {
    await saveHabits(updated);
  } catch (err) {
    console.error("Failed to delete habit:", err);
    setStatus("习惯删除失败", "error");
  } finally {
    setBusy(false);
  }
}

const DATA_KEY = "yiliu.home.data";
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

function loadLocalData() {
  const stored = loadJson(DATA_KEY);
  if (stored) {
    state.links = stored.links || [];
    state.tasks = stored.tasks || [];
    state.sources = stored.sources || [];
    state.feedItems = stored.feedItems || [];
    state.note = stored.note || null;
    state.habits = stored.habits || [];
  }
}

function saveLocalData() {
  localStorage.setItem(
    DATA_KEY,
    JSON.stringify({
      links: state.links,
      tasks: state.tasks,
      sources: state.sources,
      feedItems: state.feedItems,
      note: state.note,
      habits: state.habits,
    })
  );
}

const state = {
  links: [],
  tasks: [],
  sources: [],
  feedItems: [],
  note: null,
  activeLinkCategory: "全部",
  habits: [],
  noteSaveTimer: null,
  weather: null,
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
  $("#taskForm").addEventListener("submit", createTask);
  $("#linkForm").addEventListener("submit", createLink);
  $("#sourceForm").addEventListener("submit", createSource);
  $("#toggleLinkForm").addEventListener("click", () => toggle("#linkForm"));
  $("#toggleSourceForm").addEventListener("click", () => toggle("#sourceForm"));
  $("#clearDoneButton").addEventListener("click", clearDoneTasks);
  $("#noteBody").addEventListener("input", scheduleNoteSave);

  $("#prevMonthBtn").addEventListener("click", handlePrevMonth);
  $("#nextMonthBtn").addEventListener("click", handleNextMonth);
  $("#toggleHabitForm").addEventListener("click", () => toggle("#habitForm"));
  $("#habitForm").addEventListener("submit", createHabit);
  $("#weatherDisplay").addEventListener("click", handleWeatherClick);
  $("#weatherDisplay").addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleWeatherClick();
    }
  });

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
  loadLocalData();
  const isFirstUse = !state.links.length && !state.tasks.length && !state.sources.length && !state.note && !state.habits.length;
  if (isFirstUse) {
    seedLocalData();
  }
  renderAll();
  setStatus("本地存储", "ok");
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

function setStatus(message, type = "idle") {
  const node = $("#syncStatus");
  if (!node) return;
  node.textContent = message;
  node.className = `status-pill is-${type}`;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function localRow(table, fields) {
  const row = { id: uid(), ...fields };
  state[table].push(row);
  saveLocalData();
  return row;
}

function localUpdate(table, id, patch) {
  const idx = state[table].findIndex((row) => row.id === id);
  if (idx !== -1) {
    state[table][idx] = { ...state[table][idx], ...patch };
    saveLocalData();
  }
}

function localDelete(table, id) {
  state[table] = state[table].filter((row) => row.id !== id);
  saveLocalData();
}

function loadDashboard() {
  renderAll();
  setStatus("已保存", "ok");
}

function seedLocalData() {
  if (!state.links.length) {
    state.links = DEFAULT_LINKS.map(([title, url, category, description, accent, sort_order]) => ({
      id: uid(),
      title,
      url,
      category,
      description,
      accent,
      sort_order,
    }));
  }
  if (!state.tasks.length) {
    state.tasks = DEFAULT_TASKS.map(([title, priority, sort_order]) => ({
      id: uid(),
      title,
      priority,
      sort_order,
    }));
  }
  if (!state.sources.length) {
    state.sources = DEFAULT_SOURCES.map(([title, url, kind, category, description, sort_order]) => ({
      id: uid(),
      title,
      url,
      kind,
      category,
      description,
      sort_order,
    }));
  }
  if (!state.note) {
    state.note = {
      id: uid(),
      kind: "scratch",
      title: "随手记",
      body: "临时想法、会议链接、命令片段都可以先放这里。",
      updated_at: new Date().toISOString(),
    };
  }
  if (!state.habits || !state.habits.length) {
    state.habits = [
      { id: uid(), title: "每日阅读 30m", history: [], streak: 0 },
      { id: uid(), title: "每日专注编程", history: [], streak: 0 },
    ];
  }
  saveLocalData();
}

function renderAll() {
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
    list.textContent = "还没有内容。本地模式下仅管理信息源，RSS 抓取已停用。";
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
    savedNode.textContent = "已保存";
    savedNode.className = "mini-pill is-ok";
  } else {
    savedNode.textContent = "未保存";
    savedNode.className = "mini-pill";
  }
}

function createTask(event) {
  event.preventDefault();
  const title = $("#taskInput").value.trim();
  if (!title) return;
  localRow("tasks", {
    title,
    priority: $("#taskPriority").value,
    sort_order: Date.now(),
    done: false,
  });
  $("#taskInput").value = "";
  loadDashboard();
}

function updateTask(id, patch) {
  const payload = { ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, "done")) {
    payload.completed_at = patch.done ? new Date().toISOString() : null;
  }
  localUpdate("tasks", id, payload);
  loadDashboard();
}

function clearDoneTasks() {
  state.tasks = state.tasks.filter((task) => !task.done);
  saveLocalData();
  loadDashboard();
}

function createLink(event) {
  event.preventDefault();
  localRow("links", {
    title: $("#linkTitle").value.trim(),
    url: normalizeUrl($("#linkUrl").value),
    category: $("#linkCategory").value.trim() || "常用",
    description: "",
    accent: randomAccent(),
    sort_order: Date.now(),
  });
  $("#linkForm").reset();
  $("#linkCategory").value = "常用";
  toggle("#linkForm", false);
  loadDashboard();
}

function createSource(event) {
  event.preventDefault();
  localRow("sources", {
    title: $("#sourceTitle").value.trim(),
    url: normalizeUrl($("#sourceUrl").value),
    category: $("#sourceCategory").value.trim() || "资讯",
    kind: $("#sourceKind").value,
    description: "",
    sort_order: Date.now(),
  });
  $("#sourceForm").reset();
  $("#sourceCategory").value = "技术";
  toggle("#sourceForm", false);
  loadDashboard();
}

function deleteRow(table, id) {
  localDelete(table, id);
  loadDashboard();
}

function scheduleNoteSave() {
  const savedNode = $("#noteSaved");
  savedNode.textContent = "保存中";
  savedNode.className = "mini-pill";
  clearTimeout(state.noteSaveTimer);
  const value = $("#noteBody").value;
  state.noteSaveTimer = setTimeout(() => {
    try {
      saveNote(value);
    } catch (error) {
      console.error(error);
      savedNode.textContent = "保存失败";
      savedNode.className = "mini-pill is-error";
    }
  }, 650);
}

function saveNote(body) {
  state.note = {
    ...(state.note || {}),
    id: state.note?.id || uid(),
    kind: "scratch",
    title: "随手记",
    body,
    updated_at: new Date().toISOString(),
  };
  saveLocalData();
  const savedNode = $("#noteSaved");
  savedNode.textContent = "已保存";
  savedNode.className = "mini-pill is-ok";
  return state.note;
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
  $$("button").forEach((button) => {
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
  if (!node) return;
  const shouldShow = typeof forced === "boolean" ? forced : node.classList.contains("hidden");
  node.classList.toggle("hidden", !shouldShow);
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
function saveHabits(habitsList) {
  state.habits = habitsList;
  saveLocalData();
  renderHabits();
  return state.habits;
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

function toggleHabitCheck(habitId) {
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
  
  saveHabits(updated);
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

function createHabit(event) {
  event.preventDefault();
  const title = $("#habitTitle").value.trim();
  if (!title) return;
  
  const newHabit = {
    id: uid(),
    title: title,
    history: [],
    streak: 0
  };
  
  const updated = [...state.habits, newHabit];
  saveHabits(updated);
  $("#habitTitle").value = "";
  toggle("#habitForm", false);
}

function deleteHabit(habitId) {
  const updated = state.habits.filter(habit => habit.id !== habitId);
  saveHabits(updated);
}

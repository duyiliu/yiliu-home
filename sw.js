/* yiliu-home Service Worker
 * 页面导航 = network-first（在线拿最新）；静态资源 = stale-while-revalidate。
 * 更新站点代码后改 CACHE 版本号即可强制换缓存。 */
const CACHE = 'yiliu-home-v7';
const CORE = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  // V2 应用入口与全部模块（hash 路由，深链都落到根页面）
  '/src/app.js',
  '/src/router.js',
  '/src/store.js',
  '/src/core/Router.js',
  '/src/core/Store.js',
  '/src/core/middlewares.js',
  '/src/core/migration.js',
  '/src/components/base/Component.js',
  '/src/components/base/Modal.js',
  '/src/components/base/Toast.js',
  '/src/components/BookmarkCard.js',
  '/src/components/BookmarkGrid.js',
  '/src/components/Calendar.js',
  '/src/components/HabitTracker.js',
  '/src/components/SearchBar.js',
  '/src/components/TaskItem.js',
  '/src/components/TaskList.js',
  '/src/components/Weather.js',
  '/src/services/bookmarkService.js',
  '/src/services/habitService.js',
  '/src/services/searchService.js',
  '/src/services/taskService.js',
  '/src/services/weatherService.js',
  '/src/utils/helpers.js',
  '/src/views/BaseView.js',
  '/src/views/BookmarksView.js',
  '/src/views/DashboardView.js',
  '/src/views/SettingsView.js',
  '/src/views/StatsView.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // 页面导航：网络优先——在线永远拿最新页面（改版能立即生效），离线或 404 才回退根入口
  // cache:'no-store' 绕过浏览器 HTTP 缓存（GitHub Pages 对 HTML 也发 max-age=600），根治"改版后 10 分钟看不到更新"
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match('/index.html')))
    );
    return;
  }
  // 静态资源：stale-while-revalidate
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fresh = fetch(event.request)
        .then((res) => {
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
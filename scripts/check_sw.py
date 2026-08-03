# -*- coding: utf-8 -*-
"""验证 sw.js v4 + nav.html 注册：SW 安装、缓存名、导航请求由 SW 接管（from_service_worker）"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context()
    pg = ctx.new_page()
    nav_from_sw = []

    def on_resp(r):
        if "nav.html" in r.url and r.request.resource_type == "document":
            nav_from_sw.append(r.from_service_worker)

    pg.on("response", on_resp)
    pg.goto("http://127.0.0.1:8011/nav.html", timeout=15000)
    # 等 SW 就绪（nav.html 现在会注册）
    sw_state = pg.evaluate(
        "navigator.serviceWorker.ready.then(r => ({scope: r.scope, active: r.active.scriptURL}))"
    )
    print("SW:", sw_state)
    print("Caches:", pg.evaluate("caches.keys()"))
    # 二次导航：此时应由 SW 接管
    pg.reload()
    pg.wait_for_selector("#lockPassword", timeout=5000)
    print("nav.html 响应来自 SW:", nav_from_sw)
    # 解锁确认页面正常
    pg.fill("#lockPassword", "Ws00350425")
    pg.click("#lockSubmit")
    pg.wait_for_selector("#lockScreen", state="hidden", timeout=5000)
    groups = pg.evaluate(
        "[...document.querySelectorAll('.group-item')].map(e => e.textContent.trim())"
    )
    print("侧栏:", groups)
    b.close()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""本地打开导航站 nav.html，解锁并截桌面/移动端两图"""
import sys, time
from playwright.sync_api import sync_playwright

PASSWORD = "Ws00350425"
URL = "http://127.0.0.1:8011/nav.html"
OUT_DESK = sys.argv[1] if len(sys.argv) > 1 else "screenshots/local_nav_desktop.png"
OUT_MOBILE = sys.argv[2] if len(sys.argv) > 2 else "screenshots/local_nav_mobile.png"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # ---- 桌面 1440x900 ----
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.goto(URL, timeout=15000)
    # 锁屏
    pg.wait_for_selector("#lockPassword", timeout=5000)
    pg.fill("#lockPassword", PASSWORD)
    pg.click("#lockSubmit")
    pg.wait_for_selector("#lockScreen", state="hidden", timeout=5000)
    pg.wait_for_timeout(1200)
    print("DESKTOP unlocked, title:", pg.title())
    # 卡片数量
    n = pg.evaluate("document.querySelectorAll('.bk-card').length")
    print("DESKTOP bk-card count:", n)
    pg.screenshot(path=OUT_DESK, full_page=True)
    ctx.close()

    # ---- 移动端 390x844 (iPhone 14 尺寸) ----
    ctx2 = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True,
                         device_scale_factor=2)
    pg2 = ctx2.new_page()
    pg2.goto(URL, timeout=15000)
    pg2.wait_for_selector("#lockPassword", timeout=5000)
    pg2.fill("#lockPassword", PASSWORD)
    pg2.click("#lockSubmit")
    pg2.wait_for_selector("#lockScreen", state="hidden", timeout=5000)
    pg2.wait_for_timeout(1200)
    # 校验移动端样式生效：操作按钮是否改为静态全宽
    actions_css = pg2.evaluate("getComputedStyle(document.querySelector('.bk-card-actions')).position")
    touch_targets = pg2.evaluate("[...document.querySelectorAll('.group-item')].slice(0,3).map(e => e.getBoundingClientRect().height)")
    print("MOBILE bk-card-actions position:", actions_css)
    print("MOBILE group-item heights:", touch_targets)
    pg2.screenshot(path=OUT_MOBILE, full_page=True)
    ctx2.close()

    b.close()
print("OK:", OUT_DESK, OUT_MOBILE)

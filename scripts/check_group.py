# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    pg.goto("http://127.0.0.1:8011/nav.html", timeout=15000)
    pg.fill("#lockPassword", "Ws00350425")
    pg.click("#lockSubmit")
    pg.wait_for_selector("#lockScreen", state="hidden", timeout=5000)
    pg.click("text=科学上网")
    pg.wait_for_timeout(600)
    cards = pg.evaluate(
        "[...document.querySelectorAll('.bk-card .bk-card-title')].map(e => e.textContent.trim())"
    )
    print("科学上网分组卡片:", cards)
    # 回到全部
    pg.click("text=全部")
    pg.wait_for_timeout(500)
    n = pg.evaluate("document.querySelectorAll('.bk-card').length")
    print("全部卡片数:", n)
    b.close()

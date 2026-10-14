import time
from playwright.sync_api import sync_playwright
B = "http://localhost:5173"
res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    # Empty: a brand-new account through the sign-up form.
    c = b.new_context(viewport={"width": 1280, "height": 900}); pg = c.new_page()
    pg.goto(f"{B}/auth?mode=signup")
    email = f"new{int(time.time())}@poultrypilot.test"
    pg.fill("input[autocomplete=name]", "New Farmer"); pg.fill("input[placeholder='Green Valley Poultry']", "Fresh Start Farm")
    pg.fill("input[type=email]", email); pg.fill("input[type=password]", "freshstart123"); pg.click("button[type=submit]")
    pg.wait_for_url("**/dashboard", timeout=20000); pg.wait_for_load_state("networkidle")
    try:
        pg.get_by_text("No active flocks yet.").wait_for(timeout=8000); res["empty_dashboard"] = True
    except Exception:
        res["empty_dashboard"] = False
    pg.goto(f"{B}/flocks"); pg.wait_for_load_state("networkidle"); res["empty_flocks"] = pg.get_by_text("No batches yet.").is_visible()
    pg.goto(f"{B}/eggs"); pg.wait_for_load_state("networkidle"); res["empty_eggs"] = pg.get_by_text("No laying flocks.").is_visible()
    pg.goto(f"{B}/market"); pg.wait_for_load_state("networkidle"); res["empty_market"] = pg.get_by_text("No orders yet.").is_visible()
    # Offline: the loaded page stays, a banner explains, saving refuses clearly.
    pg.goto(f"{B}/flocks"); pg.wait_for_load_state("networkidle")
    c.set_offline(True); pg.wait_for_timeout(300)
    res["offline_banner"] = pg.get_by_text("You're offline.").is_visible()
    pg.get_by_role("button", name="Add a house").click()
    pg.fill("input[name=name]", "Shed 2"); pg.get_by_role("button", name="Add house").click(); pg.wait_for_timeout(500)
    res["offline_save_refused"] = pg.get_by_role("alert").filter(has_text="nothing was saved").count() == 1
    res["offline_single_message"] = pg.get_by_text("nothing was saved").count() == 1
    res["offline_kept_typing"] = pg.input_value("input[name=name]") == "Shed 2"
    c.set_offline(False); pg.wait_for_timeout(300)
    res["online_banner_gone"] = pg.get_by_text("You're seeing the last data loaded").count() == 0
    pg.get_by_role("button", name="Add house").click(); pg.wait_for_timeout(1200)
    res["online_save_works"] = pg.get_by_text("Shed 2").first.is_visible()
    # Error: the houses endpoint fails; the page shows a retryable error, the rest still works.
    pg.route("**/api/v1/farms/*/houses", lambda r: r.fulfill(status=500, content_type="application/json", body='{"error":{"code":"INTERNAL","message":"Something went wrong on our side.","requestId":"req-test-123"}}'))
    pg.goto(f"{B}/flocks"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(2500)
    res["error_panel"] = pg.get_by_text("Something went wrong on our side.").is_visible()
    res["error_reference"] = pg.get_by_text("Reference req-test-123").is_visible()
    res["error_retry_button"] = pg.get_by_role("button", name="Try again").first.is_visible()
    pg.unroute("**/api/v1/farms/*/houses")
    # Loading: a slow response shows skeletons first.
    def slow(route):
        time.sleep(1.5); route.continue_()
    pg.route("**/api/v1/farms/*/dashboard", slow)
    pg.goto(f"{B}/dashboard")
    try:
        pg.wait_for_selector("[aria-busy=true]", timeout=1400); res["loading_skeleton"] = True
    except Exception:
        res["loading_skeleton"] = False
    b.close()
for k, v in res.items(): print(f"{'PASS' if v else 'FAIL'}  {k}")
print(f"{sum(res.values())}/{len(res)} passed")

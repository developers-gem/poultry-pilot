"""Browser verification of every migrated route against the running API (Playwright, Chromium)."""
import json, re, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
VIEWPORTS = {"desktop": (1440, 900), "tablet": (820, 1180), "phone": (390, 844)}

# Prototype headings (from the Lovable source): eyebrow, title, section headings.
PROTO = {
    "/dashboard": ("Overview", None, ["Flock & house status", "Egg production · last 7 days", "Farm alerts", "FeedWise · consumption", "Hatchery"]),
    "/flocks": ("BroilerProfit", "Flocks & batch profit", ["Add a flock or batch", "Add a house", "Batch performance", "Houses"]),
    "/lifecycle": ("BroilerProfit", "Batch lifecycle", ["Every batch, hatch to sale"]),
    "/weights": ("BroilerProfit", "Bird weight tracker", ["Weight gain by flock", "All weigh-ins"]),
    "/chicks": ("ChickStart", "Chick arrival & brooding", ["Log a brooder check", "Brooding log"]),
    "/hatchery": ("HatcheryHub", "Incubation & chick orders", ["Set a new batch", "Incubation calendar", "Hatch results"]),
    "/eggs": ("EggCount", "Egg collection", ["Record egg collection", "Last 14 days", "Collection history"]),
    "/feed": ("FeedWise", "Feed inventory & cost", ["Record a feed purchase", "Record feed used", "Daily consumption · 14 days", "Purchases & supplier prices"]),
    "/health": ("FlockHealth", "Health, vaccination & mortality", ["Add a health record", "Record deaths", "Mortality · last 14 days", "Vaccination schedule", "Health history"]),
    "/biosecurity": ("BioSecure Farm", "Biosecurity checks & logs", ["Add a biosecurity entry", "Worker cleaning checklist"]),
    "/calendar": ("Farm calendar", "Plan vaccinations, vet visits & hatch dates", ["Coming up"]),
    "/weather": ("Farm Weather", "Temperature, humidity & rainfall", ["Last 7 days — high temperature (°C)", "Last 7 days — rainfall (mm)", "Next 7 days forecast", "Climate impact on your flocks"]),
    "/money": ("Money", "Expenses & sales", ["Record money in or out", "Where the money goes", "Transactions"]),
    "/expenses": ("Running costs", "Recurring expenses", ["Add a recurring cost", "Monthly cost by category", "All recurring costs"]),
    "/market": ("PoultryMarketConnect", "Sell birds, eggs & chicks", ["Orders you received"]),
    "/training": ("Training", "Poultry farming course", []),
    "/facts": ("Poultry Facts", "Best practices handbook", []),
    "/news": ("Poultry News", "Updates, outbreaks & prices", ["Farming updates"]),
    "/glossary": ("Poultry Glossary", "Farming terms, simply explained", []),
    "/farm-profile": ("Farm identity", None, ["Farm details"]),
    "/alerts": ("FarmAlert", "Alerts", []),
}
PUBLIC = ["/", "/auth"]

def run():
    report = {"routes": {}, "summary": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        def signed_in(w, h):
            # One signed-in session per viewport, as a person would have (signed in through the real form).
            c = browser.new_context(viewport={"width": w, "height": h})
            pg = c.new_page()
            pg.goto(f"{BASE}/auth")
            pg.fill("input[type=email]", "demo@poultrypilot.test")
            pg.fill("input[type=password]", "goodpass123")
            pg.click("button[type=submit]")
            pg.wait_for_url("**/dashboard", timeout=20000)
            return c, pg
        for vp, (w, h) in VIEWPORTS.items():
            public = browser.new_context(viewport={"width": w, "height": h})
            ctx, signed = signed_in(w, h)
            for route in PUBLIC + list(PROTO):
                pg = public.new_page() if route in PUBLIC else signed
                errors, failed = [], []
                h1 = lambda m: errors.append(m.text) if m.type == "error" else None
                h2 = lambda e: errors.append(f"pageerror: {e}")
                h3 = lambda r: failed.append(f"{r.status} {r.request.method} {r.url.replace(BASE, '')}") if "/api/" in r.url and r.status >= 400 else None
                pg.on("console", h1); pg.on("pageerror", h2); pg.on("response", h3)
                pg.goto(f"{BASE}{route}")
                try:
                    pg.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    errors.append("network never went idle")
                pg.wait_for_timeout(700)
                info = pg.evaluate("""() => ({
                  h1: document.querySelector('h1')?.innerText ?? null,
                  eyebrow: document.querySelector('main h1')?.previousElementSibling?.innerText ?? null,
                  headings: [...document.querySelectorAll('h2')].map(h => h.innerText.trim()),
                  alerts: [...document.querySelectorAll('[role=alert]')].map(a => a.innerText.trim()).filter(Boolean),
                  overflowX: document.documentElement.scrollWidth - window.innerWidth,
                  url: location.pathname,
                })""")
                shot = f"e2e/output/{vp}{route.replace('/', '_') or '_root'}.png"
                pg.screenshot(path=shot, full_page=True)
                pg.remove_listener("console", h1); pg.remove_listener("pageerror", h2); pg.remove_listener("response", h3)
                r = {"url": info["url"], "h1": info["h1"], "eyebrow": info["eyebrow"], "errors": errors, "failedApi": failed, "errorPanels": info["alerts"], "overflowX": info["overflowX"], "screenshot": shot}
                if route in PROTO:
                    pe, pt, sections = PROTO[route]
                    found = [s for s in sections if any(s.lower() in hh.lower() for hh in info["headings"])]
                    r["proto"] = {"eyebrowOk": bool(info["eyebrow"]) and pe.lower() in (info["eyebrow"] or "").lower(), "titleOk": pt is None or (info["h1"] or "") == pt, "missingSections": [s for s in sections if s not in found]}
                report["routes"].setdefault(route, {})[vp] = r
                if route in PUBLIC: pg.close()
            ctx.close(); public.close()
        browser.close()
    bad = []
    for route, vps in report["routes"].items():
        for vp, r in vps.items():
            problems = []
            if r["errors"]: problems.append(f"console: {r['errors'][:2]}")
            if r["failedApi"]: problems.append(f"api: {r['failedApi'][:3]}")
            if r["errorPanels"]: problems.append(f"panels: {r['errorPanels'][:2]}")
            if r["overflowX"] > 1: problems.append(f"overflowX {r['overflowX']}px")
            if route in PROTO and route not in PUBLIC and r["url"] != route: problems.append(f"redirected to {r['url']}")
            if problems: bad.append(f"{vp:7} {route}: " + "; ".join(problems))
    report["summary"] = {"checked": sum(len(v) for v in report["routes"].values()), "problems": bad}
    json.dump(report, open("e2e/output/report.json", "w"), indent=1)
    print(f"checked {report['summary']['checked']} route×viewport combinations; {len(bad)} with problems")
    for b in bad: print(" ", b)
    print("\nprototype comparison (desktop):")
    for route in PROTO:
        pr = report["routes"][route]["desktop"]["proto"]
        if not (pr["eyebrowOk"] and pr["titleOk"] and not pr["missingSections"]):
            print(f"  {route}: eyebrow {'ok' if pr['eyebrowOk'] else 'DIFF'} · title {'ok' if pr['titleOk'] else 'DIFF: ' + str(report['routes'][route]['desktop']['h1'])} · missing {pr['missingSections']}")

run()

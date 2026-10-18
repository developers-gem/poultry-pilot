import json
from collections import defaultdict
from playwright.sync_api import sync_playwright
ROUTES = ["/", "/auth", "/dashboard","/flocks","/lifecycle","/weights","/chicks","/hatchery","/eggs","/daily","/feed","/health","/biosecurity","/calendar","/weather","/money","/expenses","/market","/training","/facts","/news","/glossary","/farm-profile","/alerts"]
import os
AXE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "node_modules", "axe-core", "axe.min.js")).read()
summary = defaultdict(lambda: {"impact": None, "routes": set(), "nodes": 0, "help": ""})
with sync_playwright() as p:
    b = p.chromium.launch()
    for vp in [(1440, 900), (390, 844)]:
        c = b.new_context(viewport={"width": vp[0], "height": vp[1]}); pg = c.new_page()
        pg.goto("http://localhost:5173/auth"); pg.fill("input[type=email]", "demo@poultrypilot.test"); pg.fill("input[type=password]", "goodpass123"); pg.click("button[type=submit]"); pg.wait_for_url("**/dashboard", timeout=20000)
        for r in ROUTES:
            pg.goto("http://localhost:5173" + r); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(500)
            pg.add_script_tag(content=AXE)
            res = pg.evaluate("async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } })).violations.map(v => ({id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes.slice(0,2).map(x => x.target.join(' ') + ' :: ' + (x.failureSummary||'').split('\\n').slice(1,2).join(''))}))")
            for v in res:
                s = summary[v["id"]]; s["impact"] = v["impact"]; s["help"] = v["help"]; s["routes"].add(f"{r}@{vp[0]}"); s["nodes"] += v["n"]; s.setdefault("sample", v["sample"])
        c.close()
    b.close()
order = {"critical": 0, "serious": 1, "moderate": 2, "minor": 3}
for k, s in sorted(summary.items(), key=lambda kv: order.get(kv[1]["impact"], 9)):
    print(f"{s['impact']:9} {k}: {s['help']} — {s['nodes']} elements on {len(s['routes'])} route/size combos")
    for x in s.get("sample", [])[:2]: print("            e.g.", x[:170])
print("TOTAL rules violated:", len(summary))

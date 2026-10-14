# Browser verification of the web app

Checks every migrated route in Chromium against the real API (Playwright for Python).

```bash
# 1. The API on in-memory storage, seeded through its own endpoints with a realistic farm
npx tsx services/api/scripts/e2e-server.ts          # http://localhost:4000
# 2. The web app (proxies /api to :4000)
pnpm --filter @poultrypilot/web dev                 # http://localhost:5173
# 3. From apps/web
python3 e2e/verify.py   # 23 routes × desktop/tablet/phone: API failures, console errors, error panels,
                        # sideways overflow, prototype headings; screenshots in e2e/output/
python3 e2e/states.py   # empty (new account), offline, error and loading states
```

Sign-in for the seeded farm: `demo@poultrypilot.test` / `goodpass123` (test data only).

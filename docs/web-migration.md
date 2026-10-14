# Web app: migration from the Lovable prototype

The prototype (`flockfolio-pro`, TanStack Start + Supabase) is rebuilt in `apps/web` (React 19, Vite, TanStack Router and Query, Tailwind v4) on the PoultryPilot REST API.

## What is preserved

- **Identity:** the "PP" logo and "Poultry Pilot / Flock OS" lockup, with the farm name under the logo once signed in.
- **Look:**
  - the same oklch palette (ink, brand, mint, amber, rose, cyan, accent)
  - Space Grotesk headings over Inter body text
  - the 0.875 rem radius scale
  - the `prism-glass` frosted panels with the rainbow `prism-edge` and the soft colour blobs behind the page
- **Layout:**
  - each page's eyebrow, title and subtitle
  - stat rows of four glass cards
  - collapsible "Open form" cards
  - two- and three-column grids
  - the dashboard's 8/4 split
- **Navigation:** the prototype's nine groups (Dashboard, Flocks, Production, Health, Money, Market, Learn, Farm) with the same sub-pages and labels, and the alerts pill in the header.
- **Routes:** all 21 signed-in routes at the same paths, plus `/` and `/auth`.

## What changed, and why

| Area | Prototype | Now | Why |
| --- | --- | --- | --- |
| Data | Supabase tables read and written from the browser; FCR, profit, survival, lifecycle computed client-side | Every read and write through the API; figures come from the API's own calculations | One source of truth with server-side rules (withdrawal periods, stock, permissions) |
| Fake data | Training, Facts, News, Glossary hard-coded in components; News had a made-up price guide and outbreak watch | Content from `/api/v1/content` (editor-reviewed, sourced); empty states until editors publish; prices are medians of live PoultryMarket listings, labelled as asking prices | No fabricated facts, prices or outbreaks |
| Weather | Browser called Open-Meteo directly | `/farms/:id/weather` (backend, cached, with history and risk) | Requirement; one cache for all users |
| Sign-in | Supabase Auth, Lovable Google flow | API email and password, forgot and reset password, email verification link; Google button shown only when `VITE_GOOGLE_CLIENT_ID` is set | No Supabase; no button that cannot work |
| Colours | Mint, amber, rose and cyan used for text on white (about 2:1 contrast) | Same hues for fills, bars, badges and the edge; darker `-ink` shades of the same hue for text | Readability (WCAG AA) |
| Phone navigation | All 21 links wrapped in a strip under the header | "Menu" opens a grouped, near-opaque panel with a dimmed backdrop | Scannable; glass overlays were unreadable over content |
| Tables on phones | Scroll sideways | Each row becomes a small card | Readable without sideways scrolling |
| Forms | Reset even when saving failed; generic toast | Keep what was typed; server messages next to the field; one message, not inline plus toast | Usability |
| Deleting | One click | Confirm on a second click; "Remove day" says it removes the whole day's record | Prevents accidents |
| Dashboard "Expected profit" | Client-side sales minus estimated costs | "Batch profit": actual revenue minus costs across batches (API flock profitability); workers see open alerts instead | Real figure; money is permission-gated |
| Eggs "sold" | Typed count per log | Egg stock by grade, plus "eggs used or spoiled" movements; sales happen through orders or recorded income | Matches how the API moves egg stock |
| Egg entry | Separate log rows | `PATCH` of the day's record: changes only the eggs and keeps the day's feed and deaths | The API stores one record per flock per day |
| Weights | One bird per form | One weigh-in per form: several birds, or an average and a sample size; spread (range, CV, uniformity) shown | Matches the API; fewer taps |
| Lifecycle | Sale fields edited on the flock | "Record sale" and "Close" commands; projected profit computed by the API from a live price per kg you enter | Sales and closing have rules on the server |
| ChickStart | Static arrival checklist | Arrival plans, a preparation checklist from the farm's own templates, arrival that places the chicks, brooder checks, a brooding log | Real records |
| BioSecure | Static worker checklist | Cleaning schedules marked done (next date moves on), corrective actions completed then verified by someone else | Real records |
| Health | "Vaccination" as a health record; free-text treatment | Vaccinations module (schedule, given, skip); structured treatments with withdrawal days; deaths through the mortality endpoint | Withdrawal enforcement and reminders |
| Money | Dollar formatting | The farm's currency everywhere; money in minor units | Not every farm uses USD |
| Market | Listings, buyers, orders, payments | The same, plus browsing other farms' listings and orders you placed; order buttons follow the order's allowed next steps | The API's marketplace and order rules |
| Training | "Poultry farming course" (fixed lessons) | "Poultry farming courses" from the content API, with per-person progress | Content is editorial, not code |
| News title | "Updates, outbreaks & prices" | "Updates, disease information & prices" | No outbreak feed exists; disease articles carry references |
| Alerts | List | List, "Mark seen", and the 14 configurable alert rules (on/off, parameters) | Rules are farm-specific |

## Route map

All under `/api/v1/farms/:farmId` unless shown otherwise.

| Route | API |
| --- | --- |
| `/dashboard` | `GET /dashboard`, `/dashboard/trends`, `/flocks`, `/flocks/:id`, `/feed/stock`, `/finance/reports/flock-profitability`, `/hatchery/batches` |
| `/flocks` | `GET/POST /houses`, `DELETE /houses/:id`, `GET/POST /flocks`, `GET /flocks/:id`, `DELETE /flocks/:id` (planned batches only) |
| `/lifecycle` | `GET /flocks/:id/metrics?referencePricePerKgMinor`, `POST /flocks/:id/sales`, `POST /flocks/:id/close` |
| `/weights` | `GET/POST /flocks/:id/weighings`, `GET /flocks/:id` |
| `/chicks` | `/chickstart/arrivals` (+ `/preparation`, `/arrive`), `/chickstart/checks`, `/chickstart/flocks/:id`, `/biosecurity/checklists?kind=arrival_preparation` |
| `/hatchery` | `/hatchery/batches` (+ `/candling`, `/transfer`, `/hatch`, `/grading`), `/hatchery/summary`, `/chick-orders` (+ `/confirm`, `/deliver`), `/buyers` |
| `/eggs` | `GET/PATCH /flocks/:id/daily-records/:date`, `GET /daily-records`, `DELETE /daily-records/:id`, `/dashboard/trends`, `/inventory/eggs`, `POST /inventory/eggs/movements` |
| `/feed` | `/feed/analytics`, `/inventory/items?category=feed`, `POST /inventory/items`, `POST /inventory/items/:id/purchases`, `/inventory/lots?category=feed`, `GET/POST/DELETE /feed/consumption` |
| `/health` | `/health/records` (+ `/follow-up-done`), `/health/vaccinations` (+ `/administer`, `/skip`), `/health/reminders`, `POST /flocks/:id/mortality`, `/dashboard/trends` |
| `/biosecurity` | `/biosecurity/summary`, `/visitors` (+ `/check-out`), `/logs`, `/cleaning-schedules` (+ `/complete`), `/corrective-actions` (+ `/complete`, `/verify`) |
| `/calendar` | `/calendar`, `/calendar/ics` (download) |
| `/weather` | `/weather`, `/dashboard/trends` |
| `/money` | `/finance/reports/pnl`, `/finance/accounts`, `/finance/incomes`, `/finance/expenses` (+ `/payments`, `/cancel`) |
| `/expenses` | `/finance/recurring` (+ `/pause`, `/generate`), `/finance/expenses` |
| `/market` | `/market/listings` (+ `/status`), `/market/orders` (+ transitions, `/payments`), `/buyers`, `/finance/accounts`; root `GET /market/listings`, `GET/POST /market/orders` |
| `/training` | root `/content/courses`, `/content/courses/:slug`, `POST …/lessons/:id/complete` |
| `/facts` | root `/content/facts/today`, `/content/articles?kind=guide|fact`, `/content/articles/:slug` |
| `/news` | root `/content/news`, `/content/articles?kind=disease`, `/market/listings` |
| `/glossary` | root `/content/glossary` |
| `/farm-profile` | `GET/PUT /farms/:id`, root `PUT /me`, `/houses`, `/flocks` |
| `/alerts` | `/alerts` (+ `/acknowledge`, `/evaluate`), `/alert-rules`, `/dashboard/trends` |

Three endpoints were added for the web app, all with tests: `PATCH /flocks/:id/daily-records/:date`, `GET /flocks/:id/weighings` and `PUT /me`.

## States

- **Loading:** stat skeletons and row placeholders (`aria-busy`).
- **Empty:** a plain sentence and, where useful, the next step.
- **Error:** the server's message with a request reference and "Try again". Permission errors say the role doesn't include it. A crash in a screen shows a branded "This screen couldn't load" with retry, not a blank page.
- **Offline:**
  - a banner says you're seeing the last data loaded, and queries keep their cached data
  - saving refuses with "You're offline … nothing was saved" and keeps what was typed
  - queries refetch on reconnect

## Session

- **Access token:** kept in memory.
- **Refresh token:** kept in `localStorage`, so a reload stays signed in. The API rotates it on every use and revokes the session on reuse. Tabs refresh one at a time (Web Locks), so two tabs opened together cannot trip that reuse detection.
- **Hardening option:** an httpOnly-cookie session mode would keep the refresh token out of script reach. It is not built.

## Verification

Run with `apps/web/e2e/` (see its README). The real API runs on in-memory storage, seeded through its own endpoints, and Chromium drives the real web app.

- **`verify.py`:** 23 routes at desktop (1440), tablet (820) and phone (390) widths, 69 combinations. Result: **0 problems**, meaning no failed API calls, console or page errors, error panels or sideways overflow. Every prototype eyebrow and section heading is present. The only title differences are the two deliberate ones above.
- **`states.py`:** **14 of 14 pass**, run twice.
  - **Empty:** a new account signed up through the form.
  - **Offline:** banner, refusal with a single message, kept input, recovery.
  - **Error:** an injected 500 shows the message, its reference and a retry.
  - **Loading:** a slow response shows skeletons.
- **Unit tests (`src/migration.test.ts`):**
  - every prototype route exists, and every navigation link resolves
  - no Supabase, Lovable, Open-Meteo or other third-party call in the web source
  - only the API client calls `fetch`
- **Defects found by the browser runs and fixed:**
  - sign-in crashed on some browser locales
  - two tabs could revoke the session
  - Hatchery crashed on chick orders
  - the phone header was 9 px too wide
  - glass menus were unreadable
  - errors showed twice
  - houses in use offered "Remove"
- **Limits:** the prototype could not be run side by side, since its signed-in pages need a live Supabase project. The comparison is against its source and the two supplied screenshots (landing and sign-in), which the new pages match closely.

## Not done

- Google sign-in needs `VITE_GOOGLE_CLIENT_ID` and an API Google client.
- The prototype's hard-coded courses, facts and glossary were not imported, since they have no sources. They could be loaded as drafts for editors to review.
- No offline write queue: saving waits for a connection. The API's sync endpoints support one for the mobile app.
- No report download screen yet. Report exports exist in the API.

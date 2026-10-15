# Decisions log

Defaults chosen so work can proceed while the open questions in the audit document are unanswered.
Each is cheap to change until the phase named.

| # | Decision | Default taken | Change cost rises after |
| --- | --- | --- | --- |
| D1 | Package manager | pnpm workspaces | — |
| D2 | IDs | UUIDv7 strings, client-generated for offline creation | Phase 2 |
| D3 | Password hashing | Argon2id, 19 MiB memory, 2 iterations (OWASP baseline) | — |
| D4 | Access / refresh tokens | 15-minute HS256 JWT; 30-day opaque refresh token, rotated, reuse revokes family | Phase 7 (Flutter) |
| D5 | Non-member access to a farm | 404, not 403, so farm IDs cannot be probed | — |
| D6 | FCR convention | Excludes dead-bird weight by default; per-farm setting `fcrIncludesMortalityWeight` | Phase 2 |
| D7 | Worker edit window | Own production entries for today and yesterday (farm-local); setting `workerEditWindowDays` | Phase 2 |
| D8 | Profit basis | Farm profit is cash-basis from the ledger; batch margin is a separate management view with feed costed from issues | Phase 3 |
| D9 | Currency change | Allowed only while the farm has no ledger entries | Phase 3 |
| D10 | Alert defaults | Evaluate yesterday only; mortality alert when ≥3 deaths and above max(0.1% of flock, 2× 7-day baseline); egg drop 10%; feed change ±20% with ≥4 baseline days | Phase 4 |
| D11 | Job scheduler | Agenda on MongoDB (no Redis) | Phase 4 |
| D12 | Incubation days | chicken 21, duck 28, turkey 28, quail 17, guinea fowl 27; overridable per batch | Phase 2 |
| D13 | Web offline | Online-only web; offline is a Flutter capability | Phase 7 |

## Open questions still blocking specific work

- Real data in Supabase project `cgcjsvdgbkvuyadwvznr`, and the actual currency users typed → blocks Phase 8 importer.
- Species at launch → affects production profile seed data (Phase 2).
- Hosting region (Atlas region / data residency) → blocks staging environment.
- Marketplace buyer accounts → blocks Phase 5 design.

## Added with the monorepo restructure

| # | Decision | Choice |
| --- | --- | --- |
| D14 | Where business calculations live | `services/api/src/domain`, not a shared package, so no client can import business rules |
| D15 | Readiness vs liveness | `/health` checks MongoDB and returns 503 when it is down; `/health/live` never touches dependencies, so an orchestrator does not restart a healthy process during a database blip |
| D16 | Startup order | HTTP starts before MongoDB connects, so `/health` can report "degraded" during startup; the process exits if MongoDB never connects within the retry budget |
| D17 | Shared types for Flutter | Hand-written Dart models for now; generate a Dart client from `packages/contracts/openapi.json` once business endpoints exist |
| D18 | Local verification without Docker | FerretDB (MongoDB wire protocol) was used in the build environment to exercise connection, ping, failure and recovery; CI runs the same tests against real MongoDB 7 |

## Added with authentication and tenancy

| # | Decision | Choice |
| --- | --- | --- |
| D19 | Role values | Stored lowercase (`farm_manager`), like every other enum; display names are a UI concern |
| D20 | Session revocation | Checked on every request via the `sid` claim, so sign-outs are immediate; one indexed read per request |
| D21 | Brute-force protection | Per-IP rate limit on auth routes plus per-account lockout after 10 failures for 15 minutes; reset unlocks |
| D22 | Who can invite | Requires a verified email on the inviter (limits invitation spam from throwaway accounts) |
| D23 | Farm update semantics | `PUT` replaces all editable fields; omitted optional fields are cleared; `version` required |
| D24 | Non-member responses | 404 everywhere, identical to a missing farm, including for pending invitees and removed members |
| D25 | Mobile token storage | Refresh token in the platform keystore; web may move to an HttpOnly cookie later without API changes |

## Added with the full data model

| # | Decision | Choice |
| --- | --- | --- |
| D26 | Schema declaration | One `defineCollection` helper adds standard fields by ownership; every index must state the query it serves |
| D27 | Daily data shape | `daily_records` holds mortality, culls and conditions only; eggs, feed and water have their own per-day collections, so each fact has one home |
| D28 | Stock | Ledger collections are the source of truth; `stock` snapshots on items are derived and written in the same transaction |
| D29 | Corrections | Editable records are soft-deleted (`deletedAt: null` in every query); ledgers are append-only with `reversalOf` |
| D30 | Accrual vs cash | `expenses` are bills (may be unpaid); `transactions` are cash movements; profit is computed from `transactions` |
| D31 | Medicines | `medicines` holds clinical facts (withdrawal days); stock lives in `inventory_items` linked by `medicineId` |
| D32 | Mortality causes | "culled" removed from causes; culls are a separate count on `daily_records` |
| D33 | Unknown fields | Schemas use `strict: "throw"` so code that writes an undeclared field fails in tests |
| D34 | Data dictionary | Generated from the schemas; a test fails when it is stale |

## Added with the flock engine

| # | Decision | Choice |
| --- | --- | --- |
| D35 | Where deaths and culls live | `flock_events` is the single ledger for every bird-count change, including mortality and culls; daily records post them as linked events (supersedes D27's mortality fields on daily_records) |
| D36 | Flock types | `broiler`, `layer`, `breeder`, `chick`, `custom` (+ `customTypeName`); replaces the earlier purpose list |
| D37 | Transfers | Stored as paired out/in events with a shared `groupId`; acquisition cost per bird moves with the birds; feed cost stays with the flock that ate it |
| D38 | Impossible operations | Birds alive ≥ 0 at the end of every day from the event's date onward; birds available on a date = minimum alive over that date and all later dates |
| D39 | Concurrency | Every flock command updates the flock document with its expected version, so concurrent commands on one flock cannot both pass the bird check |
| D40 | Corrections | Reversal events for placement, death, cull, adjustment, sale and weighing; paired and structural events are corrected by the opposite movement; daily-record entries by editing the record |
| D41 | Sale buyer | `buyerId` omitted until the buyers module can confirm the buyer belongs to the farm (avoids the cross-farm reference gap from the audit) |

## Added with daily farm operations

| # | Decision | Choice |
| --- | --- | --- |
| D42 | Daily record shape | A thin header; each section is written to its source collection in one transaction and linked by `dailyRecordId` (no duplicated facts) |
| D43 | List speed | A derived `summary` on each record, rewritten in the same transaction, so lists read one collection |
| D44 | Dashboards | Grouped sums run on the database for each source collection; reversals carry the same type and figures as the original and are subtracted |
| D45 | Farm-less URLs | `/daily-records/:id` locates the record's farm, then applies the normal membership check; non-members get the same 404 as a missing record |
| D46 | Headcount | `observedBirdCount` is compared with the ledger and shown as a difference; it never changes the ledger (a supervisor posts an adjustment) |
| D47 | Edits | Each section is diffed and rewritten only if changed, so unchanged re-saves do not add history |
| D48 | Photos | Raw-body upload, type detected from content (JPEG, PNG, WebP), 5 MB limit, storage behind `MediaStorage` (local disk now, S3-compatible later), `media_assets` index per farm |
| D49 | Deleting a record | Reverses its ledger and egg-stock entries and soft-deletes its section rows, so the day can be recorded again |

## Added with FeedWise and inventory

| # | Decision | Choice |
| --- | --- | --- |
| D50 | One stock engine | Feed, medicine, vaccines and supplies share `inventory_items` → `inventory_lots` → `inventory_transactions`; `feed_items` and `feed_purchases` removed (one catalog, one ledger). Eggs and chicks keep their own ledgers and appear in the overview |
| D51 | Costing | Lot-based FEFO with each lot's actual unit cost (replaces moving average); positive stock counts valued at current average cost |
| D52 | Expired stock | Never issued for use; wastage writes expired lots off first |
| D53 | FCR definition | `fcr` is liveweight FCR (feed ÷ live + sold + moved-out weight); the earlier net-of-arrival figure is `feedPerKgGainKg` |
| D54 | Feed wastage | Recorded per flock or for the store; counted in feed cost, not in FCR |
| D55 | Alerts | Keyed per item, lot or flock/day; raised once, reopened, auto-resolved; evaluated in every stock transaction, on demand and hourly |
| D56 | Water limits | Defaults (±20% vs recent average, pH 6–8, dissolved solids ≤ 1,000 ppm) until per-farm alert rules are built; farms should set them from veterinary or local guidance |
| D57 | Inventory permissions | `inventory.read` all; `inventory.issue` field and vet roles; `inventory.manage` managers and accountants; `alert.manage` supervisors and above |

## Added with FlockHealth and BioSecure Farm

| # | Decision | Choice |
| --- | --- | --- |
| D58 | Diagnosis | Never generated. `assessment` stores text attributed to a named veterinarian, laboratory or staff member |
| D59 | Country rules | None built in: withdrawal periods from label or vet (per medicine, overridable per treatment, with source); vaccination programmes, visitor downtime and checklists are farm-defined; legal duties are referred to "local requirements" |
| D60 | Withdrawal enforcement | Meat withdrawal blocks sales and moves into other flocks through its last day; eggs laid during egg withdrawal are flagged `withheldUntil` (sales check with the market module) |
| D61 | No invented defaults | A medicine with no recorded withdrawal period produces no withdrawal; the app does not guess |
| D62 | Checklists | Farm-owned, versioned templates with per-item failure answers; failures create corrective actions and an alert; generic starter templates offered, never imposed |
| D63 | Corrective actions | Stored as `tasks` of kind `corrective_action`; completed by staff, verified by someone else (supervisor and above) |
| D64 | Health costs | Vet fees and medicine/vaccine stock used flow into flock cost through a flock-engine hook |
| D65 | Educational content | Published health and biosecurity articles must cite sources (model, repository and loader); seed articles need veterinary review and link checks before launch |
| D66 | Route namespaces | Every module owns a unique prefix (`/health`, `/biosecurity`, …); the idempotency middleware also runs once per request |

## Added with HatcheryHub and ChickStart

| # | Decision | Choice |
| --- | --- | --- |
| D67 | Hatchery ledger | Batch counts derived from `hatchery_events`; stage order enforced; hatch and grading must account for every egg and chick; corrections undo the latest stage |
| D68 | Fertility | fertile ÷ (eggs set − cracked): cracked eggs' fertility is unknown; hatchability = hatched ÷ fertile, with hatch of set also reported |
| D69 | Hatching eggs | Own-flock eggs leave egg stock at setting (refused beyond stock); selection rejects are recorded by reason and never set |
| D70 | Chick availability | Free chicks = lot remaining − open orders on the lot or on the batch it came from; delivery draws the lot |
| D71 | Brooding targets | Farm-defined profiles with a source; none built in; without a profile, checks are recorded but not judged |
| D72 | Arrival = placement | A ChickStart arrival creates the flock and draws the chick lot in the same transaction |
| D73 | Nested transactions | The MongoDB runner joins an active transaction (AsyncLocalStorage), matching the memory adapter |
| D74 | Calendar | Built on request from source records (never stored); iCalendar download for phone calendars |

## Added with Finance and PoultryMarket

| # | Decision | Choice |
| --- | --- | --- |
| D75 | Profit basis | P&L is accrual (document date, excluding tax); cash flow is reported separately from the ledger. Supersedes D8 |
| D76 | Documents and ledger | Bills (`expenses`) and incomes are accrual documents; payments, refunds, transfers and opening balances are cash `transactions` against one money account |
| D77 | Overpayment and refunds | No payment past the document total; no refund beyond what was paid; cash and mobile money accounts cannot go negative |
| D78 | Tax | Rate and label entered by the farm, inclusive or exclusive; reports show net amounts with tax separately; no country rules |
| D79 | Single currency | Documents, payments and listings must be in the farm currency |
| D80 | Costing without double counting | Flock cost = flock engine (chicks, feed eaten, health) + bills allocated to the flock except purchase and vet bills; flock revenue = sale events + hand-entered allocated income |
| D81 | Automatic postings | Inventory purchases, vet fees, bird sales and accepted orders create documents; those documents change only through their source |
| D82 | Order state machine | One transition table and function; actor rules for buyer and seller; pickup skips dispatch; completion needs full payment; chick orders use it too |
| D83 | Listing reservation | Quantity reserved on acceptance (refused beyond what is left), returned on cancellation |
| D84 | Marketplace privacy and pricing | Listings never carry seller contact; buyers see it after acceptance; prices come only from the listing (fixes B8) |
| D85 | Delivery moves stock | Eggs, chick lots, or a flock sale through the flock engine (withdrawal periods apply; the order carries the income) |

## Added with the intelligence layer

| # | Decision | Choice |
| --- | --- | --- |
| D86 | Thresholds | No universal poultry thresholds: production rules compare a flock with its own recent days or the farm's own past flocks; absolute limits, targets and weather limits have no default and apply only when the farm sets them |
| D87 | Water quality defaults | FeedWise's fixed pH (6–8) and TDS (1000 ppm) defaults removed; set on the water rule |
| D88 | One gate for all alerts | Every alert, from any module, passes its governing rule (on/off, scope, severity) and then the notifier |
| D89 | Alert lifecycles | Production alerts are per day and stay until handled; condition and schedule alerts (FCR, vaccination, appointment, hatch, delivery, payment, weather) resolve themselves when the condition clears |
| D90 | Overdue payments | Only documents with a due date someone set can be overdue; others are aged in reports, not alerted |
| D91 | Weather | Backend-only behind a provider port (Open-Meteo by default); cached 1 hour per ~5 km location; daily observations kept as history and used as the farm's weather baseline; stale cache served when the provider fails |
| D92 | Notifications | Providers per channel behind a port; in-app always stored; push and email queued with retries and backoff; recipients by rule roles and money permission; personal preferences and mutes; cooldown except on escalation |
| D93 | Dashboard | One call, sections by permission, each section isolated so a failure (e.g. weather) never breaks the rest |

## Added with the knowledge and reporting platform

| # | Decision | Choice |
| --- | --- | --- |
| D94 | External articles | Title, summary, content, source, sourceUrl, publicationDate, region, category, author, status; cannot be published without source, URL, date and summary (request schema, service and MongoDB schema) |
| D95 | Copyright | External items keep PoultryPilot's own summary plus the publisher's teaser and link; full source text is never stored |
| D96 | Editorial roles | Platform staff roles (content_editor, content_publisher), separate from farm roles; health, biosecurity and disease content needs a second person to publish |
| D97 | News delivery | News lives in the database (imported for review or written by editors) and reaches apps only through the API; nothing is hard-coded in components |
| D98 | Region filtering | Readers see GLOBAL, their country and their region; no region means global only |
| D99 | Reports | One format-neutral document per report, rendered to PDF, CSV or Excel from live data; each report needs its permission (route and service), money and stock sections omitted with a note for people without that access; every export audited |
| D100 | Spreadsheet safety | Text cells starting with = + - @ tab or CR are prefixed with an apostrophe in CSV and Excel |
| D101 | Seed content | Seed articles' reviewed wording and sources are carried forward verbatim across model changes |

## Added with the web migration

| # | Decision | Choice |
| --- | --- | --- |
| D102 | Prototype identity | Palette, fonts, radius, prism glass and edge, layouts and navigation kept; darker same-hue shades for text only (contrast) |
| D103 | No browser-side data logic | Every figure from the API; every write through it; no Supabase, no third-party calls from the browser (tested) |
| D104 | No hard-coded content | Learn pages show editor-published content only; News prices are live listing medians, labelled as asking prices |
| D105 | Partial day updates | `PATCH` of a day's record changes only the sections sent (server rebuilds the rest), so per-screen entry never erases other data |
| D106 | Session in the browser | Access token in memory; refresh token in localStorage with rotation and reuse detection; cross-tab refresh lock (Web Locks) |
| D107 | Overlays | Menus and dialogs are near-opaque and portalled to the page root (glass overlays were unreadable; backdrop-filter traps fixed layers) |
| D108 | Routes load on demand | One chunk per screen, prefetched on hover |

## Added with the mobile app

| # | Decision | Choice |
| --- | --- | --- |
| D109 | Mobile backend | None: the app calls the same /api/v1 as the web app |
| D110 | Layers | core, domain (Freezed entities, repository interfaces), data (JSON models, Dio and Drift sources, repositories), presentation (MVVM: Riverpod view model per screen) |
| D111 | Mobile session | Refresh token in platform secure storage; access token in memory; one shared refresh for concurrent 401s; only a server refusal signs out (offline keeps the session); random per-install device id names the session |
| D112 | Offline (mobile) | Dashboard and account cached in Drift; served when offline and marked with the time saved |
| D113 | API/app contract | Mobile models tested against fixtures captured from the real API; an API test fails when those responses change shape |
| D114 | Generated code | Freezed, json_serializable and Drift output is generated (setup script and CI), not committed |

## Added with the farmer workflow

| # | Decision | Choice |
| --- | --- | --- |
| D115 | Tasks | Stored tasks (general, follow-up, corrective action) with task.read, task.complete and task.manage; "today" adds calendar work and missing daily entries |
| D116 | Daily entry on mobile | One PATCH of the touched sections; record-owned feed and deaths flagged in the day view, so entries made elsewhere are never replaced |
| D117 | Offline entry | Drift outbox. The day is re-read before sending; if its version changed, the entry is held for the farmer to send or discard. Cleared on sign-out |
| D118 | One-handed use | Bottom dock for date, flock and save; sheets with keypads, steppers and chips; targets ≥ 56 dp |

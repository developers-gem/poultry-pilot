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

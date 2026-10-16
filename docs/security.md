# Security audit and security assumptions

PoultryPilot API (`services/api`), web app (`apps/web`) and mobile app (`apps/mobile`). Audit date: October 2026. Aligned with the OWASP API Security Top 10 (2023).

## How it was tested

All tests are automated and run in the normal suite (`pnpm test`), mostly under `services/api/src/test/security/`. They run against the real Express application with in-memory storage.

| Suite | What it does |
| --- | --- |
| `route-sweep.test.ts` | Drives **every documented operation** (262, from `packages/contracts/openapi.json`, so new routes are covered automatically) through five attacks: no token, forged tokens (garbage, wrong secret, `alg: none`, expired, tampered payload), another farm's owner, the attacker's own farm paths carrying the victim's real record ids (IDOR), and root-level routes. Fails on any 2xx, any 500, and any stack trace, file path or secret in a response. |
| `route-inventory.test.ts` | Records every route Express actually serves and fails if one is missing from the OpenAPI document, so nothing escapes the sweep. |
| `auth-hardening.test.ts` | Login enumeration, rate limiting and lockout, refresh token rotation and reuse detection, logout and session revocation, password change, password reset, hashed token storage, role escalation, invitation binding, member removal. |
| `input-errors-uploads.test.ts` | NoSQL operator and prototype-pollution injection, mass assignment, malformed input, oversize bodies, error responses, security headers, CORS, upload type sniffing, size limits, download headers. |
| `integrity.test.ts` | Seeded random sequences (reproducible) for flock counts (120 operations), inventory (100) and money (80), with invariants checked after every step. Exhaustive order state machine (168 combinations) against an independent oracle, and the order flow through the API. |
| `concurrency-sync.test.ts` | Concurrent edits, saves, deaths, feed use and idempotent requests; duplicate sync mutations in one batch, across batches and in parallel; per-farm mutation ids; a removed member's sync. |
| `sync-offline.test.ts` | Interrupted sync on the server: a crash injected between applying a mutation and recording it, before and part-way through a batch. |
| Mobile (`apps/mobile/test`) | Interrupted sync on the phone: lost responses, an app killed mid-sync, a server failing mid-batch, interrupted photo uploads, an expired session, conflicts. Run in CI. |
| `pnpm audit --prod` | No known vulnerabilities after the fix below. |

## Results by area

| Area | Result |
| --- | --- |
| Authentication | Every secured operation answers 401 to a missing, garbage, wrong-secret, unsigned (`alg: none`), expired or tampered token. The algorithm is pinned to HS256; issuer and audience are checked; the session is checked on every request, so revocation is immediate. |
| Authorization | Permissions per role are enforced at the route (`requirePermission`) and again in the service (`assertCan`). Workers cannot reach money, members, audit or settings. |
| Cross-farm access | Another farm's owner gets 403 or 404 from all farm-scoped operations, with no data. Membership is verified for every farm id the client supplies: in the path, the query (`/sync/pull`), the body (`/sync/push`), and `buyerFarmId` on orders. |
| Role escalation | Nobody changes their own role, assigns a rank at or above their own, or acts on a higher rank (owners excepted). The last owner cannot leave. Invitations are bound to the invited email. A removed member loses access on their next request. Platform roles cannot be set through the API (`PUT /me` is strict). |
| IDOR | The attacker's own farm paths carrying the victim's real record ids never reach the victim's records: every repository query is scoped by the membership-verified farm id. Root-level records (day records, buyer orders, sessions, push devices) are looked up and then checked against the caller; a missing record and someone else's record give the same 404, so ids cannot be probed. |
| Input validation | Every body, query and path is validated by strict Zod schemas. Unknown fields are refused (no mass assignment). NoSQL operators cannot reach the database: bodies are type-checked, and the query parser is flat. `__proto__` and `constructor` are refused. Bad ids, dates, numbers and sizes are 400s with field messages, never 500s. |
| Rate limiting | A per-IP global limit, plus a stricter limit on `/auth`. Repeated failed logins lock the account for 15 minutes. |
| File uploads | Membership and permission are checked before the body is read. The type comes from the bytes (JPEG, PNG, WebP, PDF), never from the client: HTML, SVG and empty files are refused. Maximum size is 5 MB. Downloads are farm-scoped and served with a sandboxing CSP and `nosniff`; PDFs download as attachments. |
| API errors | Unexpected errors answer `INTERNAL` with a request id only: no message, stack, path or secret. Details go to the log. Unknown routes are JSON 404s. |
| Headers and CORS | Helmet sets HSTS, CSP, X-Frame-Options, nosniff and Referrer-Policy; there is no `X-Powered-By`. CORS allows only the configured web origins, never credentials; a wildcard origin is refused in production. |
| Token expiry | Access tokens last 15 minutes; an expired token answers `TOKEN_EXPIRED`, so clients refresh. |
| Refresh token rotation | Every refresh issues a new refresh token. Replaying an old one revokes the whole session family, including its current access token, at once. Refresh tokens are stored only as hashes. |
| Password reset | The same answer for known and unknown emails. Tokens are single-use, stored only as hashes, never in a response, and expire. A reset or a password change revokes other sessions. |
| Concurrent updates | Optimistic versions on edits (409 for the loser, no lost update); deaths and feed use never go below zero; one record per idempotency key. |
| Order state transitions | All 168 (from, to, actor, fulfilment, payment) combinations match the spec. The API refuses payment before acceptance, completion before full payment, overpayment and cancellation after payment, and reserves listing stock once. |
| Flock count consistency | Counts match the model through 120 random deaths, culls, sales, transfers and reversals, and are never negative. Impossible moves are refused, including back-dated ones that would leave a flock negative on an earlier date. |
| Inventory consistency | Stock equals the model and the sum of lots through 100 random operations. No lot goes negative, and over-use is refused. |
| Financial calculations | Account balances, P&L and outstanding amounts match the model to the minor unit through 80 random operations. Money is integer minor units, never floats. Overpayment is refused. |
| Offline synchronization | Each mutation and its processed record are written in one transaction. A crash between them leaves nothing, and a resend applies exactly once. |
| Duplicate sync operations | The same mutation in one batch, in two batches, or in two parallel pushes is applied once. Mutation ids are scoped per farm. A removed member's queued changes are refused. |

## Findings and fixes

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| S1 | Medium | The public `/health` endpoint returned the MongoDB driver's raw error text when the database was down, which can reveal hosts or replica set names. | It now says "database did not answer"; details are logged. |
| S2 | Low | The full API contract (`/api/v1/openapi.json`) was public by default in production (OWASP API9). | Off by default in production, on elsewhere; `OPENAPI_ENABLED` overrides. |
| S3 | Low | 5xx responses echoed the message of our own internal errors. | Every 5xx answer is generic; details go to the log. |
| S4 | Low (defence in depth) | Media downloads had no sandbox, and PDFs (which can carry script) opened inline. | A sandboxing CSP and `nosniff` on every download; PDFs as attachments. |
| S5 | Low (coverage) | Two routes (`GET /farms/{farmId}/audit`, `POST /farms/{farmId}/chick-orders/{id}/payments`) were undocumented, so outside the automated sweep. Both were correctly protected. | Documented; the route inventory test now fails on any undocumented route. |
| S6 | Moderate (dependency) | `uuid` < 11.1.1 (GHSA-w5hq-g745-h8pq), through `exceljs` and `google-auth-library`. Not reachable by our code, which uses v7 without a buffer. | Upgraded, and the transitive copies pinned with a pnpm override; `pnpm audit` is clean. |
| S7 | Hardening | Flat query parsing relied on the framework default. | Set explicitly (`query parser: simple`). |

Fixed in earlier rounds and now covered by these suites:
- **Sync push was not atomic:** a crash could double-apply a mutation.
- **Offline mortality and cull commands never worked:** strict schemas rejected their own flock id.

No critical or high findings. No route allowed cross-farm access, IDOR, privilege escalation or unauthenticated access.

## Security assumptions

The guarantees above hold when these are true. Each is a deployment or design decision, not something the code can check.

1. **Secrets.**
   - `JWT_ACCESS_SECRET` is at least 32 random characters, is unique per environment, and is rotated if exposed. Rotating it signs everyone out.
   - FCM credentials and the MongoDB URI come from the environment or a secret store, never the repository.
   - `.env.example` holds no real values.
2. **Transport.** The API is only reachable over HTTPS (TLS at the load balancer or proxy). HSTS is sent, but it cannot protect a first plain-HTTP request.
3. **Proxy configuration.** `TRUST_PROXY` equals the number of proxies in front of the API. Too high, and clients can spoof `X-Forwarded-For` to dodge rate limits. Too low, and everyone shares the proxy's IP and one limit.
4. **Database.**
   - MongoDB runs as a replica set, so multi-document transactions are available; atomic sync and concurrent-update safety depend on it.
   - Unique indexes are created before traffic (`MONGODB_AUTO_INDEX` or a migration step).
   - The database user has rights only on the PoultryPilot database.
   - The concurrency tests here run on the in-memory store, whose transactions are emulated. Isolation under real parallelism is MongoDB's guarantee, and should also be exercised by the MongoDB/FerretDB contract suite in CI.
5. **Rate limiting.** The limiter counts in memory per process. With several API instances, each has its own counters, so the effective limit multiplies. Use a shared store (e.g. Redis) when scaling out.
6. **Tenancy.** A farm is the unit of isolation. Every farm-owned record carries `farmId`, and every repository query is scoped by the farm id that `requireFarm` verified against an active membership. New code must keep both properties; the sweep and IDOR tests check the result.
7. **Platform roles** (content editor and publisher) are granted directly in the database by operators. No API sets them.
8. **Email.** Reset and invitation links are as safe as the person's email account. Tokens are single-use and short-lived.
9. **Browser session (web).**
   - The access token is kept in memory and the refresh token in `localStorage`. Script injected into the web app (XSS) could read the refresh token; rotation with reuse detection limits, but does not prevent, its misuse.
   - The web app must stay free of XSS: React escaping, no `dangerouslySetInnerHTML` with user content, and a strict CSP on the web host.
10. **Mobile.** The refresh token is in the platform's secure storage (Keystore or Keychain). A rooted or jailbroken phone can read it.
11. **Media.**
    - Uploaded photos are stored as sent. EXIF metadata, including GPS location, is kept.
    - Files are served only to members of the farm.
    - Files are not scanned for malware; they are sniffed and limited to four types.
12. **Logs.**
    - Request bodies are not logged, and authorization headers, passwords and tokens are redacted.
    - Logs may still contain ids, emails in error messages and IP addresses: treat them as personal data, with retention and access controls.
13. **Health and documentation endpoints** are unauthenticated by design. `/health` reveals status, version and environment only.

## Residual risks and recommendations

| Risk | Recommendation |
| --- | --- |
| Refresh token readable by XSS in the web app | Move the web session to an httpOnly, Secure, SameSite cookie for the refresh token, with CSRF protection on `/auth/refresh`. |
| Account enumeration through registration (the "email already registered" answer) | Accepted for usability. Registration is rate limited; consider an email-confirmation-first flow. |
| Lockout can be triggered on purpose against a known email | The lock is temporary (15 minutes) and per account. Consider CAPTCHA after repeated failures rather than lockout alone. |
| No multi-factor authentication | Offer TOTP for owners and admins. |
| EXIF location in photos | Strip metadata (re-encode) on upload. |
| Rate limits per instance | Use a shared limiter store when running more than one instance. |
| Concurrency proven on the in-memory store | Run the security suites against MongoDB (replica set) in CI. |
| Dependency drift | Run `pnpm audit --prod` and the Flutter equivalent in CI and fail on high or critical findings. |

## Keeping it true

- **New routes:** a new route without documentation fails `route-inventory.test.ts`. Once documented, it is attacked by `route-sweep.test.ts` automatically.
- **New farm-owned records:** a new record type needs `farmId`, repository queries scoped by it, and an entry in the sweep's segment-to-table map, so IDOR is tested with real ids.
- **Policy changes:** any change to roles, ranks or the order state machine must keep the oracles in these tests in step.

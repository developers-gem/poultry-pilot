# PoultryPilot: production readiness audit

October 2026. Each result below is backed by an automated check that was run for this audit, unless it is marked "not verifiable here".

## Summary

The backend, web app and database design are ready for production once the deployment configuration below is in place.

Five issues found in this audit would have broken production. All five are fixed in code, with tests:
- outgoing email was never wired
- no way to create database indexes in production
- duplicate push notifications with more than one instance
- photos only on local disk
- an Android crash on old devices

What still blocks launch is outside the code:
- **Mobile build:** the Flutter app has never been compiled or run on a device.
- **App store requirements:** in-app account deletion, and privacy and terms pages.
- **Health content:** expert review of the health articles.
- **Production configuration:** filled in for real.

| Check | Result |
| --- | --- |
| Typecheck, 6 packages | Pass |
| Tests | **511 passed** (53 files), 3 skipped |
| Web: 23 routes × desktop, tablet, phone | **69 of 69** with no failed API calls, console errors, error panels or sideways scroll |
| Web: loading, empty, error, offline states | **14 of 14** |
| Web: accessibility (axe-core, WCAG 2.1 A and AA, every route, desktop and phone) | **0 violations** (after fixes: 71 contrast and 16 naming violations found) |
| Security sweep (262 operations: no token, forged tokens, cross-farm, IDOR) | Pass; see `docs/security.md` |
| Route inventory (every served route documented) | Pass |
| Dependency audit (`pnpm audit --prod`) | No known vulnerabilities |
| Index coverage (static analysis of every query against every index) | Hot paths covered; 9 remaining patterns are primary-key lookups, small collections or occasional reports |
| Performance with 720 record days (in-process) | Summaries under 50 ms; egg report 77 ms; all alert rules 172 ms; a day save 31 ms |
| Flutter compile, run on Android or iOS | **Not verifiable here** (no Flutter toolchain; CI builds an APK) |
| MongoDB behaviour | **Not verifiable here** (no MongoDB); CI runs a real replica set and now builds every index on it |

## Status by area

### Web
| Item | Status |
| --- | --- |
| All routes functional | ✅ 69 of 69 against the current API |
| Responsive | ✅ desktop 1440, tablet 820, phone 390; no overflow |
| Accessible | ✅ 0 automated WCAG 2.1 AA violations. Manual screen-reader and keyboard testing is still recommended (automation finds about a third of issues). |
| No fake data | ✅ guarded by `migration.test.ts` |
| No Supabase | ✅ guarded by `migration.test.ts` |
| API errors, loading, empty states | ✅ guarded by `states.py` |
| Gaps | Tasks management, notification settings and report downloads exist in the API and mobile app but not in the web app (M5) |

### Backend
| Item | Status |
| --- | --- |
| Authentication | ✅ HS256 pinned, issuer and audience checked, session checked per request, rotation with reuse detection |
| RBAC | ✅ route and service checks; rank rules on members |
| Tenant isolation | ✅ farm id verified against membership wherever it comes from; sweep over every operation |
| Validation | ✅ strict Zod schemas everywhere; flat query parsing |
| Indexes | ✅ defined, documented, now creatable in production (`dist/create-indexes.js`) and built in CI on real MongoDB |
| Logging | ✅ pino, request ids, redaction; 5xx details only in logs |
| Rate limiting | ✅ global and auth limits, account lockout; per instance (M2) |
| API documentation | ✅ OpenAPI, 262 operations; off by default in production |
| Tests | ✅ 511 |

### MongoDB
| Item | Status |
| --- | --- |
| Indexes | ✅ 8 added for hot paths in this audit; budget of 5 per collection enforced by a test |
| Relationships | ✅ every farm-owned record carries `farmId` and is queried through it. References are checked in services, since MongoDB has no foreign keys. |
| Data integrity | ✅ unique keys (one record per flock and day, alert dedupe, notification dedupe, recurring bills, sync mutations); multi-document transactions; optimistic versions; random-sequence consistency tests for birds, stock and money |
| Aggregation performance | ✅ summaries are computed in Node and are fast with half a year of data. At larger scale, see optimizations O1 and O2. |

### Flutter
| Item | Status |
| --- | --- |
| Android | ⚠️ never compiled here. CI builds a debug APK; minSdk raised to 23 (C-fixed 5). Release signing still to set up (L6). |
| iOS | ⚠️ never compiled here and not built in CI. Push capability and APNs key need setup (L6). |
| Offline | ✅ logic tested in Dart tests (CI): queue, overlay, interrupted sync |
| Synchronization | ✅ exactly-once on the server (tested here); conflict merge and recovery on the phone (Dart tests) |
| Push notifications | ✅ server side tested (FCM provider, dedupe, retries, claims). The phone side needs Firebase configuration. |
| Secure storage | ✅ refresh token in Keystore or Keychain; access token in memory |

### Business modules
All covered by passing suites:
- flock lifecycle (placement, events, transfers, sales, close, metrics)
- feed (FEFO, costing, FCR) and water (with quality rules)
- eggs (grading, stock) and hatchery (every egg accounted for)
- health (withdrawal, vaccinations) and biosecurity (checklists, visitors, corrective actions)
- finance (accrual P&L, payments, no double counting) and marketplace (state machine, payments)
- alerts (14 rules, own-history baselines) and reports (9 reports, PDF, CSV and Excel)

The consistency suites run random sequences against birds, stock and money with invariants after every step.

## 1. Critical bugs

None open.

Fixed in this audit; each would have broken production:

| # | Bug | Fix |
| --- | --- | --- |
| C1 | **Outgoing email was never wired.** Production used the development logger, so password resets, email verification and farm invitations were never delivered. | SMTP sender (`SMTP_URL`, any provider). Production refuses to start without it. Sign-in emails are best effort, so a mail outage cannot reveal which accounts exist. Tested. |
| C2 | **No way to create indexes in production.** Automatic index creation is off in production and there was no command, so a fresh database had no unique keys: duplicate protection and query performance were both gone. | `node dist/create-indexes.js` ships in the image, is idempotent, and fails loudly. CI now builds every index on real MongoDB. |

## 2. High-priority bugs

Fixed in this audit:

| # | Bug | Fix |
| --- | --- | --- |
| H1 | With more than one API instance, two delivery workers could send the **same push notification twice**. | Atomic claim with a 5-minute lease before sending; a crashed worker's notifications are retried, not lost. Tested with two workers. |
| H2 | Photos stored only on the server's disk: lost on redeploy without a volume, and missing on other instances. | S3-compatible storage (`S3_BUCKET`, `S3_ENDPOINT` for R2, MinIO, B2 or Spaces), with the same key guard. A warning at start-up when production still uses disk. Tested. |
| H3 | The Android app would fail to store the login token on Android 5 (EncryptedSharedPreferences needs API 23). | Setup sets minSdk 23 for both Gradle formats. Tested on sample files. |

Open:

| # | Bug | Recommendation |
| --- | --- | --- |
| H4 | **The Flutter app has never been compiled or run.** About 90 Dart files were written without a toolchain. | Run CI; fix any compile issues (most likely spots: Freezed unions, Drift tables); test on real Android and iOS devices, including offline sync and push. See L1. |
| H5 | **No account deletion, privacy policy or terms.** App Store guideline 5.1.1(v) requires in-app account deletion; both stores require a privacy policy. | `DELETE /me` with password confirmation. Refuse while the person is the last owner of a farm with other members (transfer first). Revoke sessions; remove devices, preferences and notifications; anonymise the user in the audit log; retain farm records per your retention policy. Add privacy and terms pages linked from sign-up and settings. See L3. |

## 3. Medium-priority bugs

Fixed in this audit:
- **M-fixed-1:** 8 indexes added for hot paths: each day's own feed, egg, water and health entries (every day save and view), money by flock (flock costing), chicks booked per hatchery batch, latest biosecurity log by type.
- **M-fixed-2:** accessibility: muted text contrast (71 elements) and unnamed progress bars (16).
- **M-fixed-3:** Open-Meteo's free API is non-commercial. `OPEN_METEO_API_KEY` switches to the commercial endpoint.
- **M-fixed-4:** the email library added in this audit (`nodemailer` 6) carried 15 advisories (5 high). Upgraded to 10; `pnpm audit` is clean. CI now fails on high-severity advisories.

Open:

| # | Issue | Recommendation |
| --- | --- | --- |
| M1 | Web refresh token in `localStorage` (readable by XSS) | httpOnly, Secure, SameSite cookie for the refresh token, with CSRF protection on `/auth/refresh` |
| M2 | Rate limits are counted per instance | Shared store (Redis) when running more than one instance |
| M3 | Health and disease seed articles not reviewed by a veterinarian; source URLs not verified | Expert review before publishing (L4) |
| M4 | Photos keep EXIF metadata, including GPS location | Re-encode on upload to strip metadata (also gives thumbnails) |
| M5 | Web lacks tasks management, notification settings and report downloads | Add the three screens; the API is ready |
| M6 | Mobile fonts load from Google at runtime: system font on a first offline launch, plus a request to Google | Bundle Space Grotesk and Inter as assets |
| M7 | No admin interface for platform roles (content editors) or news-feed configuration | Operational: grant in the database for now; build an admin screen later |
| M8 | Many OpenAPI responses are typed as "any" | Describe response schemas, for generated clients and contract tests |
| M9 | Registration answers "email already registered" (account enumeration) | Accepted for usability; rate limited. Consider an email-first sign-up flow. |

## 4. Optimization opportunities

| # | Opportunity | Why |
| --- | --- | --- |
| O1 | Pre-aggregated daily farm summaries (one document per farm and day) | Dashboard, trends and reports recompute from raw records; fast now, but growing with history |
| O2 | Cache dashboard and analytics per farm for 30–60 seconds | Many people open the same farm's dashboard; most numbers change with each save, not each second |
| O3 | Run scheduled jobs in one worker (or with a leader lock), not in every API instance | Avoids repeated hourly evaluation work across instances; correctness is already protected by unique keys and claims |
| O4 | Serve photos through signed, expiring URLs from a CDN | Takes image traffic off the API |
| O5 | Generate large reports in the background, then notify | Wide date ranges block a request today |
| O6 | Cursor pagination on remaining full lists (health records, biosecurity logs, notifications) | Bounded response sizes as farms grow |
| O7 | Thumbnails for photos (with M4) | Faster lists on weak connections |
| O8 | Web: code-split heavy libraries further; preload fonts | First paint on slow phones |
| O9 | Mobile: delta sync via `/sync/pull` instead of refreshing whole cached screens | Less data on every reconnect |

## 5. Launch blockers

| # | Blocker | Owner |
| --- | --- | --- |
| L1 | Flutter: CI green (analyze, tests, APK), an iOS build, and QA on real devices: sign-in, daily entry offline then online, conflict screens, push received and tapped, sign-out | Mobile |
| L2 | Production configuration filled in and verified (checklist below), including real SMTP, FCM, S3 (or a single instance with a volume) and secrets | DevOps |
| L3 | Account deletion (in-app and API), privacy policy, terms of service, store privacy labels | Product, legal, backend |
| L4 | Veterinary review of health, biosecurity and disease content; source URLs verified | Content |
| L5 | `node dist/create-indexes.js` run against the production database, with success, before traffic | DevOps |
| L6 | Android release signing (upload key in a secret store) and iOS distribution certificate; Push capability, Background Modes and APNs key in Firebase; real application ids | Mobile |

## 6. Production deployment checklist

### Infrastructure
- [ ] MongoDB 7 **replica set** (transactions required); a dedicated database user with rights on the PoultryPilot database only; TLS
- [ ] Automated daily backups with point-in-time restore; a restore tested once
- [ ] API behind HTTPS (TLS at the load balancer); HTTP redirected; HSTS
- [ ] `TRUST_PROXY` set to the exact number of proxies in front of the API
- [ ] Photos: `S3_BUCKET` (private bucket, encryption at rest), **or** exactly one API instance with a persistent volume at `MEDIA_DIR`
- [ ] More than one instance: a shared rate-limit store (M2), or a single instance
- [ ] Web app on static hosting or a CDN, with every path rewritten to `index.html` (client-side routes), and a strict CSP

### API configuration (`services/api/.env.example`)
- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET`: at least 32 random characters, unique to production, in a secret store
- [ ] `MONGODB_URI` (replica set); leave `MONGODB_AUTO_INDEX` unset
- [ ] `CORS_ORIGINS` = the web app's exact origin(s); no wildcard (refused in production)
- [ ] `APP_BASE_URL` = the web app's URL (used in email links)
- [ ] `SMTP_URL` and `EMAIL_FROM` (required; start-up fails without them); SPF, DKIM and DMARC set up for the sending domain
- [ ] `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` (Firebase Cloud Messaging API Admin role)
- [ ] `OPEN_METEO_API_KEY` for commercial use
- [ ] `GOOGLE_CLIENT_IDS` if Google sign-in is offered (also `VITE_GOOGLE_CLIENT_ID` for the web)
- [ ] `S3_BUCKET`, `S3_REGION` (and `S3_ENDPOINT` for non-AWS) with credentials from the environment or an instance role
- [ ] `NEWS_FEEDS` (optional), `LOG_LEVEL=info`
- [ ] `OPENAPI_ENABLED` left unset (off in production) unless the contract should be public

### Release steps (every deploy)
- [ ] CI green: typecheck, 511 tests, the index build on MongoDB, dependency audit, both builds, the mobile job
- [ ] Build the image: `docker build -f services/api/Dockerfile -t poultrypilot-api .`
- [ ] **Before traffic:** run `node dist/create-indexes.js` in the new image against production; it must print "All indexes in place."
- [ ] Roll out; the health check `/api/v1/health/live` turns healthy; `/api/v1/health/ready` reports the database up
- [ ] Smoke test: register, verify email (real inbox), sign in, create a farm, record a day, reset a password, receive a push

### First launch only
- [ ] Grant platform roles (content editor and publisher) to the editorial team in the database
- [ ] Publish reviewed content (L4)
- [ ] Mobile: `flutterfire configure` with production Firebase projects; `API_BASE_URL` set to the production HTTPS URL; release builds signed (L6)
- [ ] Store listings: privacy policy URL, data-safety and privacy-label answers (location, photos, contact details), account deletion (L3)

### Operations
- [ ] Central logs with retention and access control (logs contain personal data: emails in errors, IP addresses)
- [ ] Alerts on 5xx rate, latency, the error log line "notification delivery failed", the "alert job failed for farm" count, database health, and disk usage when photos are on disk
- [ ] Uptime check on `/api/v1/health/ready`
- [ ] Incident runbook: rotate `JWT_ACCESS_SECRET` (signs everyone out), revoke FCM or SMTP credentials, restore from backup
- [ ] Re-run the security suites and `pnpm audit` in CI on every change (already in CI); review `docs/security.md` assumptions each quarter

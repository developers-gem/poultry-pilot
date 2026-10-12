# PoultryPilot

Poultry farm management platform. One REST API (`/api/v1`) and one MongoDB database, shared by a React web app and a Flutter mobile app.

```
apps/
  web/            React + Vite + TypeScript + Tailwind
  mobile/         Flutter (Android, iOS)
services/
  api/            Node.js + Express + TypeScript + Mongoose
    src/domain/   Business calculations (server-only, unit-tested)
    test/legacy/  Prototype formulas + characterization tests (development only)
packages/
  constants/      Enums, roles, permissions, error codes, API version — no dependencies
  validation/     Zod schemas for every request and response
  types/          TypeScript types inferred from the schemas (type-only)
  contracts/      OpenAPI 3.1 document built from the same schemas
```

The architecture, the audit of the Lovable prototype and the roadmap are in the **PoultryPilot — Technical Audit & Migration Plan** document. Supabase is not used anywhere.

## Prerequisites

| Tool | Version | Check |
| --- | --- | --- |
| Node.js | 22 or newer | `node -v` |
| pnpm | 9 | `corepack enable && pnpm -v` |
| Docker | any recent | `docker compose version` |
| Flutter | 3.24 or newer (mobile only) | `flutter --version` |

## 1. MongoDB

```bash
docker compose up -d mongo
docker compose ps            # wait until mongo shows "healthy" (10–20 s on first start)
```

Runs MongoDB 7 as a single-node replica set (`rs0`) on `localhost:27017`, which the API needs for transactions. Data persists in the `mongo-data` volume. Other commands: `pnpm db:shell` (mongosh), `docker compose down` (stop), `docker compose down -v` (stop and delete data).

Using MongoDB Atlas instead: put the Atlas `mongodb+srv://` URI in `services/api/.env` and skip this step.

## 2. API

```bash
pnpm install
cp services/api/.env.example services/api/.env
# Set JWT_ACCESS_SECRET in services/api/.env, e.g. to the output of:
openssl rand -base64 48
pnpm dev:api
```

Check it:

```bash
curl -i http://localhost:4000/api/v1/health        # 200 when MongoDB is connected, 503 when not
curl http://localhost:4000/api/v1/health/live      # process liveness, never checks the database
curl http://localhost:4000/api/v1/openapi.json     # API contract
```

Production build: `pnpm --filter @poultrypilot/api build && pnpm --filter @poultrypilot/api start`. Docker image: `docker build -f services/api/Dockerfile -t poultrypilot-api .`, or run API and database together with `docker compose --profile api up -d`.

## 3. Web

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web                                       # http://localhost:5173
```

In development the web app calls `/api` on its own origin and Vite forwards it to `http://localhost:4000`, so no CORS setup is needed. For production, set `VITE_API_BASE_URL` to the API origin and add the web origin to the API's `CORS_ORIGINS`.

## 4. Mobile

```bash
cd apps/mobile
flutter create --platforms=android,ios --project-name poultrypilot_mobile --org com.poultrypilot .   # first time only
cp config/dev.example.json config/dev.json
flutter pub get
flutter run --dart-define-from-file=config/dev.json
```

`config/dev.json` sets `API_BASE_URL`: `http://10.0.2.2:4000` for the Android emulator, `http://localhost:4000` for the iOS simulator, or your computer's LAN IP for a physical phone. See `apps/mobile/README.md`.

## Tests and checks

```bash
pnpm typecheck
pnpm test                                          # domain, characterization, API (in-memory) and web tests
MONGODB_TEST_URI="mongodb://localhost:27017/pp_test?replicaSet=rs0&directConnection=true" pnpm test   # adds real-database checks
pnpm openapi                                       # writes packages/contracts/openapi.json
cd apps/mobile && flutter analyze && flutter test
```

## Environment files

Only `*.example` files are committed. Real values go in:

| File | Used by |
| --- | --- |
| `services/api/.env` | API (validated at startup; the process refuses to start and lists every problem) |
| `apps/web/.env.local` | Web (only `VITE_`-prefixed values reach the browser) |
| `apps/mobile/config/dev.json` | Mobile (compiled into the app, so never secrets) |
| `.env` (repository root) | Docker Compose port overrides only |

## API foundation

| Concern | Where |
| --- | --- |
| Environment configuration | `services/api/src/config/env.ts` |
| Structured logging (JSON in production, pretty locally, secrets redacted) | `services/api/src/lib/logger.ts` |
| Request logging with request IDs | `services/api/src/app.ts` (pino-http) |
| Security headers, CORS, rate limits, body size limit | `services/api/src/app.ts` |
| Request validation (Zod) | `services/api/src/http/middleware/core.ts` |
| Centralized error handling, one error envelope | `services/api/src/http/middleware/core.ts` |
| API versioning (`/api/v1`) | `packages/constants/src/api.ts` |
| MongoDB connection, retry, ping | `services/api/src/db/mongo.ts` |
| Health and OpenAPI endpoints | `services/api/src/http/routes/system.routes.ts` |
| Graceful shutdown | `services/api/src/server.ts` |
| OpenAPI contract | `packages/contracts/src/openapi.ts` |

## Authentication and farms

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Account + first farm + session; sends a verification email |
| POST | `/api/v1/auth/verify-email`, `/auth/resend-verification` | Email verification |
| POST | `/api/v1/auth/login`, `/auth/google` | Starts a session; per-account lockout after repeated failures |
| POST | `/api/v1/auth/refresh` | Rotates the refresh token; reuse ends the session |
| POST | `/api/v1/auth/logout` | Ends the current session |
| POST | `/api/v1/auth/forgot-password`, `/auth/reset-password` | Emailed single-use reset link; signs out all devices |
| POST | `/api/v1/auth/change-password` | Signs out other devices |
| GET | `/api/v1/me` | User, current session, farm memberships with permissions |
| GET / DELETE | `/api/v1/me/sessions`, `/me/sessions/:sessionId` | Signed-in devices |
| GET / POST | `/api/v1/farms` | My farms / create a farm (you become owner) |
| GET / PUT | `/api/v1/farms/:farmId` | PUT replaces editable fields; requires `version` |
| GET / POST | `/api/v1/farms/:farmId/members` | Members and invitations / invite by email |
| PUT / DELETE | `/api/v1/farms/:farmId/members/:memberId` | Change role / remove, cancel invitation, or leave |
| POST | `/api/v1/farms/invitations/accept` | Accept an emailed invitation |

Roles: owner, admin, farm_manager, supervisor, worker, accountant, vet. Every farm route checks: signed in → active member of that farm → role permits the action → the record belongs to that farm. Full design, permission table and hierarchy rules: `docs/auth.md`.

## Data model

52 MongoDB collections (Mongoose schemas in `services/api/src/adapters/mongo/models/`), each farm-owned record tenant-scoped by `farmId` with `createdBy`/`updatedBy`, timestamps, versioning and soft delete or append-only corrections.

- `docs/data-model.md` — conventions, ownership, source-of-truth vs derived fields, what each action writes, retention, relationship diagrams, prototype table mapping.
- `docs/data-dictionary.md` — every field, enum, index (with the query it serves) and reference. Generated: `pnpm --filter @poultrypilot/api docs:data-dictionary`.

## Flock engine

Houses and flocks under `/api/v1/farms/:farmId`: flock CRUD, placement, mortality, culls, transfers (house or flock), splits, merges, sales, adjustments, weighings, closure, reversals, and daily records (`PUT …/flocks/:flockId/daily-records/:date`). Every bird-count change is an event in an append-only ledger; impossible operations (selling or losing more birds than exist on any day, over-capacity houses, future dates) are refused. `GET …/flocks/:flockId/metrics` returns bird count, mortality and survival rates, average weight and daily gain, feed, FCR, live weight, revenue, cost, profit, margin and cost per bird. Rules and formulas: `docs/flock-engine.md`.

## Daily farm operations

`POST/GET /api/v1/farms/:farmId/daily-records`, `GET/PUT/DELETE /api/v1/daily-records/:id`: one record per flock per day covering headcount, mortality, culls, feed, water, temperature, humidity, eggs, broken eggs, egg quality, average weight, health observations, notes and photos. Each section is written to its source collection in one transaction. `GET …/daily-records/sheet` loads a phone's entry screen in one call; `Prefer: return=minimal` keeps responses small; `GET …/dashboard/day` and `…/dashboard/trends` aggregate on the server. Photos: `POST /api/v1/farms/:farmId/media`. Details: `docs/daily-operations.md`.

## FeedWise and inventory

One stock engine for feed, medicine, vaccines, disinfectant, litter, packaging, equipment supplies and other consumables: purchases become lots (supplier, batch, expiry, storage location, unit cost); stock leaves FEFO and is costed at real lot prices; daily-record feed, feed entries and chick-lot placements move stock automatically. Eggs and chicks are in the inventory overview. Water records carry source, pH, dissolved solids, chlorine and treatment, with abnormal-consumption flags. Feed per bird, per kg gain, FCR, feed cost per bird and per egg, and days of feed remaining are calculated on the server. Low-stock, feed-days, expiry and water alerts are raised automatically (also hourly). Details: `docs/feedwise-inventory.md`.

## FlockHealth and BioSecure Farm

Health records (observations, vet visits, treatments, lab tests, post-mortems) with symptom tags, attributed assessments, attachments and costs; treatments with dose, route, duration and withdrawal periods from the label or the vet; vaccination programmes by bird age with batches and expiry from stock; meat withdrawals block sales; withheld eggs are flagged; reminders and alerts for vaccinations and follow-ups. BioSecure: farm-configurable checklists, visitor register with declaration and downtime, footbath, cleaning, disinfection, vehicle, pest control and wild bird logs, equipment movement, corrective actions with verification. No diagnosis, no prescriptions, no country rules built in; educational articles cite their sources. Details: `docs/health-biosecurity.md`.

## HatcheryHub and ChickStart

Hatchery batches from egg source and selection through setting, candling, transfer, hatch and grading, with every egg accounted for and fertility, hatchability, saleable-chick and loss percentages; graded chicks become a costed chick lot; chick orders (also booked ahead of the hatch) and delivery draw from it. ChickStart: arrival plans with house-preparation checklists, arrival that places the chicks, brooder checks judged against the farm's own brooding profile, and a day-by-day brooding view. A farm calendar (JSON and iCalendar) shows expected transfers and hatches, chick deliveries and arrivals, vaccinations, cleaning and follow-ups. Details: `docs/hatchery-chickstart.md`.

Money (ledger, expenses, payments) and the public marketplace are not implemented yet; their collections are.

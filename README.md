# PoultryPilot

Poultry farm management platform: one Node.js API at `/api/v1`, used by a React web app and a Flutter mobile app, backed by MongoDB.

The architecture, audit of the Lovable prototype and the phased migration plan are in the **PoultryPilot — Technical Audit & Migration Plan** document. This repository is separate from the Lovable-synced prototype, which stays untouched as the product reference.

## Status

| Phase | State |
| --- | --- |
| 0 · Baseline | Done — contracts, domain calculations, characterization tests of the prototype |
| 1 · Foundation | In progress — auth, farms, memberships, RBAC, audit, idempotency, sync protocol done; web shell and real-MongoDB CI job outstanding |
| 2–8 | Not started |

## Layout

```
packages/contracts         Zod schemas and enums shared by API, web and Flutter (source of the OpenAPI document)
packages/domain            Pure business calculations with unit tests — the only place formulas live
packages/legacy-reference  Verbatim prototype formulas + characterization tests (never imported by apps)
apps/api                   Express 5 + Mongoose 8 API
docs/                      Decisions log
```

## Running

```bash
pnpm install
pnpm test            # all tests (domain, characterization, API over HTTP with in-memory repositories)
pnpm typecheck

docker compose up -d mongo           # local MongoDB replica set
cp apps/api/.env.example apps/api/.env   # then set JWT_ACCESS_SECRET
pnpm dev:api                          # http://localhost:4000/api/v1/health
```

## API (Phase 1)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/health` | Public |
| POST | `/auth/register` | Creates user + first farm + owner membership atomically |
| POST | `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout` | Refresh tokens rotate; reuse revokes the session family |
| POST | `/auth/password-reset`, `/auth/password-reset/confirm` | Never reveals whether an email exists |
| GET | `/auth/me` | |
| GET / POST | `/farms` | My farms with role and permissions / create a farm |
| GET / PATCH | `/farms/:farmId` | PATCH requires `version` (optimistic concurrency) |
| GET / POST | `/farms/:farmId/members` | Invite by email with a role |
| PATCH / DELETE | `/farms/:farmId/members/:membershipId` | A farm always keeps one owner |
| POST | `/farms/invitations/accept` | Only the invited email can accept |
| GET | `/farms/:farmId/audit` | Cursor-paginated audit trail |
| GET | `/sync/pull?farmId&since` | Changes after a per-farm sequence number |
| POST | `/sync/push` | Offline mutations, processed by the same services as REST, exactly once |

All writes accept an `Idempotency-Key` header. Errors always use `{ "error": { "code", "message", "details?", "requestId" } }`.

## Rules that must not be broken

1. Formulas live in `packages/domain` with tests. Routes and screens never calculate.
2. Every farm-owned query takes `farmId`; the Mongoose `requireFarmScope` plugin throws if it is missing.
3. Services re-check permissions even when middleware already did.
4. Important changes write an audit event in the same transaction.
5. Synced entities call `sync.recordChange` in the same transaction.
6. Business dates are farm-local `YYYY-MM-DD`; money is integer minor units plus currency; weights are stored in grams/kilograms.
7. Health features record and remind; they never diagnose.

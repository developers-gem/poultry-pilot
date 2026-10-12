# Authentication and multi-farm tenancy

How PoultryPilot signs people in, keeps them signed in, and decides what they may do on each farm.
Web and mobile use exactly the same endpoints and rules.

## Entities

| Entity | Collection | Purpose |
| --- | --- | --- |
| User | `users` | A person. Email (unique, lowercase), Argon2id password hash (optional for Google-only accounts), Google subject id, verification state, lockout counters, `active`/`disabled` status |
| Farm | `farms` | A tenant. Settings (timezone, currency, units) and a `version` for optimistic concurrency |
| FarmMember | `farm_memberships` | Links a user (or a pending invitee email) to a farm with one role. Status `invited` → `active` → `revoked` |
| Session | `sessions` | One signed-in device: platform, device name, IP, user agent, auth method, last use, absolute expiry, revocation reason |
| Refresh token | `refresh_tokens` | Rotating secret belonging to a session. Only the SHA-256 hash is stored |
| One-time token | `one_time_tokens` | Emailed single-use links for email verification (24 h) and password reset (1 h). Hash only |
| Audit event | `audit_events` | Every sign-in, sign-out, password change, membership change and farm edit |

## Tokens and sessions

- **Access token:** HS256 JWT, 15 minutes, claims `sub` (user), `sid` (session), `jti`. Sent as `Authorization: Bearer`.
- **Refresh token:** 32 random bytes, sliding 30 days, never beyond the session's absolute limit (90 days). Each `/auth/refresh` returns a new one and marks the old one replaced.
- **Reuse detection:** presenting a refresh token that was already replaced means it was copied. The whole session is revoked; both the attacker and the real device must sign in again.
- **Per-request session check:** `authenticate` loads the session named in the token on every request. Logout, "sign out this device", password change and password reset therefore take effect on the next request, not when the access token expires. Cost: one indexed read per request (plus the user), which can be cached later if needed.
- **Storage on clients (requirement for the apps; neither stores tokens yet):** mobile must keep the refresh token in the platform keystore (Keychain / Android Keystore, e.g. via `flutter_secure_storage`); web should keep the access token in memory only. An `HttpOnly` refresh cookie for web is compatible with this API and recommended once the web app is served from the API's site.

## Flows

| Flow | Endpoint | Behaviour |
| --- | --- | --- |
| Sign up | `POST /auth/register` | Creates user, first farm, owner membership and session in one transaction; emails a verification link. Signing in is allowed before verification |
| Verify email | `POST /auth/verify-email` | Single use; only valid for the address it was sent to. `POST /auth/resend-verification` replaces older links |
| Log in | `POST /auth/login` | Same error for unknown email and wrong password. After `LOGIN_MAX_FAILED_ATTEMPTS` (10) consecutive failures the account locks for `LOGIN_LOCK_MINUTES` (15); a password reset unlocks it |
| Refresh | `POST /auth/refresh` | Rotation with reuse detection (above) |
| Log out | `POST /auth/logout` | Ends the session of the bearer token, or of the refresh token in the body (mobile, after the access token expired). Idempotent |
| Forgot password | `POST /auth/forgot-password` | Always 202 with the same body, so it cannot reveal which emails have accounts. Invalidates earlier reset links |
| Reset password | `POST /auth/reset-password` | Single use. Signs out every session, unlocks the account, and verifies the email (the link proved access to the inbox) |
| Change password | `POST /auth/change-password` | Needs the current password; keeps the current session and signs out all others |
| Google | `POST /auth/google` | See below |
| Me | `GET /me` | User, current session id, and every active membership with role and permissions |
| Devices | `GET /me/sessions`, `DELETE /me/sessions/:id`, `DELETE /me/sessions` | List devices, sign one out, sign out all others |

### Google OAuth architecture

```
Web (Google Identity Services) ─┐
Android (Credential Manager)  ──┼─ ID token ─→ POST /api/v1/auth/google ─→ verify signature + audience ─→ session
iOS (Google Sign-In SDK)      ──┘                                         (google-auth-library, GOOGLE_CLIENT_IDS)
```

- Clients obtain a Google **ID token**; the API verifies its signature, issuer, expiry and that its audience is one of `GOOGLE_CLIENT_IDS` (one client id per platform). No Google client secret exists on any client, and the API never receives Google access tokens.
- Account resolution: (1) user already linked to this Google `sub` → sign in; (2) else, if Google says the email is verified and a user has that email → link and sign in; (3) else create a verified user with no farm (`needsFarm: true`; the client then calls `POST /farms`). Unverified Google emails are never linked or used to create accounts.
- Verification sits behind the `GoogleTokenVerifier` port, so tests use a fake and other identity providers (Apple) can be added the same way.

## Roles and permissions

Roles, highest authority first: **owner, admin, farm_manager, supervisor, worker, accountant, vet** (stored lowercase like every other enum).
The table is generated from `packages/constants/src/permissions.ts`; the API enforces exactly this.

| Action | owner | admin | farm_manager | supervisor | worker | accountant | vet |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `farm.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `farm.update_settings` | ✓ | ✓ |  |  |  |  |  |
| `farm.delete` | ✓ |  |  |  |  |  |  |
| `member.read` | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `member.invite` | ✓ | ✓ | ✓ |  |  |  |  |
| `member.change_role` | ✓ | ✓ | ✓ |  |  |  |  |
| `member.remove` | ✓ | ✓ | ✓ |  |  |  |  |
| `audit.read` | ✓ | ✓ | ✓ |  |  |  |  |
| `production.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `production.record` | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `production.edit_own_recent` | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `production.edit_any` | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `production.delete` | ✓ | ✓ | ✓ |  |  |  |  |
| `flock.manage` | ✓ | ✓ | ✓ |  |  |  |  |
| `flock.sell` | ✓ | ✓ | ✓ |  |  |  |  |
| `health.read` | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |
| `health.record_observation` | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |
| `health.manage` | ✓ | ✓ | ✓ |  |  |  | ✓ |
| `health.vaccinate` | ✓ | ✓ | ✓ | ✓ |  |  | ✓ |
| `biosecurity.read` | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |
| `biosecurity.record` | ✓ | ✓ | ✓ | ✓ | ✓ |  |  |
| `biosecurity.manage` | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `money.read` | ✓ | ✓ | ✓ |  |  | ✓ |  |
| `money.record` | ✓ | ✓ | ✓ |  |  | ✓ |  |
| `money.delete` | ✓ | ✓ |  |  |  | ✓ |  |
| `market.read` | ✓ | ✓ | ✓ |  |  | ✓ |  |
| `market.manage` | ✓ | ✓ | ✓ |  |  |  |  |
| `payment.record` | ✓ | ✓ | ✓ |  |  | ✓ |  |
| `inventory.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `inventory.issue` | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ |
| `inventory.manage` | ✓ | ✓ | ✓ |  |  | ✓ |  |
| `alert.manage` | ✓ | ✓ | ✓ | ✓ |  |  |  |
| `content.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Hierarchy rules for members

Rank: owner 100, admin 80, farm_manager 60, supervisor 40, accountant 30, vet 30, worker 20.

- You can only invite, change or remove members **below** your rank, and only assign roles below your rank. Owners are the exception: they can manage anyone, including other owners.
- Nobody can change their own role. Ownership is transferred by an owner promoting someone else to owner.
- Anyone can remove themselves (leave the farm). A farm always keeps at least one active owner.
- Inviting requires a verified email on the inviter's account. Accepting an invitation requires signing in with the invited email, and verifies it.

## Request pipeline for farm resources

```
authenticate → requireFarm → requirePermission / requireRole → requireFarmResource → service (re-checks) → repository (farm-scoped)
```

| Step | Checks | Failure |
| --- | --- | --- |
| `authenticate` | Valid access token, session active and unexpired, user active | 401 (`UNAUTHENTICATED`, `TOKEN_EXPIRED`, `SESSION_REVOKED`), 403 `ACCOUNT_DISABLED` |
| `requireFarm` | Caller has an **active** membership on `:farmId` | 404 — same as a farm that does not exist, so ids cannot be probed. Pending invitations and removed members get 404 too |
| `requirePermission` / `requireRole` | Role grants the action | 403 `FORBIDDEN` |
| `requireFarmResource` | The record in the URL is found **within this farm** | 404 |
| Service | Re-checks permission and hierarchy (`ROLE_HIERARCHY`), state rules (`LAST_OWNER`, `VERSION_CONFLICT`) | 403 / 409 / 422 |
| Repository | Every farm-scoped method takes `farmId`; the Mongoose `requireFarmScope` plugin throws on any farm-scoped query without it | Error (bug caught in tests) |

New business modules (flocks, feed, money…) follow the same chain: register a loader with `requireFarmResource` that queries by `farmId` and id, and never look a record up by id alone.

## Tests

| File | Covers |
| --- | --- |
| `test/auth.test.ts` | Sign-up, verification, login and lockout, refresh rotation and reuse, logout, forgot/reset/change password, Google linking rules, `/me` |
| `test/sessions.test.ts` | Device list, immediate revocation, sign out others, another user's session, absolute expiry, audit |
| `test/authorization.test.ts` | Role × endpoint matrix (expected statuses written by hand), hierarchy, ownership transfer, leaving, cross-farm attempts on every route, id swapping between farms, pending/removed members |
| `test/farms.test.ts` | PUT replace semantics, version conflicts, members list, cancelled invitations, idempotency, atomic registration |
| `test/repositories.contract.test.ts` | The same repository contract against the memory and MongoDB adapters |

# PoultryPilot data dictionary

> Generated from the Mongoose schemas in `services/api/src/adapters/mongo/models`. Do not edit by hand:
> run `pnpm --filter @poultrypilot/api docs:data-dictionary`. A test fails if this file is out of date.

52 collections, 86 secondary indexes (plus the default `_id` index on each). Design rules and relationships: `docs/data-model.md`.

| Collection | Domain | Ownership | Indexes | Purpose |
| --- | --- | --- | --- | --- |
| [`users`](#users) | Identity and tenancy | user | 2 | A person who signs in |
| [`sessions`](#sessions) | Identity and tenancy | user | 2 | One signed-in device |
| [`refresh_tokens`](#refresh_tokens) | Identity and tenancy | user | 2 | Rotating refresh token of a session |
| [`one_time_tokens`](#one_time_tokens) | Identity and tenancy | user | 3 | Single-use emailed links (email verification 24 h, password reset 1 h) |
| [`farms`](#farms) | Identity and tenancy | tenant | 0 | The tenant |
| [`farm_members`](#farm_members) | Identity and tenancy | farm | 4 | A user's role on a farm, or a pending invitation by email |
| [`houses`](#houses) | Production | farm | 1 | A shed, pen or brooder room |
| [`flocks`](#flocks) | Production | farm | 3 | A group of birds managed together from placement to closure: broiler batch, layer or breeder flock, chick-rearing group, or a custom poultry type |
| [`flock_events`](#flock_events) | Production | farm, append-only | 1 | The flock ledger: every placement, death, cull, transfer, split, merge, adjustment, sale and weighing |
| [`daily_records`](#daily_records) | Production | farm | 2 | One record per flock per farm-local day, entered from web or mobile |
| [`bird_weights`](#bird_weights) | Production | farm | 1 | A weigh session: individual sample weights of one flock on one day, with statistics computed from those weights |
| [`egg_records`](#egg_records) | Production | farm | 2 | Eggs collected from one flock on one day, by grade |
| [`egg_inventory`](#egg_inventory) | Production | farm, append-only | 2 | Egg stock ledger |
| [`water_records`](#water_records) | Production | farm | 1 | Water drunk by one flock on one day, with source, quality (pH, dissolved solids, chlorine), treatment and abnormal-consumption flags |
| [`feed_consumption`](#feed_consumption) | Feed | farm | 2 | Feed eaten by, or wasted in, a flock's house on a day |
| [`inventory_items`](#inventory_items) | Inventory | farm | 1 | The stock catalog: feed, medicine, vaccines, disinfectant, litter, packaging, equipment supplies, spare parts and other consumables |
| [`inventory_lots`](#inventory_lots) | Inventory | farm | 2 | A batch received into stock (a purchase, or a positive stock-count correction): supplier, batch number, expiry, storage location, unit cost and what remains |
| [`inventory_transactions`](#inventory_transactions) | Inventory | farm, append-only | 2 | The stock ledger: receipts, issues, wastage, stock-count adjustments and reversals, each against one lot |
| [`medicines`](#medicines) | Health | farm | 1 | Catalog of vaccines and medicines the farm uses, with withdrawal periods |
| [`health_records`](#health_records) | Health | farm | 2 | Vet visits, observations, treatments, lab tests and post-mortems |
| [`vaccinations`](#vaccinations) | Health | farm | 2 | A scheduled vaccination for a flock and, once given, its administration details |
| [`hatchery_batches`](#hatchery_batches) | Hatchery | farm | 2 | Eggs set together in an incubator |
| [`hatchery_events`](#hatchery_events) | Hatchery | farm, append-only | 1 | What happened to a batch: set, candling counts, transfer to hatcher, hatch and grading counts, environment readings |
| [`chicks`](#chicks) | Hatchery | farm | 1 | A lot of day-old chicks available to place or sell, from the farm's hatchery or bought in |
| [`biosecurity_logs`](#biosecurity_logs) | Biosecurity and equipment | farm | 1 | Evidence that a biosecurity action happened: cleaning, disinfection, footbath change, pest control, vehicle wash |
| [`visitors`](#visitors) | Biosecurity and equipment | farm | 1 | Visitor register: who entered, why, which houses, and their last contact with other poultry (for trace-back) |
| [`cleaning_tasks`](#cleaning_tasks) | Biosecurity and equipment | farm | 1 | A recurring cleaning or disinfection routine with its checklist |
| [`equipment`](#equipment) | Biosecurity and equipment | farm | 1 | Assets: incubators, feeders, heaters, generators, scales, vehicles |
| [`equipment_movements`](#equipment_movements) | Biosecurity and equipment | farm, append-only | 1 | Equipment moving between houses or off the farm, with whether it was disinfected (a common disease route) |
| [`expenses`](#expenses) | Money | farm | 3 | A bill or cost owed (accrual document) |
| [`recurring_expenses`](#recurring_expenses) | Money | farm | 1 | A repeating bill (electricity, wages, rent) |
| [`transactions`](#transactions) | Money | farm, append-only | 3 | The cash ledger: money actually received or paid |
| [`buyers`](#buyers) | Market | farm | 1 | The farm's own customer book |
| [`market_listings`](#market_listings) | Market | farm | 3 | Something a farm offers on the marketplace |
| [`orders`](#orders) | Market | farm | 4 | A sale by the farm (farmId = seller), recorded directly or placed by a marketplace buyer |
| [`order_payments`](#order_payments) | Market | farm, append-only | 1 | Money received against an order (or refunded) |
| [`market_prices`](#market_prices) | Market | global | 1 | Reference prices by region, product and date from a named source (fetched behind the API) |
| [`tasks`](#tasks) | Operations | farm | 2 | A piece of work assigned to someone on the farm, optionally linked to a flock, house or other record |
| [`alert_rules`](#alert_rules) | Operations | farm | 1 | A farm's configuration of one alert type: on/off, thresholds, scope and who is notified |
| [`alerts`](#alerts) | Operations | farm | 2 | Something that needs attention, raised by the server-side alert job |
| [`notifications`](#notifications) | Operations | user | 2 | A message to one person (in-app, push, email, SMS, WhatsApp) with delivery state |
| [`weather_cache`](#weather_cache) | Operations | global | 2 | Provider responses cached per rounded location (about 1 km) and kind, shared by every farm near that point |
| [`training_courses`](#training_courses) | Content | global | 2 | A course and its lessons (embedded: always read together, a few lessons each) |
| [`training_progress`](#training_progress) | Content | user | 1 | A lesson a person has completed |
| [`articles`](#articles) | Content | global | 2 | Facts, guides, news and disease notices |
| [`glossary_terms`](#glossary_terms) | Content | global | 2 | Plain-language definitions of poultry terms, searchable |
| [`audit_logs`](#audit_logs) | System | system | 3 | Who changed what, when, from which device |
| [`sync_operations`](#sync_operations) | System | farm | 1 | Each offline mutation a device pushed, with its outcome |
| [`sync_changes`](#sync_changes) | System | farm, append-only | 1 | Outbound change feed for offline clients: every change to a synced record gets the farm's next sequence number |
| [`idempotency_keys`](#idempotency_keys) | System | system | 1 | Stored responses for Idempotency-Key writes, so a retried request is answered without running twice |
| [`counters`](#counters) | System | system | 0 | Atomic per-farm sequences (sync change seq, order numbers) |
| [`media_assets`](#media_assets) | System | farm | 0 | A photo uploaded by a farm member (daily records, health records) |

## Identity and tenancy

### users

A person who signs in. Belongs to farms through farm_members, never directly.

- **Model:** `User`
- **Ownership:** User — belongs to one person
- **Standard fields:** `_id` (UUIDv7 string), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `email` | String | yes | ≤ 254 chars; lowercased |  |
| `fullName` | String | yes | ≤ 120 chars |  |
| `phone` | String |  | ≤ 30 chars |  |
| `locale` | String |  | ≤ 10 chars |  |
| `passwordHash` | String |  |  |  |
| `googleSub` | String |  |  |  |
| `emailVerified` | Boolean |  | default `false` |  |
| `emailVerifiedAt` | Date |  |  |  |
| `status` | String | yes | one of: `active`, `disabled`; default `"active"` |  |
| `passwordChangedAt` | Date |  |  |  |
| `lastLoginAt` | Date |  |  |  |
| `failedLoginCount` | Number |  | default `0`; integer |  |
| `lockedUntil` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| email | unique | Login and sign-up look users up by email; one account per email |
| googleSub | unique, sparse | Google sign-in resolves the user by Google subject id |

### sessions

One signed-in device. Checked on every authenticated request, so revoking it signs the device out immediately.

- **Model:** `Session`
- **Ownership:** User — belongs to one person
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `userId` | String | yes |  | `User` |
| `platform` | String | yes | one of: `web`, `android`, `ios`, `other` |  |
| `deviceId` | String |  | ≤ 100 chars |  |
| `deviceName` | String |  | ≤ 100 chars |  |
| `userAgent` | String |  | ≤ 300 chars |  |
| `ipAddress` | String |  | ≤ 64 chars |  |
| `authMethod` | String | yes | one of: `password`, `google` |  |
| `lastUsedAt` | Date | yes |  |  |
| `expiresAt` | Date | yes |  |  |
| `revokedAt` | Date |  |  |  |
| `revokedReason` | String |  | one of: `logout`, `user_revoked`, `password_changed`, `password_reset`, `token_reuse`, `account_disabled` |  |

| Index | Options | Serves |
| --- | --- | --- |
| userId, revokedAt |  | List a user's active sessions; revoke all of a user's sessions |
| expiresAt | TTL 30 d | TTL: delete sessions 30 days after they expire |

### refresh_tokens

Rotating refresh token of a session. Only the SHA-256 hash is stored.

- **Model:** `RefreshToken`
- **Ownership:** User — belongs to one person
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `sessionId` | String | yes |  | `Session` |
| `userId` | String | yes |  | `User` |
| `tokenHash` | String | yes |  |  |
| `expiresAt` | Date | yes |  |  |
| `replacedById` | String |  |  | `RefreshToken` |
| `revokedAt` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| tokenHash | unique | POST /auth/refresh finds the token by hash |
| expiresAt | TTL 7 d | TTL: delete tokens a week after expiry |

### one_time_tokens

Single-use emailed links (email verification 24 h, password reset 1 h). Hash only.

- **Model:** `OneTimeToken`
- **Ownership:** User — belongs to one person
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `userId` | String | yes |  | `User` |
| `purpose` | String | yes | one of: `email_verification`, `password_reset` |  |
| `tokenHash` | String | yes |  |  |
| `email` | String | yes | ≤ 254 chars; lowercased |  |
| `expiresAt` | Date | yes |  |  |
| `usedAt` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| tokenHash | unique | Verify-email and reset-password find the token by hash |
| userId, purpose |  | Invalidate a user's outstanding links of one purpose |
| expiresAt | TTL 1 d | TTL: delete links a day after expiry |

### farms

The tenant. Every farm-owned document carries this farm's _id as farmId.

- **Model:** `Farm`
- **Ownership:** Tenant root (its _id is the farmId)
- **Standard fields:** `_id` (UUIDv7 string), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `description` | String |  | ≤ 2000 chars |  |
| `countryCode` | String |  | pattern `/^[A-Z]{2}$/` |  |
| `locationLabel` | String |  | ≤ 200 chars |  |
| `location` | object |  |  |  |
| `location.lat` | Number | yes | min -90; max 90 |  |
| `location.lng` | Number | yes | min -180; max 180 |  |
| `settings` | object | yes |  |  |
| `settings.timezone` | String | yes |  |  |
| `settings.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `settings.unitSystem` | String | yes | one of: `metric`, `imperial` |  |
| `settings.fcrIncludesMortalityWeight` | Boolean |  | default `false` |  |
| `settings.workerEditWindowDays` | Number |  | max 7; default `1`; integer |  |

No secondary indexes: read by `_id` only.

### farm_members

A user's role on a farm, or a pending invitation by email. The basis of every authorization check.

- **Model:** `FarmMember`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `userId` | String |  |  | `User` |
| `email` | String | yes | ≤ 254 chars; lowercased |  |
| `role` | String | yes | one of: `owner`, `admin`, `farm_manager`, `supervisor`, `worker`, `accountant`, `vet` |  |
| `status` | String | yes | one of: `invited`, `active`, `revoked` |  |
| `inviteTokenHash` | String |  |  |  |
| `inviteExpiresAt` | Date |  |  |  |
| `invitedBy` | String |  |  | `User` |
| `invitedAt` | Date |  |  |  |
| `joinedAt` | Date |  |  |  |
| `removedAt` | Date |  |  |  |
| `removedBy` | String |  |  | `User` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, userId |  | requireFarm: is this user an active member of this farm (every farm request) |
| farmId, email |  | Invite: is this email already a member or invited |
| userId, status |  | GET /me and GET /farms: the user's active memberships across farms |
| inviteTokenHash | unique, sparse | Accept invitation by token hash |

- Members list (farmId only) is served by the farmId+userId index prefix.

## Production

### houses

A shed, pen or brooder room. Flocks are placed in houses; equipment and cleaning tasks can be tied to them.

- **Model:** `House`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 80 chars |  |
| `type` | String | yes | one of: `broiler`, `layer`, `brooder`, `breeder`, `hatchery`, `mixed` |  |
| `capacityBirds` | Number |  | min 1; integer |  |
| `floorAreaM2` | Number |  |  |  |
| `status` | String | yes | one of: `active`, `inactive`; default `"active"` |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, name | unique, live records only | House list per farm (prefix); house names are unique within a farm |

### flocks

A group of birds managed together from placement to closure: broiler batch, layer or breeder flock, chick-rearing group, or a custom poultry type.

- **Model:** `Flock`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `houseId` | String | yes |  | `House` |
| `name` | String | yes | ≤ 120 chars |  |
| `flockCode` | String | yes | ≤ 40 chars |  |
| `type` | String | yes | one of: `broiler`, `layer`, `breeder`, `chick`, `custom` |  |
| `customTypeName` | String |  | ≤ 60 chars |  |
| `species` | String | yes | one of: `chicken`, `duck`, `turkey`, `quail`, `guinea_fowl`; default `"chicken"` |  |
| `breed` | String |  | ≤ 120 chars |  |
| `strain` | String |  | ≤ 120 chars |  |
| `source` | String |  | ≤ 200 chars |  |
| `status` | String | yes | one of: `planned`, `active`, `closed`, `cancelled`; default `"planned"` |  |
| `hatchDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `placementDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `placementCount` | Number |  | min 1; integer |  |
| `deadOnArrival` | Number |  | integer |  |
| `ageDaysAtPlacement` | Number |  | max 2000; integer |  |
| `startingWeightG` | Number |  | max 50000 |  |
| `chickCost` | object |  |  |  |
| `chickCost.amountMinor` | Number | yes | integer |  |
| `chickCost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `targetSaleDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `closedDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `splitFromFlockId` | String |  |  | `Flock` |
| `mergedIntoFlockId` | String |  |  | `Flock` |
| `hatcheryBatchId` | String |  |  | `HatcheryBatch` |
| `notes` | String |  | ≤ 2000 chars |  |
| `population` | object |  |  |  |
| `population.placed` | Number | yes | integer |  |
| `population.transferredIn` | Number | yes | integer |  |
| `population.mortality` | Number | yes | integer |  |
| `population.culled` | Number | yes | integer |  |
| `population.sold` | Number | yes | integer |  |
| `population.transferredOut` | Number | yes | integer |  |
| `population.adjustments` | Number | yes | min -10000000; integer |  |
| `population.alive` | Number | yes | integer |  |
| `population.asOf` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, placementDate ↓ |  | Flock list and dashboard: active (or closed) flocks of a farm, newest first |
| farmId, houseId, status |  | House occupancy and capacity check for placements and transfers |
| farmId, flockCode | unique, live records only | Flock codes are unique within a farm; lookup by code |

### flock_events

The flock ledger: every placement, death, cull, transfer, split, merge, adjustment, sale and weighing. A flock's bird count is the sum of these. Append-only; mistakes are corrected with a reversal event.

- **Model:** `FlockEvent`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String | yes |  | `Flock` |
| `type` | String | yes | one of: `placement`, `mortality`, `cull`, `transfer_out`, `transfer_in`, `transfer_house`, `split_out`, `split_in`, `merge_out`, `merge_in`, `adjustment`, `sale`, `weighing`, `status_change` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `birds` | Number |  | min 1; integer |  |
| `deadOnArrival` | Number |  | integer |  |
| `delta` | Number |  | min -10000000; integer |  |
| `cause` | String |  | one of: `unknown`, `found_dead`, `predator`, `heat_stress`, `injury`, `suspected_disease`, `other` |  |
| `totalLiveWeightKg` | Number |  |  |  |
| `averageWeightG` | Number |  | max 50000 |  |
| `sampleSize` | Number |  | min 1; integer |  |
| `birdWeightId` | String |  |  | `BirdWeight` |
| `total` | object |  |  |  |
| `total.amountMinor` | Number | yes | integer |  |
| `total.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `cost` | object |  |  |  |
| `cost.amountMinor` | Number | yes | integer |  |
| `cost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `counterpartFlockId` | String |  |  | `Flock` |
| `fromHouseId` | String |  |  | `House` |
| `toHouseId` | String |  |  | `House` |
| `groupId` | String |  |  |  |
| `dailyRecordId` | String |  |  | `DailyRecord` |
| `chickLotId` | String |  |  | `ChickLot` |
| `buyerId` | String |  |  | `Buyer` |
| `orderId` | String |  |  | `Order` |
| `fromStatus` | String |  | one of: `planned`, `active`, `closed`, `cancelled` |  |
| `toStatus` | String |  | one of: `planned`, `active`, `closed`, `cancelled` |  |
| `reason` | String |  | ≤ 500 chars |  |
| `reversalOf` | String |  |  | `FlockEvent` |
| `note` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, date |  | A flock's ledger: population, calculations, day views, event history |

### daily_records

One record per flock per farm-local day, entered from web or mobile. Holds conditions, headcount, notes and photo references; its other sections are written to their source collections and linked by dailyRecordId: deaths, culls and average weight (flock_events), feed (feed_consumption), water (water_records), eggs (egg_records), health observations (health_records).

- **Model:** `DailyRecord`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String | yes |  | `Flock` |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `houseId` | String | yes |  | `House` |
| `flockType` | String | yes | one of: `broiler`, `layer`, `breeder`, `chick`, `custom` |  |
| `observedBirdCount` | Number |  | integer |  |
| `temperatureMinC` | Number |  | min -60; max 70 |  |
| `temperatureMaxC` | Number |  | min -60; max 70 |  |
| `humidityPercent` | Number |  | max 100 |  |
| `lightingHours` | Number |  | max 24 |  |
| `notes` | String |  | ≤ 2000 chars |  |
| `photos` | array of objects |  | custom validation |  |
| `photos[].assetId` | String | yes |  | `MediaAsset` |
| `photos[].caption` | String |  | ≤ 200 chars |  |
| `summary` | object |  |  |  |
| `summary.mortality` | Number |  | default `0`; integer |  |
| `summary.culls` | Number |  | default `0`; integer |  |
| `summary.feedKg` | Number |  | default `0` |  |
| `summary.waterLitres` | Number |  |  |  |
| `summary.eggsCollected` | Number |  | integer |  |
| `summary.eggsBroken` | Number |  | integer |  |
| `summary.averageWeightG` | Number |  | max 50000 |  |
| `summary.observations` | Number |  | default `0`; integer |  |
| `summary.photos` | Number |  | default `0`; integer |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, date | unique, live records only | One record per flock per day; also serves a flock's date-range history |
| farmId, date |  | Dashboard and nightly alert job: all flocks' records for a day; missing-record detection |

### bird_weights

A weigh session: individual sample weights of one flock on one day, with statistics computed from those weights.

- **Model:** `BirdWeight`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String | yes |  | `Flock` |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `weightsG` | array of Number | yes | custom validation; min 1; max 50000 |  |
| `stats` | object |  |  |  |
| `stats.count` | Number |  | integer |  |
| `stats.meanG` | Number |  |  |  |
| `stats.minG` | Number |  |  |  |
| `stats.maxG` | Number |  |  |  |
| `stats.sdG` | Number |  |  |  |
| `stats.cvPercent` | Number |  |  |  |
| `stats.uniformityPercent` | Number |  | max 100 |  |
| `scaleEquipmentId` | String |  |  | `Equipment` |
| `note` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, date ↓ |  | Growth curve and latest weight of a flock |

- Sample weights are embedded: they are always read with their session and are bounded (≤ 2000).

### egg_records

Eggs collected from one flock on one day, by grade. Saving it posts a 'collected' movement to egg_inventory.

- **Model:** `EggRecord`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String | yes |  | `Flock` |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `collected` | Number | yes | integer |  |
| `byGrade` | map of Mixed |  |  |  |
| `byGrade.$*` | Number |  |  |  |
| `broken` | Number |  | default `0`; integer |  |
| `averageEggWeightG` | Number |  | max 150 |  |
| `qualityNotes` | String |  | ≤ 500 chars |  |
| `dailyRecordId` | String |  |  | `DailyRecord` |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, date | unique, live records only | One record per flock per day; flock production chart and hen-day % |
| farmId, date |  | Farm egg totals per day (dashboard, 14-day chart, egg-drop alerts) |

### egg_inventory

Egg stock ledger. Each movement adds (collected, positive adjustment) or removes (sold, broken, used, spoiled) eggs; stock per grade is the sum of quantityDelta.

- **Model:** `EggInventory`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `type` | String | yes | one of: `collected`, `sold`, `broken`, `used`, `spoiled`, `adjustment`, `reversal` |  |
| `grade` | String |  | one of: `large`, `medium`, `small`, `cracked`, `dirty`, `double_yolk` |  |
| `quantityDelta` | Number | yes | min -10000000; integer |  |
| `flockId` | String |  |  | `Flock` |
| `sourceType` | String | yes | one of: `egg_record`, `order`, `manual` |  |
| `sourceId` | String |  |  |  |
| `reversalOf` | String |  |  | `EggInventory` |
| `note` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, grade, date |  | Current stock per grade (sum) and movement history |
| farmId, sourceId |  | Find the postings of an egg record or order to reverse them when it changes |

- **Relationship:** `sourceId` → EggRecord | Order (many-to-one) — Polymorphic by sourceType

### water_records

Water drunk by one flock on one day, with source, quality (pH, dissolved solids, chlorine), treatment and abnormal-consumption flags. Falling intake is often the first sign of illness or heat stress.

- **Model:** `WaterRecord`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String | yes |  | `Flock` |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `litres` | Number | yes | max 10000000 |  |
| `meterReading` | Number |  |  |  |
| `dailyRecordId` | String |  |  | `DailyRecord` |
| `source` | String |  | one of: `borehole`, `municipal`, `well`, `rainwater`, `river`, `tanker`, `other` |  |
| `ph` | Number |  | max 14 |  |
| `tdsPpm` | Number |  | max 100000 |  |
| `chlorinePpm` | Number |  | max 100 |  |
| `qualityRating` | String |  | one of: `good`, `fair`, `poor` |  |
| `treatment` | String |  | one of: `none`, `chlorination`, `acidification`, `filtration`, `uv`, `medication`, `vitamins`, `other` |  |
| `treatmentNotes` | String |  | ≤ 300 chars |  |
| `flags` | array of String |  | one of: `consumption_high`, `consumption_low`, `ph_low`, `ph_high`, `tds_high` |  |
| `baselineLitres` | Number |  |  |  |
| `medicated` | Boolean |  | default `false` |  |
| `healthRecordId` | String |  |  | `HealthRecord` |
| `notes` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, date | unique, live records only | One record per flock per day; water-to-feed ratio chart |

## Feed

### feed_consumption

Feed eaten by, or wasted in, a flock's house on a day. When it names a feed item, stock is drawn FEFO from that item's lots in the same transaction and the entry is costed at those lots' prices; the sum per flock feeds FCR and feed cost.

- **Model:** `FeedConsumption`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String |  |  | `Flock` |
| `feedItemId` | String |  |  | `InventoryItem` |
| `kind` | String | yes | one of: `consumption`, `wastage`; default `"consumption"` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `quantityKg` | Number | yes | min 0.001 |  |
| `dailyRecordId` | String |  |  | `DailyRecord` |
| `allocations` | array of objects |  |  |  |
| `allocations[].lotId` | String | yes |  | `InventoryLot` |
| `allocations[].quantity` | Number | yes |  |  |
| `allocations[].costMinor` | Number | yes | integer |  |
| `cost` | object |  |  |  |
| `cost.amountMinor` | Number | yes | integer |  |
| `cost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `reason` | String |  | ≤ 300 chars |  |
| `notes` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, date |  | FCR, daily feed per flock, feed-change alerts |
| farmId, feedItemId, date | partial: {"feedItemId":{"$exists":true}} | Average daily use per feed item for days of feed remaining |

## Inventory

### inventory_items

The stock catalog: feed, medicine, vaccines, disinfectant, litter, packaging, equipment supplies, spare parts and other consumables. Feed items carry feed details. Stock is held in lots; the item keeps a derived total.

- **Model:** `InventoryItem`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `category` | String | yes | one of: `feed`, `medicine`, `vaccine`, `disinfectant`, `litter`, `packaging`, `equipment`, `spare_part`, `cleaning`, `other` |  |
| `unit` | String | yes | one of: `kg`, `g`, `l`, `ml`, `dose`, `piece`, `tray`, `bag`, `box`, `bottle` |  |
| `sku` | String |  | ≤ 60 chars |  |
| `medicineId` | String |  |  | `Medicine` |
| `feed` | object |  |  |  |
| `feed.stage` | String | yes | one of: `pre_starter`, `starter`, `grower`, `finisher`, `pre_layer`, `layer`, `breeder`, `other` |  |
| `feed.form` | String |  | one of: `mash`, `crumble`, `pellet`, `other` |  |
| `feed.bagSizeKg` | Number |  |  |  |
| `defaultSupplier` | String |  | ≤ 120 chars |  |
| `defaultStorageLocation` | String |  | ≤ 120 chars |  |
| `reorderLevel` | Number |  |  |  |
| `reorderDays` | Number |  | max 365 |  |
| `expiryWarningDays` | Number |  | max 365; default `30`; integer |  |
| `active` | Boolean |  | default `true` |  |
| `notes` | String |  | ≤ 1000 chars |  |
| `stock` | object |  |  |  |
| `stock.quantity` | Number | yes | min -1000000000 |  |
| `stock.valueMinor` | Number | yes | min -1000000000000; integer |  |
| `stock.currency` | String |  | pattern `/^[A-Z]{3}$/` |  |
| `stock.asOf` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, name | unique, live records only | Inventory list (prefix); names unique within a farm |

### inventory_lots

A batch received into stock (a purchase, or a positive stock-count correction): supplier, batch number, expiry, storage location, unit cost and what remains. Stock leaves lots FEFO.

- **Model:** `InventoryLot`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `itemId` | String | yes |  | `InventoryItem` |
| `receivedDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `supplier` | String |  | ≤ 120 chars |  |
| `batchNumber` | String |  | ≤ 60 chars |  |
| `invoiceNumber` | String |  | ≤ 60 chars |  |
| `expiryDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `storageLocation` | String |  | ≤ 120 chars |  |
| `quantityReceived` | Number | yes | min 0.001 |  |
| `quantityRemaining` | Number | yes |  |  |
| `unitCost` | object | yes |  |  |
| `unitCost.amountMinor` | Number | yes | integer |  |
| `unitCost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `expenseId` | String |  |  | `Expense` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, itemId, receivedDate |  | An item's lots for FEFO picking and its stock view |
| farmId, expiryDate | partial: {"expiryDate":{"$exists":true}} | Expiry alerts: lots expiring soon across the farm |

### inventory_transactions

The stock ledger: receipts, issues, wastage, stock-count adjustments and reversals, each against one lot. quantityDelta is signed; valueMinor is the cost moved. Written automatically by purchases, feed use, daily records and manual issues.

- **Model:** `InventoryTransaction`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `itemId` | String | yes |  | `InventoryItem` |
| `lotId` | String | yes |  | `InventoryLot` |
| `type` | String | yes | one of: `receipt`, `issue`, `wastage`, `adjustment`, `reversal` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `quantityDelta` | Number | yes | min -1000000000 |  |
| `valueMinor` | Number | yes | min -1000000000000; integer |  |
| `currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `sourceType` | String | yes | one of: `purchase`, `feed_consumption`, `manual`, `stock_count`, `vaccination`, `health_record` |  |
| `sourceId` | String |  |  |  |
| `reason` | String |  | ≤ 300 chars |  |
| `reversalOf` | String |  |  | `InventoryTransaction` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, itemId, date |  | An item's movement history and ledger replay |
| farmId, sourceId |  | Find the movements of a feed entry or purchase to reverse them |

## Health

### medicines

Catalog of vaccines and medicines the farm uses, with withdrawal periods. Clinical facts only; stock lives in inventory_items.

- **Model:** `Medicine`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `type` | String | yes | one of: `vaccine`, `antibiotic`, `anticoccidial`, `antiparasitic`, `vitamin_mineral`, `probiotic`, `other` |  |
| `activeIngredient` | String |  | ≤ 200 chars |  |
| `manufacturer` | String |  | ≤ 120 chars |  |
| `defaultRoute` | String |  | one of: `drinking_water`, `feed`, `injection`, `eye_drop`, `nasal`, `spray`, `wing_web`, `oral`, `topical`, `in_ovo` |  |
| `doseUnit` | String |  | one of: `kg`, `g`, `l`, `ml`, `dose`, `piece`, `tray`, `bag`, `box`, `bottle` |  |
| `withdrawalMeatDays` | Number |  | max 365; integer |  |
| `withdrawalEggDays` | Number |  | max 365; integer |  |
| `prescriptionRequired` | Boolean |  | default `false` |  |
| `label` | object |  |  |  |
| `label.name` | String | yes | ≤ 200 chars |  |
| `label.url` | String |  | ≤ 1000 chars |  |
| `label.retrievedAt` | Date |  |  |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, name | unique, live records only | Medicine picker (prefix); names unique within a farm |

### health_records

Vet visits, observations, treatments, lab tests and post-mortems. Records what people observed and what a vet concluded; PoultryPilot never diagnoses.

- **Model:** `HealthRecord`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `type` | String | yes | one of: `treatment`, `vet_visit`, `observation`, `lab_test`, `post_mortem` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `title` | String | yes | ≤ 200 chars |  |
| `observedSigns` | String |  | ≤ 2000 chars |  |
| `affectedBirds` | Number |  | integer |  |
| `vetName` | String |  | ≤ 120 chars |  |
| `vetUserId` | String |  |  | `User` |
| `diagnosisByVet` | String |  | ≤ 2000 chars |  |
| `lab` | object |  |  |  |
| `lab.name` | String |  | ≤ 120 chars |  |
| `lab.reference` | String |  | ≤ 60 chars |  |
| `lab.result` | String |  | ≤ 4000 chars |  |
| `treatment` | object |  |  |  |
| `treatment.medicineId` | String | yes |  | `Medicine` |
| `treatment.dose` | Number |  |  |  |
| `treatment.doseUnit` | String |  | one of: `kg`, `g`, `l`, `ml`, `dose`, `piece`, `tray`, `bag`, `box`, `bottle` |  |
| `treatment.route` | String |  | one of: `drinking_water`, `feed`, `injection`, `eye_drop`, `nasal`, `spray`, `wing_web`, `oral`, `topical`, `in_ovo` |  |
| `treatment.startDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `treatment.endDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `treatment.withdrawalMeatUntil` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `treatment.withdrawalEggsUntil` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `treatment.prescribedBy` | String |  | ≤ 120 chars |  |
| `cost` | object |  |  |  |
| `cost.amountMinor` | Number | yes | integer |  |
| `cost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `expenseId` | String |  |  | `Expense` |
| `attachments` | array of objects |  |  |  |
| `attachments[].name` | String |  | ≤ 200 chars |  |
| `attachments[].assetUrl` | String | yes | ≤ 1000 chars |  |
| `followUpDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `dailyRecordId` | String |  |  | `DailyRecord` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, date ↓ |  | Flock health history; active withdrawal check before a sale |
| farmId, date ↓ |  | Farm-wide health log for vets and managers |

### vaccinations

A scheduled vaccination for a flock and, once given, its administration details. Overdue = scheduled and past due (derived).

- **Model:** `Vaccination`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String | yes |  | `Flock` |
| `medicineId` | String |  |  | `Medicine` |
| `vaccineName` | String | yes | ≤ 120 chars |  |
| `targetDisease` | String |  | ≤ 120 chars |  |
| `programmeName` | String |  | ≤ 120 chars |  |
| `status` | String | yes | one of: `scheduled`, `done`, `skipped`, `cancelled`; default `"scheduled"` |  |
| `dueDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `administeredDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `administeredBy` | String |  |  | `User` |
| `route` | String |  | one of: `drinking_water`, `feed`, `injection`, `eye_drop`, `nasal`, `spray`, `wing_web`, `oral`, `topical`, `in_ovo` |  |
| `dose` | Number |  |  |  |
| `doseUnit` | String |  | one of: `kg`, `g`, `l`, `ml`, `dose`, `piece`, `tray`, `bag`, `box`, `bottle` |  |
| `birdsVaccinated` | Number |  | integer |  |
| `lotNumber` | String |  | ≤ 60 chars |  |
| `expiryDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `inventoryTransactionId` | String |  |  | `InventoryTransaction` |
| `skipReason` | String |  | ≤ 500 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, dueDate |  | Upcoming and overdue vaccinations across the farm (calendar, reminder job) |
| farmId, flockId, dueDate |  | A flock's vaccination programme |

## Hatchery

### hatchery_batches

Eggs set together in an incubator. Results are recorded as hatchery_events; hatched chicks become a chick lot.

- **Model:** `HatcheryBatch`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `code` | String | yes | ≤ 40 chars |  |
| `species` | String | yes | one of: `chicken`, `duck`, `turkey`, `quail`, `guinea_fowl`; default `"chicken"` |  |
| `breed` | String |  | ≤ 120 chars |  |
| `eggSource` | String | yes | one of: `own_flock`, `purchased` |  |
| `sourceFlockId` | String |  |  | `Flock` |
| `supplier` | String |  | ≤ 120 chars |  |
| `incubatorId` | String |  |  | `Equipment` |
| `setDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `incubationDays` | Number | yes | min 10; max 40; integer |  |
| `expectedHatchDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `eggsSet` | Number | yes | min 1; integer |  |
| `status` | String | yes | one of: `incubating`, `in_hatcher`, `hatched`, `cancelled`; default `"incubating"` |  |
| `results` | object |  |  |  |
| `results.infertile` | Number |  | integer |  |
| `results.earlyDead` | Number |  | integer |  |
| `results.fertile` | Number |  | integer |  |
| `results.deadInShell` | Number |  | integer |  |
| `results.hatched` | Number |  | integer |  |
| `results.culled` | Number |  | integer |  |
| `eggCost` | object |  |  |  |
| `eggCost.amountMinor` | Number | yes | integer |  |
| `eggCost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, expectedHatchDate |  | Incubating batches and hatches due (dashboard, calendar) |
| farmId, code | unique | Batch codes unique within a farm; lookup by code from egg labels |

### hatchery_events

What happened to a batch: set, candling counts, transfer to hatcher, hatch and grading counts, environment readings.

- **Model:** `HatcheryEvent`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `batchId` | String | yes |  | `HatcheryBatch` |
| `type` | String | yes | one of: `set`, `candling`, `transfer_to_hatcher`, `hatch`, `chick_grading`, `environment_reading`, `note`, `cancelled` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `counts` | object |  |  |  |
| `counts.candled` | Number |  | integer |  |
| `counts.infertile` | Number |  | integer |  |
| `counts.earlyDead` | Number |  | integer |  |
| `counts.deadInShell` | Number |  | integer |  |
| `counts.hatched` | Number |  | integer |  |
| `counts.gradeA` | Number |  | integer |  |
| `counts.culled` | Number |  | integer |  |
| `temperatureC` | Number |  | max 50 |  |
| `humidityPercent` | Number |  | max 100 |  |
| `chickLotId` | String |  |  | `ChickLot` |
| `reversalOf` | String |  |  | `HatcheryEvent` |
| `note` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, batchId, date |  | Timeline of one batch |

### chicks

A lot of day-old chicks available to place or sell, from the farm's hatchery or bought in. Placements (flock_events) and chick sales (orders) draw it down.

- **Model:** `ChickLot`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `source` | String | yes | one of: `own_hatchery`, `purchased` |  |
| `hatcheryBatchId` | String |  |  | `HatcheryBatch` |
| `supplier` | String |  | ≤ 120 chars |  |
| `species` | String | yes | one of: `chicken`, `duck`, `turkey`, `quail`, `guinea_fowl`; default `"chicken"` |  |
| `breed` | String |  | ≤ 120 chars |  |
| `hatchDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `quantity` | Number | yes | min 1; integer |  |
| `remaining` | Number | yes | integer |  |
| `status` | String | yes | one of: `available`, `depleted`, `closed`; default `"available"` |  |
| `vaccinationsAtHatch` | array of String |  | ≤ 120 chars |  |
| `placedFlockIds` | array of String |  |  | `Flock` |
| `unitCost` | object |  |  |  |
| `unitCost.amountMinor` | Number | yes | integer |  |
| `unitCost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, hatchDate ↓ |  | Available chick lots for placement or sale |

## Biosecurity and equipment

### biosecurity_logs

Evidence that a biosecurity action happened: cleaning, disinfection, footbath change, pest control, vehicle wash.

- **Model:** `BiosecurityLog`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `type` | String | yes | one of: `cleaning`, `disinfection`, `visitor`, `vehicle`, `equipment`, `pest_control`, `footbath` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `houseId` | String |  |  | `House` |
| `cleaningTaskId` | String |  |  | `CleaningTask` |
| `performedBy` | String |  | ≤ 120 chars |  |
| `productUsed` | String |  | ≤ 120 chars |  |
| `inventoryTransactionId` | String |  |  | `InventoryTransaction` |
| `checklist` | array of objects |  |  |  |
| `checklist[].item` | String | yes | ≤ 200 chars |  |
| `checklist[].done` | Boolean |  | default `false` |  |
| `details` | String |  | ≤ 2000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, date ↓ |  | Biosecurity log list and audits by period |

### visitors

Visitor register: who entered, why, which houses, and their last contact with other poultry (for trace-back).

- **Model:** `Visitor`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `company` | String |  | ≤ 120 chars |  |
| `type` | String | yes | one of: `vet`, `supplier`, `buyer`, `worker`, `government`, `contractor`, `other` |  |
| `phone` | String |  | ≤ 30 chars |  |
| `purpose` | String |  | ≤ 200 chars |  |
| `vehicleRegistration` | String |  | ≤ 30 chars |  |
| `housesVisited` | array of String |  |  | `House` |
| `lastPoultryContactDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `ppeProvided` | Boolean |  | default `false` |  |
| `disinfected` | Boolean |  | default `false` |  |
| `checkInAt` | Date | yes |  |  |
| `checkOutAt` | Date |  |  |  |
| `hostUserId` | String |  |  | `User` |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, checkInAt ↓ |  | Visitor register by date; trace-back of who visited in a period |

### cleaning_tasks

A recurring cleaning or disinfection routine with its checklist. Completing it writes a biosecurity_log and moves nextDueDate.

- **Model:** `CleaningTask`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `title` | String | yes | ≤ 200 chars |  |
| `schedule` | String | yes | one of: `daily`, `weekly`, `monthly`, `between_flocks`, `one_off` |  |
| `houseIds` | array of String |  |  | `House` |
| `checklist` | array of String |  | ≤ 200 chars |  |
| `assigneeUserId` | String |  |  | `User` |
| `nextDueDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `lastDoneDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `active` | Boolean |  | default `true` |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, active, nextDueDate |  | Due and overdue cleaning (calendar, reminders) |

### equipment

Assets: incubators, feeders, heaters, generators, scales, vehicles. Location is the house it is currently in.

- **Model:** `Equipment`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `type` | String | yes | one of: `incubator`, `hatcher`, `feeder`, `drinker`, `heater`, `fan`, `generator`, `scale`, `vehicle`, `sprayer`, `other` |  |
| `serialNumber` | String |  | ≤ 80 chars |  |
| `houseId` | String |  |  | `House` |
| `status` | String | yes | one of: `in_service`, `maintenance`, `retired`; default `"in_service"` |  |
| `purchaseDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `purchaseCost` | object |  |  |  |
| `purchaseCost.amountMinor` | Number | yes | integer |  |
| `purchaseCost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `nextMaintenanceDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `capacity` | Number |  | integer |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, nextMaintenanceDate |  | Equipment list by status; maintenance due |

### equipment_movements

Equipment moving between houses or off the farm, with whether it was disinfected (a common disease route).

- **Model:** `EquipmentMovement`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `equipmentId` | String | yes |  | `Equipment` |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `fromHouseId` | String |  |  | `House` |
| `toHouseId` | String |  |  | `House` |
| `offFarmDestination` | String |  | ≤ 200 chars |  |
| `disinfected` | Boolean |  | default `false` |  |
| `movedBy` | String |  | ≤ 120 chars |  |
| `reversalOf` | String |  |  | `EquipmentMovement` |
| `note` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, equipmentId, date ↓ |  | Movement history of one item (trace-back) |

## Money

### expenses

A bill or cost owed (accrual document). It can be unpaid; paying it posts transactions. Feed purchases, treatments and recurring bills create expenses.

- **Model:** `Expense`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `dueDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `category` | String | yes | one of: `bird_sales`, `egg_sales`, `chick_sales`, `manure_sales`, `other_income`, `stock_purchase`, `feed`, `medicine_vaccine`, `vet_services`, `labour`, `electricity`, `water`, `fuel_transport`, `litter_bedding`, `rent`, `maintenance`, `licences_fees`, `equipment`, `other_expense` |  |
| `description` | String | yes | ≤ 300 chars |  |
| `vendor` | String |  | ≤ 120 chars |  |
| `amount` | object | yes |  |  |
| `amount.amountMinor` | Number | yes | integer |  |
| `amount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `amountPaid` | object |  |  |  |
| `amountPaid.amountMinor` | Number | yes | integer |  |
| `amountPaid.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `status` | String | yes | one of: `unpaid`, `partially_paid`, `paid`, `cancelled`; default `"unpaid"` |  |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `recurringExpenseId` | String |  |  | `RecurringExpense` |
| `sourceType` | String | yes | one of: `manual`, `feed_purchase`, `health_record`, `inventory_transaction`, `recurring_expense`; default `"manual"` |  |
| `sourceId` | String |  |  |  |
| `invoiceNumber` | String |  | ≤ 60 chars |  |
| `attachments` | array of objects |  |  |  |
| `attachments[].name` | String |  | ≤ 200 chars |  |
| `attachments[].assetUrl` | String | yes | ≤ 1000 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, date ↓ |  | Expense list and spend by period |
| farmId, status, dueDate |  | Unpaid and overdue bills |
| farmId, recurringExpenseId, dueDate | unique, partial: {"recurringExpenseId":{"$exists":true}} | Bill generation is idempotent: one expense per recurring bill per due date |

- **Relationship:** `sourceId` → FeedPurchase | HealthRecord | InventoryTransaction (one-to-one) — Polymorphic by sourceType

### recurring_expenses

A repeating bill (electricity, wages, rent). The scheduler creates an expense on each due date; pauses stop that.

- **Model:** `RecurringExpense`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `category` | String | yes | one of: `bird_sales`, `egg_sales`, `chick_sales`, `manure_sales`, `other_income`, `stock_purchase`, `feed`, `medicine_vaccine`, `vet_services`, `labour`, `electricity`, `water`, `fuel_transport`, `litter_bedding`, `rent`, `maintenance`, `licences_fees`, `equipment`, `other_expense` |  |
| `vendor` | String |  | ≤ 120 chars |  |
| `amount` | object | yes |  |  |
| `amount.amountMinor` | Number | yes | integer |  |
| `amount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `frequency` | String | yes | one of: `daily`, `weekly`, `monthly`, `quarterly`, `yearly` |  |
| `startDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `endDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `pauses` | array of objects |  |  |  |
| `pauses[].from` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `pauses[].to` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `nextDueDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `active` | Boolean |  | default `true` |  |
| `flockId` | String |  |  | `Flock` |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, active, nextDueDate |  | Scheduler finds bills due; running-costs list |

### transactions

The cash ledger: money actually received or paid. Farm profit for a period = income − expense here. Corrections are reversal entries.

- **Model:** `Transaction`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `direction` | String | yes | one of: `income`, `expense` |  |
| `category` | String | yes | one of: `bird_sales`, `egg_sales`, `chick_sales`, `manure_sales`, `other_income`, `stock_purchase`, `feed`, `medicine_vaccine`, `vet_services`, `labour`, `electricity`, `water`, `fuel_transport`, `litter_bedding`, `rent`, `maintenance`, `licences_fees`, `equipment`, `other_expense` |  |
| `amount` | object | yes |  |  |
| `amount.amountMinor` | Number | yes | integer |  |
| `amount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `description` | String |  | ≤ 300 chars |  |
| `source` | String | yes | one of: `manual`, `expense`, `order_payment`, `feed_purchase`, `recurring_expense`, `opening_balance`, `reversal` |  |
| `sourceId` | String |  |  |  |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `paymentMethod` | String |  | one of: `cash`, `bank_transfer`, `mobile_money`, `upi`, `card`, `cheque`, `other` |  |
| `reference` | String |  | ≤ 80 chars |  |
| `counterparty` | String |  | ≤ 120 chars |  |
| `reversalOf` | String |  |  | `Transaction` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, date |  | Profit and category totals for a period (Money, Dashboard) |
| farmId, flockId, date |  | Batch economics: income and direct costs of one flock |
| farmId, sourceId |  | Find the postings of an expense or payment to reverse or reconcile them |

- **Relationship:** `sourceId` → Expense | OrderPayment | FeedPurchase | RecurringExpense (many-to-one) — Polymorphic by source

## Market

### buyers

The farm's own customer book. A buyer may also be another PoultryPilot farm (linkedFarmId).

- **Model:** `Buyer`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `type` | String | yes | one of: `trader`, `retailer`, `restaurant`, `processor`, `individual`, `farm`, `other`; default `"other"` |  |
| `phone` | String |  | ≤ 30 chars |  |
| `email` | String |  | ≤ 254 chars; lowercased |  |
| `locationLabel` | String |  | ≤ 200 chars |  |
| `linkedFarmId` | String |  |  | `Farm` |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, name |  | Buyer list sorted by name and name search |

### market_listings

Something a farm offers on the marketplace. Seller contact details are not stored here; they are shared only with a buyer who places an order.

- **Model:** `MarketListing`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `title` | String | yes | ≤ 150 chars |  |
| `category` | String | yes | one of: `live_birds`, `dressed_birds`, `eggs`, `day_old_chicks`, `hatching_eggs`, `manure`, `other` |  |
| `product` | String |  | one of: `live_broiler`, `dressed_broiler`, `table_eggs`, `day_old_chick_broiler`, `day_old_chick_layer`, `spent_hen`, `maize`, `soybean_meal`, `broiler_feed`, `layer_feed` |  |
| `description` | String |  | ≤ 2000 chars |  |
| `quantityAvailable` | Number | yes |  |  |
| `unit` | String | yes | ≤ 20 chars |  |
| `price` | object | yes |  |  |
| `price.amountMinor` | Number | yes | integer |  |
| `price.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `priceUnit` | String | yes | one of: `per_kg`, `per_bird`, `per_egg`, `per_tray`, `per_dozen`, `per_tonne`, `per_bag` |  |
| `regionCode` | String | yes | pattern `/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/` |  |
| `locationLabel` | String |  | ≤ 200 chars |  |
| `location` | object |  |  |  |
| `location.type` | String | yes | one of: `Point` |  |
| `location.coordinates` | array of Number | yes |  |  |
| `availableFrom` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `availableUntil` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `status` | String | yes | one of: `draft`, `active`, `paused`, `sold_out`, `closed`; default `"draft"` |  |
| `photos` | array of String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status |  | Seller's own listings |
| status, category, createdAt ↓ |  | Marketplace browse by category, newest first (cross-farm read) |
| location (2dsphere), status |  | Marketplace near me: active listings within a distance (cross-farm read) |

- Browse queries span farms by design and use setOptions({ crossFarm: true }); they only ever return listings with status active.

### orders

A sale by the farm (farmId = seller), recorded directly or placed by a marketplace buyer. Prices come from the server, never the buyer. Delivery posts egg/bird/chick stock movements.

- **Model:** `Order`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `orderNumber` | Number | yes | min 1; integer |  |
| `channel` | String | yes | one of: `direct`, `marketplace` |  |
| `buyerId` | String |  |  | `Buyer` |
| `buyerUserId` | String |  |  | `User` |
| `buyerFarmId` | String |  |  | `Farm` |
| `listingId` | String |  |  | `MarketListing` |
| `lines` | array of objects | yes | custom validation |  |
| `lines[].category` | String | yes | one of: `live_birds`, `dressed_birds`, `eggs`, `day_old_chicks`, `hatching_eggs`, `manure`, `other` |  |
| `lines[].description` | String | yes | ≤ 200 chars |  |
| `lines[].flockId` | String |  |  | `Flock` |
| `lines[].chickLotId` | String |  |  | `ChickLot` |
| `lines[].eggGrade` | String |  | one of: `large`, `medium`, `small`, `cracked`, `dirty`, `double_yolk` |  |
| `lines[].quantity` | Number | yes | min 0.001 |  |
| `lines[].unit` | String | yes | ≤ 20 chars |  |
| `lines[].unitPrice` | object | yes |  |  |
| `lines[].unitPrice.amountMinor` | Number | yes | integer |  |
| `lines[].unitPrice.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `lines[].total` | object | yes |  |  |
| `lines[].total.amountMinor` | Number | yes | integer |  |
| `lines[].total.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `subtotal` | object | yes |  |  |
| `subtotal.amountMinor` | Number | yes | integer |  |
| `subtotal.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `discount` | object |  |  |  |
| `discount.amountMinor` | Number | yes | integer |  |
| `discount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `total` | object | yes |  |  |
| `total.amountMinor` | Number | yes | integer |  |
| `total.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `status` | String | yes | one of: `pending`, `confirmed`, `delivered`, `closed`, `cancelled`; default `"pending"` |  |
| `statusHistory` | array of objects |  |  |  |
| `statusHistory[].status` | String | yes | one of: `pending`, `confirmed`, `delivered`, `closed`, `cancelled` |  |
| `statusHistory[].at` | Date | yes |  |  |
| `statusHistory[].by` | String |  |  | `User` |
| `paymentStatus` | String | yes | one of: `unpaid`, `partially_paid`, `paid`, `refunded`; default `"unpaid"` |  |
| `amountPaid` | object |  |  |  |
| `amountPaid.amountMinor` | Number | yes | integer |  |
| `amountPaid.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `requestedDeliveryDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `deliveredDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `deliveryAddress` | String |  | ≤ 300 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, orderNumber | unique | Order numbers unique per seller farm; lookup by number |
| farmId, status, createdAt ↓ |  | Seller's order board by status |
| farmId, buyerId, createdAt ↓ |  | A buyer's order history and outstanding balance |
| buyerUserId, createdAt ↓ | partial: {"buyerUserId":{"$exists":true}} | Marketplace buyer's purchases across sellers (cross-farm read) |

- Lines and status history are embedded: always read with the order and bounded in size.

### order_payments

Money received against an order (or refunded). Posts an income transaction; overpayment is refused unless recorded as credit.

- **Model:** `OrderPayment`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `orderId` | String | yes |  | `Order` |
| `kind` | String | yes | one of: `payment`, `refund`; default `"payment"` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `amount` | object | yes |  |  |
| `amount.amountMinor` | Number | yes | integer |  |
| `amount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `method` | String | yes | one of: `cash`, `bank_transfer`, `mobile_money`, `upi`, `card`, `cheque`, `other` |  |
| `reference` | String |  | ≤ 80 chars |  |
| `transactionId` | String |  |  | `Transaction` |
| `reversalOf` | String |  |  | `OrderPayment` |
| `note` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, orderId, date |  | Payments of one order (balance, receipt) |

### market_prices

Reference prices by region, product and date from a named source (fetched behind the API). Shared by all farms.

- **Model:** `MarketPrice`
- **Ownership:** Global — shared reference data
- **Standard fields:** `_id` (UUIDv7 string), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `product` | String | yes | one of: `live_broiler`, `dressed_broiler`, `table_eggs`, `day_old_chick_broiler`, `day_old_chick_layer`, `spent_hen`, `maize`, `soybean_meal`, `broiler_feed`, `layer_feed` |  |
| `countryCode` | String | yes | pattern `/^[A-Z]{2}$/` |  |
| `regionKey` | String | yes | ≤ 80 chars |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `price` | object | yes |  |  |
| `price.amountMinor` | Number | yes | integer |  |
| `price.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `priceMin` | object |  |  |  |
| `priceMin.amountMinor` | Number | yes | integer |  |
| `priceMin.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `priceMax` | object |  |  |  |
| `priceMax.amountMinor` | Number | yes | integer |  |
| `priceMax.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `unit` | String | yes | one of: `per_kg`, `per_bird`, `per_egg`, `per_tray`, `per_dozen`, `per_tonne`, `per_bag` |  |
| `source` | object | yes |  |  |
| `source.name` | String | yes | ≤ 200 chars |  |
| `source.url` | String |  | ≤ 1000 chars |  |
| `source.retrievedAt` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| countryCode, regionKey, product, date ↓, source.name | unique | Latest prices for a region and product; one price per source per day (import is idempotent) |

## Operations

### tasks

A piece of work assigned to someone on the farm, optionally linked to a flock, house or other record.

- **Model:** `Task`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `title` | String | yes | ≤ 200 chars |  |
| `description` | String |  | ≤ 2000 chars |  |
| `assigneeUserId` | String |  |  | `User` |
| `dueDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `status` | String | yes | one of: `open`, `in_progress`, `done`, `cancelled`; default `"open"` |  |
| `priority` | String | yes | one of: `low`, `normal`, `high`, `urgent`; default `"normal"` |  |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `related` | object |  |  |  |
| `related.entity` | String | yes | ≤ 40 chars |  |
| `related.id` | String | yes |  |  |
| `completedAt` | Date |  |  |  |
| `completedBy` | String |  |  | `User` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, dueDate |  | Farm task board by status and due date |
| farmId, assigneeUserId, status, dueDate |  | My tasks (worker home screen) |

- **Relationship:** `related.id` → any farm record (many-to-one) — Polymorphic by related.entity

### alert_rules

A farm's configuration of one alert type: on/off, thresholds, scope and who is notified. Defaults apply when absent.

- **Model:** `AlertRule`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `ruleType` | String | yes | one of: `mortality_spike`, `egg_drop`, `feed_change`, `missing_record`, `heat_stress`, `low_feed_stock`, `low_inventory`, `vaccination_due`, `withdrawal_active`, `expiry_soon`, `expired_stock`, `water_abnormal` |  |
| `enabled` | Boolean |  | default `true` |  |
| `parameters` | map of Number |  |  |  |
| `parameters.$*` | Number |  |  |  |
| `flockIds` | array of String |  |  | `Flock` |
| `houseIds` | array of String |  |  | `House` |
| `notifyRoles` | array of String |  | one of: `owner`, `admin`, `farm_manager`, `supervisor`, `worker`, `accountant`, `vet` |  |
| `channels` | array of String |  | one of: `in_app`, `push`, `email`, `sms`, `whatsapp` |  |
| `cooldownHours` | Number |  | max 720; default `24`; integer |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, ruleType | unique | Load a farm's rules for the alert job; one rule per type per farm |

### alerts

Something that needs attention, raised by the server-side alert job. States facts (never a diagnosis). Deduplicated by dedupKey.

- **Model:** `Alert`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `ruleType` | String | yes | one of: `mortality_spike`, `egg_drop`, `feed_change`, `missing_record`, `heat_stress`, `low_feed_stock`, `low_inventory`, `vaccination_due`, `withdrawal_active`, `expiry_soon`, `expired_stock`, `water_abnormal` |  |
| `severity` | String | yes | one of: `info`, `warning`, `critical` |  |
| `status` | String | yes | one of: `open`, `acknowledged`, `resolved`; default `"open"` |  |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `title` | String | yes | ≤ 200 chars |  |
| `message` | String |  | ≤ 2000 chars |  |
| `values` | map of Number |  |  |  |
| `values.$*` | Number |  |  |  |
| `dedupKey` | String | yes | ≤ 200 chars |  |
| `acknowledgedBy` | String |  |  | `User` |
| `acknowledgedAt` | Date |  |  |  |
| `resolvedAt` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, dedupKey | unique | The alert job is idempotent: an alert is raised once per rule, flock and day |
| farmId, status, createdAt ↓ |  | Open alerts badge and alert list |

### notifications

A message to one person (in-app, push, email, SMS, WhatsApp) with delivery state. Kept 180 days.

- **Model:** `Notification`
- **Ownership:** User — belongs to one person
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `userId` | String | yes |  | `User` |
| `channel` | String | yes | one of: `in_app`, `push`, `email`, `sms`, `whatsapp` |  |
| `status` | String | yes | one of: `queued`, `sent`, `delivered`, `failed`, `read`; default `"queued"` |  |
| `title` | String | yes | ≤ 200 chars |  |
| `body` | String |  | ≤ 2000 chars |  |
| `link` | object |  |  |  |
| `link.entity` | String |  | ≤ 40 chars |  |
| `link.id` | String |  |  |  |
| `link.path` | String |  | ≤ 300 chars |  |
| `alertId` | String |  |  | `Alert` |
| `sentAt` | Date |  |  |  |
| `deliveredAt` | Date |  |  |  |
| `readAt` | Date |  |  |  |
| `error` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| userId, createdAt ↓ |  | A person's notification inbox, newest first; unread count |
| createdAt | TTL 180 d | TTL: delete notifications after 180 days |

### weather_cache

Provider responses cached per rounded location (about 1 km) and kind, shared by every farm near that point. Clients never call the provider.

- **Model:** `WeatherCache`
- **Ownership:** Global — shared reference data
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `provider` | String | yes | ≤ 40 chars |  |
| `locationKey` | String | yes | ≤ 40 chars |  |
| `kind` | String | yes | one of: `current`, `hourly`, `daily` |  |
| `data` | Mixed | yes |  |  |
| `fetchedAt` | Date | yes |  |  |
| `expiresAt` | Date | yes |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| provider, locationKey, kind | unique | Cache lookup for a farm's location |
| expiresAt | TTL 0 d | TTL: drop stale weather |

## Content

### training_courses

A course and its lessons (embedded: always read together, a few lessons each). Health lessons need expert review before publishing.

- **Model:** `TrainingCourse`
- **Ownership:** Global — shared reference data
- **Standard fields:** `_id` (UUIDv7 string), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `slug` | String | yes | ≤ 80 chars; lowercased |  |
| `locale` | String | yes | ≤ 10 chars |  |
| `title` | String | yes | ≤ 150 chars |  |
| `summary` | String |  | ≤ 500 chars |  |
| `level` | String | yes | one of: `beginner`, `intermediate`, `advanced`; default `"beginner"` |  |
| `order` | Number |  | default `0`; integer |  |
| `lessons` | array of objects |  |  |  |
| `lessons[].lessonId` | String | yes | ≤ 80 chars |  |
| `lessons[].title` | String | yes | ≤ 150 chars |  |
| `lessons[].body` | String |  | ≤ 20000 chars |  |
| `lessons[].minutes` | Number |  | max 120; integer |  |
| `lessons[].order` | Number |  | default `0`; integer |  |
| `status` | String | yes | one of: `draft`, `in_review`, `published`, `archived`; default `"draft"` |  |
| `publishedAt` | Date |  |  |  |
| `reviewedBy` | String |  | ≤ 120 chars |  |
| `reviewedAt` | Date |  |  |  |
| `sources` | array of objects |  |  |  |
| `sources[].name` | String | yes | ≤ 200 chars |  |
| `sources[].url` | String |  | ≤ 1000 chars |  |
| `sources[].retrievedAt` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| slug, locale | unique | Open a course by slug in the reader's language |
| status, locale, order |  | Published course catalog in display order |

### training_progress

A lesson a person has completed. Personal, not farm-owned: progress follows the person across farms.

- **Model:** `TrainingProgress`
- **Ownership:** User — belongs to one person
- **Standard fields:** `_id` (UUIDv7 string), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `userId` | String | yes |  | `User` |
| `courseId` | String | yes |  | `TrainingCourse` |
| `lessonId` | String | yes | ≤ 80 chars |  |
| `completedAt` | Date | yes |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| userId, lessonId | unique | A person's progress (prefix); a lesson is completed once |

- **Relationship:** `lessonId` → TrainingCourse.lessons.lessonId (many-to-one) — Embedded lesson id

### articles

Facts, guides, news and disease notices. News and disease notices must carry a source, a publication date and a region before they can be published.

- **Model:** `Article`
- **Ownership:** Global — shared reference data
- **Standard fields:** `_id` (UUIDv7 string), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `kind` | String | yes | one of: `fact`, `guide`, `news`, `disease_notice` |  |
| `slug` | String | yes | ≤ 120 chars; lowercased |  |
| `locale` | String | yes | ≤ 10 chars |  |
| `title` | String | yes | ≤ 200 chars |  |
| `summary` | String |  | ≤ 600 chars |  |
| `body` | String |  | ≤ 50000 chars |  |
| `regionCode` | String | yes | pattern `/^(GLOBAL\\|[A-Z]{2}(-[A-Z0-9]{1,3})?)$/`; default `"GLOBAL"` |  |
| `tags` | array of String |  | ≤ 40 chars; lowercased |  |
| `status` | String | yes | one of: `draft`, `in_review`, `published`, `archived`; default `"draft"` |  |
| `publishedAt` | Date |  |  |  |
| `reviewedBy` | String |  | ≤ 120 chars |  |
| `reviewedAt` | Date |  |  |  |
| `expiresAt` | Date |  |  |  |
| `sources` | array of objects |  |  |  |
| `sources[].name` | String | yes | ≤ 200 chars |  |
| `sources[].url` | String |  | ≤ 1000 chars |  |
| `sources[].retrievedAt` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| slug, locale | unique | Open an article by slug |
| status, kind, locale, regionCode, publishedAt ↓ |  | Feed for a kind in my language and region (regionCode $in [mine, GLOBAL]), newest first |

### glossary_terms

Plain-language definitions of poultry terms, searchable.

- **Model:** `GlossaryTerm`
- **Ownership:** Global — shared reference data
- **Standard fields:** `_id` (UUIDv7 string), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `slug` | String | yes | ≤ 80 chars; lowercased |  |
| `locale` | String | yes | ≤ 10 chars |  |
| `term` | String | yes | ≤ 120 chars |  |
| `definition` | String |  | ≤ 2000 chars |  |
| `category` | String | yes | ≤ 60 chars |  |
| `relatedSlugs` | array of String |  | ≤ 80 chars |  |
| `status` | String | yes | one of: `draft`, `in_review`, `published`, `archived`; default `"draft"` |  |
| `sources` | array of objects |  |  |  |
| `sources[].name` | String | yes | ≤ 200 chars |  |
| `sources[].url` | String |  | ≤ 1000 chars |  |
| `sources[].retrievedAt` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| slug, locale | unique | Open a term by slug in a language |
| term (text), definition (text) |  | Glossary search |

## System

### audit_logs

Who changed what, when, from which device. Written in the same transaction as the change. farmId is absent for account-level events (sign-in, password change).

- **Model:** `AuditLog`
- **Ownership:** System — written by the API only
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `actorUserId` | String | yes |  | `User` |
| `action` | String | yes | ≤ 80 chars |  |
| `entity` | String | yes | ≤ 40 chars |  |
| `entityId` | String | yes |  |  |
| `changes` | Mixed |  |  |  |
| `requestId` | String |  | ≤ 100 chars |  |
| `mutationId` | String |  | ≤ 100 chars |  |
| `deviceId` | String |  | ≤ 100 chars |  |
| `at` | Date | yes |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, _id ↓ |  | Farm audit log, newest first (UUIDv7 ids sort by time); cursor pagination |
| farmId, entity, entityId, _id ↓ |  | History of one record |
| actorUserId, _id ↓ |  | A person's account activity (sign-ins, password changes) |

- **Relationship:** `entityId` → any record (many-to-one) — Polymorphic by entity

### sync_operations

Each offline mutation a device pushed, with its outcome. _id = farmId:mutationId makes processing exactly-once: a resent mutation returns the stored result.

- **Model:** `SyncOperation`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `mutationId` | String | yes |  |  |
| `userId` | String | yes |  | `User` |
| `deviceId` | String | yes | ≤ 100 chars |  |
| `command` | String | yes | ≤ 80 chars |  |
| `entityId` | String |  |  |  |
| `baseVersion` | Number |  | integer |  |
| `status` | String | yes | one of: `accepted`, `rejected`, `conflict` |  |
| `result` | Mixed | yes |  |  |
| `receivedAt` | Date | yes |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| createdAt | TTL 90 d | TTL: forget processed mutations after 90 days (devices resend within days) |

- Lookups are by _id (farmId:mutationId), so no secondary index on mutationId is needed.

### sync_changes

Outbound change feed for offline clients: every change to a synced record gets the farm's next sequence number. Devices pull changes after their last seq.

- **Model:** `SyncChange`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdAt`, `updatedAt` (UTC, required)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `seq` | Number | yes | min 1; integer |  |
| `entity` | String | yes | ≤ 40 chars |  |
| `entityId` | String | yes |  |  |
| `op` | String | yes | one of: `upsert`, `delete` |  |
| `document` | Mixed |  |  |  |
| `at` | Date | yes |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, seq | unique | GET /sync/pull: changes after a sequence number |

### idempotency_keys

Stored responses for Idempotency-Key writes, so a retried request is answered without running twice. _id = userId:key.

- **Model:** `IdempotencyKey`
- **Ownership:** System — written by the API only
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `requestHash` | String | yes |  |  |
| `status` | String | yes | one of: `processing`, `done` |  |
| `responseStatus` | Number |  | min 100; max 599; integer |  |
| `responseBody` | Mixed |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| createdAt | TTL 7 d | TTL: keys expire after 7 days |

### counters

Atomic per-farm sequences (sync change seq, order numbers). _id = purpose:farmId.

- **Model:** `Counter`
- **Ownership:** System — written by the API only
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `value` | Number | yes | default `0`; integer |  |

No secondary indexes: read by `_id` only.

### media_assets

A photo uploaded by a farm member (daily records, health records). The bytes live in object storage under storageKey; this document is the farm-scoped index and access check.

- **Model:** `MediaAsset`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `contentType` | String | yes | one of: `image/jpeg`, `image/png`, `image/webp` |  |
| `sizeBytes` | Number | yes | min 1; max 10000000; integer |  |
| `sha256` | String | yes | ≤ 64 chars |  |
| `storageKey` | String | yes | ≤ 300 chars |  |

No secondary indexes: read by `_id` only.

- Read by _id within the farm only; no secondary index. Linked from daily_records.photos[].assetId.

## Relationship index

Every reference between collections, derived from the schemas.

| From | Field | To | Cardinality |
| --- | --- | --- | --- |
| `sessions` | `userId` | `users` | many-to-one |
| `refresh_tokens` | `sessionId` | `sessions` | many-to-one |
| `refresh_tokens` | `userId` | `users` | many-to-one |
| `refresh_tokens` | `replacedById` | `refresh_tokens` | many-to-one |
| `one_time_tokens` | `userId` | `users` | many-to-one |
| `farm_members` | `userId` | `users` | many-to-one |
| `farm_members` | `invitedBy` | `users` | many-to-one |
| `farm_members` | `removedBy` | `users` | many-to-one |
| `flocks` | `houseId` | `houses` | many-to-one |
| `flocks` | `splitFromFlockId` | `flocks` | many-to-one |
| `flocks` | `mergedIntoFlockId` | `flocks` | many-to-one |
| `flocks` | `hatcheryBatchId` | `hatchery_batches` | many-to-one |
| `flock_events` | `flockId` | `flocks` | many-to-one |
| `flock_events` | `birdWeightId` | `bird_weights` | many-to-one |
| `flock_events` | `counterpartFlockId` | `flocks` | many-to-one |
| `flock_events` | `fromHouseId` | `houses` | many-to-one |
| `flock_events` | `toHouseId` | `houses` | many-to-one |
| `flock_events` | `dailyRecordId` | `daily_records` | many-to-one |
| `flock_events` | `chickLotId` | `chicks` | many-to-one |
| `flock_events` | `buyerId` | `buyers` | many-to-one |
| `flock_events` | `orderId` | `orders` | many-to-one |
| `flock_events` | `reversalOf` | `flock_events` | many-to-one |
| `daily_records` | `flockId` | `flocks` | many-to-one |
| `daily_records` | `houseId` | `houses` | many-to-one |
| `daily_records` | `photos[].assetId` | `media_assets` | many-to-one |
| `bird_weights` | `flockId` | `flocks` | many-to-one |
| `bird_weights` | `scaleEquipmentId` | `equipment` | many-to-one |
| `egg_records` | `flockId` | `flocks` | many-to-one |
| `egg_records` | `dailyRecordId` | `daily_records` | many-to-one |
| `egg_inventory` | `flockId` | `flocks` | many-to-one |
| `egg_inventory` | `reversalOf` | `egg_inventory` | many-to-one |
| `egg_inventory` | `sourceId` | EggRecord \| Order | many-to-one (Polymorphic by sourceType) |
| `water_records` | `flockId` | `flocks` | many-to-one |
| `water_records` | `dailyRecordId` | `daily_records` | many-to-one |
| `water_records` | `healthRecordId` | `health_records` | many-to-one |
| `feed_consumption` | `flockId` | `flocks` | many-to-one |
| `feed_consumption` | `feedItemId` | `inventory_items` | many-to-one |
| `feed_consumption` | `dailyRecordId` | `daily_records` | many-to-one |
| `feed_consumption` | `allocations[].lotId` | `inventory_lots` | many-to-one |
| `inventory_items` | `medicineId` | `medicines` | many-to-one |
| `inventory_lots` | `itemId` | `inventory_items` | many-to-one |
| `inventory_lots` | `expenseId` | `expenses` | many-to-one |
| `inventory_transactions` | `itemId` | `inventory_items` | many-to-one |
| `inventory_transactions` | `lotId` | `inventory_lots` | many-to-one |
| `inventory_transactions` | `flockId` | `flocks` | many-to-one |
| `inventory_transactions` | `houseId` | `houses` | many-to-one |
| `inventory_transactions` | `reversalOf` | `inventory_transactions` | many-to-one |
| `health_records` | `flockId` | `flocks` | many-to-one |
| `health_records` | `houseId` | `houses` | many-to-one |
| `health_records` | `vetUserId` | `users` | many-to-one |
| `health_records` | `treatment.medicineId` | `medicines` | many-to-one |
| `health_records` | `expenseId` | `expenses` | many-to-one |
| `health_records` | `dailyRecordId` | `daily_records` | many-to-one |
| `vaccinations` | `flockId` | `flocks` | many-to-one |
| `vaccinations` | `medicineId` | `medicines` | many-to-one |
| `vaccinations` | `administeredBy` | `users` | many-to-one |
| `vaccinations` | `inventoryTransactionId` | `inventory_transactions` | many-to-one |
| `hatchery_batches` | `sourceFlockId` | `flocks` | many-to-one |
| `hatchery_batches` | `incubatorId` | `equipment` | many-to-one |
| `hatchery_events` | `batchId` | `hatchery_batches` | many-to-one |
| `hatchery_events` | `chickLotId` | `chicks` | many-to-one |
| `hatchery_events` | `reversalOf` | `hatchery_events` | many-to-one |
| `chicks` | `hatcheryBatchId` | `hatchery_batches` | many-to-one |
| `chicks` | `placedFlockIds` | `flocks` | many-to-many |
| `biosecurity_logs` | `houseId` | `houses` | many-to-one |
| `biosecurity_logs` | `cleaningTaskId` | `cleaning_tasks` | many-to-one |
| `biosecurity_logs` | `inventoryTransactionId` | `inventory_transactions` | many-to-one |
| `visitors` | `housesVisited` | `houses` | many-to-many |
| `visitors` | `hostUserId` | `users` | many-to-one |
| `cleaning_tasks` | `houseIds` | `houses` | many-to-many |
| `cleaning_tasks` | `assigneeUserId` | `users` | many-to-one |
| `equipment` | `houseId` | `houses` | many-to-one |
| `equipment_movements` | `equipmentId` | `equipment` | many-to-one |
| `equipment_movements` | `fromHouseId` | `houses` | many-to-one |
| `equipment_movements` | `toHouseId` | `houses` | many-to-one |
| `equipment_movements` | `reversalOf` | `equipment_movements` | many-to-one |
| `expenses` | `flockId` | `flocks` | many-to-one |
| `expenses` | `houseId` | `houses` | many-to-one |
| `expenses` | `recurringExpenseId` | `recurring_expenses` | many-to-one |
| `expenses` | `sourceId` | FeedPurchase \| HealthRecord \| InventoryTransaction | one-to-one (Polymorphic by sourceType) |
| `recurring_expenses` | `flockId` | `flocks` | many-to-one |
| `transactions` | `flockId` | `flocks` | many-to-one |
| `transactions` | `houseId` | `houses` | many-to-one |
| `transactions` | `reversalOf` | `transactions` | many-to-one |
| `transactions` | `sourceId` | Expense \| OrderPayment \| FeedPurchase \| RecurringExpense | many-to-one (Polymorphic by source) |
| `buyers` | `linkedFarmId` | `farms` | many-to-one |
| `orders` | `buyerId` | `buyers` | many-to-one |
| `orders` | `buyerUserId` | `users` | many-to-one |
| `orders` | `buyerFarmId` | `farms` | many-to-one |
| `orders` | `listingId` | `market_listings` | many-to-one |
| `orders` | `lines[].flockId` | `flocks` | many-to-one |
| `orders` | `lines[].chickLotId` | `chicks` | many-to-one |
| `orders` | `statusHistory[].by` | `users` | many-to-one |
| `order_payments` | `orderId` | `orders` | many-to-one |
| `order_payments` | `transactionId` | `transactions` | many-to-one |
| `order_payments` | `reversalOf` | `order_payments` | many-to-one |
| `tasks` | `assigneeUserId` | `users` | many-to-one |
| `tasks` | `flockId` | `flocks` | many-to-one |
| `tasks` | `houseId` | `houses` | many-to-one |
| `tasks` | `completedBy` | `users` | many-to-one |
| `tasks` | `related.id` | any farm record | many-to-one (Polymorphic by related.entity) |
| `alert_rules` | `flockIds` | `flocks` | many-to-many |
| `alert_rules` | `houseIds` | `houses` | many-to-many |
| `alerts` | `flockId` | `flocks` | many-to-one |
| `alerts` | `houseId` | `houses` | many-to-one |
| `alerts` | `acknowledgedBy` | `users` | many-to-one |
| `notifications` | `userId` | `users` | many-to-one |
| `notifications` | `alertId` | `alerts` | many-to-one |
| `training_progress` | `userId` | `users` | many-to-one |
| `training_progress` | `courseId` | `training_courses` | many-to-one |
| `training_progress` | `lessonId` | `TrainingCourse.lessons.lessonId` | many-to-one (Embedded lesson id) |
| `audit_logs` | `actorUserId` | `users` | many-to-one |
| `audit_logs` | `entityId` | any record | many-to-one (Polymorphic by entity) |
| `sync_operations` | `userId` | `users` | many-to-one |

Every farm-owned collection also references `farms` through `farmId` (many-to-one).


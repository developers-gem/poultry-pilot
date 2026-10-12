# PoultryPilot data dictionary

> Generated from the Mongoose schemas in `services/api/src/adapters/mongo/models`. Do not edit by hand:
> run `pnpm --filter @poultrypilot/api docs:data-dictionary`. A test fails if this file is out of date.

63 collections, 103 secondary indexes (plus the default `_id` index on each). Design rules and relationships: `docs/data-model.md`.

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
| [`medicines`](#medicines) | Health | farm | 1 | The farm's catalog of vaccines and medicines with default withdrawal periods taken from the product label or the farm's veterinarian |
| [`health_records`](#health_records) | Health | farm | 3 | Farm health records: observations, veterinary visits, treatments, lab tests and post-mortems |
| [`vaccination_programmes`](#vaccination_programmes) | Health | farm | 1 | A farm's own vaccination programme (from its veterinarian or hatchery), by bird age |
| [`vaccinations`](#vaccinations) | Health | farm | 2 | A vaccination planned for a flock and, once given, how: batch numbers and expiry, doses used from stock, route, who gave it |
| [`checklist_templates`](#checklist_templates) | Biosecurity and equipment | farm | 1 | A farm's own checklist (visitor declaration, PPE, footbath, cleaning, disinfection, vehicle, pest control, audit) |
| [`biosecurity_logs`](#biosecurity_logs) | Biosecurity and equipment | farm | 1 | Evidence that a biosecurity activity happened: cleaning, disinfection, footbath change or check, vehicle movement, pest control, wild bird observation, or an audit |
| [`visitors`](#visitors) | Biosecurity and equipment | farm | 1 | Visitor register: who entered, why, which houses, their declaration, last contact with other poultry and the downtime since, PPE and footbath use |
| [`cleaning_tasks`](#cleaning_tasks) | Biosecurity and equipment | farm | 1 | A recurring cleaning or disinfection routine, optionally with a checklist template |
| [`equipment`](#equipment) | Biosecurity and equipment | farm | 1 | Assets: incubators, feeders, heaters, generators, scales, vehicles |
| [`equipment_movements`](#equipment_movements) | Biosecurity and equipment | farm, append-only | 1 | Equipment moving between houses or off the farm, with whether it was disinfected (a common disease route) |
| [`hatchery_batches`](#hatchery_batches) | Hatchery | farm | 2 | Eggs selected and set together |
| [`hatchery_events`](#hatchery_events) | Hatchery | farm, append-only | 1 | The hatchery ledger: setting, candling, transfer to the hatcher, hatch, chick grading, machine readings and notes |
| [`chicks`](#chicks) | Hatchery | farm | 1 | A lot of day-old chicks available to place or sell, from the farm's hatchery or bought in |
| [`brooding_profiles`](#brooding_profiles) | ChickStart | farm | 1 | The farm's brooding targets by day of age (temperature at chick level, humidity, target weight), taken from its breed guide or veterinarian |
| [`chick_arrivals`](#chick_arrivals) | ChickStart | farm | 1 | A planned delivery of chicks into a house: preparation checklist, then the arrival itself (count, dead on arrival, chick weight and quality) |
| [`brooder_checks`](#brooder_checks) | ChickStart | farm | 1 | A check of young chicks: temperature at chick level, humidity, behaviour, feed and water, crop fill, with optional checklist answers |
| [`suppliers`](#suppliers) | Money | farm | 1 | The farm's suppliers (feed mills, hatcheries, vets, utilities) |
| [`money_accounts`](#money_accounts) | Money | farm | 1 | Where the farm keeps money: cash box, bank account, mobile money wallet |
| [`expenses`](#expenses) | Money | farm | 4 | A bill: an expense or a purchase the farm owes |
| [`incomes`](#incomes) | Money | farm | 3 | A sale or other income the farm is owed |
| [`recurring_expenses`](#recurring_expenses) | Money | farm | 1 | A repeating bill (electricity, wages, rent) |
| [`transactions`](#transactions) | Money | farm, append-only | 3 | The cash ledger: money in or out of one of the farm's accounts |
| [`buyers`](#buyers) | Market | farm | 1 | The farm's own customer book |
| [`market_listings`](#market_listings) | Market | farm | 3 | Something a farm offers on the marketplace |
| [`orders`](#orders) | Market | farm | 4 | A sale by the farm (farmId = seller), recorded directly or placed by a marketplace buyer |
| [`order_payments`](#order_payments) | Market | farm, append-only | 1 | Money received against an order (or refunded) |
| [`market_prices`](#market_prices) | Market | global | 1 | Reference prices by region, product and date from a named source (fetched behind the API) |
| [`tasks`](#tasks) | Operations | farm | 2 | A piece of work assigned to someone on the farm, optionally linked to a flock, house or other record |
| [`alert_rules`](#alert_rules) | Operations | farm | 1 | A farm's settings for one rule from the catalog (mortality, egg production, feed, water, weight, FCR, stock, expiry, vaccination, vet appointment, hatch, delivery, payment, weather): on or off, parameters, scope, severity, who is told and how |
| [`alerts`](#alerts) | Operations | farm | 2 | Something that needs attention, raised by the server-side alert job |
| [`notifications`](#notifications) | Operations | user | 3 | A message to one person on one channel (in-app, push, email) with delivery state |
| [`push_devices`](#push_devices) | Operations | user | 2 | A phone or browser registered for push notifications |
| [`notification_preferences`](#notification_preferences) | Operations | user | 1 | How a person wants to be told: push and email on or off, the lowest severity for each, and rules they have muted |
| [`weather_observations`](#weather_observations) | Operations | global | 1 | Observed daily weather for a location (temperature, humidity, rain, wind), kept as history |
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
| `settings.visitorDowntimeHours` | Number |  | max 10000 |  |

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
| `withheldUntil` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
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
| `sourceType` | String | yes | one of: `egg_record`, `order`, `manual`, `hatchery_batch` |  |
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

The farm's catalog of vaccines and medicines with default withdrawal periods taken from the product label or the farm's veterinarian. PoultryPilot ships no country rules; stock lives in inventory_items.

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
| `withdrawalSource` | String |  | one of: `medicine_label`, `veterinarian`, `other` |  |
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

Farm health records: observations, veterinary visits, treatments, lab tests and post-mortems. Holds what people saw and what a named veterinarian, laboratory or staff member assessed; PoultryPilot never diagnoses or prescribes.

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
| `symptoms` | array of String |  | ≤ 60 chars; lowercased |  |
| `observedSigns` | String |  | ≤ 2000 chars |  |
| `affectedBirds` | Number |  | integer |  |
| `deadBirds` | Number |  | integer |  |
| `vetName` | String |  | ≤ 120 chars |  |
| `vetUserId` | String |  |  | `User` |
| `assessment` | object |  |  |  |
| `assessment.text` | String |  | ≤ 2000 chars |  |
| `assessment.by` | String | yes | ≤ 120 chars |  |
| `assessment.source` | String | yes | one of: `veterinarian`, `laboratory`, `farm_staff` |  |
| `lab` | object |  |  |  |
| `lab.name` | String |  | ≤ 120 chars |  |
| `lab.reference` | String |  | ≤ 60 chars |  |
| `lab.result` | String |  | ≤ 4000 chars |  |
| `treatments` | array of objects |  | custom validation |  |
| `treatments[].id` | String | yes |  |  |
| `treatments[].medicineId` | String |  |  | `Medicine` |
| `treatments[].medicineName` | String | yes | ≤ 120 chars |  |
| `treatments[].inventoryItemId` | String |  |  | `InventoryItem` |
| `treatments[].quantityUsed` | Number |  |  |  |
| `treatments[].dose` | String |  | ≤ 120 chars |  |
| `treatments[].route` | String |  | one of: `drinking_water`, `feed`, `injection`, `eye_drop`, `nasal`, `spray`, `wing_web`, `oral`, `topical`, `in_ovo` |  |
| `treatments[].frequency` | String |  | ≤ 120 chars |  |
| `treatments[].startDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `treatments[].durationDays` | Number | yes | min 1; max 365; integer |  |
| `treatments[].endDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `treatments[].withdrawalMeatDays` | Number |  | max 365; integer |  |
| `treatments[].withdrawalEggDays` | Number |  | max 365; integer |  |
| `treatments[].withdrawalSource` | String |  | one of: `medicine_label`, `veterinarian`, `other` |  |
| `treatments[].withdrawalMeatUntil` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `treatments[].withdrawalEggsUntil` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `treatments[].prescribedBy` | String |  | ≤ 120 chars |  |
| `treatments[].prescriptionReference` | String |  | ≤ 80 chars |  |
| `treatments[].stockCostMinor` | Number |  | integer |  |
| `cost` | object |  |  |  |
| `cost.amountMinor` | Number | yes | integer |  |
| `cost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `followUpDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `followUpDone` | Boolean |  | default `false` |  |
| `attachments` | array of objects |  |  |  |
| `attachments[].assetId` | String | yes |  | `MediaAsset` |
| `attachments[].name` | String |  | ≤ 200 chars |  |
| `dailyRecordId` | String |  |  | `DailyRecord` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, date ↓ |  | Flock health history; active withdrawal check before a sale |
| farmId, date ↓ |  | Farm-wide health log for vets and managers |
| farmId, followUpDone, followUpDate | partial: {"followUpDate":{"$exists":true}} | Follow-ups due (reminders, alert job) |

### vaccination_programmes

A farm's own vaccination programme (from its veterinarian or hatchery), by bird age. Applying it to a flock creates scheduled vaccinations. No country programme is built in.

- **Model:** `VaccinationProgramme`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `flockTypes` | array of String |  | one of: `broiler`, `layer`, `breeder`, `chick`, `custom` |  |
| `items` | array of objects | yes | custom validation |  |
| `items[].dayOfAge` | Number | yes | max 2000; integer |  |
| `items[].vaccineName` | String | yes | ≤ 120 chars |  |
| `items[].medicineId` | String |  |  | `Medicine` |
| `items[].targetDisease` | String |  | ≤ 120 chars |  |
| `items[].route` | String |  | one of: `drinking_water`, `feed`, `injection`, `eye_drop`, `nasal`, `spray`, `wing_web`, `oral`, `topical`, `in_ovo` |  |
| `items[].notes` | String |  | ≤ 300 chars |  |
| `source` | String |  | ≤ 300 chars |  |
| `active` | Boolean |  | default `true` |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, name | unique, live records only | Programme list (prefix); names unique within a farm |

### vaccinations

A vaccination planned for a flock and, once given, how: batch numbers and expiry, doses used from stock, route, who gave it. Overdue = scheduled and past due (derived).

- **Model:** `Vaccination`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String | yes |  | `Flock` |
| `programmeId` | String |  |  | `VaccinationProgramme` |
| `dayOfAge` | Number |  | max 2000; integer |  |
| `medicineId` | String |  |  | `Medicine` |
| `vaccineName` | String | yes | ≤ 120 chars |  |
| `targetDisease` | String |  | ≤ 120 chars |  |
| `status` | String | yes | one of: `scheduled`, `done`, `skipped`, `cancelled`; default `"scheduled"` |  |
| `dueDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `administeredDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `administeredBy` | String |  | ≤ 120 chars |  |
| `route` | String |  | one of: `drinking_water`, `feed`, `injection`, `eye_drop`, `nasal`, `spray`, `wing_web`, `oral`, `topical`, `in_ovo` |  |
| `birdsVaccinated` | Number |  | integer |  |
| `inventoryItemId` | String |  |  | `InventoryItem` |
| `dosesUsed` | Number |  |  |  |
| `batches` | array of objects |  |  |  |
| `batches[].lotId` | String |  |  | `InventoryLot` |
| `batches[].batchNumber` | String |  | ≤ 60 chars |  |
| `batches[].expiryDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `batches[].doses` | Number |  |  |  |
| `stockCostMinor` | Number |  | integer |  |
| `skipReason` | String |  | ≤ 500 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, dueDate |  | Upcoming and overdue vaccinations across the farm (calendar, reminder job) |
| farmId, flockId, dueDate |  | A flock's vaccination programme |

## Biosecurity and equipment

### checklist_templates

A farm's own checklist (visitor declaration, PPE, footbath, cleaning, disinfection, vehicle, pest control, audit). Items say which answer counts as a failure; failures create corrective actions. Editing bumps the version; records keep the version they used.

- **Model:** `ChecklistTemplate`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `kind` | String | yes | one of: `visitor_declaration`, `ppe`, `footbath`, `cleaning`, `disinfection`, `vehicle`, `pest_control`, `audit`, `general`, `arrival_preparation`, `brooder_check` |  |
| `items` | array of objects | yes | custom validation |  |
| `items[].id` | String | yes | ≤ 60 chars |  |
| `items[].text` | String | yes | ≤ 300 chars |  |
| `items[].required` | Boolean |  | default `true` |  |
| `items[].responseType` | String | yes | one of: `yes_no`, `text`, `number`, `choice` |  |
| `items[].choices` | array of String |  | ≤ 60 chars |  |
| `items[].failIf` | String |  | ≤ 60 chars |  |
| `items[].createActionOnFail` | Boolean |  | default `true` |  |
| `active` | Boolean |  | default `true` |  |
| `source` | String |  | ≤ 300 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, kind, name | unique, live records only | Templates by kind for each form; names unique per kind |

### biosecurity_logs

Evidence that a biosecurity activity happened: cleaning, disinfection, footbath change or check, vehicle movement, pest control, wild bird observation, or an audit. Each type has its own section; any type can carry checklist answers.

- **Model:** `BiosecurityLog`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `type` | String | yes | one of: `cleaning`, `disinfection`, `footbath`, `vehicle`, `pest_control`, `wild_bird_observation`, `audit` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `houseId` | String |  |  | `House` |
| `cleaningTaskId` | String |  |  | `CleaningTask` |
| `performedBy` | String |  | ≤ 120 chars |  |
| `product` | object |  |  |  |
| `product.inventoryItemId` | String |  |  | `InventoryItem` |
| `product.name` | String |  | ≤ 120 chars |  |
| `product.quantityUsed` | Number |  |  |  |
| `product.concentration` | String |  | ≤ 60 chars |  |
| `product.stockCostMinor` | Number |  | integer |  |
| `footbath` | object |  |  |  |
| `footbath.action` | String | yes | one of: `changed`, `checked`, `topped_up` |  |
| `footbath.disinfectant` | String |  | ≤ 120 chars |  |
| `footbath.concentration` | String |  | ≤ 60 chars |  |
| `vehicle` | object |  |  |  |
| `vehicle.registration` | String | yes | ≤ 30 chars |  |
| `vehicle.driver` | String |  | ≤ 120 chars |  |
| `vehicle.company` | String |  | ≤ 120 chars |  |
| `vehicle.purpose` | String |  | ≤ 200 chars |  |
| `vehicle.disinfected` | Boolean |  | default `false` |  |
| `vehicle.entryAt` | Date |  |  |  |
| `vehicle.exitAt` | Date |  |  |  |
| `vehicle.lastPoultryContactAt` | Date |  |  |  |
| `pest` | object |  |  |  |
| `pest.pestType` | String | yes | one of: `rodents`, `insects`, `wild_birds`, `other` |  |
| `pest.method` | String |  | ≤ 120 chars |  |
| `pest.stationsChecked` | Number |  | integer |  |
| `pest.activityFound` | Boolean |  | default `false` |  |
| `wildBird` | object |  |  |  |
| `wildBird.description` | String | yes | ≤ 200 chars |  |
| `wildBird.count` | Number |  | integer |  |
| `wildBird.location` | String |  | ≤ 200 chars |  |
| `wildBird.contactWithPoultry` | Boolean |  | default `false` |  |
| `wildBird.contactWithFeedOrWater` | Boolean |  | default `false` |  |
| `wildBird.deadWildBirdsFound` | Number |  | integer |  |
| `checklist` | object |  |  |  |
| `checklist.templateId` | String | yes |  | `ChecklistTemplate` |
| `checklist.templateVersion` | Number | yes | integer |  |
| `checklist.answers` | array of objects |  |  |  |
| `checklist.answers[].itemId` | String | yes | ≤ 60 chars |  |
| `checklist.answers[].text` | String | yes | ≤ 300 chars |  |
| `checklist.answers[].answer` | Mixed | yes |  |  |
| `checklist.answers[].passed` | Boolean | yes |  |  |
| `checklist.failedCount` | Number |  | default `0`; integer |  |
| `attachments` | array of objects |  |  |  |
| `attachments[].assetId` | String | yes |  | `MediaAsset` |
| `attachments[].name` | String |  | ≤ 200 chars |  |
| `details` | String |  | ≤ 2000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, date ↓ |  | Biosecurity log list and audits by period |

### visitors

Visitor register: who entered, why, which houses, their declaration, last contact with other poultry and the downtime since, PPE and footbath use. Supports trace-back.

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
| `previousPoultryContact` | object |  |  |  |
| `previousPoultryContact.hadContact` | Boolean | yes |  |  |
| `previousPoultryContact.lastContactAt` | Date |  |  |  |
| `previousPoultryContact.description` | String |  | ≤ 300 chars |  |
| `downtimeHours` | Number |  | max 100000 |  |
| `requiredDowntimeHours` | Number |  | max 10000 |  |
| `declaration` | object |  |  |  |
| `declaration.declaredName` | String | yes | ≤ 120 chars |  |
| `declaration.declaredAt` | Date | yes |  |  |
| `declaration.signatureAssetId` | String |  |  | `MediaAsset` |
| `declaration.checklist` | object |  |  |  |
| `declaration.checklist.templateId` | String | yes |  | `ChecklistTemplate` |
| `declaration.checklist.templateVersion` | Number | yes | integer |  |
| `declaration.checklist.answers` | array of objects |  |  |  |
| `declaration.checklist.answers[].itemId` | String | yes | ≤ 60 chars |  |
| `declaration.checklist.answers[].text` | String | yes | ≤ 300 chars |  |
| `declaration.checklist.answers[].answer` | Mixed | yes |  |  |
| `declaration.checklist.answers[].passed` | Boolean | yes |  |  |
| `declaration.checklist.failedCount` | Number |  | default `0`; integer |  |
| `ppeUsed` | array of String |  | ≤ 60 chars |  |
| `footbathUsed` | Boolean |  | default `false` |  |
| `disinfected` | Boolean |  | default `false` |  |
| `flags` | array of String |  | one of: `downtime_short`, `declaration_failed` |  |
| `checkInAt` | Date | yes |  |  |
| `checkOutAt` | Date |  |  |  |
| `hostUserId` | String |  |  | `User` |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, checkInAt ↓ |  | Visitor register by date; trace-back of who visited in a period |

### cleaning_tasks

A recurring cleaning or disinfection routine, optionally with a checklist template. Completing it writes a biosecurity_log (with the checklist answers) and moves nextDueDate.

- **Model:** `CleaningTask`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `title` | String | yes | ≤ 200 chars |  |
| `activity` | String | yes | one of: `cleaning`, `disinfection`; default `"cleaning"` |  |
| `schedule` | String | yes | one of: `daily`, `weekly`, `monthly`, `between_flocks`, `one_off` |  |
| `houseIds` | array of String |  |  | `House` |
| `checklistTemplateId` | String |  |  | `ChecklistTemplate` |
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

## Hatchery

### hatchery_batches

Eggs selected and set together. Holds the egg source, selection rejects and setting details; counts and rates are derived from hatchery_events. Grading creates a chick lot.

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
| `eggGrade` | String |  | one of: `large`, `medium`, `small`, `cracked`, `dirty`, `double_yolk` |  |
| `supplier` | String |  | ≤ 120 chars |  |
| `eggsReceived` | Number | yes | min 1; integer |  |
| `rejects` | map of Mixed |  |  |  |
| `rejects.$*` | Number |  |  |  |
| `eggsSet` | Number | yes | min 1; integer |  |
| `incubatorId` | String |  |  | `Equipment` |
| `hatcherId` | String |  |  | `Equipment` |
| `setDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `incubationDays` | Number | yes | min 10; max 40; integer |  |
| `expectedTransferDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `expectedHatchDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `status` | String | yes | one of: `incubating`, `in_hatcher`, `hatched`, `cancelled`; default `"incubating"` |  |
| `results` | object |  |  |  |
| `results.infertile` | Number |  | integer |  |
| `results.cracked` | Number |  | integer |  |
| `results.deadEmbryo` | Number |  | integer |  |
| `results.transferred` | Number |  | integer |  |
| `results.hatched` | Number |  | integer |  |
| `results.deadInShell` | Number |  | integer |  |
| `results.culled` | Number |  | integer |  |
| `results.saleable` | Number |  | integer |  |
| `results.inIncubation` | Number |  | integer |  |
| `results.fertilityPercent` | Number |  | max 100 |  |
| `results.hatchabilityPercent` | Number |  | max 100 |  |
| `results.saleableChickPercent` | Number |  | max 100 |  |
| `results.lossPercent` | Number |  | max 100 |  |
| `eggCost` | object |  |  |  |
| `eggCost.amountMinor` | Number | yes | integer |  |
| `eggCost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `otherCost` | object |  |  |  |
| `otherCost.amountMinor` | Number | yes | integer |  |
| `otherCost.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `chickLotId` | String |  |  | `ChickLot` |
| `cancelledReason` | String |  | ≤ 300 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, expectedHatchDate |  | Incubating batches and hatches due (dashboard, calendar) |
| farmId, code | unique, live records only | Batch codes unique within a farm; lookup by code from egg trays |

### hatchery_events

The hatchery ledger: setting, candling, transfer to the hatcher, hatch, chick grading, machine readings and notes. Counts move only through these; a reversal cancels the latest counted event.

- **Model:** `HatcheryEvent`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `batchId` | String | yes |  | `HatcheryBatch` |
| `type` | String | yes | one of: `set`, `candling`, `transfer_to_hatcher`, `hatch`, `chick_grading`, `environment_reading`, `note`, `cancelled`, `reversal` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `counts` | object |  |  |  |
| `counts.infertile` | Number |  | integer |  |
| `counts.cracked` | Number |  | integer |  |
| `counts.deadEmbryo` | Number |  | integer |  |
| `counts.hatched` | Number |  | integer |  |
| `counts.deadInShell` | Number |  | integer |  |
| `counts.saleable` | Number |  | integer |  |
| `counts.culled` | Number |  | integer |  |
| `machine` | String |  | one of: `setter`, `hatcher` |  |
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

## ChickStart

### brooding_profiles

The farm's brooding targets by day of age (temperature at chick level, humidity, target weight), taken from its breed guide or veterinarian. Brooder checks are compared with it. No targets are built in.

- **Model:** `BroodingProfile`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `flockTypes` | array of String |  | one of: `broiler`, `layer`, `breeder`, `chick`, `custom` |  |
| `bands` | array of objects | yes | custom validation |  |
| `bands[].fromDay` | Number | yes | max 120; integer |  |
| `bands[].toDay` | Number | yes | max 120; integer |  |
| `bands[].tempMinC` | Number |  | max 45 |  |
| `bands[].tempMaxC` | Number |  | max 45 |  |
| `bands[].humidityMin` | Number |  | max 100 |  |
| `bands[].humidityMax` | Number |  | max 100 |  |
| `bands[].targetWeightG` | Number |  | max 10000 |  |
| `source` | String |  | ≤ 300 chars |  |
| `isDefault` | Boolean |  | default `false` |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, name | unique, live records only | Profile list (prefix); names unique within a farm |

### chick_arrivals

A planned delivery of chicks into a house: preparation checklist, then the arrival itself (count, dead on arrival, chick weight and quality). Arrival places the chicks into a flock.

- **Model:** `ChickArrival`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `houseId` | String | yes |  | `House` |
| `expectedDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `expectedCount` | Number | yes | min 1; integer |  |
| `source` | String | yes | one of: `own_hatchery`, `chick_lot`, `supplier` |  |
| `hatcheryBatchId` | String |  |  | `HatcheryBatch` |
| `chickLotId` | String |  |  | `ChickLot` |
| `supplier` | String |  | ≤ 120 chars |  |
| `flockType` | String | yes | one of: `broiler`, `layer`, `breeder`, `chick`, `custom` |  |
| `breed` | String |  | ≤ 120 chars |  |
| `broodingProfileId` | String |  |  | `BroodingProfile` |
| `status` | String | yes | one of: `planned`, `arrived`, `cancelled`; default `"planned"` |  |
| `preparation` | object |  |  |  |
| `preparation.checklist` | object | yes |  |  |
| `preparation.checklist.templateId` | String | yes |  | `ChecklistTemplate` |
| `preparation.checklist.templateVersion` | Number | yes | integer |  |
| `preparation.checklist.answers` | array of objects |  |  |  |
| `preparation.checklist.answers[].itemId` | String | yes | ≤ 60 chars |  |
| `preparation.checklist.answers[].text` | String | yes | ≤ 300 chars |  |
| `preparation.checklist.answers[].answer` | Mixed | yes |  |  |
| `preparation.checklist.answers[].passed` | Boolean | yes |  |  |
| `preparation.checklist.failedCount` | Number |  | default `0`; integer |  |
| `preparation.completedAt` | Date | yes |  |  |
| `preparation.completedBy` | String |  |  | `User` |
| `arrival` | object |  |  |  |
| `arrival.arrivedAt` | Date | yes |  |  |
| `arrival.received` | Number | yes | min 1; integer |  |
| `arrival.deadOnArrival` | Number |  | default `0`; integer |  |
| `arrival.averageWeightG` | Number |  | max 200 |  |
| `arrival.sampleSize` | Number |  | integer |  |
| `arrival.qualityNotes` | String |  | ≤ 500 chars |  |
| `arrival.checklist` | object |  |  |  |
| `arrival.checklist.templateId` | String | yes |  | `ChecklistTemplate` |
| `arrival.checklist.templateVersion` | Number | yes | integer |  |
| `arrival.checklist.answers` | array of objects |  |  |  |
| `arrival.checklist.answers[].itemId` | String | yes | ≤ 60 chars |  |
| `arrival.checklist.answers[].text` | String | yes | ≤ 300 chars |  |
| `arrival.checklist.answers[].answer` | Mixed | yes |  |  |
| `arrival.checklist.answers[].passed` | Boolean | yes |  |  |
| `arrival.checklist.failedCount` | Number |  | default `0`; integer |  |
| `flockId` | String |  |  | `Flock` |
| `cancelledReason` | String |  | ≤ 300 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, expectedDate |  | Upcoming arrivals (calendar, preparation reminders) |

### brooder_checks

A check of young chicks: temperature at chick level, humidity, behaviour, feed and water, crop fill, with optional checklist answers. Flags come from the farm's brooding profile for that day of age.

- **Model:** `BrooderCheck`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `flockId` | String | yes |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `checkedAt` | Date | yes |  |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `dayOfAge` | Number | yes | max 2000; integer |  |
| `temperatureC` | Number |  | min -10; max 60 |  |
| `humidityPercent` | Number |  | max 100 |  |
| `behaviour` | String |  | one of: `comfortable`, `huddling`, `spread_out`, `panting`, `avoiding_area` |  |
| `feedAvailable` | Boolean |  |  |  |
| `waterAvailable` | Boolean |  |  |  |
| `cropFill` | object |  |  |  |
| `cropFill.sampled` | Number | yes | min 1; integer |  |
| `cropFill.full` | Number | yes | integer |  |
| `checklist` | object |  |  |  |
| `checklist.templateId` | String | yes |  | `ChecklistTemplate` |
| `checklist.templateVersion` | Number | yes | integer |  |
| `checklist.answers` | array of objects |  |  |  |
| `checklist.answers[].itemId` | String | yes | ≤ 60 chars |  |
| `checklist.answers[].text` | String | yes | ≤ 300 chars |  |
| `checklist.answers[].answer` | Mixed | yes |  |  |
| `checklist.answers[].passed` | Boolean | yes |  |  |
| `checklist.failedCount` | Number |  | default `0`; integer |  |
| `flags` | array of String |  | one of: `temperature_low`, `temperature_high`, `humidity_low`, `humidity_high`, `behaviour`, `no_feed`, `no_water` |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, flockId, checkedAt ↓ |  | A flock's brooder checks, newest first (brooding view) |

## Money

### suppliers

The farm's suppliers (feed mills, hatcheries, vets, utilities). Linked from bills, purchases and payments.

- **Model:** `Supplier`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `phone` | String |  | ≤ 30 chars |  |
| `email` | String |  | ≤ 254 chars; lowercased |  |
| `taxId` | String |  | ≤ 40 chars |  |
| `address` | String |  | ≤ 300 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, name |  | Supplier list by name and name search |

### money_accounts

Where the farm keeps money: cash box, bank account, mobile money wallet. Balance = opening balance + its ledger entries.

- **Model:** `MoneyAccount`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 80 chars |  |
| `type` | String | yes | one of: `cash`, `bank`, `mobile_money`, `other` |  |
| `openingBalance` | object | yes |  |  |
| `openingBalance.amountMinor` | Number | yes | integer |  |
| `openingBalance.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `openingDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `active` | Boolean |  | default `true` |  |
| `notes` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, name | unique, live records only | Account list (prefix); names unique within a farm |

### expenses

A bill: an expense or a purchase the farm owes. Unpaid bills are payables; payments are ledger entries in `transactions`. Purchases of stock and vet fees are created automatically by FeedWise and FlockHealth.

- **Model:** `Expense`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `kind` | String | yes | one of: `expense`, `purchase`; default `"expense"` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `dueDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `category` | String | yes | one of: `stock_purchase`, `feed`, `medicine_vaccine`, `vet_services`, `labour`, `electricity`, `water`, `fuel_transport`, `litter_bedding`, `rent`, `maintenance`, `licences_fees`, `equipment`, `other_expense` |  |
| `description` | String | yes | ≤ 300 chars |  |
| `supplierId` | String |  |  | `Supplier` |
| `vendor` | String |  | ≤ 120 chars |  |
| `amount` | object | yes |  |  |
| `amount.amountMinor` | Number | yes | integer |  |
| `amount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `net` | object | yes |  |  |
| `net.amountMinor` | Number | yes | integer |  |
| `net.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `tax` | object |  |  |  |
| `tax.label` | String |  | ≤ 30 chars |  |
| `tax.ratePercent` | Number | yes | max 100 |  |
| `tax.inclusive` | Boolean | yes |  |  |
| `tax.amountMinor` | Number | yes | integer |  |
| `amountPaid` | object | yes |  |  |
| `amountPaid.amountMinor` | Number | yes | integer |  |
| `amountPaid.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `status` | String | yes | one of: `unpaid`, `partially_paid`, `paid`, `cancelled`; default `"unpaid"` |  |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `recurringExpenseId` | String |  |  | `RecurringExpense` |
| `sourceType` | String | yes | one of: `manual`, `inventory_purchase`, `health_record`, `recurring_expense`, `flock_sale`, `chick_order`, `market_order`; default `"manual"` |  |
| `sourceId` | String |  |  |  |
| `invoiceNumber` | String |  | ≤ 60 chars |  |
| `attachments` | array of objects |  |  |  |
| `attachments[].assetId` | String | yes |  | `MediaAsset` |
| `attachments[].name` | String |  | ≤ 200 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, date ↓ |  | Expense list, P&L and breakdowns by period |
| farmId, status, dueDate |  | Payables: unpaid and overdue bills |
| farmId, recurringExpenseId, dueDate | unique, partial: {"recurringExpenseId":{"$exists":true}} | Bill generation is idempotent: one bill per recurring expense per due date |
| farmId, sourceId | partial: {"sourceId":{"$exists":true}} | The bill created from a purchase lot or health record |

- **Relationship:** `sourceId` → InventoryLot | HealthRecord (one-to-one) — Polymorphic by sourceType

### incomes

A sale or other income the farm is owed. Unpaid incomes are receivables. Bird sales, chick orders and marketplace orders create them automatically.

- **Model:** `Income`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `kind` | String | yes | one of: `sale`, `income`; default `"sale"` |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `dueDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `category` | String | yes | one of: `bird_sales`, `egg_sales`, `chick_sales`, `manure_sales`, `other_income` |  |
| `description` | String | yes | ≤ 300 chars |  |
| `buyerId` | String |  |  | `Buyer` |
| `customerName` | String |  | ≤ 120 chars |  |
| `amount` | object | yes |  |  |
| `amount.amountMinor` | Number | yes | integer |  |
| `amount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `net` | object | yes |  |  |
| `net.amountMinor` | Number | yes | integer |  |
| `net.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `tax` | object |  |  |  |
| `tax.label` | String |  | ≤ 30 chars |  |
| `tax.ratePercent` | Number | yes | max 100 |  |
| `tax.inclusive` | Boolean | yes |  |  |
| `tax.amountMinor` | Number | yes | integer |  |
| `amountPaid` | object | yes |  |  |
| `amountPaid.amountMinor` | Number | yes | integer |  |
| `amountPaid.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `status` | String | yes | one of: `unpaid`, `partially_paid`, `paid`, `cancelled`; default `"unpaid"` |  |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `sourceType` | String | yes | one of: `manual`, `inventory_purchase`, `health_record`, `recurring_expense`, `flock_sale`, `chick_order`, `market_order`; default `"manual"` |  |
| `sourceId` | String |  |  |  |
| `invoiceNumber` | String |  | ≤ 60 chars |  |
| `attachments` | array of objects |  |  |  |
| `attachments[].assetId` | String | yes |  | `MediaAsset` |
| `attachments[].name` | String |  | ≤ 200 chars |  |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, date ↓ |  | Income list, P&L and breakdowns by period |
| farmId, status, dueDate |  | Receivables: unpaid and overdue incomes |
| farmId, sourceId | partial: {"sourceId":{"$exists":true}} | The income created from a sale event or order |

- **Relationship:** `sourceId` → FlockEvent | Order (one-to-one) — Polymorphic by sourceType

### recurring_expenses

A repeating bill (electricity, wages, rent). The scheduler creates an expense on each due date; pauses stop that.

- **Model:** `RecurringExpense`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `name` | String | yes | ≤ 120 chars |  |
| `category` | String | yes | one of: `stock_purchase`, `feed`, `medicine_vaccine`, `vet_services`, `labour`, `electricity`, `water`, `fuel_transport`, `litter_bedding`, `rent`, `maintenance`, `licences_fees`, `equipment`, `other_expense` |  |
| `supplierId` | String |  |  | `Supplier` |
| `vendor` | String |  | ≤ 120 chars |  |
| `amount` | object | yes |  |  |
| `amount.amountMinor` | Number | yes | integer |  |
| `amount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `tax` | object |  |  |  |
| `tax.label` | String |  | ≤ 30 chars |  |
| `tax.ratePercent` | Number | yes | max 100 |  |
| `tax.inclusive` | Boolean | yes |  |  |
| `tax.amountMinor` | Number | yes | integer |  |
| `frequency` | String | yes | one of: `daily`, `weekly`, `monthly`, `quarterly`, `yearly` |  |
| `startDate` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `endDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `pauses` | array of objects |  |  |  |
| `pauses[].from` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `pauses[].to` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `nextDueDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `active` | Boolean |  | default `true` |  |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `notes` | String |  | ≤ 1000 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, active, nextDueDate |  | Scheduler finds bills due; running-costs list |

### transactions

The cash ledger: money in or out of one of the farm's accounts. Payments and refunds against bills and incomes, transfers between accounts (a pair sharing transferGroupId) and opening balances. Cash flow is built from it. Corrections are reversal entries.

- **Model:** `Transaction`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency)
- **Append-only:** never updated or deleted; corrections are new entries with `reversalOf`

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `kind` | String | yes | one of: `payment`, `refund`, `transfer`, `opening_balance`, `adjustment` |  |
| `direction` | String | yes | one of: `in`, `out` |  |
| `accountId` | String | yes |  | `MoneyAccount` |
| `amount` | object | yes |  |  |
| `amount.amountMinor` | Number | yes | integer |  |
| `amount.currency` | String | yes | pattern `/^[A-Z]{3}$/` |  |
| `category` | String |  | one of: `bird_sales`, `egg_sales`, `chick_sales`, `manure_sales`, `other_income`, `stock_purchase`, `feed`, `medicine_vaccine`, `vet_services`, `labour`, `electricity`, `water`, `fuel_transport`, `litter_bedding`, `rent`, `maintenance`, `licences_fees`, `equipment`, `other_expense` |  |
| `documentType` | String |  | one of: `expense`, `income` |  |
| `documentId` | String |  |  |  |
| `orderId` | String |  |  | `Order` |
| `transferGroupId` | String |  |  |  |
| `counterpartAccountId` | String |  |  | `MoneyAccount` |
| `supplierId` | String |  |  | `Supplier` |
| `buyerId` | String |  |  | `Buyer` |
| `flockId` | String |  |  | `Flock` |
| `houseId` | String |  |  | `House` |
| `paymentMethod` | String |  | one of: `cash`, `bank_transfer`, `mobile_money`, `upi`, `card`, `cheque`, `other` |  |
| `reference` | String |  | ≤ 80 chars |  |
| `description` | String |  | ≤ 300 chars |  |
| `attachments` | array of objects |  |  |  |
| `attachments[].assetId` | String | yes |  | `MediaAsset` |
| `attachments[].name` | String |  | ≤ 200 chars |  |
| `reversalOf` | String |  |  | `Transaction` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, date |  | Cash flow for a period |
| farmId, accountId, date |  | Account balances and statements |
| farmId, documentId | partial: {"documentId":{"$exists":true}} | Payments and refunds of one bill or income |

- **Relationship:** `documentId` → Expense | Income (many-to-one) — Polymorphic by documentType

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

Something a farm offers on the marketplace. quantityAvailable is what is not yet reserved by accepted orders. Seller contact details are never in a listing; a buyer sees them once the seller accepts the order. An optional stock source makes delivery move stock automatically.

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
| `minOrderQuantity` | Number |  |  |  |
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
| `fulfilmentOptions` | array of String | yes | custom validation; one of: `pickup`, `seller_delivery`, `courier` |  |
| `status` | String | yes | one of: `draft`, `active`, `paused`, `sold_out`, `closed`; default `"draft"` |  |
| `photos` | array of String |  |  | `MediaAsset` |
| `source` | object |  |  |  |
| `source.kind` | String | yes | one of: `eggs`, `chick_lot`, `flock` |  |
| `source.eggGrade` | String |  | one of: `large`, `medium`, `small`, `cracked`, `dirty`, `double_yolk` |  |
| `source.chickLotId` | String |  |  | `ChickLot` |
| `source.flockId` | String |  |  | `Flock` |

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
| `hatcheryBatchId` | String |  |  | `HatcheryBatch` |
| `buyerName` | String |  | ≤ 120 chars |  |
| `buyerPhone` | String |  | ≤ 30 chars |  |
| `fulfilment` | String | yes | one of: `pickup`, `seller_delivery`, `courier`; default `"pickup"` |  |
| `delivery` | object |  |  |  |
| `delivery.address` | String |  | ≤ 300 chars |  |
| `delivery.expectedDate` | String |  | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `delivery.vehicle` | String |  | ≤ 60 chars |  |
| `delivery.driver` | String |  | ≤ 120 chars |  |
| `delivery.trackingReference` | String |  | ≤ 80 chars |  |
| `delivery.dispatchedAt` | Date |  |  |  |
| `delivery.deliveredAt` | Date |  |  |  |
| `delivery.receivedBy` | String |  | ≤ 120 chars |  |
| `delivery.proofAssetId` | String |  |  | `MediaAsset` |
| `incomeId` | String |  |  | `Income` |
| `cancelReason` | String |  | ≤ 300 chars |  |
| `cancelledBy` | String |  | one of: `seller`, `buyer` |  |
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
| `status` | String | yes | one of: `pending`, `accepted`, `preparing`, `dispatched`, `delivered`, `completed`, `cancelled`; default `"pending"` |  |
| `statusHistory` | array of objects |  |  |  |
| `statusHistory[].status` | String | yes | one of: `pending`, `accepted`, `preparing`, `dispatched`, `delivered`, `completed`, `cancelled` |  |
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
| `accountId` | String |  |  | `MoneyAccount` |
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
| `kind` | String | yes | one of: `general`, `corrective_action`, `follow_up`, `vet_appointment`; default `"general"` |  |
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
| `resolutionNotes` | String |  | ≤ 2000 chars |  |
| `verifiedAt` | Date |  |  |  |
| `verifiedBy` | String |  |  | `User` |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, status, dueDate |  | Farm task board by status and due date |
| farmId, assigneeUserId, status, dueDate |  | My tasks (worker home screen) |

- **Relationship:** `related.id` → any farm record (many-to-one) — Polymorphic by related.entity

### alert_rules

A farm's settings for one rule from the catalog (mortality, egg production, feed, water, weight, FCR, stock, expiry, vaccination, vet appointment, hatch, delivery, payment, weather): on or off, parameters, scope, severity, who is told and how. Absent = catalog defaults, which compare with the farm's own history.

- **Model:** `AlertRule`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy` (required), `updatedBy`, `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `ruleKey` | String | yes | one of: `mortality`, `egg_production`, `feed_consumption`, `water_consumption`, `weight_variance`, `fcr_variance`, `inventory`, `medicine_expiry`, `vaccination_due`, `vet_appointment`, `hatch_date`, `order_delivery`, `payment_overdue`, `weather_risk` |  |
| `enabled` | Boolean |  | default `true` |  |
| `parameters` | map of Number |  |  |  |
| `parameters.$*` | Number |  |  |  |
| `flockIds` | array of String |  |  | `Flock` |
| `houseIds` | array of String |  |  | `House` |
| `severity` | String |  | one of: `info`, `warning`, `critical` |  |
| `notifyRoles` | array of String |  | one of: `owner`, `admin`, `farm_manager`, `supervisor`, `worker`, `accountant`, `vet` |  |
| `channels` | array of String |  | one of: `in_app`, `push`, `email`, `sms`, `whatsapp` |  |
| `cooldownHours` | Number |  | max 720; default `24`; integer |  |

| Index | Options | Serves |
| --- | --- | --- |
| farmId, ruleKey | unique | Load a farm's rule settings; one per rule per farm |

### alerts

Something that needs attention, raised by the server-side alert job. States facts (never a diagnosis). Deduplicated by dedupKey.

- **Model:** `Alert`
- **Ownership:** Farm — every query must include farmId
- **Standard fields:** `_id` (UUIDv7 string), `farmId` (required), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required), `version` (optimistic concurrency), `deletedAt`, `deletedBy` (soft delete)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `ruleType` | String | yes | one of: `mortality_spike`, `egg_drop`, `feed_change`, `missing_record`, `heat_stress`, `low_feed_stock`, `low_inventory`, `vaccination_due`, `withdrawal_active`, `expiry_soon`, `expired_stock`, `water_abnormal`, `health_follow_up`, `biosecurity_breach`, `wild_bird_contact`, `checklist_failed`, `brooding_conditions`, `hatch_due`, `weight_variance`, `fcr_variance`, `vet_appointment`, `order_delivery`, `payment_overdue`, `weather_risk` |  |
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

A message to one person on one channel (in-app, push, email) with delivery state. Push and email are queued and sent by the delivery worker through replaceable providers, with retries. Kept 180 days.

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
| `ruleKey` | String |  | one of: `mortality`, `egg_production`, `feed_consumption`, `water_consumption`, `weight_variance`, `fcr_variance`, `inventory`, `medicine_expiry`, `vaccination_due`, `vet_appointment`, `hatch_date`, `order_delivery`, `payment_overdue`, `weather_risk` |  |
| `severity` | String |  | one of: `info`, `warning`, `critical` |  |
| `sentAt` | Date |  |  |  |
| `deliveredAt` | Date |  |  |  |
| `readAt` | Date |  |  |  |
| `attempts` | Number |  | max 20; default `0`; integer |  |
| `nextAttemptAt` | Date |  |  |  |
| `providerMessageId` | String |  | ≤ 200 chars |  |
| `error` | String |  | ≤ 500 chars |  |

| Index | Options | Serves |
| --- | --- | --- |
| userId, createdAt ↓ |  | A person's notification inbox, newest first; unread count |
| status, nextAttemptAt | partial: {"status":"queued"} | Delivery queue: queued push and email notifications due for an attempt |
| createdAt | TTL 180 d | TTL: delete notifications after 180 days |

### push_devices

A phone or browser registered for push notifications. Tokens the provider reports as invalid are disabled.

- **Model:** `PushDevice`
- **Ownership:** User — belongs to one person
- **Standard fields:** `_id` (UUIDv7 string), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `userId` | String | yes |  | `User` |
| `platform` | String | yes | one of: `ios`, `android`, `web` |  |
| `token` | String | yes | ≤ 4096 chars |  |
| `deviceName` | String |  | ≤ 100 chars |  |
| `lastSeenAt` | Date | yes |  |  |
| `disabledAt` | Date |  |  |  |

| Index | Options | Serves |
| --- | --- | --- |
| token | unique | One registration per token (re-registering moves it to the signed-in user) |
| userId |  | A person's devices when sending a push |

### notification_preferences

How a person wants to be told: push and email on or off, the lowest severity for each, and rules they have muted. In-app notifications are always kept.

- **Model:** `NotificationPreference`
- **Ownership:** User — belongs to one person
- **Standard fields:** `_id` (UUIDv7 string), `createdBy`, `updatedBy` (when a person made the change), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `userId` | String | yes |  | `User` |
| `pushEnabled` | Boolean |  | default `true` |  |
| `emailEnabled` | Boolean |  | default `true` |  |
| `pushMinSeverity` | String | yes | one of: `info`, `warning`, `critical`; default `"warning"` |  |
| `emailMinSeverity` | String | yes | one of: `info`, `warning`, `critical`; default `"warning"` |  |
| `mutedRuleKeys` | array of String |  | one of: `mortality`, `egg_production`, `feed_consumption`, `water_consumption`, `weight_variance`, `fcr_variance`, `inventory`, `medicine_expiry`, `vaccination_due`, `vet_appointment`, `hatch_date`, `order_delivery`, `payment_overdue`, `weather_risk` |  |

| Index | Options | Serves |
| --- | --- | --- |
| userId | unique | One preference document per person |

### weather_observations

Observed daily weather for a location (temperature, humidity, rain, wind), kept as history. Shared by every farm near that point; weather rules use it as the farm's own baseline.

- **Model:** `WeatherObservation`
- **Ownership:** Global — shared reference data
- **Standard fields:** `_id` (UUIDv7 string), `createdAt`, `updatedAt` (UTC, required)

| Field | Type | Required | Constraints | References |
| --- | --- | --- | --- | --- |
| `provider` | String | yes | ≤ 40 chars |  |
| `locationKey` | String | yes | ≤ 40 chars |  |
| `date` | String | yes | pattern `/^\d{4}-\d{2}-\d{2}$/` |  |
| `tempMaxC` | Number |  | min -90; max 70 |  |
| `tempMinC` | Number |  | min -90; max 70 |  |
| `humidityMaxPercent` | Number |  | max 100 |  |
| `humidityMinPercent` | Number |  | max 100 |  |
| `rainMm` | Number |  | max 2000 |  |
| `windMaxKph` | Number |  | max 500 |  |

| Index | Options | Serves |
| --- | --- | --- |
| locationKey, date | unique | History for a location over a date range; one row per day |

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
| `contentType` | String | yes | one of: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |  |
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
| `health_records` | `treatments[].medicineId` | `medicines` | many-to-one |
| `health_records` | `treatments[].inventoryItemId` | `inventory_items` | many-to-one |
| `health_records` | `attachments[].assetId` | `media_assets` | many-to-one |
| `health_records` | `dailyRecordId` | `daily_records` | many-to-one |
| `vaccination_programmes` | `items[].medicineId` | `medicines` | many-to-one |
| `vaccinations` | `flockId` | `flocks` | many-to-one |
| `vaccinations` | `programmeId` | `vaccination_programmes` | many-to-one |
| `vaccinations` | `medicineId` | `medicines` | many-to-one |
| `vaccinations` | `inventoryItemId` | `inventory_items` | many-to-one |
| `vaccinations` | `batches[].lotId` | `inventory_lots` | many-to-one |
| `biosecurity_logs` | `houseId` | `houses` | many-to-one |
| `biosecurity_logs` | `cleaningTaskId` | `cleaning_tasks` | many-to-one |
| `biosecurity_logs` | `product.inventoryItemId` | `inventory_items` | many-to-one |
| `biosecurity_logs` | `checklist.templateId` | `checklist_templates` | many-to-one |
| `biosecurity_logs` | `attachments[].assetId` | `media_assets` | many-to-one |
| `visitors` | `housesVisited` | `houses` | many-to-many |
| `visitors` | `declaration.signatureAssetId` | `media_assets` | many-to-one |
| `visitors` | `declaration.checklist.templateId` | `checklist_templates` | many-to-one |
| `visitors` | `hostUserId` | `users` | many-to-one |
| `cleaning_tasks` | `houseIds` | `houses` | many-to-many |
| `cleaning_tasks` | `checklistTemplateId` | `checklist_templates` | many-to-one |
| `cleaning_tasks` | `assigneeUserId` | `users` | many-to-one |
| `equipment` | `houseId` | `houses` | many-to-one |
| `equipment_movements` | `equipmentId` | `equipment` | many-to-one |
| `equipment_movements` | `fromHouseId` | `houses` | many-to-one |
| `equipment_movements` | `toHouseId` | `houses` | many-to-one |
| `equipment_movements` | `reversalOf` | `equipment_movements` | many-to-one |
| `hatchery_batches` | `sourceFlockId` | `flocks` | many-to-one |
| `hatchery_batches` | `incubatorId` | `equipment` | many-to-one |
| `hatchery_batches` | `hatcherId` | `equipment` | many-to-one |
| `hatchery_batches` | `chickLotId` | `chicks` | many-to-one |
| `hatchery_events` | `batchId` | `hatchery_batches` | many-to-one |
| `hatchery_events` | `chickLotId` | `chicks` | many-to-one |
| `hatchery_events` | `reversalOf` | `hatchery_events` | many-to-one |
| `chicks` | `hatcheryBatchId` | `hatchery_batches` | many-to-one |
| `chicks` | `placedFlockIds` | `flocks` | many-to-many |
| `chick_arrivals` | `houseId` | `houses` | many-to-one |
| `chick_arrivals` | `hatcheryBatchId` | `hatchery_batches` | many-to-one |
| `chick_arrivals` | `chickLotId` | `chicks` | many-to-one |
| `chick_arrivals` | `broodingProfileId` | `brooding_profiles` | many-to-one |
| `chick_arrivals` | `preparation.checklist.templateId` | `checklist_templates` | many-to-one |
| `chick_arrivals` | `preparation.completedBy` | `users` | many-to-one |
| `chick_arrivals` | `arrival.checklist.templateId` | `checklist_templates` | many-to-one |
| `chick_arrivals` | `flockId` | `flocks` | many-to-one |
| `brooder_checks` | `flockId` | `flocks` | many-to-one |
| `brooder_checks` | `houseId` | `houses` | many-to-one |
| `brooder_checks` | `checklist.templateId` | `checklist_templates` | many-to-one |
| `expenses` | `supplierId` | `suppliers` | many-to-one |
| `expenses` | `flockId` | `flocks` | many-to-one |
| `expenses` | `houseId` | `houses` | many-to-one |
| `expenses` | `recurringExpenseId` | `recurring_expenses` | many-to-one |
| `expenses` | `attachments[].assetId` | `media_assets` | many-to-one |
| `expenses` | `sourceId` | InventoryLot \| HealthRecord | one-to-one (Polymorphic by sourceType) |
| `incomes` | `buyerId` | `buyers` | many-to-one |
| `incomes` | `flockId` | `flocks` | many-to-one |
| `incomes` | `houseId` | `houses` | many-to-one |
| `incomes` | `attachments[].assetId` | `media_assets` | many-to-one |
| `incomes` | `sourceId` | FlockEvent \| Order | one-to-one (Polymorphic by sourceType) |
| `recurring_expenses` | `supplierId` | `suppliers` | many-to-one |
| `recurring_expenses` | `flockId` | `flocks` | many-to-one |
| `recurring_expenses` | `houseId` | `houses` | many-to-one |
| `transactions` | `accountId` | `money_accounts` | many-to-one |
| `transactions` | `orderId` | `orders` | many-to-one |
| `transactions` | `counterpartAccountId` | `money_accounts` | many-to-one |
| `transactions` | `supplierId` | `suppliers` | many-to-one |
| `transactions` | `buyerId` | `buyers` | many-to-one |
| `transactions` | `flockId` | `flocks` | many-to-one |
| `transactions` | `houseId` | `houses` | many-to-one |
| `transactions` | `attachments[].assetId` | `media_assets` | many-to-one |
| `transactions` | `reversalOf` | `transactions` | many-to-one |
| `transactions` | `documentId` | Expense \| Income | many-to-one (Polymorphic by documentType) |
| `buyers` | `linkedFarmId` | `farms` | many-to-one |
| `market_listings` | `photos` | `media_assets` | many-to-many |
| `market_listings` | `source.chickLotId` | `chicks` | many-to-one |
| `market_listings` | `source.flockId` | `flocks` | many-to-one |
| `orders` | `buyerId` | `buyers` | many-to-one |
| `orders` | `buyerUserId` | `users` | many-to-one |
| `orders` | `buyerFarmId` | `farms` | many-to-one |
| `orders` | `listingId` | `market_listings` | many-to-one |
| `orders` | `hatcheryBatchId` | `hatchery_batches` | many-to-one |
| `orders` | `delivery.proofAssetId` | `media_assets` | many-to-one |
| `orders` | `incomeId` | `incomes` | many-to-one |
| `orders` | `lines[].flockId` | `flocks` | many-to-one |
| `orders` | `lines[].chickLotId` | `chicks` | many-to-one |
| `orders` | `statusHistory[].by` | `users` | many-to-one |
| `order_payments` | `orderId` | `orders` | many-to-one |
| `order_payments` | `transactionId` | `transactions` | many-to-one |
| `order_payments` | `reversalOf` | `order_payments` | many-to-one |
| `order_payments` | `accountId` | `money_accounts` | many-to-one |
| `tasks` | `assigneeUserId` | `users` | many-to-one |
| `tasks` | `flockId` | `flocks` | many-to-one |
| `tasks` | `houseId` | `houses` | many-to-one |
| `tasks` | `completedBy` | `users` | many-to-one |
| `tasks` | `verifiedBy` | `users` | many-to-one |
| `tasks` | `related.id` | any farm record | many-to-one (Polymorphic by related.entity) |
| `alert_rules` | `flockIds` | `flocks` | many-to-many |
| `alert_rules` | `houseIds` | `houses` | many-to-many |
| `alerts` | `flockId` | `flocks` | many-to-one |
| `alerts` | `houseId` | `houses` | many-to-one |
| `alerts` | `acknowledgedBy` | `users` | many-to-one |
| `notifications` | `userId` | `users` | many-to-one |
| `notifications` | `alertId` | `alerts` | many-to-one |
| `push_devices` | `userId` | `users` | many-to-one |
| `notification_preferences` | `userId` | `users` | many-to-one |
| `training_progress` | `userId` | `users` | many-to-one |
| `training_progress` | `courseId` | `training_courses` | many-to-one |
| `training_progress` | `lessonId` | `TrainingCourse.lessons.lessonId` | many-to-one (Embedded lesson id) |
| `audit_logs` | `actorUserId` | `users` | many-to-one |
| `audit_logs` | `entityId` | any record | many-to-one (Polymorphic by entity) |
| `sync_operations` | `userId` | `users` | many-to-one |

Every farm-owned collection also references `farms` through `farmId` (many-to-one).


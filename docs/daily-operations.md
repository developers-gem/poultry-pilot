# Daily farm operations

One daily record per flock per farm-local day, entered from the React web app or the Flutter app with the same request and response shapes. Code: `services/api/src/services/daily-record.service.ts`; schemas: `packages/validation/src/schemas/daily-record.ts`.

## What a record holds and where it goes

The record is a thin header. Each section is written to the collection that owns that fact, in one transaction, and linked back by `dailyRecordId`. Nothing is stored twice.

| Section | Field | Written to |
| --- | --- | --- |
| Birds (headcount) | `observedBirdCount` | the record; compared with the ledger as `countDifference`, never applied to it |
| Mortality by cause | `mortality[]` | `flock_events` (mortality) |
| Culls | `culls` | `flock_events` (cull) |
| Feed | `feed[]` (kg, optional feed item and price per kg) | `feed_consumption` |
| Water | `waterLitres` | `water_records` |
| Temperature, humidity, lighting | `temperatureMinC`, `temperatureMaxC`, `humidityPercent`, `lightingHours` | the record |
| Eggs, broken eggs, quality | `eggs.collected`, `eggs.broken`, `eggs.byGrade`, `eggs.averageEggWeightG`, `eggs.qualityNotes` | `egg_records` + `egg_inventory` |
| Average weight | `averageWeight.averageWeightG`, `sampleSize` | `flock_events` (weighing) |
| Health observations | `healthObservations[]` (what was seen, birds affected) | `health_records` (type observation) |
| Notes | `notes` | the record |
| Photos | `photos[]` (asset id, caption) | the record references `media_assets` |

The record also stores a small derived `summary` (deaths, culls, feed, water, eggs, weight, counts of observations and photos), rewritten in the same transaction. Lists can then show a day at a glance without reading six collections.

Egg stock: unbroken eggs enter stock, graded eggs by grade and the rest ungraded; broken eggs never enter stock. Egg entry is refused for broiler and chick flocks.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/farms/:farmId/daily-records` | Create. Body: `flockId`, `date`, optional client-generated `id`, and the sections. A second record for the same flock and date → 409 `DUPLICATE` with `details.existingId` and `version` |
| GET | `/api/v1/farms/:farmId/daily-records` | Compact list, newest first. Filters: `date` or `from`/`to`, `houseId`, `flockId`, `type` (flock type). Cursor pagination: `limit` (≤ 200), `cursor` → `nextCursor` |
| GET | `/api/v1/farms/:farmId/daily-records/sheet?date=` | Entry sheet (below) |
| GET | `/api/v1/daily-records/:id` | One record with every section |
| PUT | `/api/v1/daily-records/:id` | Replace every section; `version` required |
| DELETE | `/api/v1/daily-records/:id` | Delete and undo everything the record wrote |
| PUT | `/api/v1/farms/:farmId/flocks/:flockId/daily-records/:date` | Create or replace by flock and date (natural key; used by offline sync) |
| GET | `/api/v1/farms/:farmId/flocks/:flockId/daily-records/:date` | The day for one flock, including entries made outside a record |
| GET | `/api/v1/farms/:farmId/dashboard/day?date=&houseId=&type=` | One day across the farm |
| GET | `/api/v1/farms/:farmId/dashboard/trends?from=&to=&flockId=&houseId=&type=` | Daily totals over a range (≤ 366 days) |
| POST | `/api/v1/farms/:farmId/media` | Upload a photo (raw body) |
| GET | `/api/v1/farms/:farmId/media/:assetId` | Download a photo |

`/daily-records/:id` URLs don't name the farm. The API finds the record's farm, then runs the usual membership and permission checks. A record on someone else's farm gets the same 404 as a record that doesn't exist.

## Built for fast mobile entry

- **One call to open the entry screen.** `GET …/daily-records/sheet` returns every active flock with its house, the birds expected (from the ledger), whether today is already recorded (id and version), and yesterday's summary for pre-filling. It costs 5 queries for today and 7 for a past date, whatever the number of flocks.
- **One call to save a day.** Every section goes in one request and one transaction.
- **Small responses.** Send `Prefer: return=minimal` and the API answers with `{ id, version, summary }` instead of the full day.
- **Cheap re-saves.** Each section is compared with what the record wrote last time and rewritten only if it changed. Re-saving an unchanged day is a few reads and one write, and adds no events to the flock history.
- **Offline.** The Flutter outbox sends `daily_record.put` through `/sync/push` with the flock and date as the key. It is applied exactly once and checked with the same rules. Records can also be created with a client-generated `id`.
- **Photos.** Upload first, then reference the asset id in the record. Phones should resize to about 1,600 px and compress to JPEG at about 80% before uploading; the limit is 5 MB.
- **No new indexes.** Lists and filters use the existing (farmId, date) and (farmId, flockId, date) indexes. House and type are stored on the record, so no join is needed.

## Dashboards

Clients never download raw records to build charts. The server runs grouped sums on the database for each source collection, in parallel: flock events, feed, water, eggs and records.

- **Day:** per flock and in total:
  - birds alive at the end of the day, deaths, culls
  - feed, water, water-to-feed ratio
  - eggs, broken eggs, hen-day %
  - daily mortality %, latest average weight
  - whether the day has been recorded

  Deaths entered outside a record are included, and reversed entries are cancelled out.
- **Trends:** one row per day in the range, with zeros for days without data, plus range totals.

The house filter on dashboards uses each flock's current house. The list filter uses the house stored on each record, which is the house on that day.

## Rules

- **Dates:** no future dates (farm-local), and nothing before the flock was placed. The flock must be active.
- **Writing:**
  - Workers can record and edit only within the farm's edit window (default today and yesterday), and only records they created.
  - Supervisors and above can edit any record.
  - Deleting needs `production.delete` (farm manager and above), or the worker rule above.
- **Consistency checks:**
  - Deaths and culls must leave birds alive at or above zero on every day.
  - Broken eggs ≤ collected; graded eggs ≤ unbroken eggs.
  - Minimum temperature ≤ maximum.
  - Photos must belong to the same farm.
- **Deleting a record** undoes everything it wrote:
  - its deaths, culls and weighing are reversed in the flock ledger
  - its egg stock postings are reversed
  - its feed, water, egg record and observations are soft-deleted
  - the day can then be recorded again
- **Health observations** record what people saw. PoultryPilot does not diagnose.

## Not yet included

- Photo storage is on local disk; production needs the S3-compatible adapter behind the same `MediaStorage` port.
- Photos are not resized on the server, and unused uploads are not cleaned up yet.
- Feed cost comes from the price on the entry until the feed stock module costs feed automatically.

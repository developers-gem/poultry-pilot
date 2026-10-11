# FeedWise and inventory

Feed, medicine, vaccines and farm supplies in one stock engine; eggs and chicks in their own ledgers; water quality and consumption; feed calculations; low-stock, expiry and water alerts. Code: `services/api/src/services/inventory.service.ts`, `feed.service.ts`, `alert.service.ts`, `domain/inventory.ts`.

## One stock engine

| Inventory kind | Where it lives |
| --- | --- |
| Feed, medicine, vaccines, disinfectant, litter, packaging, equipment supplies, spare parts, cleaning, other consumables | `inventory_items` (catalog) → `inventory_lots` (batches) → `inventory_transactions` (ledger) |
| Eggs | `egg_inventory` ledger, posted automatically from daily records; manual used/spoiled/count entries |
| Chicks | `chicks` lots; placing a flock from a lot draws it down |
| Equipment assets (incubators, generators) | `equipment` (assets, not stock) |

- **Catalog.** Feed is an item of category `feed`, stocked in kg, with stage, form and bag size. Each item can set a reorder level, feed items a reorder threshold in days, and every item an expiry warning window (default 30 days).
- **Lots.** Every purchase creates a lot: supplier, batch number, invoice, expiry date, storage location, quantity and unit cost. A positive stock count also creates a lot, valued at the current average cost.
- **FEFO.** Stock leaves the lot that expires first (lots without expiry last). Each movement is costed at the actual cost of the lots it used, so feed cost and stock value follow real purchase prices.
- **Expired stock** is never issued for use. Wastage writes it off first. When in-date stock is short, the error says how much more is expired.
- **Ledger.** Every movement is a signed, costed entry: receipt, issue, wastage, adjustment or reversal. Corrections are reversals that put stock back into the same lots.
- **Concurrency.** Every movement updates the item under its version, so two simultaneous issues cannot both take the last stock.

## Automatic stock movement

| Action | Stock movement |
| --- | --- |
| Purchase | lot + receipt |
| Daily record feed line with `feedItemId` | FEFO issue (or wastage, for `kind: "wastage"`); the feed entry stores the lots used and their cost |
| Editing that daily record's feed | the old movements are reversed into the same lots, and the new ones issued (only if the feed changed) |
| Deleting the daily record | its feed movements are reversed |
| `POST /feed/consumption` | the same as a daily record feed line; `DELETE` reverses it |
| Placing a flock with `chickLotId` | the chick lot is drawn down; its unit cost becomes the chick cost if none is given |
| Daily record eggs | egg stock by grade (broken eggs never enter stock) |
| Issue, wastage, stock count | the corresponding ledger entries |

A daily record that would take more feed than is in date is refused as a whole: no deaths, eggs or feed are written. Feed not tracked in inventory can still be recorded without `feedItemId`, with an optional price per kg; no stock moves.

## Water

Each flock's daily water record holds:
- litres
- source: borehole, municipal, well, rainwater, river, tanker or other
- pH, dissolved solids (ppm) and chlorine (ppm)
- a quality rating and the treatment: none, chlorination, acidification, filtration, UV, medication, vitamins or other

On save, the record is checked against the farm's limits and flagged:
- consumption more than 20% above or below the flock's average over the previous days (3 days needed)
- pH below 6 or above 8
- dissolved solids above 1,000 ppm

A flagged day raises a `water_abnormal` alert, critical when intake fell. Correcting the record resolves the alert. These limits are defaults; farms should set them from their veterinarian's or local guidance.

## Calculations

Per flock (`GET /flocks/:id/metrics`, `GET /feed/analytics`):

| Figure | Formula |
| --- | --- |
| Feed per bird | feed eaten ÷ birds received |
| Feed per kg gain | feed eaten ÷ weight gained on the farm (live + sold + moved out − weight on arrival) |
| FCR | feed eaten ÷ (live weight + weight sold or moved out). Liveweight basis, the industry standard; dead-bird weight is included when the farm setting is on |
| Feed cost per bird | cost of feed eaten and wasted in the house ÷ birds received |
| Feed cost per egg | cost of feed ÷ eggs collected (layers and breeders); may be fractional in minor units |
| Feed wasted | wastage entries for the flock: counted in cost, not in FCR |

Per feed item and farm-wide (`GET /feed/stock`):

| Figure | Formula |
| --- | --- |
| Days of feed remaining | in-date kg ÷ average daily use over the last 7 complete days (eaten and wasted, averaged over days with entries) |
| Status | `out` (no stock), `low` (fewer days than the item's reorder days, default 7), `ok`, or `unknown` (no recent use) |

> **Change in this release:** `fcr` is now the liveweight figure. The former value, which subtracted the weight birds arrived with, is reported as `feedPerKgGainKg`. On the sample broiler flock: FCR 1.70, feed per kg gain 1.73.

## Alerts

| Alert | Raised when | Resolved when |
| --- | --- | --- |
| `low_inventory` / `low_feed_stock` | in-date stock at or below the reorder level; for feed, also fewer days left than `reorderDays`, or out of stock (critical) | stock rises above the level |
| `expiry_soon` | a lot with stock expires within the item's warning window | the lot is used up or written off |
| `expired_stock` | a lot with stock is past its expiry (critical; "do not use") | the lot is written off |
| `water_abnormal` | a water record is flagged | the record is corrected |

Alerts are keyed by item, lot or flock and day, so a condition is raised once. It reopens if it comes back and resolves itself when cleared. They are evaluated:
- inside every stock movement's transaction
- on demand with `POST /alerts/evaluate`
- by an hourly job for every farm, because expiry depends on the calendar

Supervisors and above can acknowledge an alert.

## Endpoints

All under `/api/v1/farms/:farmId`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/inventory/overview` | Every kind of stock: value and alerts per category, eggs by grade, chicks |
| GET / POST | `/inventory/items` | Catalog (filters: category, low stock) / add an item |
| GET / PUT | `/inventory/items/:itemId` | Item with open lots / edit details and thresholds |
| POST | `/inventory/items/:itemId/purchases` | Receive a purchase (lot) |
| POST | `/inventory/items/:itemId/issues` | Use stock |
| POST | `/inventory/items/:itemId/wastage` | Write off stock |
| POST | `/inventory/items/:itemId/counts` | Stock count |
| GET | `/inventory/items/:itemId/transactions` | Ledger |
| GET | `/inventory/lots?expiring=true` | Lots, optionally expired or expiring |
| GET / POST | `/inventory/eggs`, `/inventory/eggs/movements` | Egg stock / used, spoiled, counted |
| GET / POST | `/inventory/chick-lots` | Chick lots / receive chicks |
| POST / GET / DELETE | `/feed/consumption` | Feed eaten or wasted |
| GET | `/feed/stock` | Days of feed remaining |
| GET | `/feed/analytics` | Feed performance per flock |
| GET | `/water-records?abnormal=true` | Water records |
| GET | `/alerts` | Alerts (filters: status, type) |
| POST | `/alerts/evaluate`, `/alerts/:alertId/acknowledge` | Re-check now; acknowledge |

Offline: `feed.consume` through `/sync/push`, plus feed lines inside `daily_record.put`.

## Permissions

| Action | Roles |
| --- | --- |
| See stock (`inventory.read`) | all roles |
| Use stock and record wastage (`inventory.issue`) | owner, admin, farm manager, supervisor, worker, vet |
| Catalog, purchases, stock counts, chick receipts (`inventory.manage`) | owner, admin, farm manager, accountant |
| Acknowledge and re-check alerts (`alert.manage`) | owner, admin, farm manager, supervisor |

## Not yet included

- **Purchases don't create expenses yet.** The money module will post them to the ledger, and `inventory_lots.expenseId` is reserved for that link.
- **Vaccinations and treatments don't issue stock automatically yet.** The health module will call the same issue operation. Until then, use `POST …/issues` with the flock.
- **Notifications:** alerts are stored and listed, but not yet pushed to phones.
- **Alert thresholds:** water limits and the 20% deviation are defaults in code. Per-farm values through `alert_rules` come next.

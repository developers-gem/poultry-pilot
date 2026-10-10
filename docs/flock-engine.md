# Flock engine

How PoultryPilot tracks a flock from placement to closure and calculates its performance. Code: `services/api/src/domain/flock.ts` (ledger rules), `services/api/src/domain/flock-metrics.ts` (calculations), `services/api/src/services/flock.service.ts` (commands).

## The ledger

A flock's bird count is never an editable number. It is the sum of the flock's **events** in `flock_events`, which are append-only. A wrong entry is corrected by a **reversal** event; the reversal and the event it cancels both drop out of every calculation, and both stay visible in the history.

| Event | Bird count | Recorded by |
| --- | --- | --- |
| `placement` | + birds − dead on arrival | creating a flock with `placement`, or `POST …/placement` |
| `mortality` | − birds (with cause) | `POST …/mortality` or a daily record |
| `cull` | − birds | `POST …/culls` or a daily record |
| `transfer_out` / `transfer_in` | − / + birds | `POST …/transfers` with `mode: "flock"` |
| `transfer_house` | none (house changes) | `POST …/transfers` with `mode: "house"` |
| `split_out` / `split_in` | − / + birds (new flock) | `POST …/splits` |
| `merge_out` / `merge_in` | − all / + all | `POST …/merge` |
| `adjustment` | ± delta, reason required | `POST …/adjustments` |
| `sale` | − birds | `POST …/sales` |
| `weighing` | none (average weight) | `POST …/weighings` |
| `status_change` | none | closing or merging |

Paired events share a `groupId` and name each other in `counterpartFlockId`. `flocks.population` is a snapshot of the ledger, rewritten in the same transaction as every event.

## Flock types and fields

Types: `broiler`, `layer`, `breeder`, `chick` (rearing young birds), `custom` (requires `customTypeName`, e.g. "Geese"). Species is separate (chicken, duck, turkey, quail, guinea fowl).

| Field | Notes |
| --- | --- |
| `farmId`, `houseId` | `houseId` changes only through a house transfer |
| `name`, `flockCode` | code unique per farm among live flocks |
| `type`, `customTypeName`, `species` | fixed after creation |
| `breed`, `strain`, `source` | editable |
| `placementDate`, `placementCount`, `startingWeightG`, `chickCost` | set by the placement; immutable afterwards (correct a wrong placement by reversing it and placing again) |
| `targetSaleDate`, `hatchDate`, `notes` | editable |
| `status` | `planned` → `active` → `closed`; `planned` flocks can be deleted |

## Rules that prevent impossible operations

Every command runs in one transaction. It loads the flock and its whole ledger, checks the rules below, writes the events and snapshot, and records audit and sync entries.

| Rule | Error |
| --- | --- |
| Birds alive can never go below zero **at the end of any day**, from the new event's date onwards. So a sale, death, transfer or adjustment cannot exceed the birds present, and a back-dated loss cannot invalidate a later sale | 422 `INSUFFICIENT_BIRDS` |
| Birds that can leave on a date = the minimum alive on that date and every later date (birds already committed to a later sale are not available) | 422 `INSUFFICIENT_BIRDS`, with `available` |
| Dead on arrival ≤ birds received | 400 |
| No future dates (farm-local today), no events before placement | 400 |
| Commands need the right status: place only when planned; everything else only when active | 422 `INVALID_STATE_TRANSITION` |
| A house cannot hold more birds than its capacity (placement, house transfer, transfer/split/merge into another house) | 422 `CAPACITY_EXCEEDED` |
| Money must be in the farm currency | 400 |
| Merge only into an active flock of the same type and species, with no entries after the merge date | 400 / 422 |
| Transfers only between flocks of the same species, never to the same flock | 400 |
| Close only when no birds remain and nothing is dated after the close date | 422 |
| A flock with records cannot be deleted (close it instead) | 422 |
| An event can be reversed once; a reversal cannot be reversed. Transfers, splits, merges, house moves and status changes cannot be reversed (record the opposite movement). Entries from a daily record are changed by editing the record | 422 |
| Two simultaneous commands on the same flock: the second fails rather than both passing the bird check (optimistic lock on the flock's version) | 409 `VERSION_CONFLICT` |

## Daily records

`PUT /farms/:farmId/flocks/:flockId/daily-records/:date` carries the whole day: deaths by cause, culls, feed (kg, optional price per kg), water (litres), temperature, humidity, lighting and notes.

- Deaths and culls become `mortality`/`cull` events linked by `dailyRecordId`.
- Saving again reverses the record's previous events and posts the new ones, but only if the figures changed.
- Feed entries are replaced; water is one record per flock and day.
- Updates must send the `version` they last read.
- People without `production.edit_any` (workers) can only record days within the farm's `workerEditWindowDays` (default 1: today and yesterday), and can only edit records they created.
- `GET …/daily-records/:date` shows everything for the day from every source, including deaths entered through `POST …/mortality`, and the birds alive at the end of the day.

The same commands are available offline through `/sync/push`: `daily_record.put`, `flock.mortality`, `flock.cull`, `flock.weighing`.

## Calculations

All figures come from `computeFlockMetrics` as of a date (default: today, or the close date for closed flocks). A figure that cannot be computed honestly is `null`, never 0. Money is in integer minor units of the farm currency.

| Figure | Formula |
| --- | --- |
| birds received (`birdsIn`) | placed (net of dead on arrival) + transferred, split or merged in |
| `currentBirdCount` | birdsIn − mortality − culls − sold − moved out ± adjustments |
| `mortalityCount`, `cullCount` | sum of mortality / cull events |
| `mortalityRate` | mortality ÷ birdsIn × 100 |
| `survivalRate` (livability) | (birdsIn − mortality − culls) ÷ birdsIn × 100. Sold and moved birds are not losses |
| `averageWeightG` | latest weighing on or before the date |
| `dailyWeightGainG` | (latest average − starting weight) ÷ days from placement to that weighing; from the first weighing if there is no starting weight |
| `recentDailyWeightGainG` | gain between the two most recent weighings ÷ days between them |
| `feedConsumedKg` | sum of feed recorded for the flock |
| `liveWeightKg` | currentBirdCount × averageWeightG ÷ 1000 (null if birds are alive but never weighed) |
| weight produced | liveWeight + weight sold + weight moved out (+ estimated dead weight if the farm setting is on) − placement weight − weight moved in |
| `fcr` | feedConsumed ÷ weight produced |
| `revenueMinor` | sum of sale totals |
| `cost.totalMinor` | chick cost + cost received with birds moved in − cost given away with birds moved out + feed cost + other flock costs |
| `profitMinor` | revenue − cost |
| `marginPercent` | profit ÷ revenue × 100 (null before the first sale) |
| `costPerBirdMinor` | cost ÷ birdsIn |
| `costPerKgProducedMinor` | cost ÷ weight produced |
| `liveInventoryValueMinor` | liveWeight × `referencePricePerKgMinor` (query parameter); 0 when no birds remain |
| `projectedProfitMinor`, `projectedMarginPercent` | (revenue + live inventory value − cost), and that ÷ (revenue + live inventory value) |
| `costsComplete` | false while some feed has no price, so cost and profit are understated |

**Estimated weights.** When a sale or movement has no measured weight, the engine uses the growth curve. The curve is built from the placement weight and every weighing, interpolates linearly between points, and never extrapolates beyond the last weighing. The weight it used is stored on the event, so later figures don't change when new weighings arrive.

**Cost moved with birds.** Transfers, splits and merges move each bird's share of acquisition cost: (chick cost + cost received − cost given) ÷ birds received, times the birds moved. Feed cost stays with the flock that ate it.

## Permissions

| Action | Roles |
| --- | --- |
| Read flocks, events, metrics, daily records (`production.read`) | all roles |
| Daily records, mortality, culls, weighings (`production.record`) | owner, admin, farm manager, supervisor, worker |
| Edit any daily record, adjustments, reversals (`production.edit_any`) | owner, admin, farm manager, supervisor |
| Create, edit, delete, place, transfer, split, merge, close; houses (`flock.manage`) | owner, admin, farm manager |
| Sell (`flock.sell`) | owner, admin, farm manager |

## Not yet included

- **Withdrawal periods:** sales are not yet blocked by an active medicine withdrawal period. The health module stores the dates; the sale check is added with it.
- **Buyer:** a sale cannot name a buyer until the buyers module can confirm the buyer belongs to the farm.
- **Feed cost** comes from the price given on each feed entry. The feed stock module will cost feed automatically at moving average.
- **Egg revenue** for layer flocks, and other flock-tagged income and costs, join the calculations through the money ledger (`otherIncomeMinor`, `otherCostMinor` are already in the formula).
- **Stage boundaries** are defaults per type; per-farm editing is not built yet.

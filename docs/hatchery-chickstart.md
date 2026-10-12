# HatcheryHub and ChickStart

From hatching egg to placed chick: the hatchery workflow, chick orders and delivery, the first days in the brooder, and a farm calendar. Code: `services/api/src/services/hatchery.service.ts`, `chickstart.service.ts`, `calendar.service.ts`, `domain/hatchery.ts`.

## Hatchery workflow

```
egg source → selection → setting → incubation → candling → transfer → hatch → grading → chick lot → order → delivery
```

| Step | Endpoint (`/api/v1/farms/:farmId/…`) | What happens |
| --- | --- | --- |
| Egg source, selection, setting | `POST hatchery/batches` | Own flock (layer, breeder or custom): eggs received leave egg stock (a grade, or ungraded), and more than are in stock are refused. Purchased: supplier and cost. Rejects at selection by reason (cracked, dirty, misshapen, undersized, oversized, thin shell, other); eggs set = received − rejects. Expected transfer (3 days before hatch) and hatch dates come from the species' incubation period (chicken 21, duck and turkey 28, quail 17, guinea fowl 27), editable per batch |
| Incubation | `POST …/readings` | Setter or hatcher temperature and humidity, or a note |
| Candling | `POST …/candling` | Infertile, dead embryo, cracked. Any number of times before transfer |
| Transfer | `POST …/transfer` | Once. Cracked and dead embryos found at transfer; eggs moved = still incubating |
| Hatch | `POST …/hatch` | Hatched + dead in shell must equal the eggs in the hatcher (dead in shell defaults to the rest). A hatch can be recorded without a separate transfer (single-stage machines) |
| Grading | `POST …/grading` | Saleable + culled must equal hatched. Saleable chicks become a **chick lot**, costed at (egg cost + other cost) ÷ saleable |
| Correction | `POST …/reverse` | Undoes the latest stage. A grading can be undone only while none of its chicks are placed, sold or booked |
| Cancel | `POST …/cancel` | Before the hatch (e.g. power failure); the eggs set are written off |

Counts are derived from the batch's events, never typed in as totals. Every event is checked under a lock on the batch. Every egg set ends in exactly one bucket: infertile, cracked, dead embryo, dead in shell, culled or saleable.

### Tracked and calculated

**Tracked:** eggs set, fertile, infertile, cracked (at selection and during incubation), dead embryo, transferred, hatched, dead in shell, culled, saleable.

| Rate | Formula |
| --- | --- |
| Fertility % | fertile ÷ (eggs set − cracked). Fertile = eggs set − cracked − infertile; cracked eggs' fertility is unknown, so they are left out |
| Hatchability % | hatched ÷ fertile (hatch of fertile). **Hatch of set %** (hatched ÷ eggs set) is also given |
| Saleable chick % | saleable ÷ eggs set. **Saleable of hatched %** is also given |
| Loss % | (eggs set − saleable) ÷ eggs set |

Hatch-based rates are empty until the hatch, sale-based rates until grading. The summary (`GET hatchery/summary`) uses completed batches only, so batches still incubating do not drag the rate down (prototype bug B27).

Worked example (tests): 1,050 eggs received, 50 rejected, 1,000 set; 80 infertile, 35 dead embryos, 10 cracked; 830 hatched, 45 dead in shell; 810 saleable, 20 culled. Fertility 91.9%, hatchability 91.2%, hatch of set 83%, saleable 81%, loss 19%.

## Chick orders and delivery

- **Buyers** (`/buyers`): the farm's customer book.
- **Ordering** (`/chick-orders`): from a chick lot, or booked against a batch still incubating.
  - A lot order is checked against free chicks: remaining − chicks booked by other open orders, including bookings on the batch the lot came from.
  - The price is set by the farm, in the farm currency.
- **Statuses:** pending → confirmed → delivered, or cancelled.
- **Delivery** needs a confirmed order and draws the chicks from the lot (for a booking, the batch's lot once graded).
- **Placing on the farm:** chicks can instead be placed into one of the farm's own flocks from the lot (flock placement with `chickLotId`, or a ChickStart arrival).

Payments and revenue posting arrive with the money module.

## ChickStart

| Part | Endpoint (`/chickstart/…`) | What happens |
| --- | --- | --- |
| Brooding profile | `profiles` | The farm's own targets by day of age: temperature at chick level, humidity, target weight, with a source (e.g. its breed guide). Bands may not overlap; one default per farm. **No targets are built in** |
| Arrival plan | `arrivals` | House, expected date and count, source (own hatchery batch, chick lot, supplier), flock type, breed, profile |
| House and arrival preparation | `arrivals/:id/preparation` | Answered against a farm checklist (kind `arrival_preparation`); failed items become corrective actions |
| Arrival | `arrivals/:id/arrive` | Received, dead on arrival, sample weight, quality notes, optional checklist; **places the chicks into a new flock in the same transaction**, drawing the chick lot (for own-hatchery arrivals, the batch must be graded) |
| Brooder checks | `checks` | Temperature at chick level, humidity, behaviour (comfortable, huddling, spread out, panting, avoiding an area), feed and water available, crop fill (sampled and full), optional checklist (kind `brooder_check`). Day of age from the flock |
| Daily view | `flocks/:flockId?days=14` | Per day: birds alive, deaths, culls, feed, water, temperature and humidity (daily record), average weight against the profile target, number of checks and flagged checks, checklist failures, crop fill %. Totals for the period |

Temperature, humidity, feed, water, mortality and weight are entered through the daily record as for any flock; ChickStart reads them, it does not duplicate them.

Brooder checks are flagged against the profile band for the chicks' age: temperature or humidity outside the band, behaviour other than comfortable, no feed, no water. A flagged check raises a `brooding_conditions` alert; it is critical when feed or water was missing. Without a profile, readings are recorded but not judged.

## Calendar

`GET /calendar?from=&to=&types=` returns events built fresh from the source records:

| Type | From |
| --- | --- |
| `transfer_expected`, `hatch_expected` | incubating batches |
| `chick_delivery` | open chick orders with a delivery date |
| `chick_arrival` | planned arrivals (the title says when the house is not yet prepared) |
| `vaccination_due` | scheduled vaccinations; overdue ones appear on today |
| `cleaning_due` | cleaning schedules |
| `health_follow_up` | open follow-ups |

Each event has `overdue`. `GET /calendar/ics` returns the same events as an iCalendar file (all-day events) for phone and desktop calendars. Ranges are limited to 366 days.

The hourly job raises `hatch_due` for hatches due today or overdue; recording the hatch or cancelling resolves it.

## Permissions

| Action | Roles |
| --- | --- |
| See hatchery (`hatchery.read`) | all roles |
| Candling, transfer, hatch, grading, readings (`hatchery.record`) | owner, admin, farm manager, supervisor, worker |
| Set, undo, cancel batches (`hatchery.manage`) | owner, admin, farm manager |
| Buyers, chick orders, delivery (`market.manage`) | owner, admin, farm manager |
| Brooding profiles, arrival plans, arrivals (`flock.manage`) | owner, admin, farm manager |
| Preparation, brooder checks (`production.record`) | owner, admin, farm manager, supervisor, worker |
| Calendar (`farm.read`) | all roles |

## Transactions

The MongoDB transaction runner now joins a transaction already in progress, as the in-memory adapter always has. A ChickStart arrival therefore creates the flock, draws the lot and marks the arrival in one transaction. The tests confirm that a refused placement leaves the arrival planned and the lot untouched. Verified on the in-memory adapter; MongoDB transactions are exercised in CI on MongoDB 7 (FerretDB, used locally, has none).

## Not yet included

- Payments and revenue for chick orders (money module).
- Delivery notes and vehicle details on delivery (a vehicle movement can be logged in BioSecure).
- An iCalendar subscription URL (the `.ics` endpoint needs a signed-in request, so it is downloaded rather than subscribed to).
- Hatchery-specific checklists (e.g. setter hygiene) can be made with kind `general` today.

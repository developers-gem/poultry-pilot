# FlockHealth and BioSecure Farm

Farm health records, vaccination, withdrawal periods and biosecurity. Code: `services/api/src/services/health.service.ts`, `biosecurity.service.ts`, `content.service.ts`, `domain/health.ts`.

## Principles

- **Records and reminders, not diagnosis or prescriptions.**
  - PoultryPilot stores what people observed and what a named veterinarian, laboratory or staff member assessed, attributed to them.
  - It computes dates (treatment end, withdrawal end, vaccination due, follow-ups) and raises reminders.
  - It never suggests a diagnosis, a medicine or a dose.
- **No country's veterinary rules are built in.**
  - Withdrawal periods come from the product label or the farm's veterinarian, recorded per medicine and overridable per treatment, with their source.
  - Vaccination programmes are the farm's own.
  - Visitor downtime is a farm setting.
  - Checklists are farm-editable; the starter templates are generic.
  - Where a legal duty may exist (reporting dead wild birds, notifiable disease, disposal of dead birds), messages say "follow your local requirements".
- **Educational content cites its sources.** Published health and biosecurity articles must carry at least one source. The model, the repository and the seed loader all enforce this.

## FlockHealth

### Health records

`type`: `observation`, `vet_visit`, `treatment`, `lab_test`, `post_mortem`.

| Field | Notes |
| --- | --- |
| `symptoms` | Free-text tags chosen by the farm (lowercased), e.g. "coughing", "watery droppings" |
| `observedSigns`, `affectedBirds`, `deadBirds` | What was seen |
| `vetName` | For visits |
| `assessment` | `{ text, by, source }`: the diagnosis or assessment as entered by the person named, with source `veterinarian`, `laboratory` or `farm_staff` |
| `lab` | Laboratory name, reference, result |
| `treatments[]` | Up to 5 per record (below) |
| `cost` | Fees entered by hand; medicine used from stock is costed automatically |
| `followUpDate` | Reminder and alert when due; `POST …/follow-up-done` closes it |
| `attachments[]` | Photos or PDF documents uploaded to `/media`, belonging to the farm |

Workers and supervisors can record observations. Visits, treatments, lab tests and post-mortems need `health.manage` (owner, admin, farm manager, vet).

### Treatments and withdrawal periods

Each treatment records:
- the medicine (from the catalog, or by name)
- dose (as instructed), route, frequency, start date and duration
- who prescribed it, and a prescription reference
- optionally, the inventory item and quantity drawn from stock

| Derived | Rule |
| --- | --- |
| `endDate` | start + duration − 1 |
| `withdrawalMeatUntil`, `withdrawalEggsUntil` | end date + withdrawal days (none when 0 or not recorded) |
| `stockCostMinor` | lots used, FEFO; expired stock refused |

Withdrawal days come from the treatment if given (e.g. a vet's instruction, with `withdrawalSource: "veterinarian"`), otherwise from the medicine's catalog entry. If neither records one, there is no withdrawal; PoultryPilot never invents a default.

While a meat withdrawal is in force (through its last day):
- bird sales are refused with `WITHDRAWAL_ACTIVE`, giving the date sales may resume
- transfers, splits and merges into other flocks are refused, so treated birds cannot be mixed into an untreated flock

Eggs collected during an egg withdrawal are marked `withheldUntil` on the egg record. They are re-marked whenever treatments change. A `withdrawal_active` alert stays open until both periods end.

Editing a record re-draws medicine only if its treatments changed. Deleting a record returns the medicine to stock and lifts its withdrawal periods. Vet fees and medicine used count in the flock's costs and profit.

### Vaccination

- **Programmes.** The farm's own (`/health/programmes`), by day of age, with a source (e.g. "Dr. Rao, 2026"). Applying one to a flock schedules each item from the hatch date, or from placement minus age on arrival. Days already past are skipped unless `includePast`, and re-applying never duplicates.
- **States.** `scheduled`, `due` (within 3 days), `overdue` (past due, derived), `done`, `skipped` (with a reason), `cancelled`.
- **Administering.** From stock, the doses leave the vaccine's lots FEFO, and every batch number and expiry is recorded with the cost. Expired batches are refused. Without stock, batches are entered by hand and must not be expired. Birds vaccinated cannot exceed the flock on that day. Supervisors, managers and vets can record vaccinations.

### Reminders and alerts

`GET /health/reminders?days=14` lists vaccinations due or overdue, follow-ups, and withdrawal periods ending, in date order.

The hourly job raises:
- `vaccination_due` for overdue vaccinations
- `health_follow_up` for follow-ups due

It also resolves `withdrawal_active` once periods end. Giving or skipping a vaccination, or completing a follow-up, resolves its alert.

## BioSecure Farm

### Configurable checklists

Each farm keeps its own checklists (`/biosecurity/checklists`), of kind:
- `visitor_declaration`, `ppe`, `footbath`, `cleaning`, `disinfection`, `vehicle`, `pest_control`, `audit` or `general`

Each item has a response type (yes/no, text, number, choice), whether it is required, and `failIf`, the answer that counts as a failure. Each item can also create a corrective action when it fails.

- Editing bumps the version. Answers keep the version and wording they were given with.
- Missing required answers are refused (`CHECKLIST_INCOMPLETE`).
- Failed items create corrective actions and a `checklist_failed` alert.
- `POST /biosecurity/checklists/starter` adds four generic, editable templates: visitor declaration, footbath check, house cleaning between flocks and a monthly audit.

### Visitors

Check-in records:
- name, company, type, purpose, vehicle and houses visited
- **previous poultry contact** (asked of everyone, with the time of the last contact)
- the **declaration** (name, optional signature image, answers to the farm's declaration checklist)
- PPE used, footbath used, disinfected

The API calculates the hours since last poultry contact. If the farm has set `visitorDowntimeHours`, a shorter downtime flags the visit and raises a `biosecurity_breach` alert. A failed declaration flags it too. Entry decisions stay with the farm. Visitors are checked out later; the register supports trace-back by date.

### Logs

`POST /biosecurity/logs` with one `type`, each with its own section:

| Type | Section |
| --- | --- |
| `cleaning`, `disinfection` | product (stock item, quantity, concentration) |
| `footbath` | changed, checked or topped up; disinfectant; concentration |
| `vehicle` | registration, driver, company, purpose, disinfected, entry and exit, last poultry contact |
| `pest_control` | rodents, insects, wild birds or other; method; stations checked; activity found |
| `wild_bird_observation` | description, count, location, contact with poultry, contact with feed or water, dead wild birds found |
| `audit` | checklist |

Any type can carry checklist answers and attachments. Products named from inventory are drawn from stock and costed.

Automatic follow-ups:
- pest activity creates a corrective action
- a vehicle entering without disinfection creates a corrective action
- wild birds touching poultry, feed or water raise a `wild_bird_contact` alert. It is critical when dead wild birds are found, and points to local reporting requirements.

### Equipment movement

Equipment is registered with its house. Each move between houses or off the farm is recorded with whether it was disinfected. A move without disinfection creates a corrective action.

### Cleaning schedules

Daily, weekly, monthly, between flocks or one-off, for cleaning or disinfection, optionally with a checklist. Completing one:
- requires the checklist answers
- writes the log
- moves the next due date (daily +1 day, weekly +7, monthly +1 month; between flocks and one-off are set by hand)

### Corrective actions

Raised by failed checklist items, pest activity, unsafe vehicle entry and undisinfected equipment moves, or by hand (the assignee must be a farm member).

- Staff complete an action with resolution notes.
- A supervisor or above verifies it. The person who completed an action cannot verify it.
- Completing an action from a checklist resolves that checklist's alert.

### Summary

`GET /biosecurity/summary`:
- visitors today and on site
- flagged visitors (7 days)
- open and overdue actions
- cleaning due and overdue
- failed checks and wild bird contacts (7 days)
- last footbath check

## Educational content

`GET /content/articles` returns published articles for `GLOBAL` and the farm's country. Each has `sources` (name and URL) and ends with "This is general information, not veterinary advice." Three seed articles load at startup (idempotent):

| Article | Sources |
| --- | --- |
| Biosecurity basics for poultry farms | FAO Animal Production and Health Paper 165 (2008); WOAH avian influenza page |
| What a withdrawal period is, and why records matter | Codex Alimentarius veterinary drug MRL database; WOAH antimicrobial resistance page |
| Changes worth calling your veterinarian about | WOAH Newcastle disease and avian influenza pages |

**Before launch:** a veterinarian must review the seed articles, and the source links must be checked. They were written from memory of these organisations' public pages and have not been opened from this environment.

## Permissions

| Action | Roles |
| --- | --- |
| Read health records, reminders, withdrawals (`health.read`) | all roles |
| Record observations, complete follow-ups (`health.record_observation`) | owner, admin, farm manager, supervisor, worker, vet |
| Visits, treatments, lab tests, medicines, programmes, scheduling, skipping (`health.manage`) | owner, admin, farm manager, vet |
| Record a vaccination as given (`health.vaccinate`) | owner, admin, farm manager, supervisor, vet |
| Read biosecurity (`biosecurity.read`) | all roles |
| Visitors, logs, equipment moves, complete actions (`biosecurity.record`) | owner, admin, farm manager, supervisor, worker |
| Checklists, schedules, equipment register, verify actions (`biosecurity.manage`) | owner, admin, farm manager, supervisor |

## Not yet included

- Alerts are not yet pushed to phones.
- Egg sales checks for withheld eggs arrive with the market module. Eggs are flagged now.
- Per-farm symptom vocabularies (tags are free text for now).
- Signature capture is an uploaded image; there is no drawn-signature widget in the apps yet.

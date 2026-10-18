# Persona review: a working day for each kind of user

October 2026. Each persona's day was walked through the real API (tests in `services/api/src/test/persona-days.test.ts`) and the web and mobile screens, judged the way a farm consultant would. Every number quoted was produced by the system.

## Findings and what was done

| Persona | Problem | Kind | Status |
| --- | --- | --- | --- |
| Small broiler farmer | Had to invent a batch code for every flock | Unnecessary typing | **Fixed**: the farm numbers batches (B-2610-1) |
| Small broiler farmer | Dashboard "Batch profit −₹67,200" for a batch not yet sold | Misleading calculation | **Fixed**: "Profit on sold batches", plus "spent so far" on active ones |
| Small broiler farmer | Feed typed in kg and priced per kg, though it is bought and counted in bags | Information a farmer does not have | **Fixed**: bags and price per bag (web purchase and use, mobile entry); a new feed remembers its bag size |
| Commercial broiler manager | FCR 0.71 and EPEF 737 when feed was recorded on 10 of 24 days (real: about 1.5 and 300–400) | Misleading calculation | **Fixed**: FCR carries a warning (feed gaps, or implausibly low); implausible FCR is kept out of benchmarks and EPEF is withheld; bulk recording is not penalised |
| Commercial broiler manager | FCR mixed today's feed with an older weight | Misleading calculation | **Fixed**: FCR at the last weigh-in, with its date |
| Commercial broiler manager, supervisor | Copying the day's house sheets: three web pages per flock | Too many screens; slower than paper | **Fixed**: the Daily sheet (`/daily`): all flocks, one save |
| Layer manager | Weight-based FCR 0.06 and EPEF 2,381 shown for layers | Misleading calculation | **Fixed**: none for layers; feed per dozen eggs and eggs per hen housed instead |
| Layer manager, worker | Eggs entered as one total; the afternoon collection replaced the morning count | Duplicate entry; unnecessary typing | **Fixed**: trays of 30 plus loose eggs, and "add a collection" (web and mobile) |
| Layer manager | Hen age ignored the age at placement (point-of-lay pullets) | Misleading calculation | **Fixed** |
| Supervisor | Could not see who recorded each flock's day | Missing field | **Fixed**: on the entry sheet and the Daily sheet |
| Accountant | Typing a feed bill the stock purchase had already created doubled the cost in P&L | Duplicate entry | **Fixed**: asked first when a same-amount bill was created automatically, or a hand-entered one matches exactly; normal equal bills (weekly wages) are not interrupted |
| Buyer | Retyped their name on every order; sellers had to know ISO region codes | Unnecessary typing | **Fixed**: both default (name from the account, region from the farm) |

No new security problems were found in the persona days: workers do not see money, buyers do not see the seller's farm records, and every farm id is checked against membership (see `docs/security.md`).

## Open

| Persona | Problem | Kind |
| --- | --- | --- |
| Worker, small farmer | No local languages (Hindi and others): the biggest remaining barrier for farm staff | Slower than paper |
| Worker | Not pointed to their own house or flock by default | Too many screens |
| Small farmer | A flock needs a house created first | Too many screens |
| Hatchery operator | A setting can come from only one source flock (mixed-flock settings are common) | Missing field |
| Office staff | The web app does not save without internet (the mobile app does) | Fails without internet |
| Manager | The mobile app cannot record feed purchases offline | Fails without internet |
| Accountant | A price per bag is stored as a price per kg, which can differ from the invoice by a paisa | Calculation detail |
| Engineering | Several web API response types are written by hand; a mismatch shows only at runtime (it caused a dashboard crash, caught by the browser checks) | Generate types from the OpenAPI contract |

## Checks run

- **Tests:** API and web: all pass, including the persona tests and the Daily sheet row tests.
- **Web in a browser:** 24 routes at 3 sizes (72 checks), no problems; accessibility (axe, WCAG 2.1 AA, 24 routes × 2 sizes): 0 violations.
- **Mobile:** the counting rules (trays, collections, bags) have Dart unit tests; the app is compiled and tested in CI, not here.

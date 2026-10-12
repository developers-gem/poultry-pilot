# Knowledge and reporting platform

Educational content (courses, lessons, facts, news, glossary, disease information, management guides) and farm reports in PDF, CSV and Excel. Code: `services/content.service.ts`, `services/report.service.ts`, `domain/report.ts`, `adapters/report-renderers.ts`, `adapters/news-feed.ts`, web `pages/News.tsx`.

## Content

| Content | Stored as | Notes |
| --- | --- | --- |
| Training courses and lessons | `training_courses` (lessons embedded, ordered) | Personal progress in `training_progress`; a published course needs at least one lesson, every lesson needs content |
| Facts | `articles`, kind `fact` | "Fact of the day" is the same for every reader on a date |
| News | `articles`, kind `news` | Always has a publication date; newest first |
| Glossary | `glossary_terms` | Searchable by term |
| Disease information | `articles`, kind `disease` | Structured: species, signs, transmission, prevention, reporting note. Never dosing or treatment instructions; shown with a "not veterinary advice" disclaimer |
| Poultry management guides | `articles`, kind `guide` | |

Content is global, filtered by region: a reader in `IN-UP` sees `GLOBAL`, `IN` and `IN-UP` items. A reader who gives no region sees only global items.

### Externally sourced articles

Every article has: **title, summary, content, source, sourceUrl, publicationDate, region, category, author, status** (and `origin`: original or external).

| Rule | Enforced |
| --- | --- |
| External articles cannot be submitted or published without source, source URL (http/https only), publication date and summary | Request schema, service (all storage), MongoDB schema |
| `content` for an external item is PoultryPilot's own summary or commentary, never a copy of the source; readers see "Summary by PoultryPilot. Read the original at …" | Service; imports store no full text |
| Health, biosecurity and disease content written by PoultryPilot must cite references | Service and MongoDB schema |

### Editorial workflow

```
draft → in review → published → archived
          └─ rejected (back to draft, tagged needs-changes)
```

| Role | Can |
| --- | --- |
| `content_editor` | Create and edit drafts, submit for review, import feeds, draft glossary terms and courses |
| `content_publisher` | Everything an editor can, plus publish, reject, archive, edit published content, and publish glossary terms and courses |

Health, biosecurity and disease articles must be published by someone other than the person who submitted them. Edits to published content are re-checked against the publishing rules and use version numbers (stale edits get `409`).

Platform roles are PoultryPilot staff roles stored on the user (`platformRoles`), separate from farm roles. Farms cannot grant them; an operator sets them in the database.

### News without hard-coding

- **Import:** `POST /api/v1/admin/content/import` (editors) takes items from a partner or pipeline. The server also imports configured RSS/Atom feeds every 6 hours (`NEWS_FEEDS`, a JSON list of `{url, source, regionCode, category}`).
- **What is kept:** one article per source URL. Titles and teasers have their HTML stripped; teasers are cut to 600 characters, and no full text is stored.
- **Review first:** every imported item waits in review; nothing reaches readers until a publisher publishes it.
- **Untested here:** the feed fetcher was not exercised against live feeds from the sandbox. The parser is unit-tested.

The web app's news page (`/news`) renders only what `GET /api/v1/content/news` returns; there is no news in any component. The access token is held in memory (`api/session.ts`), to be set by the sign-in screen, which is not built yet. Until then the page shows "Sign in to read news".

### Reader endpoints (any signed-in user)

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/content/news?region&category&limit` | Published news, newest publication first |
| `GET /api/v1/content/articles?kind&category&region&q` | Published facts, guides, news, disease information |
| `GET /api/v1/content/articles/:slug` | Full article, references, disclaimer or attribution |
| `GET /api/v1/content/facts/today?region` | Fact of the day |
| `GET /api/v1/content/glossary?q&category&region` | Terms |
| `GET /api/v1/content/courses`, `/courses/:slug` | Courses, lessons, your progress |
| `POST /api/v1/content/courses/:slug/lessons/:lessonId/complete` | Records your progress |

The farm-scoped `/farms/:farmId/content/articles` remains (region = the farm's country).

## Reports

`GET /api/v1/farms/:farmId/reports` lists the reports and which this person may export. `GET /api/v1/farms/:farmId/reports/:type?format=pdf|csv|xlsx|json&from&to[&flockId]` generates one from live data. The period defaults to the last 30 days, with at most 366.

| Report | Permission | Contents |
| --- | --- | --- |
| Farm | `farm.read` | Farm summary; flocks to date and production by day (with production access); alerts in the period; money totals (with finance access) |
| Flock (`flockId`) | `production.read` | Performance summary; every day of the period (alive, deaths, culls, feed, water, eggs, weight); events with reversals marked; costs and revenue (with finance access) |
| Egg | `production.read` | By day and flock: collected, grades, broken, hen-day %, withheld; totals and breakage; stock movements; stock by grade |
| Feed | `production.read` | By flock: eaten, wasted, waste %, per bird, FCR. With stock access: purchases (prices only with finance access) and stock with days left |
| Health | `health.read` | Health records; treatments with withdrawal dates and their source; vaccinations due; deaths by cause |
| Hatchery | `hatchery.read` | Completed-batch rates; every batch with all counts and rates (formulas noted) |
| Biosecurity | `biosecurity.read` | Visitors with poultry contact and flags; logs by type; failed checklist items; corrective actions |
| Financial | `money.read` | P&L (accrual, excluding tax) by category and month; cash flow by account; receivables and payables by age; spending by supplier |
| Marketplace | `market.read` | Orders in the period with status and payment; listings; sales and payments received |

### Permissions

**Reports:** each report needs its permission (`403` otherwise), checked at the route and again in the service. Within a report, sections that need more (money, stock) are left out for people without that access, and the report's notes say what was left out. Other farms get `404`.

**Audit:** every export is recorded with type, format and period.

### Formats

All three are rendered from one format-neutral document, so they always contain the same data.

| Format | Details |
| --- | --- |
| PDF | A4, report header, summaries, tables that repeat their header on each page, notes, "page n of m". DejaVu Sans is bundled (`assets/fonts`, with its licence) for wide Latin, Greek and Cyrillic coverage and the ₹ sign; scripts needing complex shaping (e.g. Devanagari) are not rendered correctly yet. Amounts are written as "INR 1,234.50" |
| CSV | UTF-8 with byte-order mark (opens correctly in Excel). Report header, then each section as a block. Money is a plain number in the farm currency (column header says which) |
| Excel | A Summary sheet (report details and summaries), then one sheet per table with bold frozen headers, money as numbers with `#,##0.00` format, totals rows |
| JSON | The document itself, for previews in the apps |

**Spreadsheet formula injection** is neutralised in CSV and Excel: any text cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with an apostrophe, so a hostile name such as `=HYPERLINK(…)` is shown as text. Numbers are untouched.

## Not yet included

- **Sign-in screens:** the web app has none yet. The news page is ready for a token.
- **Rich content:** no images or attachments in articles and lessons, and no rich-text editor. Content is plain text with paragraphs.
- **Translations:** content has a `locale` field, but there is no translation workflow yet.
- **Scheduled reports:** reports are not emailed on a schedule. The notification infrastructure could carry them.
- **Complex scripts:** they are not rendered correctly in PDFs. CSV and Excel handle any text.

# PoultryPilot intelligence layer

Configurable alert rules judged against each farm's own history, weather through the backend, notifications, and the dashboard and analytics endpoints. Code: `domain/intelligence.ts`, `services/rules.service.ts`, `intelligence.service.ts`, `weather.service.ts`, `notification.service.ts`, `dashboard.service.ts`.

## No universal thresholds

Every production rule compares a flock with **its own** recent days, or the farm with **its own** past flocks. Defaults are relative deviations: "50% above this flock's average", not "more than 50 deaths". The same 10 deaths raise an alert on a farm that usually loses 2 a day and not on one that loses 12, and the tests check exactly that.

Absolute limits apply only when the farm sets them. This covers:
- daily mortality %, minimum hen-day %
- water pH and dissolved solids
- target FCR, fixed heat, cold, rain and wind limits

They have no default. The water pH and TDS defaults that FeedWise previously assumed (6–8, 1000 ppm) have been removed.

Small numbers do not alarm: a rule can require a minimum absolute change as well as a percentage (2 deaths against an average of 1 is +100%, but only one bird). Nothing is judged until a flock has enough history (`minBaselineDays`, default 3).

## Rules

`GET /api/v1/farms/:farmId/alert-rules` lists all 14 with the farm's values, parameter ranges and whether each was set by the farm.

`PUT …/alert-rules/:ruleKey` sets enabled, parameters, severity, channels, notified roles, cooldown, and scope (flocks, houses). `DELETE` returns the rule to defaults. Changing rules needs `alert.manage` (owner, admin, farm manager, supervisor).

| Rule | Baseline | Defaults | Optional (off until set) |
| --- | --- | --- | --- |
| Mortality | flock's last 7 days | 50% above average and at least 3 more birds | daily mortality % limit |
| Egg production | flock's last 7 days | hen-day % 10% below average | minimum hen-day % |
| Feed consumption | flock's last 7 days | feed per bird 20% from average, either way | — |
| Water consumption | flock's last 7 days | water 20% from average (checked when the daily record is saved) | pH min and max, dissolved solids max |
| Weight variance | farm's target for the age (brooding profile), else the flock's own daily gain | 10% below target; recent gain 25% below the flock's own | — |
| FCR variance | farm's past flocks of the same type (at least 2) | 10% above them | target FCR (used instead) |
| Low stock | each item's reorder level and days | — | — |
| Expiry | each item's warning window | — | — |
| Vaccination due | farm's programmes | 1 day before, and overdue | — |
| Vet appointment | booked appointments, health follow-ups | 1 day before, and overdue | — |
| Hatch date | batches' expected hatch | 1 day before, due, overdue | — |
| Order delivery | open orders' delivery dates | 1 day before, and overdue | — |
| Payment overdue | documents with a due date | on the day after the due date; payables included | grace days |
| Weather risk | farm's own last 30 days of weather (at least 7) | forecast high 4 °C above the recent average high; low 4 °C below the recent average low | fixed heat, cold, rain, wind limits |

All windows, percentages and day counts are farm parameters. The catalog is `RULE_DEFINITIONS` in `domain/intelligence.ts`.

### How rules apply

**Every alert in PoultryPilot passes through the rule that governs it**, whichever module raises it: stock, health, hatchery, daily records, the rule engine. So:
- a rule switched off raises nothing, and resolves what it had raised
- the farm's severity overrides the default
- alerts for flocks or houses outside the rule's scope are skipped

**Evaluation** happens:
- **hourly** for every farm
- **on demand** (`POST /alerts/evaluate`, which returns a per-rule summary)
- **at entry** for water quality and intake, and for stock in every transaction

One failing rule does not stop the others.

**Lifecycles differ:**
- Production alerts (mortality, eggs, feed, water, weight) are per day and stay until handled.
- Condition and schedule alerts resolve themselves when the condition clears: FCR back in range, a vaccination given, an appointment completed, an order delivered, a document paid, a forecast no longer risky.

**Limitation:** a growing flock's FCR is compared with past flocks' final FCR, which errs on the side of fewer alerts while the flock is young.

## Weather

`GET /api/v1/farms/:farmId/weather` returns current conditions, a 7-day forecast, history, the farm's weather baseline and risks. Clients never call a weather service.

| Aspect | Behaviour |
| --- | --- |
| Provider | `WeatherProvider` port; production uses Open-Meteo (free, no key). Swap by passing another adapter in `server.ts`. Not exercised from the development sandbox (no outbound access); tests use a fake |
| Cache | `weather_cache`, per provider and location (rounded to 0.05°, about 5 km, so nearby farms share it), for 1 hour |
| Stored | Temperature (current; daily high and low), humidity (current; daily high and low), rain, wind, forecast |
| History | `weather_observations`: one row per location and day, from the provider's past days, upserted on each fetch |
| Failure | The last cached forecast is returned with `stale: true`; with nothing cached, `503 WEATHER_UNAVAILABLE` |
| Location | Farm `location` (latitude and longitude) is required; the dashboard says so instead of failing |
| Refresh | The hourly job refreshes each distinct location once, before the checks and outside any database transaction |

## Notifications

| Channel | Behaviour |
| --- | --- |
| In-app | Stored at once, always (the alert list stays complete); `GET /me/notifications` with an unread count, `POST /me/notifications/read`, `/read-all` |
| Push | Queued; sent to the person's registered devices (`POST /me/push-devices`). Tokens the provider rejects are disabled |
| Email | Queued; sent to the person's account email |

**Providers:**
- **Interface:** `NotificationProvider` (one per channel), behind a port so they can be replaced.
- **Email:** the existing `EmailSender`, logging in development and an email service in production.
- **Push:** a logging provider in development. An FCM or APNs adapter plugs in behind the same interface.

**Delivery worker:** runs every 30 seconds. Failures retry after 1 minute, 5 minutes, 30 minutes and 2 hours, then the notification is marked failed. Missing addresses or devices fail at once, without retrying.

**Who is told:**
- **Recipients:** the rule's roles among active farm members. Payment alerts go only to people who may see money.
- **Personal preferences:** push and email on or off, the lowest severity for each, and muted rules (`GET/PUT /me/notification-preferences`).
- **Cooldown:** a reopened alert is not re-sent on a channel within the rule's cooldown (default 24 hours). An escalation to a higher severity always is.

## Endpoints

| Endpoint | Contents |
| --- | --- |
| `GET /api/v1/farms/:farmId/dashboard` | One call for the home screen: alerts (counts by severity, the five most important), production today, weather, the next 7 days of events, stock, hatchery, money. Sections follow the person's permissions (workers see no money). A section that fails reports `{ unavailable }` without breaking the rest |
| `GET /api/v1/farms/:farmId/analytics?from&to[&flockId&type]` | Daily series (mortality %, hen-day %, feed g/bird, water ml/bird) for the chosen flocks, each day with a baseline band (mean ± 1 standard deviation of the preceding window) and an anomaly flag using the farm's rule parameters; each flock against the farm's past flocks of the same type (mortality, FCR); alert counts. Up to 366 days |
| `GET /api/v1/farms/:farmId/alerts` | Filters: status, type, rule, severity, flock. Returns items plus counts (open, acknowledged, by severity) |

Vet appointments: `GET/POST /farms/:farmId/health/appointments`, `POST …/:id/complete`.

## Not yet included

- **Production push:** an FCM/APNs provider, and production email transport. The interfaces are in place.
- **Quiet hours and digests:** neither exists yet. Each alert is notified on its own.
- **SMS and WhatsApp:** listed as channels in the model but without providers.
- **Hourly forecasts:** only daily values are kept, not hourly ones (e.g. for heat stress by time of day).
- **Rule history:** changes to rule settings are in the audit log, not versioned on the rule.

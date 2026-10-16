# PoultryPilot mobile (Flutter)

Android and iOS app on the same `/api/v1` REST API as the web app. There is no mobile backend.

## Architecture

```
lib/
  core/          config, Dio client + auth interceptor, AppException, secure token store,
                 Drift database, GoRouter, theme, shared widgets, formatters, connectivity, providers
  domain/        entities (Freezed) and repository interfaces — no Flutter, no HTTP
  data/          JSON models (Freezed + json_serializable), remote data source (Dio),
                 local cache (Drift), repository implementations
  presentation/  one folder per screen: view model (Riverpod Notifier / AsyncNotifier) + screen (MVVM)
```

| Concern | Choice |
| --- | --- |
| State, DI | Riverpod (providers in `core/providers.dart`; tests override them) |
| Navigation | GoRouter; one pure `sessionRedirect` decides where the app may be (unit-tested) |
| HTTP | Dio. `AuthInterceptor` adds the bearer token, refreshes once on 401 (concurrent failures share one refresh, because the API revokes a session whose refresh token is replayed) and retries |
| Session | Refresh token in the platform's secure storage (Keystore, Keychain); access token in memory; a random per-install device id names the session in Profile, Devices |
| Offline | Dashboard and account responses cached in Drift (SQLite). Offline, screens show the cached copy, marked with when it was saved, and an offline banner |
| Models | Freezed entities in `domain`; Freezed + json_serializable models in `data`, field-for-field with the API |

## Screens

Seven primary tabs, in this order: **Home, Daily Entry, Flocks, Production, Health, Tasks, More**. Each tab is at least 48 dp wide on a 360 dp phone; only the selected one shows its label.

| Screen | What it does | API |
| --- | --- | --- |
| Splash, onboarding, sign-in, sign-up, forgot password, farm selection | as before | `/auth/*`, `/me`, `/farms` |
| Home | birds, deaths, feed, water, eggs, average weight, alerts, tasks; today's status per flock; one big "Record today" button | `GET /farms/:id/dashboard` |
| Daily Entry | one flock, one day, eight sections (below) | `GET /daily-records/sheet`, `GET/PATCH /flocks/:id/daily-records/:date`, `POST /media`, `GET /feed/stock` |
| Flocks | active flocks; detail with survival, weight and daily gain, feed, FCR, eggs, weigh-ins | `GET /flocks`, `/flocks/:id`, `/flocks/:id/weighings` |
| Production | eggs, feed, water and deaths over 7, 14 or 30 days, whole farm or one flock | `GET /dashboard/trends` |
| Health | report a problem with symptom chips; vaccinations due, marked as given in two taps; recent records | `/health/records`, `/health/vaccinations` |
| Tasks | today: entries to do, my tasks (tap to finish), scheduled work; all open tasks; new task for managers | `GET /tasks/today`, `/tasks`, `POST /tasks/:id/complete` |
| More | profile, settings, switch farm, entries waiting to send, sign out | `/me`, `/me/sessions`, `/me/notification-preferences` |

### Daily Entry: built for one hand

- **Thumb dock:** the date (Yesterday, Today, or a calendar limited to the dates the person's role may edit), the flock (◀ ▶, or a list showing which flocks are done) and Save sit at the bottom.
- **Sections:** feed, water, deaths, eggs (laying flocks), weight, temperature, humidity and health observation. Each tile shows today's value, with yesterday's as a hint.
- **Little typing:** each section opens a sheet with large controls:
  - a built-in keypad (no system keyboard)
  - "same as yesterday" chips
  - counters per death cause
  - ±0.5° temperature steppers and a humidity slider
  - symptom chips; the optional note is the only text field
- **Large targets:** keypad keys are 64 dp tall and buttons at least 56 dp, with a haptic tick on each tap.
- **Photos:** camera or gallery, resized to about 1600 px at JPEG 80% on the phone. Up to 10 per day.
- **Only what changed is sent.** One `PATCH` carries the touched sections, so saving the eggs never changes feed someone else entered. Feed entered elsewhere (FeedWise) is shown, not overwritten.
- **Save & next** moves to the next flock still to record.
- **Conflicts while online:** if someone else saved the day meanwhile, it reloads and puts the farmer's changes back on top to check and save again.

### Offline-first

Everything below works without internet:
- **Viewing:** recent farm data, flocks and houses.
- **Recording:** daily records (deaths, feed, water, eggs, weight, temperature, humidity, health observations, photos).
- **Actions:** finishing tasks, reporting health events and marking vaccinations as given.

**Reading.** After every sync, and when the app opens online, the phone refreshes its copy of the farm's recent data in Drift:
- the dashboard and today's and yesterday's entry sheets
- each flock's day, the flocks and houses
- tasks, health records and vaccinations
- feed stock and 14 days of trends

Screens show that copy when offline, with the farmer's own unsent changes applied on top. A day never loaded can still be recorded; it starts empty.

**Writing.** Every change goes into the sync queue on the phone first, always, whether or not there is a connection:

| Status | Meaning |
| --- | --- |
| pending | saved on the phone, not yet sent |
| syncing | being sent now |
| synced | on the server (kept 7 days for the record, then removed) |
| failed | the server refused it (the reason is shown); kept until the farmer retries or removes it |
| conflict | changed elsewhere in the same section; kept until the farmer decides |

**When the connection returns** (also on app resume, after every save, and every minute while anything waits):
1. **Authenticate:** refresh the session. If the session was refused, sync stops with everything kept: "sign in again to send".
2. **Push** pending changes in order, in batches per farm. A change waits while an earlier change to the same thing is unsent. Photos upload first, each recorded once it lands.
3. **Receive results:** accepted becomes synced; rejected becomes failed.
4. **Resolve conflicts:** a day change whose touched sections are unchanged on the server (someone changed other sections) is resent on the server's version automatically. Otherwise it waits for the farmer: "Keep mine" or "Use the server's".
5. **Update the local database** from the server.

**Interruptions never lose or double data.**
- Each change has a mutation id made on the phone, and the server stores each result in the same transaction as the change. A resent change returns its stored result instead of being applied again.
- A batch with no answer goes back to pending.
- Changes left "syncing" by an app closed mid-request are recovered at the next start.
- A photo already uploaded is not uploaded again.
- Nothing in the queue is deleted except after syncing, or when the farmer explicitly removes a change.

**Status, always visible** at the top of every signed-in screen: **Offline**, **Syncing**, **Synced** (with the time), **Sync failed** (including conflicts and an expired session). Tap it for the Sync screen: every change and what can be done about it.

**Accounts.** Each change is tagged with the person who made it and sent only as them. Signing out does not delete unsent changes; they are sent when that person signs in again. Another person on the same phone sees them listed, never sent as themselves. Changes from the previous app version's outbox are moved into the queue on upgrade.

### Notifications

**Types.** Twelve, each with its own push and email switch (Settings → Notifications):

| Type | Comes from |
| --- | --- |
| Vaccinations and vet visits, stock, deaths, feed, water, egg production, bird weight, hatchery, weather | the farm's alert rules |
| Tasks | tasks due today and overdue tasks, told once each, to the assignee or to everyone who can do tasks |
| Orders | new orders, and every status change, told to the other side, never to the person who made the change |
| Payments | payments and refunds on orders, and overdue payments |

**Settings.** Besides the twelve switches, alerts have a minimum severity for push and for email. Quiet hours make push wait until morning, while critical alerts still come through. Every notification is always kept in the in-app inbox (More → Notifications).

**No duplicates.**
- **Server:** every notification has a key made of the event, the person and the channel, which is unique in the database. Re-running the hourly job, retrying a request or two servers at once cannot notify anyone twice.
- **Push retries:** a retry goes only to devices that did not get the push.
- **Phone:** every push carries its notification id as the Android tag and collapse key and the iOS collapse id, so a repeat replaces instead of adding. The app also remembers the last 200 ids it showed.
- **Accounts:** a phone registered by a new person stops receiving the previous person's notifications.

**On the phone.**
- In the background or closed, the system shows the notification. Tapping it opens the right screen: tasks, health, production or the inbox.
- While the app is open, a banner appears with an "Open" button.
- The phone's token is registered once per person and token, registered again when it changes, and removed on sign-out.

**Firebase setup** (push is off until this is done; the app works without it):
```bash
dart pub global activate flutterfire_cli
flutterfire configure        # adds google-services.json / GoogleService-Info.plist and the Gradle plugin
```
- **iOS:** add the Push Notifications capability and Background Modes → Remote notifications in Xcode, then upload an APNs key in the Firebase console.
- **Server:** set `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL` and `FCM_PRIVATE_KEY` from a service account with the Firebase Cloud Messaging API Admin role. Without them, the API only logs pushes.

## The contract with the API

The models are tested against **responses captured from the real API** (`test/fixtures/*.json`):
- `services/api/scripts/mobile-fixtures.ts` captures them
- `services/api/src/test/mobile-contract.test.ts` (in the API's test suite) fails if the API's responses change shape

After an intended API change, regenerate the fixtures (`npx tsx services/api/scripts/mobile-fixtures.ts` from the repository root) and update the Dart models.

## Setup

Requires Flutter 3.27 or newer.

```bash
cd apps/mobile
./tool/setup.sh        # platform folders, INTERNET permission, iOS camera/photo text, packages, generated code
flutter run --dart-define-from-file=config/dev.json
```

`config/dev.json` holds `API_BASE_URL`:

| Where | Value |
| --- | --- |
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` |
| Phone on the same Wi-Fi | your computer's LAN address |
| Production | the HTTPS API URL |

Debug Android builds may use plain HTTP (see `android/app/src/debug`); release builds require HTTPS.

Generated files (`*.g.dart`, `*.freezed.dart`) are not committed. After changing a model, run `dart run build_runner build --delete-conflicting-outputs`.

## Checks

```bash
flutter analyze
flutter test
```

CI (`.github/workflows/ci.yml`, job `mobile`) runs code generation, `flutter analyze`, `flutter test` and a debug APK build.

## Not yet included

- **Google sign-in:** needs `google_sign_in` and a client ID; the API's `POST /auth/google` is ready.
- **Editing past weigh-ins and tasks' details** is on the web app; the phone records and completes.

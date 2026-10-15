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

### Offline

- Entries saved without a connection wait in a Drift outbox, with copies of their photos in the app's own storage.
- They are sent automatically when the connection returns or the app comes back to the foreground (or with "Send now").
- Before sending, the day is read again. If it changed since the farmer saw it, the entry is held for them to choose: send theirs anyway, or discard it. Nothing is silently overwritten.
- Signing out clears unsent entries (with a warning), so they are never sent later as someone else.

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
- **Push notifications:** need Firebase. The API's `POST /me/push-devices` is ready; until then the push preference applies once a device is registered.
- **Editing past weigh-ins and tasks' details** is on the web app; the phone records and completes.

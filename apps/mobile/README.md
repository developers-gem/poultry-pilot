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

| Screen | API |
| --- | --- |
| Splash | restores the session: `POST /auth/refresh`, `GET /me` (cached copy when offline) |
| Onboarding | first launch only (stored in Drift) |
| Login, Signup | `POST /auth/login`, `POST /auth/register` (farm, currency, the phone's time zone, device) |
| Forgot password | `POST /auth/forgot-password` (the same answer whether or not the account exists) |
| Farm selection | memberships from `/me`; `POST /farms` to create one. One farm: chosen automatically |
| Dashboard | `GET /farms/:id/dashboard`: birds, eggs, deaths, alerts, weather and risks, flocks today, money (if permitted), stock, hatchery, coming up. Pull to refresh |
| Profile | `PUT /me`, `POST /auth/change-password`, `POST /auth/resend-verification`, `GET/DELETE /me/sessions` |
| Settings | `GET/PUT /me/notification-preferences` (shared with the web), switch farm, clear saved data, sign out (`POST /auth/logout`) |

## The contract with the API

The models are tested against **responses captured from the real API** (`test/fixtures/*.json`):
- `services/api/scripts/mobile-fixtures.ts` captures them
- `services/api/src/test/mobile-contract.test.ts` (in the API's test suite) fails if the API's responses change shape

After an intended API change, regenerate the fixtures (`npx tsx services/api/scripts/mobile-fixtures.ts` from the repository root) and update the Dart models.

## Setup

Requires Flutter 3.27 or newer.

```bash
cd apps/mobile
./tool/setup.sh        # platform folders, INTERNET permission for release, packages, generated code
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
- **Daily records and offline entry:** recording eggs, feed and deaths, with an outbox to `/sync/push`, is the next mobile feature.

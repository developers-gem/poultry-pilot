# PoultryPilot mobile (Flutter)

Uses the same `/api/v1` REST API and MongoDB database as the web app. This is the foundation only:
a health screen that proves the device can reach the API and that the API can reach MongoDB.
Offline-first storage (Drift + outbox + `/sync/push` and `/sync/pull`) arrives in roadmap Phase 7.

## First-time setup

Requires Flutter 3.24 or newer (`flutter --version`).

```bash
cd apps/mobile
flutter create --platforms=android,ios --project-name poultrypilot_mobile --org com.poultrypilot .
cp config/dev.example.json config/dev.json
flutter pub get
```

`flutter create .` adds the android/ and ios/ platform folders and keeps every file that already exists
(`lib/`, `test/`, `pubspec.yaml`, and the debug Android manifest that allows plain HTTP to the local API).

## Run

```bash
flutter run --dart-define-from-file=config/dev.json
flutter test
flutter analyze
```

`API_BASE_URL` in `config/dev.json`:

| Where the app runs | Value |
| --- | --- |
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` |
| Physical phone on the same Wi-Fi | `http://<your computer's LAN IP>:4000` — also start the API with `HOST=0.0.0.0` (the default) |

`config/dev.json` is git-ignored. Never put secrets in it: anything compiled into an app can be extracted.

If the iOS simulator refuses plain HTTP, add `NSAppTransportSecurity` → `NSAllowsLocalNetworking = YES`
to `ios/Runner/Info.plist` for development builds.

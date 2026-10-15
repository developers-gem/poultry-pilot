#!/usr/bin/env bash
# One-time setup: platform folders, PoultryPilot's platform settings, packages and generated code.
# Run from apps/mobile.
set -euo pipefail

flutter create --platforms=android,ios --project-name poultrypilot_mobile --org com.poultrypilot .

# Release builds need the INTERNET permission (Flutter's template only adds it to debug/profile).
MANIFEST=android/app/src/main/AndroidManifest.xml
if ! grep -q 'android.permission.INTERNET' "$MANIFEST"; then
  sed -i.bak 's#<manifest xmlns:android="http://schemas.android.com/apk/res/android"#&>\n    <uses-permission android:name="android.permission.INTERNET"/#' "$MANIFEST"
  sed -i.bak 's#android.permission.INTERNET"/>>#android.permission.INTERNET"/>#' "$MANIFEST"
  rm -f "$MANIFEST.bak"
fi
grep -q 'android.permission.INTERNET' "$MANIFEST" || { echo "Add <uses-permission android:name=\"android.permission.INTERNET\"/> to $MANIFEST"; exit 1; }

# iOS: Daily Entry attaches photos (camera and library). iOS closes the app without these descriptions.
PLIST=ios/Runner/Info.plist
if [ -f "$PLIST" ] && ! grep -q NSCameraUsageDescription "$PLIST"; then
  perl -0pi -e 's#</dict>\s*</plist>\s*$#\t<key>NSCameraUsageDescription</key>\n\t<string>Take photos of your flock to attach to daily records.</string>\n\t<key>NSPhotoLibraryUsageDescription</key>\n\t<string>Choose photos to attach to daily records.</string>\n</dict>\n</plist>\n#' "$PLIST"
fi

[ -f config/dev.json ] || cp config/dev.example.json config/dev.json
flutter pub get
dart run build_runner build --delete-conflicting-outputs
echo "Ready: flutter run --dart-define-from-file=config/dev.json"

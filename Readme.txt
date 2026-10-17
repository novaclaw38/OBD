OBD
===

A workspace holding OBD-II vehicle diagnostic scanner apps that talk to ELM327-compatible
adapters, plus a voice-assistant web project.

FOLDERS
-------
  obd/                  React Native (TypeScript) scanner for Android and iOS.
                        Classic Bluetooth SPP (Android) and BLE adapters. Reads live data
                        (Mode 01), reads/clears trouble codes (Modes 03/04/07), decodes the
                        VIN (Mode 09) via the NHTSA vPIC API. 40 unit tests.
  obd-scanner-android/  Native Android app (Kotlin, Jetpack Compose, Material 3). Bluetooth
                        Classic and Wi-Fi (TCP) adapters, live gauge dashboard, trouble codes
                        with descriptions, VIN and vehicle info.
  voice-buddy-app/      Vite + React voice-assistant web project (with Supabase and Vercel
                        serverless functions).

GETTING STARTED
---------------
  React Native app:   cd obd && npm install && npm start, then npm run android / npm run ios
                      (iOS: cd ios && bundle install && bundle exec pod install)
  Android app:        open obd-scanner-android/ in Android Studio, or
                      ./gradlew assembleDebug (requires an Android SDK, API 34)

Use a physical device: Bluetooth and the adapter's Wi-Fi network are not available in
emulators. Clearing trouble codes also resets emissions monitors; do not operate the app
while driving.

See obd/README.md and obd-scanner-android/README.md for architecture and details.

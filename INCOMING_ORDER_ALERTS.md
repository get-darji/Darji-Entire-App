# Incoming Order Alerts

Tailor and Delivery use the same native Expo module in
`apps/incoming-alert`. The first visible alert is created by Android native
code as soon as the FCM data message reaches the process. React Native is used
afterward for authenticated API actions and app navigation.

## Why the old implementation was unreliable

- It waited for React Native Firebase's headless JavaScript handler before
  creating the notification. Android can delay or limit that startup while the
  app is backgrounded, idle, or stopped.
- Expo Notifications, Notifee, socket UI, and looping JavaScript audio were
  separate alert paths. They could create duplicates and the JavaScript
  ringtone could survive an accept, reject, or timeout.
- Declaring `SYSTEM_ALERT_WINDOW` in the manifest does not create an overlay.
  The old apps had no native overlay service and did not open the permission
  settings screen.
- Delivery could route a notification action with the order ID instead of the
  delivery task ID.

## Current architecture

1. The backend sends an FCM high-priority, data-only incoming-request message
   with a 35-second TTL and a 30-second `expiresAt` value.
2. `IncomingAlertFirebaseReceiver` receives the same FCM broadcast as React
   Native Firebase and immediately invokes native Android code.
3. Android posts an ongoing, public, maximum-importance notification on
   `darji-incoming-orders-v3`, using the bundled `requests` sound, an insistent
   ringtone flag, and a strong vibration pattern.
4. When allowed, Android attaches a full-screen intent and starts a native
   incoming-order activity that can turn on and appear over the lock screen.
5. When Display over other apps is granted and the phone is unlocked, a
   special-use foreground service shows the native Accept/Reject/countdown UI
   over the home screen or another app.
6. If either privileged display path is unavailable, the high-importance
   heads-up notification remains the fallback. Tapping it opens the native
   incoming screen.
7. Native Accept/Reject stores a pending action, cancels the notification,
   overlay, service, vibration, and looping sound immediately, then opens the
   app. The authenticated React Native provider consumes the action and calls
   the existing API.

The native service and views enforce their own expiration timer. Dismissing an
order from React Native also calls the native dismiss method, so every alert
path stops together.

## Android permissions and limits

- `POST_NOTIFICATIONS` is a runtime permission on Android 13 and newer.
- `SYSTEM_ALERT_WINDOW` is a special access permission. It cannot be granted
  by a normal runtime dialog. The app explains the need and opens the package's
  Display over other apps settings page.
- `USE_FULL_SCREEN_INTENT` is declared, but Android 14 and Google Play normally
  reserve default full-screen access for calling and alarm apps. The module
  checks `NotificationManager.canUseFullScreenIntent()` before attaching the
  intent and can open the official settings page. A denied full-screen intent
  is expected to become a heads-up notification.
- `FOREGROUND_SERVICE_SPECIAL_USE` supports the short overlay service on
  Android 14. The use must also be declared accurately in Play Console. Store
  review policy can still reject an unjustified overlay or full-screen use.
- Device manufacturers, notification permission, Focus/Do Not Disturb,
  battery restrictions, force-stop, and network delivery can still prevent or
  delay an alert. No Android app can guarantee delivery after the user
  force-stops it.

## Build and deploy

This change includes Kotlin, AndroidManifest entries, config plugins, native
resources, and a new notification channel. Fast Refresh and an Expo update are
not enough.

1. Build and install new Tailor and Delivery Android binaries.
2. Deploy the backend so it sends the native payload and v3 channel.
3. Open each app, sign in, allow notifications, and grant Display over other
   apps when prompted.
4. On Android 14 or newer, review the full-screen notification setting when the
   app offers it. The app still works through overlay/heads-up if Android does
   not permit full-screen access.

Preview APK builds:

```powershell
cd D:\app\apps\tailor-app
npx eas-cli build --platform android --profile preview

cd D:\app\apps\delivery-app
npx eas-cli build --platform android --profile preview
```

Production Play Store AAB builds use `--profile production` instead.

## Real-device test

Use a physical Android device with the new binary; Expo Go cannot test this
native module or Android remote push behavior.

1. Sign into Tailor or Delivery and confirm notification and overlay access.
2. Put the app in the background and open another app.
3. Create the matching request in Darzi Customer.
4. Confirm the overlay appears promptly, counts down, and Accept/Reject stops
   all sound immediately.
5. Repeat from the home screen and with the screen locked.
6. Disable Display over other apps and repeat. Confirm a heads-up or allowed
   full-screen notification appears and tapping it opens the request.
7. Reject once from inside the app and once from the native notification to
   verify both API paths and sound cancellation.

Use the Android SDK executable directly on this machine when `adb` is not on
`PATH`:

```powershell
& "C:\Users\amank\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
```

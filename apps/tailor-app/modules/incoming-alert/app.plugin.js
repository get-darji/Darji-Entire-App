const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

const REQUIRED_PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.TURN_SCREEN_ON",
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.VIBRATE",
  "android.permission.WAKE_LOCK"
];

function ensurePermission(manifest, name) {
  manifest["uses-permission"] = manifest["uses-permission"] || [];
  if (!manifest["uses-permission"].some((item) => item?.$?.["android:name"] === name)) {
    manifest["uses-permission"].push({ $: { "android:name": name } });
  }
}

function hasComponent(application, tag, name) {
  return (application[tag] ?? []).some((item) => item?.$?.["android:name"] === name);
}

module.exports = function withIncomingAlert(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(modConfig.modResults);
    const application = modConfig.modResults.manifest.application[0];

    for (const permission of REQUIRED_PERMISSIONS) ensurePermission(manifest, permission);

    // Android 14+ can still revoke FSI for apps that are not approved call/alarm apps.
    // The runtime module checks canUseFullScreenIntent before attaching an FSI and
    // always retains a high-importance heads-up notification as the fallback.
    activity.$["android:showWhenLocked"] = "true";
    activity.$["android:turnScreenOn"] = "true";
    activity.$["android:excludeFromRecents"] = "false";

    // ── FCM broadcast receiver ───────────────────────────────────────────────
    // Intercepts high-priority FCM data messages before React Native JS boots.
    if (!hasComponent(application, "receiver", "com.darzi.incomingalert.IncomingAlertFirebaseReceiver")) {
      application["receiver"] = application["receiver"] ?? [];
      application["receiver"].push({
        $: {
          "android:name": "com.darzi.incomingalert.IncomingAlertFirebaseReceiver",
          "android:exported": "true",
          "android:permission": "com.google.android.c2dm.permission.SEND"
        },
        "intent-filter": [{ $: { "android:priority": "999" }, action: [{ $: { "android:name": "com.google.android.c2dm.intent.RECEIVE" } }] }]
      });
    }

    // ── Action button broadcast receiver ────────────────────────────────────
    if (!hasComponent(application, "receiver", "com.darzi.incomingalert.IncomingAlertActionReceiver")) {
      application["receiver"].push({
        $: { "android:name": "com.darzi.incomingalert.IncomingAlertActionReceiver", "android:exported": "false" },
        "intent-filter": [{
          action: [
            { $: { "android:name": "com.darzi.incomingalert.ACCEPT" } },
            { $: { "android:name": "com.darzi.incomingalert.DECLINE" } },
            { $: { "android:name": "com.darzi.incomingalert.VIEW" } }
          ]
        }]
      });
    }

    // ── Overlay foreground service ───────────────────────────────────────────
    if (!hasComponent(application, "service", "com.darzi.incomingalert.IncomingAlertOverlayService")) {
      application["service"] = application["service"] ?? [];
      application["service"].push({
        $: {
          "android:name": "com.darzi.incomingalert.IncomingAlertOverlayService",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse"
        },
        property: [{ $: { "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE", "android:value": "Darji incoming order overlay" } }]
      });
    }

    // ── Full-screen incoming alert activity ──────────────────────────────────
    if (!hasComponent(application, "activity", "com.darzi.incomingalert.IncomingAlertActivity")) {
      application["activity"] = application["activity"] ?? [];
      application["activity"].push({
        $: {
          "android:name": "com.darzi.incomingalert.IncomingAlertActivity",
          "android:exported": "false",
          "android:launchMode": "singleTask",
          "android:showWhenLocked": "true",
          "android:turnScreenOn": "true",
          "android:excludeFromRecents": "true",
          "android:taskAffinity": "",
          "android:theme": "@style/Theme.AppCompat.NoActionBar"
        }
      });
    }

    return modConfig;
  });
};

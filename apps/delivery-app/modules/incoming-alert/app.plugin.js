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

function ensureComponent(application, kind, name, value) {
  application[kind] = application[kind] || [];
  if (!application[kind].some((item) => item?.$?.["android:name"] === name)) {
    application[kind].push(value);
  }
}

module.exports = function withIncomingAlert(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = manifest.application?.[0];
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(modConfig.modResults);

    for (const permission of REQUIRED_PERMISSIONS) ensurePermission(manifest, permission);

    // Android 14+ can still revoke FSI for apps that are not approved call/alarm apps.
    // The runtime module checks canUseFullScreenIntent before attaching an FSI and
    // always retains a high-importance heads-up notification as the fallback.
    activity.$["android:showWhenLocked"] = "true";
    activity.$["android:turnScreenOn"] = "true";
    activity.$["android:excludeFromRecents"] = "false";

    if (application) {
      ensureComponent(application, "receiver", "com.darzi.incomingalert.IncomingAlertFirebaseReceiver", {
        $: {
          "android:name": "com.darzi.incomingalert.IncomingAlertFirebaseReceiver",
          "android:exported": "true",
          "android:permission": "com.google.android.c2dm.permission.SEND"
        },
        "intent-filter": [{
          $: { "android:priority": "999" },
          action: [{ $: { "android:name": "com.google.android.c2dm.intent.RECEIVE" } }]
        }]
      });
      ensureComponent(application, "receiver", "com.darzi.incomingalert.IncomingAlertActionReceiver", {
        $: {
          "android:name": "com.darzi.incomingalert.IncomingAlertActionReceiver",
          "android:exported": "false"
        }
      });
      ensureComponent(application, "service", "com.darzi.incomingalert.IncomingAlertMessagingService", {
        $: {
          "android:name": "com.darzi.incomingalert.IncomingAlertMessagingService",
          "android:exported": "false"
        },
        "intent-filter": [{
          action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }]
        }]
      });
      ensureComponent(application, "service", "com.darzi.incomingalert.IncomingAlertOverlayService", {
        $: {
          "android:name": "com.darzi.incomingalert.IncomingAlertOverlayService",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse",
          "android:stopWithTask": "false"
        },
        property: [{
          $: {
            "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
            "android:value": "time_limited_incoming_order_alert_overlay"
          }
        }]
      });
      ensureComponent(application, "activity", "com.darzi.incomingalert.IncomingAlertActivity", {
        $: {
          "android:name": "com.darzi.incomingalert.IncomingAlertActivity",
          "android:excludeFromRecents": "true",
          "android:exported": "false",
          "android:launchMode": "singleTop",
          "android:showWhenLocked": "true",
          "android:theme": "@android:style/Theme.Material.Light.NoActionBar",
          "android:turnScreenOn": "true"
        }
      });
    }

    return modConfig;
  });
};

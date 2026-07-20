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

module.exports = function withIncomingAlert(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(modConfig.modResults);

    for (const permission of REQUIRED_PERMISSIONS) ensurePermission(manifest, permission);

    // Android 14+ can still revoke FSI for apps that are not approved call/alarm apps.
    // The runtime module checks canUseFullScreenIntent before attaching an FSI and
    // always retains a high-importance heads-up notification as the fallback.
    activity.$["android:showWhenLocked"] = "true";
    activity.$["android:turnScreenOn"] = "true";
    activity.$["android:excludeFromRecents"] = "false";

    return modConfig;
  });
};

const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withRichNotificationRenderer(config) {
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (app && !(app.receiver || []).some((item) => item?.$?.["android:name"] === ".RichNotificationFirebaseReceiver")) {
      app.receiver = app.receiver || [];
      app.receiver.push({ $: { "android:name": ".RichNotificationFirebaseReceiver", "android:exported": "true", "android:permission": "com.google.android.c2dm.permission.SEND" }, "intent-filter": [{ $: { "android:priority": "998" }, action: [{ $: { "android:name": "com.google.android.c2dm.intent.RECEIVE" } }] }] });
    }
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const packagePath = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "java", "com", "darji", "customer");
    fs.mkdirSync(packagePath, { recursive: true });
    fs.copyFileSync(path.join(__dirname, "android", "RichNotificationFirebaseReceiver.kt"), path.join(packagePath, "RichNotificationFirebaseReceiver.kt"));
    return mod;
  }]);
};

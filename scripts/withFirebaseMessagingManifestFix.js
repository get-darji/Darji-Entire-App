const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

const FIREBASE_CHANNEL_META = "com.google.firebase.messaging.default_notification_channel_id";
const FIREBASE_COLOR_META = "com.google.firebase.messaging.default_notification_color";

function ensureToolsNamespace(manifest) {
  manifest.$ = manifest.$ || {};
  manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";
}

function setToolsReplace(metaData, name, replaceValue) {
  const item = metaData.find((entry) => entry?.$?.["android:name"] === name);
  if (!item?.$) return;
  item.$["tools:replace"] = replaceValue;
}

module.exports = function withFirebaseMessagingManifestFix(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    const metaData = application["meta-data"] || [];

    ensureToolsNamespace(manifest);
    setToolsReplace(metaData, FIREBASE_CHANNEL_META, "android:value");
    setToolsReplace(metaData, FIREBASE_COLOR_META, "android:resource");

    return modConfig;
  });
};

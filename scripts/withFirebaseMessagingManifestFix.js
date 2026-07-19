const fs = require("node:fs");
const path = require("node:path");
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");

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
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    const metaData = application["meta-data"] || [];

    ensureToolsNamespace(manifest);
    setToolsReplace(metaData, FIREBASE_CHANNEL_META, "android:value");
    setToolsReplace(metaData, FIREBASE_COLOR_META, "android:resource");

    return modConfig;
  });

  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const manifestPath = path.join(modConfig.modRequest.platformProjectRoot, "app", "src", "main", "AndroidManifest.xml");
      let source = await fs.promises.readFile(manifestPath, "utf8");

      if (!source.includes("xmlns:tools=")) {
        source = source.replace(
          /<manifest\s+xmlns:android="http:\/\/schemas\.android\.com\/apk\/res\/android"/,
          '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"'
        );
      }

      source = source.replace(
        /(<meta-data\s+android:name="com\.google\.firebase\.messaging\.default_notification_channel_id"(?=[^>]*android:value=)(?![^>]*tools:replace=)[^>]*)(\/?>)/,
        '$1 tools:replace="android:value"$2'
      );
      source = source.replace(
        /(<meta-data\s+android:name="com\.google\.firebase\.messaging\.default_notification_color"(?=[^>]*android:resource=)(?![^>]*tools:replace=)[^>]*)(\/?>)/,
        '$1 tools:replace="android:resource"$2'
      );

      await fs.promises.writeFile(manifestPath, source);
      return modConfig;
    }
  ]);
};

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.fileMapCacheDirectory = path.join(__dirname, ".expo", "metro-cache", "file-map");
config.hasteMapCacheDirectory = path.join(__dirname, ".expo", "metro-cache", "haste-map");

module.exports = withNativeWind(config, { input: "./global.css" });

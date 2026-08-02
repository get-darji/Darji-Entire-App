const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Override watchFolders to only watch the tailor-app directory itself.
// This prevents Windows file-system watch timeouts in monorepo structures.
config.watchFolders = [__dirname];

module.exports = withNativeWind(config, { input: "./global.css" });

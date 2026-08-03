const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the workspace root so hoisted dependencies (like expo) are visible
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Exclude non-relevant monorepo directories from the file crawler.
// This prevents Windows file system watch timeouts while maintaining monorepo resolutions.
config.resolver.blockList = [
  ...config.resolver.blockList,
  /.*[\\/]backend[\\/].*/,
  /.*[\\/]apps[\\/]admin-panel[\\/].*/,
  /.*[\\/]apps[\\/]customer-app[\\/].*/,
  /.*[\\/]apps[\\/]customer-web[\\/].*/,
  /.*[\\/]apps[\\/]delivery-app[\\/].*/,
  /.*[\\/]inspect-delivery-prebuild[\\/].*/,
  /.*[\\/]inspect-tailor-prebuild[\\/].*/,
  /.*\.git\/.*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });

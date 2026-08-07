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
// We subclass RegExp for blockList so that we can ignore node_modules directories from being watched
// (saving thousands of file watchers on Windows) while still resolving node_modules files correctly.
class CustomBlockListRegExp extends RegExp {
  constructor(defaultPatterns, customPatterns) {
    super(" ^");
    this.patterns = [...defaultPatterns, ...customPatterns];
  }
  test(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    
    // Ignore node_modules directory walks in the watcher
    if (normalized.includes("/node_modules")) {
      const hasFileExtension = /\.[a-z0-9]+$/i.test(normalized);
      if (!hasFileExtension) {
        return true;
      }
    }
    
    return this.patterns.some((re) => re.test(filePath));
  }
}

const defaultPatterns = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

const customPatterns = [
  /.*[\\/]backend[\\/].*/,
  /.*[\\/]apps[\\/]admin-panel[\\/].*/,
  /.*[\\/]apps[\\/]customer-app[\\/].*/,
  /.*[\\/]apps[\\/]customer-web[\\/].*/,
  /.*[\\/]apps[\\/]delivery-app[\\/].*/,
  /.*[\\/]inspect-delivery-prebuild[\\/].*/,
  /.*[\\/]inspect-tailor-prebuild[\\/].*/,
  /.*\.git\/.*/,
];

config.resolver.blockList = new CustomBlockListRegExp(defaultPatterns, customPatterns);

module.exports = withNativeWind(config, { input: "./global.css" });

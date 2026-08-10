const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../../shared");
const rootNodeModules = path.resolve(projectRoot, "../../node_modules");
const appRequestPrefix = `/apps/${path.basename(projectRoot)}/`;

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot, rootNodeModules];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  rootNodeModules,
];
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) => path.join(rootNodeModules, name),
  },
);
config.server = {
  ...config.server,
  unstable_serverRoot: projectRoot,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url?.startsWith(appRequestPrefix)) {
        req.url = `/${req.url.slice(appRequestPrefix.length)}`;
      }
      return middleware(req, res, next);
    };
  },
};

class CustomBlockListRegExp extends RegExp {
  constructor(defaultPatterns, customPatterns) {
    super(" ^");
    this.patterns = [...defaultPatterns, ...customPatterns];
  }

  test(filePath) {
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
  /.*[\\/]apps[\\/]tailor-app[\\/].*/,
  /.*[\\/]inspect-delivery-prebuild[\\/].*/,
  /.*[\\/]inspect-tailor-prebuild[\\/].*/,
  /.*\.git\/.*/,
];

config.resolver.blockList = new CustomBlockListRegExp(defaultPatterns, customPatterns);

module.exports = withNativeWind(config, { input: "./global.css" });

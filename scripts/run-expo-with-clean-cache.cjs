const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const [, , appArg, ...expoArgs] = process.argv;

if (!appArg || expoArgs.length === 0) {
  console.error("Usage: node scripts/run-expo-with-clean-cache.cjs <app-path> <expo-command> [...args]");
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "..");
const appRoot = path.resolve(process.cwd(), appArg);
const tempRoot = os.tmpdir();

const projectCacheDirs = [
  path.join(appRoot, ".expo", "metro-cache"),
  path.join(appRoot, ".expo", "web"),
  path.join(appRoot, "node_modules", ".cache", "metro"),
  path.join(appRoot, "node_modules", ".cache", "metro-file-map"),
  path.join(repoRoot, "node_modules", ".cache", "metro"),
  path.join(repoRoot, "node_modules", ".cache", "metro-file-map")
];

const tempCachePrefixes = ["metro-cache", "haste-map-", "metro-file-map", "react-native-packager-cache"];
const requiredCacheDirs = [
  path.join(appRoot, ".expo"),
  path.join(appRoot, ".expo", "metro-cache"),
  path.join(appRoot, ".expo", "metro-cache", "file-map"),
  path.join(appRoot, ".expo", "metro-cache", "haste-map")
];

function safeRemove(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`[cache] removed ${targetPath}`);
    }
  } catch (error) {
    console.warn(`[cache] unable to remove ${targetPath}: ${error.message}`);
  }
}

for (const targetPath of projectCacheDirs) {
  safeRemove(targetPath);
}

for (const targetPath of requiredCacheDirs) {
  fs.mkdirSync(targetPath, { recursive: true });
}

try {
  for (const entry of fs.readdirSync(tempRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (tempCachePrefixes.some((prefix) => entry.name.startsWith(prefix))) {
      safeRemove(path.join(tempRoot, entry.name));
    }
  }
} catch (error) {
  console.warn(`[cache] unable to inspect temp directory ${tempRoot}: ${error.message}`);
}

let expoCliPath;
try {
  expoCliPath = require.resolve("expo/bin/cli", { paths: [appRoot, repoRoot] });
} catch (error) {
  console.error(`Unable to resolve Expo CLI from ${appRoot}: ${error.message}`);
  process.exit(1);
}

const finalArgs = [...expoArgs];
if (finalArgs[0] === "start" && !finalArgs.includes("--clear") && !finalArgs.includes("-c")) {
  finalArgs.push("--clear");
}

const child = spawn(process.execPath, [expoCliPath, ...finalArgs], {
  cwd: appRoot,
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

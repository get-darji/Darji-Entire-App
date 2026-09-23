const fs = require("fs");
const path = require("path");

module.exports = function patchOneDriveDirents(projectRoot) {
  if (process.platform !== "win32" || !/[\\/]OneDrive[\\/]/i.test(projectRoot)) return;

  const patchKey = Symbol.for("darji.onedriveDirentsPatched");
  if (fs[patchKey]) return;
  fs[patchKey] = true;

  function correctEntries(directory, entries, options) {
    if (!options?.withFileTypes || typeof directory !== "string") return entries;

    for (const entry of entries) {
      if (!entry.isSymbolicLink()) continue;
      try {
        const stat = fs.lstatSync(path.join(directory, entry.name));
        if (stat.isSymbolicLink()) continue;
        if (!stat.isFile() && !stat.isDirectory()) continue;

        entry.isSymbolicLink = () => false;
        entry.isFile = () => stat.isFile();
        entry.isDirectory = () => stat.isDirectory();
      } catch {
        // Keep the original entry if it disappeared during the scan.
      }
    }
    return entries;
  }

  const originalReaddir = fs.readdir;
  fs.readdir = function readdir(directory, options, callback) {
    if (typeof options === "function") return originalReaddir.call(fs, directory, options);
    return originalReaddir.call(fs, directory, options, (error, entries) => {
      if (error) return callback(error);
      return callback(null, correctEntries(directory, entries, options));
    });
  };

  const originalReaddirSync = fs.readdirSync;
  fs.readdirSync = function readdirSync(directory, options) {
    return correctEntries(directory, originalReaddirSync.call(fs, directory, options), options);
  };
};

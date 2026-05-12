const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoots = ["backend", "database", "mobile-app", "scripts", "shared", "web-admin"];
const checkedExtensions = new Set([".cjs", ".css", ".html", ".js", ".json", ".mjs", ".sql"]);
const skippedDirs = new Set(["node_modules", "dist", "build", ".next", "out", "tmp", "artifacts"]);
const conflictMarkerPattern = /^(<<<<<<<|=======|>>>>>>>)(\s|$)/;

function collectFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) collectFiles(path.join(dir, entry.name), files);
      continue;
    }
    const filePath = path.join(dir, entry.name);
    if (checkedExtensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = sourceRoots.flatMap((root) => collectFiles(path.join(projectRoot, root)));
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const hasConflictMarker = content.split(/\r?\n/).some((line) => conflictMarkerPattern.test(line));
  assert(!hasConflictMarker, `Merge conflict marker found in ${path.relative(projectRoot, file)}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
for (const scriptName of ["lint", "typecheck", "test", "build"]) {
  assert(packageJson.scripts && packageJson.scripts[scriptName], `Missing package script: ${scriptName}`);
  assert(packageJson.scripts[scriptName] !== "npm run check:syntax", `${scriptName} still points only to check:syntax`);
}

const envExample = fs.readFileSync(path.join(projectRoot, ".env.example"), "utf8");
for (const line of envExample.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  const [key, ...rest] = line.split("=");
  assert(key && /^[A-Z0-9_]+$/.test(key), `.env.example has an invalid key: ${line}`);
  assert(rest.join("=") === "", `.env.example should keep placeholder values empty: ${key}`);
}

console.log(`Project hygiene check passed for ${files.length} files.`);

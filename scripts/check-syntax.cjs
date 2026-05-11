const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoots = ["backend", "scripts", "web-admin", "mobile-app", "shared"];
const jsExtensions = new Set([".js", ".cjs", ".mjs"]);
const skippedDirs = new Set(["node_modules", "dist", "build", ".next", "out", "tmp", "artifacts"]);

function collectJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) collectJsFiles(path.join(dir, entry.name), files);
      continue;
    }
    const filePath = path.join(dir, entry.name);
    if (jsExtensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

const files = sourceRoots.flatMap((root) => collectJsFiles(path.join(projectRoot, root))).sort();
if (!files.length) throw new Error("No JavaScript files found for syntax check.");

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { cwd: projectRoot, encoding: "utf8" });
  if (result.status !== 0) {
    failures.push({ file: path.relative(projectRoot, file), output: `${result.stdout || ""}${result.stderr || ""}`.trim() });
  }
}

if (failures.length) {
  console.error("Syntax check failed:");
  for (const failure of failures) {
    console.error(`\n${failure.file}\n${failure.output}`);
  }
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);

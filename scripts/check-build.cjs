const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertFile(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  assert(fs.existsSync(absolutePath), `Missing required build file: ${relativePath}`);
  return absolutePath;
}

const indexPath = assertFile("web-admin/index.html");
assertFile("web-admin/src/App.js");
assertFile("web-admin/src/mini-react.js");
assertFile("web-admin/src/styles.css");
assertFile("backend/server.js");
assertFile("database/schema.sql");

const indexHtml = fs.readFileSync(indexPath, "utf8");
assert(indexHtml.includes('<div id="root"></div>'), "web-admin/index.html must include #root");

const assetRefs = [...indexHtml.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((match) => match[1]);
assert(assetRefs.length > 0, "web-admin/index.html must reference at least one local asset");
for (const asset of assetRefs) {
  assertFile(path.join("web-admin", asset));
}

const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
assert(packageJson.scripts.start === "node backend/server.js", "start script should point to backend/server.js");

console.log(`Build verification passed for ${assetRefs.length} web assets.`);

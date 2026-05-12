const path = require("node:path");
const fs = require("node:fs");

const projectRoot = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireFromRoot(relativePath) {
  return require(path.join(projectRoot, relativePath));
}

async function importStandaloneModule(relativePath) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

(async () => {
  const auth = requireFromRoot("backend/store/auth-utils.js");
  for (const name of [
    "createDefaultUser",
    "hashPassword",
    "hasFeaturePermission",
    "normalizeEmail",
    "normalizeUsername",
    "permissionJson",
    "publicUser",
    "validateOptionalEmail",
    "validatePassword",
    "validateUsername",
    "verifyPassword",
  ]) {
    assert(typeof auth[name] === "function", `auth-utils missing function export: ${name}`);
  }
  assert(Array.isArray(auth.FEATURE_PERMISSION_KEYS), "auth-utils missing FEATURE_PERMISSION_KEYS array");

  const mailer = requireFromRoot("backend/mailer.js");
  assert(typeof mailer.isEmailConfigured === "function", "mailer missing isEmailConfigured");
  assert(typeof mailer.sendMail === "function", "mailer missing sendMail");
  assert(typeof mailer.sendPasswordResetEmail === "function", "mailer missing sendPasswordResetEmail");

  const store = requireFromRoot("backend/store/store.js");
  assert(typeof store.createStore === "function", "store missing createStore");

  const fileStore = requireFromRoot("backend/store/store-file.js");
  assert(typeof fileStore.createFileStore === "function", "store-file missing createFileStore");

  const mysqlStore = requireFromRoot("backend/store/store-mysql.js");
  assert(typeof mysqlStore.createMySqlStore === "function", "store-mysql missing createMySqlStore");

  const miniReact = await importStandaloneModule("web-admin/src/mini-react.js");
  assert(typeof miniReact.createElement === "function", "mini-react missing createElement");
  assert(typeof miniReact.render === "function", "mini-react missing render");

  const mobileDate = await importStandaloneModule("mobile-app/src/date.js");
  assert(typeof mobileDate.formatThaiDate === "function", "mobile date module missing formatThaiDate");

  console.log("Module contract check passed.");
})();

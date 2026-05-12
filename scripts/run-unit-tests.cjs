const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const auth = require(path.join(projectRoot, "backend/store/auth-utils.js"));

async function importStandaloneModule(relativePath) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

(async () => {
  const passwordHash = auth.hashPassword("StrongPass123");
  assert.equal(auth.verifyPassword("StrongPass123", passwordHash), true, "valid password should verify");
  assert.equal(auth.verifyPassword("WrongPass123", passwordHash), false, "invalid password should not verify");

  assert.equal(auth.normalizeEmail(" User@Example.COM "), "user@example.com");
  assert.equal(auth.normalizeUsername(" admin "), "admin");
  assert.throws(() => auth.validatePassword("short1"), /8/);
  assert.doesNotThrow(() => auth.validatePassword("StrongPass123"));

  const staffPermissions = JSON.parse(auth.permissionJson(["dashboard", "finance", "unknown"], "staff"));
  assert.deepEqual(staffPermissions, ["dashboard", "finance"]);
  assert.equal(auth.hasFeaturePermission({ role: "staff", permissions: JSON.stringify(["reports"]) }, "reports"), true);
  assert.equal(auth.hasFeaturePermission({ role: "staff", permissions: JSON.stringify(["reports"]) }, "finance"), false);
  assert.equal(auth.hasFeaturePermission({ role: "admin", permissions: "[]" }, "finance"), true);

  const publicUser = auth.publicUser({
    id: 7,
    username: "owner",
    email: "owner@example.com",
    display_name: "Owner",
    role: "admin",
    permissions: "[]",
    password_hash: "secret",
  });
  assert.equal(publicUser.password_hash, undefined);
  assert.deepEqual(publicUser.permissions, auth.FEATURE_PERMISSION_KEYS);

  const mobileDate = await importStandaloneModule("mobile-app/src/date.js");
  assert.equal(mobileDate.formatThaiDate("2026-05-11T00:00:00.000Z"), "11/05/2569");
  assert.equal(mobileDate.formatThaiDate("not-a-date"), "");

  console.log("Unit tests passed.");
})();

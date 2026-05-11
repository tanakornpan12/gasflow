const crypto = require("node:crypto");

const PASSWORD_ALGORITHM = "scrypt";
const FEATURE_PERMISSION_KEYS = [
  "dashboard",
  "sales",
  "delivery",
  "customers",
  "suppliers",
  "goods_receipts",
  "products",
  "opening_stock",
  "finance",
  "reports",
];
const DEFAULT_STAFF_PERMISSIONS = FEATURE_PERMISSION_KEYS.filter((key) => key !== "finance");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return `${PASSWORD_ALGORITHM}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash = "") {
  const [algorithm, salt, expectedHash] = String(storedHash || "").split("$");
  if (algorithm !== PASSWORD_ALGORITHM || !salt || !expectedHash) return false;
  const actual = crypto.scryptSync(String(password || ""), salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function createDefaultUser() {
  return {
    username: process.env.DEFAULT_ADMIN_USERNAME || "admin",
    password_hash: hashPassword(process.env.DEFAULT_ADMIN_PASSWORD || "admin1234"),
    display_name: process.env.DEFAULT_ADMIN_NAME || "ผู้ดูแลระบบ",
    email: normalizeEmail(process.env.DEFAULT_ADMIN_EMAIL || ""),
    role: "admin",
    permissions: JSON.stringify(FEATURE_PERMISSION_KEYS),
    is_active: 1,
  };
}

function normalizeUsername(username = "") {
  return String(username || "").trim();
}

function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function validateOptionalEmail(email = "") {
  const normalized = normalizeEmail(email);
  if (!normalized) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
  return normalized;
}

function validateUsername(username = "") {
  const normalized = normalizeUsername(username);
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(normalized)) {
    throw new Error("ชื่อผู้ใช้ต้องเป็นอังกฤษ/ตัวเลข 3-40 ตัว และใช้ . _ - ได้");
  }
  return normalized;
}

function validatePassword(password = "") {
  const text = String(password || "");
  if (text.length < 8) throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  if (!/[A-Za-z]/.test(text) || !/\d/.test(text)) throw new Error("รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข");
  return text;
}

function parsePermissionInput(permissions) {
  if (Array.isArray(permissions)) return permissions;
  if (permissions === undefined || permissions === null || permissions === "") return [];
  if (typeof permissions === "string") {
    try {
      const parsed = JSON.parse(permissions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return permissions.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  if (typeof permissions === "object") return Object.entries(permissions).filter(([, allowed]) => Boolean(allowed)).map(([key]) => key);
  return [];
}

function normalizePermissions(permissions, role = "staff") {
  if (role === "admin") return [...FEATURE_PERMISSION_KEYS];
  if (permissions === undefined || permissions === null || permissions === "") return [...DEFAULT_STAFF_PERMISSIONS];
  const raw = parsePermissionInput(permissions);
  const known = new Set(FEATURE_PERMISSION_KEYS);
  return [...new Set(raw.map((key) => String(key || "").trim()).filter((key) => known.has(key)))];
}

function permissionJson(permissions, role = "staff") {
  return JSON.stringify(normalizePermissions(permissions, role));
}

function hasFeaturePermission(user = {}, permission) {
  if (user.role === "admin") return true;
  return normalizePermissions(user.permissions, user.role).includes(permission);
}

function publicUser(user = {}) {
  const role = user.role || "staff";
  return {
    id: user.id,
    username: user.username,
    email: normalizeEmail(user.email || ""),
    display_name: user.display_name || user.username,
    role,
    permissions: normalizePermissions(user.permissions, role),
    is_active: user.is_active !== false && user.is_active !== 0,
    created_at: user.created_at || "",
  };
}

module.exports = {
  createDefaultUser,
  FEATURE_PERMISSION_KEYS,
  hashPassword,
  hasFeaturePermission,
  normalizeEmail,
  normalizeUsername,
  normalizePermissions,
  permissionJson,
  publicUser,
  validateOptionalEmail,
  validatePassword,
  validateUsername,
  verifyPassword,
};

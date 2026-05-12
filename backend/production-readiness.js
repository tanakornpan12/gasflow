function envValue(name) {
  return String(process.env[name] || "").trim();
}

function isProductionMode() {
  return envValue("NODE_ENV") === "production";
}

function hasAnyEnv(names) {
  return names.some((name) => Boolean(envValue(name)));
}

function requireEnv(name, errors) {
  if (!envValue(name)) errors.push(`${name} is required in production.`);
}

function validateHttpsUrl(name, value, errors) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      errors.push(`${name} must use an https:// URL in production.`);
    }
  } catch {
    errors.push(`${name} must be a valid URL.`);
  }
}

function validatePositiveInteger(name, value, errors) {
  if (!/^\d+$/.test(value) || Number(value) <= 0) {
    errors.push(`${name} must be a positive integer.`);
  }
}

function validateCorsOrigins(errors) {
  const raw = envValue("CORS_ALLOWED_ORIGINS");
  requireEnv("CORS_ALLOWED_ORIGINS", errors);
  if (!raw) return;
  for (const origin of raw.split(",").map((item) => item.trim()).filter(Boolean)) {
    validateHttpsUrl("CORS_ALLOWED_ORIGINS", origin, errors);
  }
}

function validateAdminConfig(errors) {
  const adminVars = [
    "DEFAULT_ADMIN_USERNAME",
    "DEFAULT_ADMIN_PASSWORD",
    "DEFAULT_ADMIN_NAME",
    "DEFAULT_ADMIN_EMAIL",
  ];
  adminVars.forEach((name) => requireEnv(name, errors));
  if (envValue("DEFAULT_ADMIN_PASSWORD") === "admin1234") {
    errors.push("DEFAULT_ADMIN_PASSWORD must not use the development default.");
  }
  const email = envValue("DEFAULT_ADMIN_EMAIL");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("DEFAULT_ADMIN_EMAIL must be a valid email address.");
  }
}

function validateMysqlConfig(errors) {
  if (envValue("DB_ENGINE").toLowerCase() !== "mysql") {
    errors.push("DB_ENGINE must be mysql in production.");
  }
  ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"].forEach((name) => requireEnv(name, errors));
  if (envValue("MYSQL_PORT")) validatePositiveInteger("MYSQL_PORT", envValue("MYSQL_PORT"), errors);
}

function validateSmtpConfig(errors) {
  const smtpVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_STARTTLS",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
  ];
  if (!hasAnyEnv(smtpVars)) return;

  ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM"].forEach((name) => requireEnv(name, errors));
  if (envValue("SMTP_PORT")) validatePositiveInteger("SMTP_PORT", envValue("SMTP_PORT"), errors);
  if (Boolean(envValue("SMTP_USER")) !== Boolean(envValue("SMTP_PASSWORD"))) {
    errors.push("SMTP_USER and SMTP_PASSWORD must be configured together.");
  }
  if (envValue("SMTP_FROM") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(envValue("SMTP_FROM").replace(/^.*<([^>]+)>.*$/, "$1"))) {
    errors.push("SMTP_FROM must contain a valid email address.");
  }
}

function assertProductionReadiness() {
  if (!isProductionMode()) return;

  const errors = [];
  validateMysqlConfig(errors);
  requireEnv("APP_BASE_URL", errors);
  if (envValue("APP_BASE_URL")) validateHttpsUrl("APP_BASE_URL", envValue("APP_BASE_URL"), errors);
  validateCorsOrigins(errors);
  validateAdminConfig(errors);
  validateSmtpConfig(errors);

  if (errors.length) {
    throw new Error(`Production readiness check failed:\n- ${errors.join("\n- ")}`);
  }
}

module.exports = {
  assertProductionReadiness,
  isProductionMode,
};

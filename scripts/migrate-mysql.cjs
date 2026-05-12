const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

const projectRoot = path.resolve(__dirname, "..");
const schemaPath = path.join(projectRoot, "database", "schema.sql");
const requiredEnv = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
const confirmationEnv = "DB_SETUP_CONFIRM";
const confirmationValue = "staging";

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function getRequiredEnv() {
  const missing = requiredEnv.filter((name) => !readEnv(name));
  if (missing.length) {
    throw new Error(`Missing required MySQL environment variables: ${missing.join(", ")}`);
  }

  const port = Number(readEnv("MYSQL_PORT"));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("MYSQL_PORT must be a positive integer.");
  }

  return {
    host: readEnv("MYSQL_HOST"),
    port,
    user: readEnv("MYSQL_USER"),
    password: readEnv("MYSQL_PASSWORD"),
    database: readEnv("MYSQL_DATABASE"),
  };
}

function assertStagingConfirmation() {
  if (readEnv(confirmationEnv) !== confirmationValue) {
    throw new Error(
      `Refusing to apply schema without ${confirmationEnv}=${confirmationValue}. Confirm the target is staging before running this script.`
    );
  }
}

async function main() {
  const db = getRequiredEnv();
  assertStagingConfirmation();

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, "utf8").trim();
  if (!schemaSql) {
    throw new Error(`Schema file is empty: ${schemaPath}`);
  }

  const connection = await mysql.createConnection({
    ...db,
    charset: "utf8mb4",
    multipleStatements: true,
  });

  try {
    await connection.query(schemaSql);
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
      [db.database]
    );
    const tableCount = Array.isArray(tables) ? tables.length : 0;

    console.log(`Database setup completed for ${db.database} on ${db.host}:${db.port}.`);
    console.log(`Applied schema: ${path.relative(projectRoot, schemaPath)}`);
    console.log(`Tables visible after setup: ${tableCount}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database setup failed: ${message}`);
  process.exit(1);
});

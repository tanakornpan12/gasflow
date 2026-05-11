const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3307,
    user: "gasflow",
    password: "gasflow123",
    database: "gasflow",
    charset: "utf8mb4",
    multipleStatements: true,
  });

  const sql = fs.readFileSync(path.join(__dirname, "..", "database", "schema.sql"), "utf8");
  const [ddlSql, seedSql = ""] = sql.split("INSERT IGNORE INTO customers");
  await conn.query(ddlSql);
  const [columns] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'is_active'"
  );
  if (!columns.length) {
    await conn.query("ALTER TABLE customers ADD COLUMN is_active TINYINT(1) DEFAULT 1");
  }
  const [latColumns] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'latitude'"
  );
  if (!latColumns.length) {
    await conn.query("ALTER TABLE customers ADD COLUMN latitude DECIMAL(10,7) NULL, ADD COLUMN longitude DECIMAL(10,7) NULL");
  }
  const [productActiveColumns] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_active'"
  );
  if (!productActiveColumns.length) {
    await conn.query("ALTER TABLE products ADD COLUMN is_active TINYINT(1) DEFAULT 1");
  }
  const [productUnitColumns] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'unit'"
  );
  if (!productUnitColumns.length) {
    await conn.query("ALTER TABLE products ADD COLUMN unit VARCHAR(40) DEFAULT 'ชิ้น' AFTER category");
  }
  const receiptColumns = [
    ["payment_method", "ALTER TABLE goods_receipts ADD COLUMN payment_method VARCHAR(40) DEFAULT 'credit' AFTER payment_status"],
    ["credit_days", "ALTER TABLE goods_receipts ADD COLUMN credit_days INT DEFAULT 0 AFTER payment_method"],
    ["bank_account_id", "ALTER TABLE goods_receipts ADD COLUMN bank_account_id INT NULL AFTER credit_days"],
    ["subtotal_amount", "ALTER TABLE goods_receipts ADD COLUMN subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER bank_account_id"],
    ["vat_type", "ALTER TABLE goods_receipts ADD COLUMN vat_type VARCHAR(20) NOT NULL DEFAULT 'exclusive' AFTER subtotal_amount"],
    ["vat_rate", "ALTER TABLE goods_receipts ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER vat_type"],
    ["vat_amount", "ALTER TABLE goods_receipts ADD COLUMN vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER vat_rate"],
  ];
  for (const [columnName, alterSql] of receiptColumns) {
    const [receiptColumnRows] = await conn.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'goods_receipts' AND COLUMN_NAME = ?",
      [columnName]
    );
    if (!receiptColumnRows.length) await conn.query(alterSql);
  }
  await conn.query(`
    CREATE TABLE IF NOT EXISTS supplier_payment_vouchers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      voucher_no VARCHAR(40) NOT NULL UNIQUE,
      goods_receipt_id INT NOT NULL,
      supplier_id INT NULL,
      paid_at DATE NULL,
      payment_method VARCHAR(40) NOT NULL DEFAULT 'cash',
      bank_account_id INT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      reference_no VARCHAR(80),
      note VARCHAR(255),
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await conn.query("UPDATE goods_receipts SET subtotal_amount = total_amount WHERE subtotal_amount = 0 AND vat_amount = 0");
  await conn.query(`
    UPDATE products SET unit = 'ถัง' WHERE category = 'gas' AND (unit IS NULL OR unit = 'ชิ้น');
    UPDATE products SET unit = 'เส้น' WHERE sku LIKE 'HOSE%' AND (unit IS NULL OR unit = 'ชิ้น');
  `);
  await conn.query(`
    UPDATE customers SET latitude = 13.9121827, longitude = 100.4988192 WHERE id = 1 AND latitude IS NULL;
    UPDATE customers SET latitude = 13.9051712, longitude = 100.5214925 WHERE id = 2 AND latitude IS NULL;
    UPDATE customers SET latitude = 13.8992146, longitude = 100.5378881 WHERE id = 3 AND latitude IS NULL;
    UPDATE customers SET latitude = 13.8938642, longitude = 100.5156304 WHERE id = 4 AND latitude IS NULL;
  `);
  if (seedSql.trim()) {
    await conn.query(`INSERT IGNORE INTO customers${seedSql}`);
  }
  await conn.end();
  console.log("mysql-migrate-ok");
})();

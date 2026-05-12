function env(name, fallback) {
  return process.env[name] || fallback;
}

const crypto = require("node:crypto");
const { createDefaultUser, hashPassword, normalizeEmail, permissionJson, publicUser, validateOptionalEmail, validatePassword, validateUsername, verifyPassword } = require("./auth-utils");
const backupTables = [
  "app_users",
  "branches",
  "customers",
  "products",
  "suppliers",
  "bank_accounts",
  "bank_openings",
  "cash_openings",
  "goods_receipts",
  "goods_receipt_items",
  "supplier_payment_vouchers",
  "orders",
  "order_items",
  "payments",
  "expenses",
  "stock_movements",
  "monthly_stock_counts",
  "opening_inventory_items",
];

function categoryPrefix(category = "") {
  const known = { gas: "GAS", accessory: "ACC", service: "SRV" };
  if (known[category]) return known[category];
  const ascii = String(category).replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
  if (ascii) {
    const code = ascii.padEnd(3, "X");
    return /^[A-Z]/.test(code) ? code : `C${code}`;
  }
  const hash = [...String(category || "product")].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 46656, 0);
  return `C${hash.toString(36).toUpperCase().padStart(3, "0")}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizePaymentQrImage(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length > 900_000) throw new Error("ไฟล์ QR ใหญ่เกินไป กรุณาใช้รูปขนาดเล็กลง");
  if (!/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(text)) {
    throw new Error("รูป QR ต้องเป็นไฟล์รูปภาพที่ถูกต้อง");
  }
  return text;
}

function normalizeCustomerPhone(phone = "") {
  return String(phone || "").replace(/\D/g, "");
}

const CANCEL_STATUS = "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01";

function createMySqlStore() {
  const mysql = require("mysql2/promise");
  const pool = mysql.createPool({
    host: env("MYSQL_HOST", "127.0.0.1"),
    port: Number(env("MYSQL_PORT", "3307")),
    user: env("MYSQL_USER", "gasflow"),
    password: env("MYSQL_PASSWORD", "gasflow123"),
    database: env("MYSQL_DATABASE", "gasflow"),
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
  });

  /**
   * @typedef {Record<string, any>} DbRow
   * @typedef {DbRow[] & { insertId?: number, affectedRows?: number, changedRows?: number }} DbQueryResult
   * @typedef {{
   *   beginTransaction: () => Promise<void>,
   *   commit: () => Promise<void>,
   *   rollback: () => Promise<void>,
   *   release: () => void,
   *   execute: (sql: string, params?: any[]) => Promise<[DbQueryResult, any]>
   * }} DbConnection
   */

  // mysql2 exposes broad QueryResult unions. Keep the adapter cast in one place so
  // TypeScript can cover this file without changing the current store behavior.
  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<DbQueryResult>}
   */
  async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return /** @type {DbQueryResult} */ (rows);
  }

  /**
   * @returns {Promise<DbConnection>}
   */
  async function getConnection() {
    return /** @type {DbConnection} */ (await pool.getConnection());
  }

  function hashResetToken(token = "") {
    return crypto.createHash("sha256").update(String(token || "")).digest("hex");
  }

  async function uniqueUserEmailCheck(email = "", currentId = 0) {
    if (!email) return;
    const rows = await query("SELECT id FROM app_users WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1", [email, currentId || 0]);
    if (rows.length) throw new Error("อีเมลนี้ถูกใช้แล้ว");
  }

  function sanitizeBackupRows(tableName, rows = []) {
    return (rows || []).map((row) => {
      const copy = { ...row };
      if (tableName === "app_users") {
        delete copy.reset_password_token_hash;
        delete copy.reset_password_expires_at;
      }
      return copy;
    });
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function sqlDateTime(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "");
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function orderSqlDateTime(orderDate = "") {
    const datePart = String(orderDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const now = new Date();
    return `${datePart} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  }

  function monthlyDocumentPrefix(prefix = "DOC", dateValue = new Date().toISOString().slice(0, 10)) {
    const rawDate = String(dateValue || new Date().toISOString().slice(0, 10));
    const year = Number(rawDate.slice(0, 4)) || new Date().getFullYear();
    const month = rawDate.slice(5, 7) || pad2(new Date().getMonth() + 1);
    return `${prefix}${String(year + 543).slice(-2)}${month}`;
  }

  function isTransferMethod(method = "") {
    const text = String(method || "").toLowerCase();
    return text === "transfer" || text.includes("โอน") || text.includes("qr");
  }

  function stockMovementReferenceFromText(movement = {}) {
    const text = `${movement.note || ""} ${movement.reference_no || ""}`;
    const match = text.match(/\b(?:GR\d{6,}-\d+|CSH\d{8}|SND\d{8}|VCS\d{8}|VDN\d{8})\b/i);
    return match ? match[0].toUpperCase() : "";
  }

  function filterActiveStockMovements(movements = []) {
    const canceledReceiveRefs = new Set(
      movements.filter((movement) => movement.movement_type === "void_receive").map(stockMovementReferenceFromText).filter(Boolean)
    );
    const canceledSaleRefs = new Set(
      movements.filter((movement) => movement.movement_type === "void_sale").map(stockMovementReferenceFromText).filter(Boolean)
    );
    return movements.filter((movement) => {
      const ref = stockMovementReferenceFromText(movement);
      if (movement.movement_type === "void_receive") return false;
      if (movement.movement_type === "void_sale") return false;
      if (ref && canceledReceiveRefs.has(ref) && ["receive", "edit_receive", "edit_receive_reverse"].includes(movement.movement_type)) return false;
      if (ref && canceledSaleRefs.has(ref) && movement.movement_type === "sale") return false;
      return true;
    });
  }

  function isOpeningStockMovement(movement = {}) {
    return ["opening", "opening_adjust", "opening_balance", "opening_balance_delete"].includes(movement.movement_type);
  }

  async function availableFullStockAt(conn, productId, saleDateTime) {
    const saleMonth = saleDateTime.slice(0, 7);
    const monthStart = `${saleMonth}-01 00:00:00`;
    const [rows] = await conn.execute(
      "SELECT * FROM stock_movements WHERE product_id = ? AND created_at <= ? ORDER BY created_at ASC, id ASC FOR UPDATE",
      [productId, saleDateTime]
    );
    const activeMovements = filterActiveStockMovements(rows);
    const monthMovements = activeMovements.filter((movement) => sqlDateTime(movement.created_at).slice(0, 7) === saleMonth);
    const openingMovements = monthMovements.filter(isOpeningStockMovement);
    if (openingMovements.length) {
      const openingFull = openingMovements.reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0);
      const monthDelta = monthMovements
        .filter((movement) => !isOpeningStockMovement(movement) && sqlDateTime(movement.created_at) >= monthStart)
        .reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0);
      return openingFull + monthDelta;
    }
    return activeMovements.reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0);
  }

  async function ensureEnoughEmptyStockForReceipt(conn, items = []) {
    const requiredByProduct = new Map();
    items.forEach((item) => {
      const productId = Number(item.product_id || 0);
      const quantity = Number(item.quantity_empty || 0);
      if (!productId || quantity <= 0) return;
      requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + quantity);
    });
    for (const [productId, requiredQty] of requiredByProduct.entries()) {
      const [productRows] = await conn.execute("SELECT id, sku, name, stock_empty FROM products WHERE id = ? FOR UPDATE", [productId]);
      const product = productRows[0];
      if (!product) throw new Error("ไม่พบสินค้าในระบบ");
      const availableQty = Number(product.stock_empty || 0);
      if (requiredQty > availableQty) {
        throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} ถังเปล่าคงเหลือ ${availableQty.toLocaleString("th-TH")} แต่ต้องใช้แลก ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
      }
    }
  }

  async function ensureMonthlyStockTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS monthly_stock_counts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stock_month CHAR(7) NOT NULL,
        product_id INT NOT NULL,
        counted_full INT DEFAULT 0,
        counted_empty INT DEFAULT 0,
        system_full INT DEFAULT 0,
        system_empty INT DEFAULT 0,
        note VARCHAR(255),
        counted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_monthly_stock_product (stock_month, product_id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  async function ensureOpeningBalanceTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS opening_inventory_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stock_month CHAR(7) NOT NULL,
        product_id INT NOT NULL,
        quantity INT DEFAULT 0,
        empty_quantity INT DEFAULT 0,
        unit_price DECIMAL(12,2) DEFAULT 0,
        total_amount DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_opening_inventory_product_month (stock_month, product_id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    const columns = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'opening_inventory_items'
        AND COLUMN_NAME = 'empty_quantity'
    `);
    if (!columns.length) {
      await query("ALTER TABLE opening_inventory_items ADD COLUMN empty_quantity INT DEFAULT 0 AFTER quantity");
    }
  }

  async function ensureCashOpeningTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS cash_openings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cash_month CHAR(7) NOT NULL,
        opening_cash DECIMAL(14,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_cash_opening_month (cash_month)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  async function ensureBankOpeningTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS bank_openings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_month CHAR(7) NOT NULL,
        bank_account_id INT NOT NULL,
        opening_balance DECIMAL(14,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_bank_opening_month_account (bank_month, bank_account_id),
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  async function ensureUserTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(80) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(160),
        email VARCHAR(160),
        role VARCHAR(40) DEFAULT 'staff',
        permissions JSON NULL,
        reset_password_token_hash VARCHAR(128),
        reset_password_expires_at DATETIME NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    const columns = await query("SHOW COLUMNS FROM app_users LIKE 'permissions'");
    if (!columns.length) {
      await query("ALTER TABLE app_users ADD COLUMN permissions JSON NULL AFTER role");
    }
    const emailColumns = await query("SHOW COLUMNS FROM app_users LIKE 'email'");
    if (!emailColumns.length) {
      await query("ALTER TABLE app_users ADD COLUMN email VARCHAR(160) NULL AFTER display_name");
    }
    const resetTokenColumns = await query("SHOW COLUMNS FROM app_users LIKE 'reset_password_token_hash'");
    if (!resetTokenColumns.length) {
      await query("ALTER TABLE app_users ADD COLUMN reset_password_token_hash VARCHAR(128) NULL AFTER permissions");
    }
    const resetExpiryColumns = await query("SHOW COLUMNS FROM app_users LIKE 'reset_password_expires_at'");
    if (!resetExpiryColumns.length) {
      await query("ALTER TABLE app_users ADD COLUMN reset_password_expires_at DATETIME NULL AFTER reset_password_token_hash");
    }
    const rows = await query("SELECT COUNT(*) AS count FROM app_users");
    if (!Number(rows[0]?.count || 0)) {
      const user = createDefaultUser();
      await query(
        "INSERT INTO app_users (username, password_hash, display_name, email, role, permissions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [user.username, user.password_hash, user.display_name, user.email, user.role, user.permissions, user.is_active]
      );
    }
  }

  async function ensureBranchTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        tax_id VARCHAR(40),
        phone VARCHAR(40),
        address VARCHAR(255),
        payment_qr_image LONGTEXT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    try {
      await query("ALTER TABLE branches ADD COLUMN payment_qr_image LONGTEXT NULL AFTER address");
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") throw error;
    }
    const rows = await query("SELECT COUNT(*) AS count FROM branches");
    if (!Number(rows[0]?.count || 0)) {
      await query(
        "INSERT INTO branches (name, tax_id, phone, address, is_active) VALUES (?, ?, ?, ?, 1)",
        ["สาขาปากเกร็ด", "0100000000000", "", ""]
      );
    }
  }

  async function ensurePaymentColumns() {
    const addColumn = async (sql) => {
      try {
        await query(sql);
      } catch (error) {
        if (error.code !== "ER_DUP_FIELDNAME") throw error;
      }
    };
    await addColumn("ALTER TABLE payments ADD COLUMN bank_account_id INT NULL");
    await addColumn("ALTER TABLE payments ADD COLUMN reference_no VARCHAR(80) NULL");
    await addColumn("ALTER TABLE payments ADD COLUMN is_active TINYINT(1) DEFAULT 1");
    await addColumn("ALTER TABLE payments ADD COLUMN status VARCHAR(40) DEFAULT 'รับเงินแล้ว'");
    await addColumn("ALTER TABLE payments ADD COLUMN canceled_at DATETIME NULL");
    await addColumn("ALTER TABLE payments ADD COLUMN source_type VARCHAR(40) DEFAULT 'payment'");
    await addColumn("ALTER TABLE payments ADD COLUMN party_name VARCHAR(160) NULL");
    await addColumn("ALTER TABLE payments ADD COLUMN description VARCHAR(255) NULL");
    await addColumn("ALTER TABLE payments ADD COLUMN debt_reduction_amount DECIMAL(12,2) DEFAULT 0 AFTER amount");
    await query("UPDATE payments SET debt_reduction_amount = 0 WHERE debt_reduction_amount IS NULL");
    await query("UPDATE payments SET status = 'ยกเลิก' WHERE COALESCE(is_active, 1) = 0 AND (status IS NULL OR status <> 'ยกเลิก')");
  }

  async function ensureCustomerColumns() {
    const addColumn = async (sql) => {
      try {
        await query(sql);
      } catch (error) {
        if (error.code !== "ER_DUP_FIELDNAME") throw error;
      }
    };
    await addColumn("ALTER TABLE customers ADD COLUMN line_id VARCHAR(80) NULL AFTER phone");
    await addColumn("ALTER TABLE customers ADD COLUMN is_priority TINYINT(1) DEFAULT 0 AFTER is_active");
  }

  async function assertUniqueCustomerPhone(phone = "", currentId = 0) {
    const normalized = normalizeCustomerPhone(phone);
    if (!normalized) return;
    const rows = await query("SELECT id, name, phone FROM customers WHERE COALESCE(is_active, 1) = 1");
    const duplicate = rows.find((customer) =>
      Number(customer.id) !== Number(currentId) &&
      normalizeCustomerPhone(customer.phone) === normalized
    );
    if (duplicate) throw new Error(`เบอร์โทรนี้ซ้ำกับลูกค้า ${duplicate.name || ""}`);
  }

  async function ensureExpenseColumns() {
    const addColumn = async (sql) => {
      try {
        await query(sql);
      } catch (error) {
        if (error.code !== "ER_DUP_FIELDNAME") throw error;
      }
    };
    await addColumn("ALTER TABLE expenses ADD COLUMN source_type VARCHAR(40) DEFAULT 'expense'");
    await addColumn("ALTER TABLE expenses ADD COLUMN payee_name VARCHAR(160) NULL");
    await addColumn("ALTER TABLE expenses ADD COLUMN payment_method VARCHAR(40) DEFAULT 'cash'");
    await addColumn("ALTER TABLE expenses ADD COLUMN bank_account_id INT NULL");
    await addColumn("ALTER TABLE expenses ADD COLUMN reference_no VARCHAR(80) NULL");
    await addColumn("ALTER TABLE expenses ADD COLUMN note VARCHAR(255) NULL");
    await addColumn("ALTER TABLE expenses ADD COLUMN is_active TINYINT(1) DEFAULT 1");
    await addColumn("ALTER TABLE expenses ADD COLUMN status VARCHAR(40) DEFAULT 'บันทึกแล้ว'");
    await addColumn("ALTER TABLE expenses ADD COLUMN canceled_at DATETIME NULL");
    await query("UPDATE expenses SET status = 'ยกเลิก' WHERE COALESCE(is_active, 1) = 0 AND (status IS NULL OR status <> 'ยกเลิก')");
  }

  async function enrichOrders() {
    const orders = await query(`
      SELECT o.*, c.name AS customer_name, c.customer_type, c.latitude AS customer_latitude, c.longitude AS customer_longitude
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      ORDER BY o.id DESC
    `);
    const items = await query(`
      SELECT oi.*, p.name AS product_name
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
    `);
    return orders.map((order) => ({
      ...order,
      items: items.filter((item) => item.order_id === order.id),
    }));
  }

  async function nextProductSku(category = "accessory") {
    const prefix = categoryPrefix(category);
    const rows = await query("SELECT sku FROM products WHERE sku LIKE ?", [`${prefix}-%`]);
    const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d{4})$`);
    const max = rows.reduce((highest, row) => {
      const match = String(row.sku || "").match(pattern);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    return `${prefix}-${String(max + 1).padStart(4, "0")}`;
  }

  return {
    async authenticateUser(input = {}) {
      await ensureUserTable();
      const username = String(input.username || "").trim();
      const rows = await query(
        "SELECT id, username, email, password_hash, display_name, role, permissions, is_active FROM app_users WHERE username = ? OR LOWER(email) = LOWER(?) LIMIT 1",
        [username, username]
      );
      const user = rows[0];
      if (!user || user.is_active === false || user.is_active === 0) return null;
      if (!verifyPassword(input.password, user.password_hash)) return null;
      return publicUser(user);
    },
    async createPasswordResetToken(input = {}) {
      await ensureUserTable();
      const identifier = String(input.identifier || "").trim();
      if (!identifier) throw new Error("กรุณากรอกชื่อผู้ใช้หรืออีเมล");
      const rows = await query(
        "SELECT id, username, email, display_name, role, permissions, is_active FROM app_users WHERE COALESCE(is_active, 1) = 1 AND (username = ? OR LOWER(email) = LOWER(?)) LIMIT 1",
        [identifier, identifier]
      );
      const user = rows[0];
      if (!user || !normalizeEmail(user.email || "")) return { ok: true, email: "" };
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await query(
        "UPDATE app_users SET reset_password_token_hash = ?, reset_password_expires_at = ? WHERE id = ?",
        [hashResetToken(token), sqlDateTime(expiresAt), user.id]
      );
      return {
        ok: true,
        email: normalizeEmail(user.email || ""),
        token,
        expires_at: expiresAt.toISOString(),
        user: publicUser(user),
      };
    },
    async resetPasswordWithToken(input = {}) {
      await ensureUserTable();
      const token = String(input.token || "").trim();
      if (!token) throw new Error("ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง");
      const password = validatePassword(input.new_password);
      const rows = await query(
        "SELECT id FROM app_users WHERE reset_password_token_hash = ? AND reset_password_expires_at > NOW() AND COALESCE(is_active, 1) = 1 LIMIT 1",
        [hashResetToken(token)]
      );
      const user = rows[0];
      if (!user) throw new Error("ลิงก์ตั้งรหัสผ่านหมดอายุหรือถูกใช้แล้ว");
      await query(
        "UPDATE app_users SET password_hash = ?, reset_password_token_hash = NULL, reset_password_expires_at = NULL WHERE id = ?",
        [hashPassword(password), user.id]
      );
      return { ok: true, userId: Number(user.id) };
    },
    async users() {
      await ensureUserTable();
      const rows = await query(
        "SELECT id, username, email, display_name, role, permissions, is_active, created_at FROM app_users ORDER BY is_active DESC, id ASC"
      );
      return rows.map(publicUser);
    },
    async createUser(input = {}) {
      await ensureUserTable();
      const username = validateUsername(input.username);
      const password = validatePassword(input.password);
      const email = validateOptionalEmail(input.email);
      if (!email) throw new Error("กรุณากรอกอีเมลผู้ใช้งาน");
      await uniqueUserEmailCheck(email);
      const role = input.role === "admin" ? "admin" : "staff";
      const permissions = permissionJson(input.permissions, role);
      try {
        const result = await query(
          "INSERT INTO app_users (username, email, password_hash, display_name, role, permissions, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
          [username, email, hashPassword(password), String(input.display_name || username).trim(), role, permissions]
        );
        const rows = await query("SELECT id, username, email, display_name, role, permissions, is_active, created_at FROM app_users WHERE id = ?", [result.insertId]);
        return publicUser(rows[0]);
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
        throw error;
      }
    },
    async updateUser(id, input = {}) {
      await ensureUserTable();
      const username = validateUsername(input.username);
      const email = validateOptionalEmail(input.email);
      if (!email) throw new Error("กรุณากรอกอีเมลผู้ใช้งาน");
      await uniqueUserEmailCheck(email, id);
      const role = input.role === "admin" ? "admin" : "staff";
      const permissions = permissionJson(input.permissions, role);
      const isActive = input.is_active === false || input.is_active === 0 ? 0 : 1;
      try {
        const result = await query(
          "UPDATE app_users SET username = ?, email = ?, display_name = ?, role = ?, permissions = ?, is_active = ? WHERE id = ?",
          [username, email, String(input.display_name || username).trim(), role, permissions, isActive, id]
        );
        if (!result.affectedRows) throw new Error("ไม่พบผู้ใช้งาน");
        const rows = await query("SELECT id, username, email, display_name, role, permissions, is_active, created_at FROM app_users WHERE id = ?", [id]);
        return publicUser(rows[0]);
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
        throw error;
      }
    },
    async resetUserPassword(id, input = {}) {
      await ensureUserTable();
      const result = await query(
        "UPDATE app_users SET password_hash = ?, reset_password_token_hash = NULL, reset_password_expires_at = NULL WHERE id = ?",
        [hashPassword(validatePassword(input.password)), id]
      );
      if (!result.affectedRows) throw new Error("ไม่พบผู้ใช้งาน");
      return { id: Number(id), ok: true };
    },
    async changePassword(userId, input = {}) {
      await ensureUserTable();
      const rows = await query("SELECT id, password_hash FROM app_users WHERE id = ? AND COALESCE(is_active, 1) = 1", [userId]);
      const user = rows[0];
      if (!user) throw new Error("ไม่พบผู้ใช้งาน");
      if (!verifyPassword(input.current_password, user.password_hash)) throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
      await query(
        "UPDATE app_users SET password_hash = ?, reset_password_token_hash = NULL, reset_password_expires_at = NULL WHERE id = ?",
        [hashPassword(validatePassword(input.new_password)), userId]
      );
      return { ok: true };
    },
    async deleteUser(id) {
      await ensureUserTable();
      const result = await query("UPDATE app_users SET is_active = 0 WHERE id = ?", [id]);
      if (!result.affectedRows) throw new Error("ไม่พบผู้ใช้งาน");
      return { id: Number(id), deleted: true };
    },
    async health() {
      await query("SELECT 1");
      return { ok: true, engine: "mysql", message: "API is connected to MySQL" };
    },
    async backupData() {
      const existingRows = await query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      const existingTables = new Set(existingRows.map((row) => row.TABLE_NAME));
      const tables = {};
      for (const tableName of backupTables) {
        tables[tableName] = existingTables.has(tableName)
          ? sanitizeBackupRows(tableName, await query(`SELECT * FROM ${tableName} ORDER BY id ASC`))
          : [];
      }
      return {
        metadata: {
          app: "GasFlow",
          backup_type: "full-data-json",
          engine: "mysql",
          database: env("MYSQL_DATABASE", "gasflow"),
          generated_at: new Date().toISOString(),
          table_count: Object.keys(tables).length,
          row_counts: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])),
        },
        tables,
      };
    },
    async dashboard() {
      const customers = await this.customers();
      const products = await this.products();
      const suppliers = await this.suppliers();
      const bankAccounts = await this.bankAccounts();
      const branches = await this.branches();
      const goodsReceipts = await this.goodsReceipts();
      const supplierPaymentVouchers = await this.supplierPaymentVouchers();
      const openingBalances = await this.openingBalances();
      const cashOpenings = await this.cashOpenings();
      const bankOpenings = await this.bankOpenings();
      const monthlyStockCounts = await this.monthlyStockCounts();
      const stockMovements = await this.stockMovements();
      const orders = await this.orders();
      const payments = await this.payments();
      const customerReceiptVouchers = await this.customerReceiptVouchers();
      const generalReceiptVouchers = await this.generalReceiptVouchers();
      const expenses = await this.expenses();
      return {
        metrics: {
          todaySales: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
          orderCount: orders.length,
          paidToday: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
          fullCylinders: products.filter((p) => p.category === "gas").reduce((sum, p) => sum + Number(p.stock_full || 0), 0),
          emptyCylinders: products.filter((p) => p.category === "gas").reduce((sum, p) => sum + Number(p.stock_empty || 0), 0),
          debtTotal: customers.reduce((sum, c) => sum + Number(c.balance_due || 0), 0),
        },
        customers,
        products,
        suppliers,
        bankAccounts,
        branches,
        goodsReceipts,
        supplierPaymentVouchers,
        openingBalances,
        cashOpenings,
        bankOpenings,
        monthlyStockCounts,
        stockMovements,
        orders,
        payments,
        customerReceiptVouchers,
        generalReceiptVouchers,
        expenses,
      };
    },
    async branches() {
      await ensureBranchTable();
      return query("SELECT * FROM branches WHERE COALESCE(is_active, 1) = 1 ORDER BY id DESC");
    },
    async createBranch(input = {}) {
      await ensureBranchTable();
      const name = String(input.name || "").trim();
      if (!name) throw new Error("กรุณากรอกชื่อสาขา");
      const result = await query(
        "INSERT INTO branches (name, tax_id, phone, address, payment_qr_image, is_active) VALUES (?, ?, ?, ?, ?, 1)",
        [name, String(input.tax_id || "").trim(), String(input.phone || "").trim(), String(input.address || "").trim(), sanitizePaymentQrImage(input.payment_qr_image)]
      );
      const rows = await query("SELECT * FROM branches WHERE id = ?", [result.insertId]);
      return rows[0];
    },
    async updateBranch(id, input = {}) {
      await ensureBranchTable();
      const name = String(input.name || "").trim();
      if (!name) throw new Error("กรุณากรอกชื่อสาขา");
      const paymentQrImage = input.payment_qr_image === undefined ? null : sanitizePaymentQrImage(input.payment_qr_image);
      const result = await query(
        "UPDATE branches SET name = ?, tax_id = ?, phone = ?, address = ?, payment_qr_image = COALESCE(?, payment_qr_image) WHERE id = ?",
        [name, String(input.tax_id || "").trim(), String(input.phone || "").trim(), String(input.address || "").trim(), paymentQrImage, id]
      );
      if (!result.affectedRows) throw new Error("ไม่พบสาขา");
      const rows = await query("SELECT * FROM branches WHERE id = ?", [id]);
      return rows[0];
    },
    async deleteBranch(id) {
      await ensureBranchTable();
      const result = await query("UPDATE branches SET is_active = 0 WHERE id = ?", [id]);
      if (!result.affectedRows) throw new Error("ไม่พบสาขา");
      return { id: Number(id), deleted: true };
    },
    async customers() {
      await ensureCustomerColumns();
      return query("SELECT * FROM customers WHERE COALESCE(is_active, 1) = 1 ORDER BY id DESC");
    },
    async createCustomer(input) {
      await ensureCustomerColumns();
      await assertUniqueCustomerPhone(input.phone);
      const result = await query(
        "INSERT INTO customers (name, phone, line_id, address, customer_type, credit_limit, balance_due, cylinders_on_hand, latitude, longitude, is_priority, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
        [
          input.name || "ลูกค้าใหม่",
          input.phone || "",
          input.line_id || "",
          input.address || "",
          input.customer_type || "ทั่วไป",
          Number(input.credit_limit || 0),
          Number(input.balance_due || 0),
          input.cylinders_on_hand || "",
          input.latitude === "" || input.latitude === undefined ? null : Number(input.latitude),
          input.longitude === "" || input.longitude === undefined ? null : Number(input.longitude),
          input.is_priority === true || input.is_priority === 1 || input.is_priority === "1" || input.is_priority === "true" ? 1 : 0,
        ]
      );
      return { id: result.insertId, ...input };
    },
    async updateCustomer(id, input) {
      await ensureCustomerColumns();
      await assertUniqueCustomerPhone(input.phone, id);
      await query(
        "UPDATE customers SET name = ?, phone = ?, line_id = ?, address = ?, customer_type = ?, credit_limit = ?, balance_due = ?, cylinders_on_hand = ?, latitude = ?, longitude = ? WHERE id = ?",
        [
          input.name || "ลูกค้าใหม่",
          input.phone || "",
          input.line_id || "",
          input.address || "",
          input.customer_type || "ทั่วไป",
          Number(input.credit_limit || 0),
          Number(input.balance_due || 0),
          input.cylinders_on_hand || "",
          input.latitude === "" || input.latitude === undefined ? null : Number(input.latitude),
          input.longitude === "" || input.longitude === undefined ? null : Number(input.longitude),
          id,
        ]
      );
      const rows = await query("SELECT * FROM customers WHERE id = ?", [id]);
      if (!rows[0]) throw new Error("Customer not found");
      return rows[0];
    },
    async updateCustomerPriority(id, input) {
      await ensureCustomerColumns();
      const result = await query(
        "UPDATE customers SET is_priority = ? WHERE id = ? AND COALESCE(is_active, 1) = 1",
        [input.is_priority === true || input.is_priority === 1 || input.is_priority === "1" || input.is_priority === "true" ? 1 : 0, id]
      );
      if (!result.affectedRows) throw new Error("Customer not found");
      const rows = await query("SELECT * FROM customers WHERE id = ?", [id]);
      return rows[0];
    },
    async deleteCustomer(id) {
      await query("UPDATE customers SET is_active = 0 WHERE id = ?", [id]);
      return { id, deleted: true };
    },
    async suppliers() {
      return query("SELECT * FROM suppliers WHERE COALESCE(is_active, 1) = 1 ORDER BY id DESC");
    },
    async createSupplier(input) {
      const result = await query(
        "INSERT INTO suppliers (name, contact_name, phone, address, tax_id, payment_terms, note, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
        [
          input.name || "ตัวแทนจำหน่ายใหม่",
          input.contact_name || "",
          input.phone || "",
          input.address || "",
          input.tax_id || "",
          input.payment_terms || "",
          input.note || "",
        ]
      );
      const rows = await query("SELECT * FROM suppliers WHERE id = ?", [result.insertId]);
      return rows[0];
    },
    async updateSupplier(id, input) {
      await query(
        "UPDATE suppliers SET name = ?, contact_name = ?, phone = ?, address = ?, tax_id = ?, payment_terms = ?, note = ? WHERE id = ?",
        [
          input.name || "ตัวแทนจำหน่าย",
          input.contact_name || "",
          input.phone || "",
          input.address || "",
          input.tax_id || "",
          input.payment_terms || "",
          input.note || "",
          id,
        ]
      );
      const rows = await query("SELECT * FROM suppliers WHERE id = ?", [id]);
      if (!rows[0]) throw new Error("Supplier not found");
      return rows[0];
    },
    async deleteSupplier(id) {
      await query("UPDATE suppliers SET is_active = 0 WHERE id = ?", [id]);
      return { id, deleted: true };
    },
    async bankAccounts() {
      return query("SELECT * FROM bank_accounts WHERE COALESCE(is_active, 1) = 1 ORDER BY id DESC");
    },
    async createBankAccount(input) {
      const openingBalance = Number(input.opening_balance || 0);
      const currentBalance = input.current_balance === "" || input.current_balance === undefined ? openingBalance : Number(input.current_balance || 0);
      const result = await query(
        "INSERT INTO bank_accounts (bank_name, account_name, account_number, branch_name, account_type, opening_balance, current_balance, note, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
        [
          input.bank_name || "ธนาคาร",
          input.account_name || "บัญชีร้าน",
          input.account_number || "",
          input.branch_name || "",
          input.account_type || "ออมทรัพย์",
          openingBalance,
          currentBalance,
          input.note || "",
        ]
      );
      const rows = await query("SELECT * FROM bank_accounts WHERE id = ?", [result.insertId]);
      return rows[0];
    },
    async updateBankAccount(id, input) {
      await query(
        "UPDATE bank_accounts SET bank_name = ?, account_name = ?, account_number = ?, branch_name = ?, account_type = ?, opening_balance = ?, current_balance = ?, note = ? WHERE id = ?",
        [
          input.bank_name || "ธนาคาร",
          input.account_name || "บัญชีร้าน",
          input.account_number || "",
          input.branch_name || "",
          input.account_type || "ออมทรัพย์",
          Number(input.opening_balance || 0),
          Number(input.current_balance || 0),
          input.note || "",
          id,
        ]
      );
      const rows = await query("SELECT * FROM bank_accounts WHERE id = ?", [id]);
      if (!rows[0]) throw new Error("Bank account not found");
      return rows[0];
    },
    async deleteBankAccount(id) {
      await query("UPDATE bank_accounts SET is_active = 0 WHERE id = ?", [id]);
      return { id, deleted: true };
    },
    async products() {
      return query("SELECT * FROM products WHERE COALESCE(is_active, 1) = 1 ORDER BY id");
    },
    async nextProductSku(category) {
      return { sku: await nextProductSku(category) };
    },
    async createProduct(input) {
      const category = input.category || "accessory";
      const sku = input.sku || await nextProductSku(category);
      const initialFull = Number(input.stock_full || 0);
      const initialEmpty = Number(input.stock_empty || 0);
      const result = await query(
        "INSERT INTO products (sku, name, category, unit, unit_price, stock_full, stock_empty, reorder_level, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
        [
          sku,
          input.name || "สินค้าใหม่",
          category,
          input.unit || "ชิ้น",
          Number(input.unit_price || 0),
          initialFull,
          initialEmpty,
          Number(input.reorder_level || 0),
        ]
      );
      if (initialFull || initialEmpty) {
        await query(
          "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
          [result.insertId, "opening", initialFull, initialEmpty, "ยอดตั้งต้นตอนเริ่มใช้ระบบ"]
        );
      }
      const rows = await query("SELECT * FROM products WHERE id = ?", [result.insertId]);
      return rows[0];
    },
    async updateProduct(id, input) {
      const category = input.category || "accessory";
      const sku = input.sku || await nextProductSku(category);
      const beforeRows = await query("SELECT stock_full, stock_empty FROM products WHERE id = ?", [id]);
      if (!beforeRows[0]) throw new Error("Product not found");
      const nextFull = Number(input.stock_full || 0);
      const nextEmpty = Number(input.stock_empty || 0);
      const fullDelta = nextFull - Number(beforeRows[0].stock_full || 0);
      const emptyDelta = nextEmpty - Number(beforeRows[0].stock_empty || 0);
      await query(
        "UPDATE products SET sku = ?, name = ?, category = ?, unit = ?, unit_price = ?, stock_full = ?, stock_empty = ?, reorder_level = ? WHERE id = ?",
        [
          sku,
          input.name || "สินค้า",
          category,
          input.unit || "ชิ้น",
          Number(input.unit_price || 0),
          nextFull,
          nextEmpty,
          Number(input.reorder_level || 0),
          id,
        ]
      );
      if (fullDelta || emptyDelta) {
        await query(
          "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
          [id, "opening_adjust", fullDelta, emptyDelta, "แก้ไขจำนวนสินค้าโดยตรง"]
        );
      }
      const rows = await query("SELECT * FROM products WHERE id = ?", [id]);
      return rows[0];
    },
    async deleteProduct(id) {
      await query("UPDATE products SET is_active = 0 WHERE id = ?", [id]);
      return { id, deleted: true };
    },
    async adjustStock(id, input) {
      await query(
        "UPDATE products SET stock_full = stock_full + ?, stock_empty = stock_empty + ? WHERE id = ?",
        [Number(input.full_delta || 0), Number(input.empty_delta || 0), id]
      );
      await query(
        "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
        [id, input.movement_type || "adjust", Number(input.full_delta || 0), Number(input.empty_delta || 0), input.note || ""]
      );
      const rows = await query("SELECT * FROM products WHERE id = ?", [id]);
      return rows[0];
    },
    async monthlyStockCounts(month = "") {
      await ensureMonthlyStockTable();
      const params = [];
      let where = "";
      if (month) {
        where = "WHERE msc.stock_month = ?";
        params.push(month);
      }
      return query(`
        SELECT msc.*, p.sku, p.name AS product_name, p.category, p.unit
        FROM monthly_stock_counts msc
        JOIN products p ON p.id = msc.product_id
        ${where}
        ORDER BY msc.stock_month DESC, p.id
      `, params);
    },
    async saveMonthlyStockCounts(input) {
      await ensureMonthlyStockTable();
      const stockMonth = /^\d{4}-\d{2}$/.test(String(input.stock_month || "")) ? input.stock_month : new Date().toISOString().slice(0, 7);
      const items = Array.isArray(input.items) ? input.items : [];
      for (const item of items) {
        const productId = Number(item.product_id || 0);
        if (!productId) continue;
        const productRows = await query("SELECT stock_full, stock_empty FROM products WHERE id = ?", [productId]);
        const product = productRows[0] || {};
        await query(`
          INSERT INTO monthly_stock_counts (stock_month, product_id, counted_full, counted_empty, system_full, system_empty, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            counted_full = VALUES(counted_full),
            counted_empty = VALUES(counted_empty),
            system_full = VALUES(system_full),
            system_empty = VALUES(system_empty),
            note = VALUES(note),
            counted_at = CURRENT_TIMESTAMP
        `, [
          stockMonth,
          productId,
          Number(item.counted_full || 0),
          Number(item.counted_empty || 0),
          Number(product.stock_full || 0),
          Number(product.stock_empty || 0),
          input.note || item.note || "",
        ]);
      }
      return { stock_month: stockMonth, items: await this.monthlyStockCounts(stockMonth) };
    },
    async deleteMonthlyStockCount(id) {
      await ensureMonthlyStockTable();
      await query("DELETE FROM monthly_stock_counts WHERE id = ?", [id]);
      return { id, deleted: true };
    },
    async openingBalances(month = "") {
      await ensureOpeningBalanceTable();
      const params = [];
      let where = "";
      if (month) {
        where = "WHERE oi.stock_month = ?";
        params.push(month);
      }
      return query(`
        SELECT oi.*, p.sku, p.name AS product_name, p.category, p.unit
        FROM opening_inventory_items oi
        JOIN products p ON p.id = oi.product_id
        ${where}
        ORDER BY oi.stock_month DESC, p.sku ASC, oi.id ASC
      `, params);
    },
    async saveOpeningBalance(input) {
      await ensureOpeningBalanceTable();
      const stockMonth = /^\d{4}-\d{2}$/.test(String(input.stock_month || "")) ? input.stock_month : new Date().toISOString().slice(0, 7);
      const productId = Number(input.product_id || 0);
      if (!productId) throw new Error("Product is required");
      const quantity = Number(input.quantity || 0);
      const emptyQuantity = Number(input.empty_quantity || 0);
      const unitPrice = Number(input.unit_price || 0);
      if (quantity < 0 || emptyQuantity < 0) throw new Error("จำนวนต้องไม่ติดลบ");
      if (quantity <= 0 && emptyQuantity <= 0) throw new Error("กรุณากรอกถังเต็มหรือถังเปล่ามากกว่า 0");
      const totalAmount = quantity * unitPrice;
      const productRows = await query("SELECT id FROM products WHERE id = ? AND COALESCE(is_active, 1) = 1", [productId]);
      if (!productRows[0]) throw new Error("Product not found");
      const existingRows = await query("SELECT * FROM opening_inventory_items WHERE stock_month = ? AND product_id = ?", [stockMonth, productId]);
      const oldQuantity = Number(existingRows[0]?.quantity || 0);
      const oldEmptyQuantity = Number(existingRows[0]?.empty_quantity || 0);
      await query(`
        INSERT INTO opening_inventory_items (stock_month, product_id, quantity, empty_quantity, unit_price, total_amount)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          quantity = VALUES(quantity),
          empty_quantity = VALUES(empty_quantity),
          unit_price = VALUES(unit_price),
          total_amount = VALUES(total_amount),
          created_at = CURRENT_TIMESTAMP
      `, [stockMonth, productId, quantity, emptyQuantity, unitPrice, totalAmount]);
      const delta = quantity - oldQuantity;
      const emptyDelta = emptyQuantity - oldEmptyQuantity;
      if (delta || emptyDelta) {
        await query("UPDATE products SET stock_full = stock_full + ?, stock_empty = stock_empty + ? WHERE id = ?", [delta, emptyDelta, productId]);
        await query(
          "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [productId, "opening_balance", delta, emptyDelta, `ยอดยกมา ${stockMonth}`, `${stockMonth}-01 00:00:00`]
        );
      }
      return { stock_month: stockMonth, items: await this.openingBalances(stockMonth) };
    },
    async deleteOpeningBalance(id) {
      await ensureOpeningBalanceTable();
      const rows = await query("SELECT * FROM opening_inventory_items WHERE id = ?", [id]);
      const item = rows[0];
      if (!item) return { id, deleted: false };
      const quantity = Number(item.quantity || 0);
      const emptyQuantity = Number(item.empty_quantity || 0);
      if (quantity || emptyQuantity) {
        await query("UPDATE products SET stock_full = stock_full - ?, stock_empty = stock_empty - ? WHERE id = ?", [quantity, emptyQuantity, item.product_id]);
        await query(
          "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [item.product_id, "opening_balance_delete", -quantity, -emptyQuantity, `ลบยอดยกมา ${item.stock_month}`, `${item.stock_month}-01 00:00:01`]
        );
      }
      await query("DELETE FROM opening_inventory_items WHERE id = ?", [id]);
      return { id, deleted: true };
    },
    async cashOpenings(month = "") {
      await ensureCashOpeningTable();
      const params = [];
      let where = "";
      if (month) {
        where = "WHERE cash_month = ?";
        params.push(month);
      }
      return query(`
        SELECT *
        FROM cash_openings
        ${where}
        ORDER BY cash_month DESC, id DESC
      `, params);
    },
    async saveCashOpening(input) {
      await ensureCashOpeningTable();
      const cashMonth = /^\d{4}-\d{2}$/.test(String(input.cash_month || "")) ? input.cash_month : new Date().toISOString().slice(0, 7);
      const openingCash = Number(input.opening_cash || 0);
      await query(`
        INSERT INTO cash_openings (cash_month, opening_cash)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          opening_cash = VALUES(opening_cash),
          updated_at = CURRENT_TIMESTAMP
      `, [cashMonth, openingCash]);
      return { cash_month: cashMonth, items: await this.cashOpenings(cashMonth) };
    },
    async deleteCashOpening(id) {
      await ensureCashOpeningTable();
      await query("DELETE FROM cash_openings WHERE id = ?", [id]);
      return { id, deleted: true };
    },
    async bankOpenings(month = "") {
      await ensureBankOpeningTable();
      const params = [];
      let where = "";
      if (month) {
        where = "WHERE bo.bank_month = ?";
        params.push(month);
      }
      return query(`
        SELECT bo.*, ba.bank_name, ba.account_name, ba.account_number
        FROM bank_openings bo
        LEFT JOIN bank_accounts ba ON ba.id = bo.bank_account_id
        ${where}
        ORDER BY bo.bank_month DESC, ba.bank_name ASC, bo.id DESC
      `, params);
    },
    async saveBankOpening(input) {
      await ensureBankOpeningTable();
      const bankMonth = /^\d{4}-\d{2}$/.test(String(input.bank_month || "")) ? input.bank_month : new Date().toISOString().slice(0, 7);
      const bankAccountId = Number(input.bank_account_id || 0);
      if (!bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคาร");
      const openingBalance = Number(input.opening_balance || 0);
      const accounts = await query("SELECT id FROM bank_accounts WHERE id = ? AND COALESCE(is_active, 1) = 1 LIMIT 1", [bankAccountId]);
      if (!accounts.length) throw new Error("ไม่พบบัญชีธนาคาร");
      await query(`
        INSERT INTO bank_openings (bank_month, bank_account_id, opening_balance)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          opening_balance = VALUES(opening_balance),
          updated_at = CURRENT_TIMESTAMP
      `, [bankMonth, bankAccountId, openingBalance]);
      return { bank_month: bankMonth, bank_account_id: bankAccountId, items: await this.bankOpenings(bankMonth) };
    },
    async deleteBankOpening(id) {
      await ensureBankOpeningTable();
      await query("DELETE FROM bank_openings WHERE id = ?", [id]);
      return { id, deleted: true };
    },
    async stockMovements(month = "") {
      const params = [];
      let where = "";
      if (month) {
        where = "WHERE DATE_FORMAT(sm.created_at, '%Y-%m') = ?";
        params.push(month);
      }
      return query(`
        SELECT sm.*, p.sku, p.name AS product_name, p.category, p.unit
        FROM stock_movements sm
        JOIN products p ON p.id = sm.product_id
        ${where}
        ORDER BY sm.created_at ASC, sm.id ASC
      `, params);
    },
    async goodsReceipts() {
      const receipts = await query(`
        SELECT gr.*, s.name AS supplier_name
        FROM goods_receipts gr
        LEFT JOIN suppliers s ON s.id = gr.supplier_id
        WHERE COALESCE(gr.is_active, 1) = 1
        ORDER BY gr.id DESC
      `);
      const items = await query(`
        SELECT gri.*, p.name AS product_name, p.sku
        FROM goods_receipt_items gri
        JOIN products p ON p.id = gri.product_id
      `);
      return receipts.map((receipt) => ({
        ...receipt,
        items: items.filter((item) => item.receipt_id === receipt.id),
      }));
    },
    async supplierPaymentVouchers() {
      return query(`
        SELECT spv.*, s.name AS supplier_name, gr.receipt_no, gr.invoice_no
        FROM supplier_payment_vouchers spv
        LEFT JOIN suppliers s ON s.id = spv.supplier_id
        LEFT JOIN goods_receipts gr ON gr.id = spv.goods_receipt_id
        WHERE COALESCE(spv.is_active, 1) = 1
        ORDER BY spv.id DESC
      `);
    },
    async createSupplierPaymentVoucher(input) {
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const receiptId = Number(input.goods_receipt_id || 0);
        const [receipts] = await conn.execute("SELECT * FROM goods_receipts WHERE id = ? AND COALESCE(is_active, 1) = 1", [receiptId]);
        const receipt = receipts[0];
        if (!receipt) throw new Error("Goods receipt not found");
        if (receipt.payment_status === "ชำระแล้ว") throw new Error("ใบรับนี้ชำระแล้ว");
        const paymentMethod = input.payment_method === "transfer" ? "transfer" : "cash";
        const bankAccountId = paymentMethod === "transfer" ? Number(input.bank_account_id || 0) : null;
        if (paymentMethod === "transfer" && !bankAccountId) throw new Error("Bank account is required for transfer payment");
        const amount = Number(input.amount || receipt.total_amount || 0);
        if (amount <= 0) throw new Error("Invalid payment amount");
        const voucherNo = `PV${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Date.now().toString().slice(-4)}`;
        const referenceNo = String(input.reference_no || "").trim() || voucherNo;
        const [existingRefs] = await conn.execute(
          "SELECT id FROM supplier_payment_vouchers WHERE reference_no = ? AND COALESCE(is_active, 1) = 1 LIMIT 1",
          [referenceNo]
        );
        if (existingRefs.length) throw new Error(`เลขที่อ้างอิง ${referenceNo} ถูกใช้แล้ว`);
        const [voucherResult] = await conn.execute(
          "INSERT INTO supplier_payment_vouchers (voucher_no, goods_receipt_id, supplier_id, paid_at, payment_method, bank_account_id, amount, reference_no, note, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
          [
            voucherNo,
            receiptId,
            receipt.supplier_id,
            input.paid_at || new Date().toISOString().slice(0, 10),
            paymentMethod,
            bankAccountId,
            amount,
            referenceNo,
            input.note || "",
          ]
        );
        await conn.execute(
          "UPDATE goods_receipts SET payment_status = ?, payment_method = ?, bank_account_id = ? WHERE id = ?",
          ["ชำระแล้ว", paymentMethod, bankAccountId, receiptId]
        );
        if (paymentMethod === "transfer") {
          await conn.execute(
            "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
            [amount, bankAccountId]
          );
        }
        await conn.commit();
        const rows = await query("SELECT * FROM supplier_payment_vouchers WHERE id = ?", [voucherResult.insertId]);
        return rows[0];
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async deleteSupplierPaymentVoucher(id) {
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [vouchers] = await conn.execute("SELECT * FROM supplier_payment_vouchers WHERE id = ? AND COALESCE(is_active, 1) = 1", [id]);
        const voucher = vouchers[0];
        if (!voucher) throw new Error("Payment voucher not found");
        const [otherVouchers] = await conn.execute(
          "SELECT id FROM supplier_payment_vouchers WHERE goods_receipt_id = ? AND id <> ? AND COALESCE(is_active, 1) = 1 LIMIT 1",
          [voucher.goods_receipt_id, id]
        );
        if (!otherVouchers.length) {
          await conn.execute(
            "UPDATE goods_receipts SET payment_status = ?, payment_method = ?, bank_account_id = NULL WHERE id = ?",
            ["เครดิต", "credit", voucher.goods_receipt_id]
          );
        }
        if (voucher.payment_method === "transfer" && voucher.bank_account_id) {
          await conn.execute(
            "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
            [Number(voucher.amount || 0), voucher.bank_account_id]
          );
        }
        await conn.execute("UPDATE supplier_payment_vouchers SET is_active = 0 WHERE id = ?", [id]);
        await conn.commit();
        return { id, deleted: true };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async createGoodsReceipt(input) {
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const items = Array.isArray(input.items) && input.items.length ? input.items : [{
          product_id: input.product_id,
          quantity_full: input.quantity_full,
          quantity_empty: input.quantity_empty,
          unit_cost: input.unit_cost,
        }];
        const normalizedItems = items.map((item) => ({
          product_id: Number(item.product_id),
          quantity_full: Math.max(0, Number(item.quantity_full || 0)),
          quantity_empty: Math.max(0, Number(item.quantity_empty || 0)),
          unit_cost: Math.max(0, Number(item.unit_cost || 0)),
        })).filter((item) => item.product_id && (item.quantity_full || item.quantity_empty));
        if (!normalizedItems.length) throw new Error("No receipt items");
        await ensureEnoughEmptyStockForReceipt(conn, normalizedItems);

        const lineSubtotal = normalizedItems.reduce((sum, item) => sum + item.quantity_full * item.unit_cost, 0);
        const vatRate = Math.max(0, Number(input.vat_rate || 0));
        const vatType = input.vat_type === "inclusive" ? "inclusive" : "exclusive";
        const vatAmount = vatType === "inclusive" ? lineSubtotal * vatRate / (100 + vatRate || 1) : lineSubtotal * vatRate / 100;
        const subtotal = vatType === "inclusive" ? lineSubtotal - vatAmount : lineSubtotal;
        const total = vatType === "inclusive" ? lineSubtotal : lineSubtotal + vatAmount;
        const invoiceNo = String(input.invoice_no || "").trim();
        if (invoiceNo) {
          const [existingReceipts] = await conn.execute(
            "SELECT id FROM goods_receipts WHERE invoice_no = ? AND COALESCE(is_active, 1) = 1 LIMIT 1",
            [invoiceNo]
          );
          if (existingReceipts.length) throw new Error(`เลขที่อ้างอิง ${invoiceNo} ถูกใช้แล้ว`);
        }
        const receiptNo = `GR${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Date.now().toString().slice(-4)}`;
        const paymentMethod = ["cash", "transfer"].includes(input.payment_method) ? input.payment_method : "credit";
        const paymentStatus = paymentMethod === "credit" ? "เครดิต" : "ชำระแล้ว";
        const creditDays = paymentMethod === "credit" ? Math.max(0, Number(input.credit_days || 0)) : 0;
        const bankAccountId = paymentMethod === "transfer" ? Number(input.bank_account_id || 0) : null;
        if (paymentMethod === "transfer" && !bankAccountId) throw new Error("Bank account is required for transfer payment");
        const [receiptResult] = await conn.execute(
          "INSERT INTO goods_receipts (receipt_no, supplier_id, invoice_no, received_at, payment_status, payment_method, credit_days, bank_account_id, subtotal_amount, vat_type, vat_rate, vat_amount, total_amount, note, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
          [
            receiptNo,
            input.supplier_id ? Number(input.supplier_id) : null,
            invoiceNo,
            input.received_at || new Date().toISOString().slice(0, 10),
            paymentStatus,
            paymentMethod,
            creditDays,
            bankAccountId,
            subtotal,
            vatType,
            vatRate,
            vatAmount,
            total,
            input.note || "",
          ]
        );
        if (paymentMethod === "transfer") {
          await conn.execute(
            "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
            [total, bankAccountId]
          );
        }
        for (const item of normalizedItems) {
          await conn.execute(
            "INSERT INTO goods_receipt_items (receipt_id, product_id, quantity_full, quantity_empty, unit_cost, line_total) VALUES (?, ?, ?, ?, ?, ?)",
            [receiptResult.insertId, item.product_id, item.quantity_full, item.quantity_empty, item.unit_cost, item.quantity_full * item.unit_cost]
          );
          await conn.execute(
            "UPDATE products SET stock_full = stock_full + ?, stock_empty = stock_empty - ? WHERE id = ?",
            [item.quantity_full, item.quantity_empty, item.product_id]
          );
          await conn.execute(
            "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
            [item.product_id, "receive", item.quantity_full, -item.quantity_empty, `รับสินค้า ${receiptNo}`]
          );
        }
        await conn.commit();
        const rows = await query("SELECT * FROM goods_receipts WHERE id = ?", [receiptResult.insertId]);
        return rows[0];
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async updateGoodsReceipt(id, input) {
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [receipts] = await conn.execute("SELECT * FROM goods_receipts WHERE id = ? AND COALESCE(is_active, 1) = 1", [id]);
        if (!receipts[0]) throw new Error("Goods receipt not found");
        const receipt = receipts[0];
        const items = Array.isArray(input.items) && input.items.length ? input.items : [{
          product_id: input.product_id,
          quantity_full: input.quantity_full,
          quantity_empty: input.quantity_empty,
          unit_cost: input.unit_cost,
        }];
        const normalizedItems = items.map((item) => ({
          product_id: Number(item.product_id),
          quantity_full: Math.max(0, Number(item.quantity_full || 0)),
          quantity_empty: Math.max(0, Number(item.quantity_empty || 0)),
          unit_cost: Math.max(0, Number(item.unit_cost || 0)),
        })).filter((item) => item.product_id && (item.quantity_full || item.quantity_empty));
        if (!normalizedItems.length) throw new Error("No receipt items");

        const invoiceNo = String(input.invoice_no || "").trim();
        if (invoiceNo) {
          const [existingReceipts] = await conn.execute(
            "SELECT id FROM goods_receipts WHERE invoice_no = ? AND id <> ? AND COALESCE(is_active, 1) = 1 LIMIT 1",
            [invoiceNo, id]
          );
          if (existingReceipts.length) throw new Error(`เลขที่อ้างอิง ${invoiceNo} ถูกใช้แล้ว`);
        }

        const [oldItems] = await conn.execute("SELECT * FROM goods_receipt_items WHERE receipt_id = ?", [id]);
        for (const item of oldItems) {
          await conn.execute(
            "UPDATE products SET stock_full = stock_full - ?, stock_empty = stock_empty + ? WHERE id = ?",
            [Number(item.quantity_full || 0), Number(item.quantity_empty || 0), item.product_id]
          );
          await conn.execute(
            "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
            [item.product_id, "edit_receive_reverse", -Number(item.quantity_full || 0), Number(item.quantity_empty || 0), `แก้ไขใบรับ ${receipt.receipt_no}`]
          );
        }
        await ensureEnoughEmptyStockForReceipt(conn, normalizedItems);
        if (receipt.payment_method === "transfer" && receipt.bank_account_id) {
          await conn.execute(
            "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
            [Number(receipt.total_amount || 0), receipt.bank_account_id]
          );
        }

        const lineSubtotal = normalizedItems.reduce((sum, item) => sum + item.quantity_full * item.unit_cost, 0);
        const vatRate = Math.max(0, Number(input.vat_rate || 0));
        const vatType = input.vat_type === "inclusive" ? "inclusive" : "exclusive";
        const vatAmount = vatType === "inclusive" ? lineSubtotal * vatRate / (100 + vatRate || 1) : lineSubtotal * vatRate / 100;
        const subtotal = vatType === "inclusive" ? lineSubtotal - vatAmount : lineSubtotal;
        const total = vatType === "inclusive" ? lineSubtotal : lineSubtotal + vatAmount;
        const paymentMethod = ["cash", "transfer"].includes(input.payment_method) ? input.payment_method : "credit";
        const paymentStatus = paymentMethod === "credit" ? "เครดิต" : "ชำระแล้ว";
        const creditDays = paymentMethod === "credit" ? Math.max(0, Number(input.credit_days || 0)) : 0;
        const bankAccountId = paymentMethod === "transfer" ? Number(input.bank_account_id || 0) : null;
        if (paymentMethod === "transfer" && !bankAccountId) throw new Error("Bank account is required for transfer payment");

        await conn.execute(
          "UPDATE goods_receipts SET supplier_id = ?, invoice_no = ?, received_at = ?, payment_status = ?, payment_method = ?, credit_days = ?, bank_account_id = ?, subtotal_amount = ?, vat_type = ?, vat_rate = ?, vat_amount = ?, total_amount = ?, note = ? WHERE id = ?",
          [
            input.supplier_id ? Number(input.supplier_id) : null,
            invoiceNo,
            input.received_at || new Date().toISOString().slice(0, 10),
            paymentStatus,
            paymentMethod,
            creditDays,
            bankAccountId,
            subtotal,
            vatType,
            vatRate,
            vatAmount,
            total,
            input.note || "",
            id,
          ]
        );
        await conn.execute("DELETE FROM goods_receipt_items WHERE receipt_id = ?", [id]);
        if (paymentMethod === "transfer") {
          await conn.execute(
            "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
            [total, bankAccountId]
          );
        }
        for (const item of normalizedItems) {
          await conn.execute(
            "INSERT INTO goods_receipt_items (receipt_id, product_id, quantity_full, quantity_empty, unit_cost, line_total) VALUES (?, ?, ?, ?, ?, ?)",
            [id, item.product_id, item.quantity_full, item.quantity_empty, item.unit_cost, item.quantity_full * item.unit_cost]
          );
          await conn.execute(
            "UPDATE products SET stock_full = stock_full + ?, stock_empty = stock_empty - ? WHERE id = ?",
            [item.quantity_full, item.quantity_empty, item.product_id]
          );
          await conn.execute(
            "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
            [item.product_id, "edit_receive", item.quantity_full, -item.quantity_empty, `แก้ไขใบรับ ${receipt.receipt_no}`]
          );
        }
        await conn.commit();
        const rows = await query("SELECT * FROM goods_receipts WHERE id = ?", [id]);
        return rows[0];
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async deleteGoodsReceipt(id) {
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [receipts] = await conn.execute("SELECT * FROM goods_receipts WHERE id = ? AND COALESCE(is_active, 1) = 1", [id]);
        if (!receipts[0]) throw new Error("Goods receipt not found");
        const receipt = receipts[0];
        const [activeVouchers] = await conn.execute(
          "SELECT id FROM supplier_payment_vouchers WHERE goods_receipt_id = ? AND COALESCE(is_active, 1) = 1 LIMIT 1",
          [id]
        );
        if (activeVouchers.length) throw new Error("กรุณายกเลิกใบสำคัญจ่ายเจ้าหนี้ก่อนยกเลิกใบรับสินค้า");
        const [items] = await conn.execute("SELECT * FROM goods_receipt_items WHERE receipt_id = ?", [id]);
        for (const item of items) {
          await conn.execute(
            "UPDATE products SET stock_full = stock_full - ?, stock_empty = stock_empty + ? WHERE id = ?",
            [Number(item.quantity_full || 0), Number(item.quantity_empty || 0), item.product_id]
          );
          await conn.execute(
            "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
            [item.product_id, "void_receive", -Number(item.quantity_full || 0), Number(item.quantity_empty || 0), `ยกเลิกใบรับ ${receipts[0].receipt_no}`]
          );
        }
        if (receipt.payment_method === "transfer" && receipt.bank_account_id) {
          await conn.execute(
            "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
            [Number(receipt.total_amount || 0), receipt.bank_account_id]
          );
        }
        await conn.execute("UPDATE goods_receipts SET is_active = 0 WHERE id = ?", [id]);
        await conn.commit();
        return { id, deleted: true };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async orders() {
      return enrichOrders();
    },
    async createOrder(input) {
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const items = Array.isArray(input.items) && input.items.length ? input.items : [{ product_id: 1, quantity: 1, unit_price: 380 }];
        const lineSubtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
        const vatRate = Math.max(0, Number(input.vat_rate || 0));
        const vatType = input.vat_type === "inclusive" ? "inclusive" : "exclusive";
        const vatAmount = vatRate ? (vatType === "inclusive" ? lineSubtotal * vatRate / (100 + vatRate || 1) : lineSubtotal * vatRate / 100) : 0;
        const total = vatType === "inclusive" ? lineSubtotal : lineSubtotal + vatAmount;
        let orderNo = `OD${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Date.now().toString().slice(-4)}`;
        const requestedOrderPrefix = String(input.order_prefix || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
        if (requestedOrderPrefix) {
          const rawDate = String(input.order_date || new Date().toISOString().slice(0, 10));
          const year = Number(rawDate.slice(0, 4)) || new Date().getFullYear();
          const month = rawDate.slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0");
          const documentPrefix = `${requestedOrderPrefix}${String(year + 543).slice(-2)}${month}`;
          const [latestRows] = await conn.execute(
            "SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY order_no DESC LIMIT 1",
            [`${documentPrefix}%`]
          );
          const latestRun = Number(String(latestRows[0]?.order_no || "").slice(-4)) || 0;
          orderNo = `${documentPrefix}${String(latestRun + 1).padStart(4, "0")}`;
        }
        const orderCreatedAt = orderSqlDateTime(input.order_date);
        const requiredByProduct = new Map();
        const gasProductIds = new Set();
        items.forEach((item) => {
          const productId = Number(item.product_id || 0);
          if (!productId) return;
          requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + Number(item.quantity || 0));
        });
        for (const [productId, requiredQty] of requiredByProduct.entries()) {
          const [productRows] = await conn.execute("SELECT id, sku, name, category, stock_full FROM products WHERE id = ? FOR UPDATE", [productId]);
          const product = productRows[0];
          if (!product) throw new Error("ไม่พบสินค้าในระบบ");
          if (String(product.category || "").toLowerCase() === "gas") gasProductIds.add(Number(productId));
          const availableQty = Number(product.stock_full || 0);
          if (requiredQty > availableQty) {
            throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} คงเหลือ ${availableQty.toLocaleString("th-TH")} แต่ต้องการขาย ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
          }
          const stockCardAvailableQty = await availableFullStockAt(conn, productId, orderCreatedAt);
          if (requiredQty > stockCardAvailableQty) {
            throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} คงเหลือตาม Stock card ${stockCardAvailableQty.toLocaleString("th-TH")} แต่ต้องการขาย ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
          }
        }
        const [orderResult] = await conn.execute(
          "INSERT INTO orders (order_no, customer_id, status, delivery_address, delivery_time, payment_status, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [orderNo, Number(input.customer_id || 1), input.status || "รอดำเนินการ", input.delivery_address || "", input.delivery_time || "", input.payment_status || "รอชำระ", total, orderCreatedAt]
        );
        for (const item of items) {
          const productId = Number(item.product_id);
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unit_price || 0);
          await conn.execute(
            "INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)",
            [orderResult.insertId, productId, quantity, unitPrice, quantity * unitPrice]
          );
          const emptyReturn = gasProductIds.has(productId) ? quantity : 0;
          const [stockUpdate] = await conn.execute(
            "UPDATE products SET stock_full = stock_full - ?, stock_empty = stock_empty + ? WHERE id = ? AND stock_full >= ?",
            [quantity, emptyReturn, productId, quantity]
          );
          if (!stockUpdate.affectedRows) throw new Error("สต๊อกสินค้าไม่พอ กรุณารีเฟรชข้อมูลแล้วลองใหม่");
          await conn.execute(
            "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [Number(item.product_id), "sale", -Number(item.quantity), emptyReturn, `ขายสินค้า ${orderNo}`, orderCreatedAt]
          );
        }
        await conn.commit();
        return { id: orderResult.insertId, order_no: orderNo, total_amount: total };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async updateOrderStatus(id, input) {
      await ensurePaymentColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [orders] = await conn.execute("SELECT * FROM orders WHERE id = ? FOR UPDATE", [id]);
        const order = orders[0];
        if (!order) throw new Error("Order not found");
        const nextStatus = input.status || order.status;
        if (nextStatus === CANCEL_STATUS && order.status !== CANCEL_STATUS) {
          const [items] = await conn.execute("SELECT oi.*, p.category FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?", [id]);
          for (const item of items) {
            const quantity = Number(item.quantity || 0);
            const emptyReturn = String(item.category || "").toLowerCase() === "gas" ? quantity : 0;
            const [stockUpdate] = await conn.execute(
              "UPDATE products SET stock_full = stock_full + ?, stock_empty = stock_empty - ? WHERE id = ? AND stock_empty >= ?",
              [quantity, emptyReturn, Number(item.product_id), emptyReturn]
            );
            if (!stockUpdate.affectedRows) throw new Error("ถังเปล่าไม่พอสำหรับยกเลิกเอกสารขาย กรุณาตรวจสอบสต๊อคถังเปล่าก่อน");
            await conn.execute(
              "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
              [Number(item.product_id), "void_sale", quantity, -emptyReturn, `void sale ${order.order_no}`]
            );
          }
          await conn.execute(
            "UPDATE payments SET amount = 0, debt_reduction_amount = 0, note = CONCAT(COALESCE(note, ''), ' (void bill)') WHERE order_id = ?",
            [id]
          );
          await conn.execute(
            "UPDATE orders SET status = ?, payment_status = ? WHERE id = ?",
            [CANCEL_STATUS, CANCEL_STATUS, id]
          );
          await conn.commit();
          return { ...order, status: CANCEL_STATUS, payment_status: CANCEL_STATUS };
        }
        if (nextStatus === "ยกเลิก" && order.status !== "ยกเลิก") {
          const [items] = await conn.execute("SELECT oi.*, p.category FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?", [id]);
          for (const item of items) {
            const quantity = Number(item.quantity || 0);
            const emptyReturn = String(item.category || "").toLowerCase() === "gas" ? quantity : 0;
            const [stockUpdate] = await conn.execute(
              "UPDATE products SET stock_full = stock_full + ?, stock_empty = stock_empty - ? WHERE id = ? AND stock_empty >= ?",
              [quantity, emptyReturn, Number(item.product_id), emptyReturn]
            );
            if (!stockUpdate.affectedRows) throw new Error("ถังเปล่าไม่พอสำหรับยกเลิกเอกสารขาย กรุณาตรวจสอบสต๊อคถังเปล่าก่อน");
            await conn.execute(
              "INSERT INTO stock_movements (product_id, movement_type, full_delta, empty_delta, note) VALUES (?, ?, ?, ?, ?)",
              [Number(item.product_id), "void_sale", quantity, -emptyReturn, `ยกเลิกเอกสารขาย ${order.order_no}`]
            );
          }
          await conn.execute(
            "UPDATE payments SET amount = 0, debt_reduction_amount = 0, note = CONCAT(COALESCE(note, ''), ' (ยกเลิกบิล)') WHERE order_id = ?",
            [id]
          );
          await conn.execute("UPDATE orders SET status = ?, payment_status = ? WHERE id = ?", [nextStatus, "ยกเลิก", id]);
        } else {
          await conn.execute("UPDATE orders SET status = ? WHERE id = ?", [nextStatus, id]);
        }
        await conn.commit();
        const rows = await query("SELECT * FROM orders WHERE id = ?", [id]);
        return rows[0];
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async payments() {
      await ensurePaymentColumns();
      return query(`
        SELECT p.*, c.name AS customer_name, o.order_no, o.status AS order_status,
          ba.bank_name, ba.account_name AS bank_account_name, ba.account_number AS bank_account_number
        FROM payments p
        LEFT JOIN customers c ON c.id = p.customer_id
        LEFT JOIN orders o ON o.id = p.order_id
        LEFT JOIN bank_accounts ba ON ba.id = p.bank_account_id
        WHERE COALESCE(p.is_active, 1) = 1
        ORDER BY p.id DESC
      `);
    },
    async customerReceiptVouchers() {
      await ensurePaymentColumns();
      return query(`
        SELECT p.*, c.name AS customer_name, o.order_no, o.status AS order_status,
          ba.bank_name, ba.account_name AS bank_account_name, ba.account_number AS bank_account_number
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        LEFT JOIN customers c ON c.id = p.customer_id
        LEFT JOIN bank_accounts ba ON ba.id = p.bank_account_id
        WHERE (o.order_no LIKE 'SND%' OR o.order_no LIKE 'VDN%')
        ORDER BY p.id DESC
      `);
    },
    async generalReceiptVouchers() {
      await ensurePaymentColumns();
      return query(`
        SELECT p.*, COALESCE(NULLIF(p.party_name, ''), c.name) AS customer_name, o.order_no, o.status AS order_status,
          ba.bank_name, ba.account_name AS bank_account_name, ba.account_number AS bank_account_number
        FROM payments p
        LEFT JOIN customers c ON c.id = p.customer_id
        LEFT JOIN orders o ON o.id = p.order_id
        LEFT JOIN bank_accounts ba ON ba.id = p.bank_account_id
        WHERE (p.source_type = 'general_receipt' OR p.payment_no LIKE 'RCV%')
        ORDER BY p.id DESC
      `);
    },
    async createCustomerReceiptVoucher(input) {
      await ensurePaymentColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const orderId = Number(input.order_id || 0);
        const [orders] = await conn.execute(
          "SELECT * FROM orders WHERE id = ? AND (order_no LIKE 'SND%' OR order_no LIKE 'VDN%') AND status <> ? FOR UPDATE",
          [orderId, CANCEL_STATUS]
        );
        const order = orders[0];
        if (!order) throw new Error("ไม่พบใบส่งสินค้าที่รับเงินได้");
        const [paidRows] = await conn.execute(
          "SELECT COALESCE(SUM(COALESCE(amount, 0) + COALESCE(debt_reduction_amount, 0)), 0) AS paid_total FROM payments WHERE order_id = ? AND COALESCE(is_active, 1) = 1",
          [orderId]
        );
        const outstanding = Math.max(0, Number(order.total_amount || 0) - Number(paidRows[0]?.paid_total || 0));
        if (outstanding <= 0) throw new Error("เอกสารนี้รับเงินครบแล้ว");
        const amount = input.amount === undefined || input.amount === null || input.amount === "" ? outstanding : Number(input.amount || 0);
        const debtReductionAmount = Math.max(0, Number(input.debt_reduction_amount || 0));
        const settlementAmount = amount + debtReductionAmount;
        if (!Number.isFinite(amount) || !Number.isFinite(debtReductionAmount)) throw new Error("ยอดรับหรือลดหนี้ไม่ถูกต้อง");
        if (amount < 0) throw new Error("ยอดรับไม่ถูกต้อง");
        if (settlementAmount <= 0) throw new Error("กรุณากรอกยอดรับหรือยอดลดหนี้");
        if (settlementAmount > outstanding) throw new Error(`ยอดรับรวมลดหนี้เกินยอดค้าง ${outstanding.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        const paymentMethod = input.payment_method === "transfer" ? "transfer" : "cash";
        const bankAccountId = paymentMethod === "transfer" ? Number(input.bank_account_id || 0) : null;
        if (paymentMethod === "transfer" && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
        const paidAt = String(input.paid_at || new Date().toISOString().slice(0, 10)).slice(0, 10);
        const year = Number(paidAt.slice(0, 4)) || new Date().getFullYear();
        const month = paidAt.slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0");
        const docPrefix = `RV${String(year + 543).slice(-2)}${month}`;
        const [latestRows] = await conn.execute(
          "SELECT payment_no FROM payments WHERE payment_no LIKE ? ORDER BY payment_no DESC LIMIT 1",
          [`${docPrefix}%`]
        );
        const latestRun = Number(String(latestRows[0]?.payment_no || "").slice(-4)) || 0;
        const paymentNo = `${docPrefix}${String(latestRun + 1).padStart(4, "0")}`;
        const referenceNo = String(input.reference_no || "").trim() || paymentNo;
        const [existingRefs] = await conn.execute(
          "SELECT id FROM payments WHERE COALESCE(is_active, 1) = 1 AND (reference_no = ? OR payment_no = ?) LIMIT 1",
          [referenceNo, referenceNo]
        );
        if (existingRefs.length) throw new Error(`เลขอ้างอิง ${referenceNo} ถูกใช้แล้ว`);
        const [paymentResult] = await conn.execute(
          "INSERT INTO payments (payment_no, customer_id, order_id, method, bank_account_id, amount, debt_reduction_amount, reference_no, note, paid_at, is_active, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
          [paymentNo, order.customer_id, orderId, paymentMethod, bankAccountId, amount, debtReductionAmount, referenceNo, input.note || "", `${paidAt} 00:00:00`, "รับเงินแล้ว"]
        );
        if (paymentMethod === "transfer" && amount > 0) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [amount, bankAccountId]);
        }
        await conn.execute("UPDATE customers SET balance_due = GREATEST(0, balance_due - ?) WHERE id = ?", [settlementAmount, order.customer_id]);
        const nextOutstanding = Math.max(0, outstanding - settlementAmount);
        await conn.execute("UPDATE orders SET payment_status = ? WHERE id = ?", [nextOutstanding <= 0 ? "ชำระแล้ว" : "รับบางส่วน", orderId]);
        await conn.commit();
        const rows = await query("SELECT * FROM payments WHERE id = ?", [paymentResult.insertId]);
        return rows[0];
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async deleteCustomerReceiptVoucher(id) {
      await ensurePaymentColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [payments] = await conn.execute("SELECT * FROM payments WHERE id = ? AND COALESCE(is_active, 1) = 1 FOR UPDATE", [id]);
        const payment = payments[0];
        if (!payment) throw new Error("ไม่พบใบสำคัญรับเงิน");
        const [orders] = await conn.execute("SELECT * FROM orders WHERE id = ? FOR UPDATE", [payment.order_id]);
        const order = orders[0];
        const settlementAmount = Number(payment.amount || 0) + Number(payment.debt_reduction_amount || 0);
        if (payment.method === "transfer" && payment.bank_account_id) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [Number(payment.amount || 0), payment.bank_account_id]);
        }
        await conn.execute("UPDATE customers SET balance_due = balance_due + ? WHERE id = ?", [settlementAmount, payment.customer_id]);
        await conn.execute("UPDATE payments SET is_active = 0, status = ?, canceled_at = NOW() WHERE id = ?", ["ยกเลิก", id]);
        if (order && /^(SND|VDN)/.test(String(order.order_no || "")) && order.status !== CANCEL_STATUS) {
          const [paidRows] = await conn.execute(
            "SELECT COALESCE(SUM(COALESCE(amount, 0) + COALESCE(debt_reduction_amount, 0)), 0) AS paid_total FROM payments WHERE order_id = ? AND COALESCE(is_active, 1) = 1",
            [order.id]
          );
          const paidTotal = Number(paidRows[0]?.paid_total || 0);
          await conn.execute("UPDATE orders SET payment_status = ? WHERE id = ?", [paidTotal >= Number(order.total_amount || 0) ? "ชำระแล้ว" : "รอชำระ", order.id]);
        }
        await conn.commit();
        return { id, canceled: true };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async createPayment(input) {
      await ensurePaymentColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const isGeneralReceipt = input.source_type === "general_receipt";
        const paidAt = input.paid_at || new Date().toISOString().slice(0, 10);
        const method = input.payment_method || input.method || "เงินสด";
        const amount = Number(input.amount || 0);
        const bankAccountId = input.bank_account_id ? Number(input.bank_account_id) : null;
        if (amount <= 0) throw new Error("ยอดรับไม่ถูกต้อง");
        if (isTransferMethod(method) && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
        let paymentNo = `PAY${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Date.now().toString().slice(-4)}`;
        if (isGeneralReceipt) {
          const docPrefix = monthlyDocumentPrefix("RCV", paidAt);
          const [latestRows] = await conn.execute("SELECT payment_no FROM payments WHERE payment_no LIKE ? ORDER BY payment_no DESC LIMIT 1", [`${docPrefix}%`]);
          const latestRun = Number(String(latestRows[0]?.payment_no || "").slice(-4)) || 0;
          paymentNo = `${docPrefix}${String(latestRun + 1).padStart(4, "0")}`;
        }
        const referenceNo = String(input.reference_no || "").trim() || paymentNo;
        const [existingRefs] = await conn.execute(
          "SELECT id FROM payments WHERE COALESCE(is_active, 1) = 1 AND (reference_no = ? OR payment_no = ?) LIMIT 1",
          [referenceNo, referenceNo]
        );
        if (existingRefs.length) throw new Error(`เลขอ้างอิง ${referenceNo} ถูกใช้แล้ว`);
        const customerId = Number(input.customer_id || 1);
        const [result] = await conn.execute(
          "INSERT INTO payments (payment_no, source_type, party_name, description, customer_id, order_id, method, bank_account_id, amount, reference_no, note, paid_at, is_active, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
          [paymentNo, isGeneralReceipt ? "general_receipt" : (input.source_type || "payment"), input.party_name || input.received_from || "", input.description || "", customerId, input.order_id || null, method, bankAccountId, amount, referenceNo, input.note || "", `${paidAt} 00:00:00`, "รับเงินแล้ว"]
        );
        if (bankAccountId) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [amount, bankAccountId]);
        }
        if (!isGeneralReceipt || input.customer_id) {
          await conn.execute("UPDATE customers SET balance_due = GREATEST(0, balance_due - ?) WHERE id = ?", [amount, customerId]);
        }
        await conn.commit();
        return { id: result.insertId, payment_no: paymentNo };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async updatePayment(id, input) {
      await ensurePaymentColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [payments] = await conn.execute("SELECT * FROM payments WHERE id = ? AND COALESCE(is_active, 1) = 1 FOR UPDATE", [id]);
        const payment = payments[0];
        if (!payment) throw new Error("ไม่พบใบรับเงิน");
        const isGeneralReceipt = payment.source_type === "general_receipt" || /^RCV/.test(String(payment.payment_no || ""));
        if (!isGeneralReceipt) throw new Error("แก้ไขได้เฉพาะใบรับเงินทั่วไป");
        const paidAt = input.paid_at || String(payment.paid_at || new Date()).slice(0, 10);
        const method = input.payment_method || input.method || payment.method || "cash";
        const amount = Number(input.amount || 0);
        const bankAccountId = input.bank_account_id ? Number(input.bank_account_id) : null;
        if (amount <= 0) throw new Error("ยอดรับไม่ถูกต้อง");
        if (isTransferMethod(method) && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
        const referenceNo = String(input.reference_no || "").trim() || payment.payment_no;
        const [existingRefs] = await conn.execute(
          "SELECT id FROM payments WHERE id <> ? AND COALESCE(is_active, 1) = 1 AND (reference_no = ? OR payment_no = ?) LIMIT 1",
          [id, referenceNo, referenceNo]
        );
        if (existingRefs.length) throw new Error(`เลขอ้างอิง ${referenceNo} ถูกใช้แล้ว`);

        if (isTransferMethod(payment.method) && payment.bank_account_id) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [Number(payment.amount || 0), payment.bank_account_id]);
        }
        if (isTransferMethod(method) && bankAccountId) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [amount, bankAccountId]);
        }

        await conn.execute(
          "UPDATE payments SET party_name = ?, description = ?, method = ?, bank_account_id = ?, amount = ?, reference_no = ?, note = ?, paid_at = ?, status = ? WHERE id = ?",
          [
            input.party_name || input.received_from || "",
            input.description || "",
            method,
            bankAccountId,
            amount,
            referenceNo,
            input.note || "",
            `${paidAt} 00:00:00`,
            "รับเงินแล้ว",
            id,
          ]
        );
        await conn.commit();
        const rows = await query("SELECT * FROM payments WHERE id = ?", [id]);
        return rows[0];
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async deletePayment(id) {
      await ensurePaymentColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [payments] = await conn.execute("SELECT * FROM payments WHERE id = ? AND COALESCE(is_active, 1) = 1 FOR UPDATE", [id]);
        const payment = payments[0];
        if (!payment) throw new Error("ไม่พบใบรับเงิน");
        if (isTransferMethod(payment.method) && payment.bank_account_id) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [Number(payment.amount || 0), payment.bank_account_id]);
        }
        await conn.execute("UPDATE payments SET is_active = 0, status = ?, canceled_at = NOW() WHERE id = ?", [CANCEL_STATUS, id]);
        await conn.commit();
        return { id, canceled: true };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async expenses() {
      await ensureExpenseColumns();
      return query(`
        SELECT e.*, ba.bank_name, ba.account_name AS bank_account_name, ba.account_number AS bank_account_number
        FROM expenses e
        LEFT JOIN bank_accounts ba ON ba.id = e.bank_account_id
        ORDER BY e.id DESC
      `);
    },
    async createExpense(input) {
      await ensureExpenseColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const paidAt = input.paid_at || new Date().toISOString().slice(0, 10);
        const sourceType = input.source_type || "expense";
        const docPrefix = monthlyDocumentPrefix(sourceType === "general_payment" ? "GPV" : "EXP", paidAt);
        const [latestRows] = await conn.execute("SELECT expense_no FROM expenses WHERE expense_no LIKE ? ORDER BY expense_no DESC LIMIT 1", [`${docPrefix}%`]);
        const latestRun = Number(String(latestRows[0]?.expense_no || "").slice(-4)) || 0;
        const expenseNo = `${docPrefix}${String(latestRun + 1).padStart(4, "0")}`;
        const paymentMethod = input.payment_method || input.paid_by || "cash";
        const bankAccountId = isTransferMethod(paymentMethod) ? Number(input.bank_account_id || 0) : null;
        const amount = Number(input.amount || 0);
        if (amount <= 0) throw new Error("ยอดจ่ายไม่ถูกต้อง");
        if (isTransferMethod(paymentMethod) && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
        const [result] = await conn.execute(
          "INSERT INTO expenses (expense_no, source_type, category, description, payee_name, amount, paid_by, payment_method, bank_account_id, reference_no, note, expense_at, is_active, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
          [expenseNo, sourceType, input.category || "ทั่วไป", input.description || "ค่าใช้จ่าย", input.payee_name || "", amount, paymentMethod, paymentMethod, bankAccountId, input.reference_no || "", input.note || "", `${paidAt} 00:00:00`, "บันทึกแล้ว"]
        );
        if (bankAccountId) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [amount, bankAccountId]);
        }
        await conn.commit();
        return { id: result.insertId, expense_no: expenseNo };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async updateExpense(id, input) {
      await ensureExpenseColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [expenses] = await conn.execute("SELECT * FROM expenses WHERE id = ? AND COALESCE(is_active, 1) = 1 FOR UPDATE", [id]);
        const expense = expenses[0];
        if (!expense) throw new Error("ไม่พบใบสำคัญจ่าย");
        const isGeneralPayment = expense.source_type === "general_payment" || /^GPV/.test(String(expense.expense_no || ""));
        if (!isGeneralPayment) throw new Error("แก้ไขได้เฉพาะใบสำคัญจ่ายทั่วไป");
        const paidAt = input.paid_at || String(expense.expense_at || new Date()).slice(0, 10);
        const paymentMethod = input.payment_method || input.paid_by || expense.payment_method || expense.paid_by || "cash";
        const bankAccountId = isTransferMethod(paymentMethod) ? Number(input.bank_account_id || 0) : null;
        const amount = Number(input.amount || 0);
        if (amount <= 0) throw new Error("ยอดจ่ายไม่ถูกต้อง");
        if (isTransferMethod(paymentMethod) && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");

        if (isTransferMethod(expense.payment_method || expense.paid_by) && expense.bank_account_id) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [Number(expense.amount || 0), expense.bank_account_id]);
        }
        if (isTransferMethod(paymentMethod) && bankAccountId) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [amount, bankAccountId]);
        }

        await conn.execute(
          "UPDATE expenses SET category = ?, description = ?, payee_name = ?, amount = ?, paid_by = ?, payment_method = ?, bank_account_id = ?, reference_no = ?, note = ?, expense_at = ?, status = ? WHERE id = ?",
          [
            input.category || "ทั่วไป",
            input.description || "ค่าใช้จ่าย",
            input.payee_name || "",
            amount,
            paymentMethod,
            paymentMethod,
            bankAccountId,
            input.reference_no || "",
            input.note || "",
            `${paidAt} 00:00:00`,
            "บันทึกแล้ว",
            id,
          ]
        );
        await conn.commit();
        const rows = await query("SELECT * FROM expenses WHERE id = ?", [id]);
        return rows[0];
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    async deleteExpense(id) {
      await ensureExpenseColumns();
      const conn = await getConnection();
      try {
        await conn.beginTransaction();
        const [expenses] = await conn.execute("SELECT * FROM expenses WHERE id = ? AND COALESCE(is_active, 1) = 1 FOR UPDATE", [id]);
        const expense = expenses[0];
        if (!expense) throw new Error("ไม่พบใบสำคัญจ่าย");
        if (isTransferMethod(expense.payment_method || expense.paid_by) && expense.bank_account_id) {
          await conn.execute("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [Number(expense.amount || 0), expense.bank_account_id]);
        }
        await conn.execute("UPDATE expenses SET is_active = 0, status = ?, canceled_at = NOW() WHERE id = ?", [CANCEL_STATUS, id]);
        await conn.commit();
        return { id, canceled: true };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
  };
}

module.exports = { createMySqlStore };

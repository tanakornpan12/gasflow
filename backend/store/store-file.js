const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const seed = require("./seed");
const { createDefaultUser, hashPassword, normalizeEmail, permissionJson, publicUser, validateOptionalEmail, validatePassword, validateUsername, verifyPassword } = require("./auth-utils");

const dataDir = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDir, "gasflow-data.json");
const fileBackupKeys = [
  "users",
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

function ensureData() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2), "utf8");
  }
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

function sanitizeBackupRows(tableName, rows = []) {
  return (rows || []).map((row) => {
    const copy = { ...row };
    if (tableName === "users") {
      delete copy.reset_password_token_hash;
      delete copy.reset_password_expires_at;
    }
    return copy;
  });
}

function backupFromFileData(data = {}) {
  const tables = {};
  fileBackupKeys.forEach((key) => {
    tables[key] = sanitizeBackupRows(key, Array.isArray(data[key]) ? data[key] : []);
  });
  return {
    metadata: {
      app: "GasFlow",
      backup_type: "full-data-json",
      engine: "file",
      generated_at: new Date().toISOString(),
      table_count: Object.keys(tables).length,
      row_counts: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])),
    },
    tables,
  };
}

function ensureUsers(data) {
  let changed = false;
  if (!Array.isArray(data.users)) {
    data.users = [];
    changed = true;
  }
  if (!data.users.length) {
    data.users.push({ id: 1, ...createDefaultUser(), created_at: new Date().toISOString() });
    changed = true;
  }
  if (changed) saveData(data);
  return data.users;
}

function defaultBranch() {
  return {
    id: 1,
    name: "สาขาปากเกร็ด",
    tax_id: "0100000000000",
    phone: "",
    address: "",
    payment_qr_image: "",
    is_active: true,
    created_at: new Date().toISOString(),
  };
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

function ensureBranches(data) {
  let changed = false;
  if (!Array.isArray(data.branches)) {
    data.branches = [defaultBranch()];
    changed = true;
  }
  if (!data.branches.length) {
    data.branches.push(defaultBranch());
    changed = true;
  }
  data.branches.forEach((branch) => {
    if (branch.payment_qr_image === undefined) {
      branch.payment_qr_image = "";
      changed = true;
    }
  });
  if (changed) saveData(data);
  return data.branches;
}

function uniqueUserCheck(users, username, currentId = 0) {
  const duplicate = users.find((user) =>
    Number(user.id) !== Number(currentId) &&
    String(user.username || "").toLowerCase() === String(username || "").toLowerCase()
  );
  if (duplicate) throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
}

function uniqueUserEmailCheck(users, email, currentId = 0) {
  if (!email) return;
  const duplicate = users.find((user) =>
    Number(user.id) !== Number(currentId) &&
    normalizeEmail(user.email || "") === normalizeEmail(email)
  );
  if (duplicate) throw new Error("อีเมลนี้ถูกใช้แล้ว");
}

function hashResetToken(token = "") {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function resetTokenExpiry() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

function normalizeCustomerPhone(phone = "") {
  return String(phone || "").replace(/\D/g, "");
}

function assertUniqueCustomerPhone(customers = [], phone = "", currentId = 0) {
  const normalized = normalizeCustomerPhone(phone);
  if (!normalized) return;
  const duplicate = customers.find((customer) =>
    Number(customer.id) !== Number(currentId) &&
    customer.is_active !== false &&
    normalizeCustomerPhone(customer.phone) === normalized
  );
  if (duplicate) throw new Error(`เบอร์โทรนี้ซ้ำกับลูกค้า ${duplicate.name || ""}`);
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function paymentSettlementAmount(payment = {}) {
  return Number(payment.amount || 0) + Number(payment.debt_reduction_amount || 0);
}

function ensureEnoughEmptyStockForReceipt(data, items = []) {
  const requiredByProduct = new Map();
  items.forEach((item) => {
    const productId = Number(item.product_id || 0);
    const quantity = Number(item.quantity_empty || 0);
    if (!productId || quantity <= 0) return;
    requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + quantity);
  });
  for (const [productId, requiredQty] of requiredByProduct.entries()) {
    const product = (data.products || []).find((item) => Number(item.id) === productId);
    if (!product) throw new Error("ไม่พบสินค้าในระบบ");
    const availableQty = Number(product.stock_empty || 0);
    if (requiredQty > availableQty) {
      throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} ถังเปล่าคงเหลือ ${availableQty.toLocaleString("th-TH")} แต่ต้องใช้แลก ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
    }
  }
}

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

function booleanFlag(value) {
  return value === true || value === 1 || value === "1" || value === "true";
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

function monthlyDocumentNo(items = [], field = "payment_no", prefix = "RV", dateValue = new Date().toISOString().slice(0, 10)) {
  const rawDate = String(dateValue || new Date().toISOString().slice(0, 10));
  const year = Number(rawDate.slice(0, 4)) || new Date().getFullYear();
  const month = rawDate.slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0");
  const documentPrefix = `${prefix}${String(year + 543).slice(-2)}${month}`;
  const maxRun = items.reduce((highest, item) => {
    const match = String(item[field] || "").match(new RegExp(`^${documentPrefix}(\\d{4})$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${documentPrefix}${String(maxRun + 1).padStart(4, "0")}`;
}

function isTransferMethod(method = "") {
  const text = String(method || "").toLowerCase();
  return text === "transfer" || text.includes("โอน") || text.includes("qr");
}

function isActiveRecord(record = {}) {
  return record.is_active !== false && record.is_active !== 0 && record.status !== "ยกเลิก";
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

function availableFullStockAt(data, productId, saleDateTime) {
  const saleMonth = saleDateTime.slice(0, 7);
  const monthStart = `${saleMonth}-01 00:00:00`;
  const activeMovements = filterActiveStockMovements(data.stock_movements || [])
    .filter((movement) => Number(movement.product_id) === Number(productId))
    .filter((movement) => sqlDateTime(movement.created_at) <= saleDateTime);
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

function nextSku(products, category) {
  const prefix = categoryPrefix(category);
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d{4})$`);
  const max = products.reduce((highest, product) => {
    const match = String(product.sku || "").match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function reportMonthFromDate(value = "") {
  if (!value) return "";
  if (/^\d{4}-\d{2}/.test(String(value))) return String(value).slice(0, 7);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function enrichOrders(data) {
  return data.orders.map((order) => {
    const customer = data.customers.find((item) => item.id === order.customer_id) || {};
    const items = (order.items || []).map((item) => {
      const product = data.products.find((p) => p.id === item.product_id) || {};
      return { ...item, product_name: product.name, line_total: item.quantity * item.unit_price };
    });
    return { ...order, customer_name: customer.name, customer_type: customer.customer_type, customer_latitude: customer.latitude, customer_longitude: customer.longitude, items };
  });
}

function enrichPayments(data, options = {}) {
  const includeInactive = options.includeInactive === true;
  return (data.payments || [])
    .filter((payment) => includeInactive || payment.is_active !== false)
    .map((payment) => {
      const customer = data.customers.find((item) => item.id === payment.customer_id) || {};
      const order = data.orders.find((item) => item.id === payment.order_id) || {};
      const account = (data.bank_accounts || []).find((item) => item.id === payment.bank_account_id) || {};
      return {
        ...payment,
        debt_reduction_amount: Number(payment.debt_reduction_amount || 0),
        status: payment.is_active === false ? "ยกเลิก" : (payment.status || "รับเงินแล้ว"),
        customer_name: customer.name || payment.party_name || "",
        order_no: order.order_no,
        order_status: order.status,
        bank_name: account.bank_name,
        bank_account_name: account.account_name,
        bank_account_number: account.account_number,
      };
    })
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
}

function dashboardFrom(data) {
  const orders = enrichOrders(data);
  const activeCustomers = data.customers.filter((c) => c.is_active !== false);
  const activeSuppliers = (data.suppliers || []).filter((s) => s.is_active !== false);
  const activeBankAccounts = (data.bank_accounts || []).filter((a) => a.is_active !== false);
  const activeBranches = (data.branches || []).filter((branch) => branch.is_active !== false);
  const goodsReceipts = (data.goods_receipts || [])
    .filter((receipt) => receipt.is_active !== false)
    .map((receipt) => {
      const supplier = activeSuppliers.find((item) => item.id === receipt.supplier_id) || {};
      const items = (data.goods_receipt_items || [])
        .filter((item) => item.receipt_id === receipt.id)
        .map((item) => {
          const product = data.products.find((p) => p.id === item.product_id) || {};
          return { ...item, product_name: product.name, sku: product.sku };
        });
      return { ...receipt, supplier_name: supplier.name, items };
    });
  const supplierPaymentVouchers = (data.supplier_payment_vouchers || [])
    .filter((voucher) => voucher.is_active !== false)
    .map((voucher) => {
      const supplier = activeSuppliers.find((item) => item.id === voucher.supplier_id) || {};
      const receipt = goodsReceipts.find((item) => item.id === voucher.goods_receipt_id) || {};
      return { ...voucher, supplier_name: supplier.name, receipt_no: receipt.receipt_no, invoice_no: receipt.invoice_no };
    });
  const enrichedPayments = enrichPayments(data, { includeInactive: true });
  const expenses = (data.expenses || []).map((expense) => {
    const account = (data.bank_accounts || []).find((item) => item.id === expense.bank_account_id) || {};
    return {
      ...expense,
      payment_method: expense.payment_method || expense.paid_by || "cash",
      bank_name: account.bank_name || "",
      bank_account_name: account.account_name || "",
      bank_account_number: account.account_number || "",
      status: isActiveRecord(expense) ? (expense.status || "บันทึกแล้ว") : "ยกเลิก",
    };
  });
  const todaySales = (data.payments || [])
    .filter((payment) => payment.is_active !== false)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return {
    metrics: {
      todaySales,
      orderCount: data.orders.length,
      paidToday: todaySales,
      fullCylinders: data.products.filter((p) => p.category === "gas" && p.is_active !== false).reduce((sum, p) => sum + Number(p.stock_full || 0), 0),
      emptyCylinders: data.products.filter((p) => p.category === "gas" && p.is_active !== false).reduce((sum, p) => sum + Number(p.stock_empty || 0), 0),
      debtTotal: activeCustomers.reduce((sum, c) => sum + Number(c.balance_due || 0), 0),
    },
    customers: activeCustomers,
    products: data.products.filter((p) => p.is_active !== false),
    suppliers: activeSuppliers,
    bankAccounts: activeBankAccounts,
    branches: activeBranches,
    goodsReceipts,
    supplierPaymentVouchers,
    stockMovements: (data.stock_movements || []).map((movement) => {
      const product = data.products.find((item) => item.id === movement.product_id) || {};
      return { ...movement, sku: product.sku, product_name: product.name, category: product.category, unit: product.unit };
    }),
    orders,
    payments: enrichPayments(data),
    customerReceiptVouchers: enrichedPayments.filter((payment) => /^(SND|VDN)/.test(String(payment.order_no || ""))),
    generalReceiptVouchers: enrichedPayments.filter((payment) => payment.source_type === "general_receipt" || /^RCV/.test(String(payment.payment_no || ""))),
    expenses,
  };
}

function createFileStore() {
  return {
    async authenticateUser(input = {}) {
      const data = ensureData();
      const username = String(input.username || "").trim();
      const users = ensureUsers(data);
      const user = users.find((item) =>
        String(item.username || "").toLowerCase() === username.toLowerCase() ||
        (normalizeEmail(item.email || "") && normalizeEmail(item.email || "") === normalizeEmail(username))
      );
      if (!user || user.is_active === false || user.is_active === 0) return null;
      if (!verifyPassword(input.password, user.password_hash)) return null;
      return publicUser(user);
    },
    async createPasswordResetToken(input = {}) {
      const data = ensureData();
      const users = ensureUsers(data);
      const identifier = String(input.identifier || "").trim();
      if (!identifier) throw new Error("กรุณากรอกชื่อผู้ใช้หรืออีเมล");
      const normalizedIdentifier = normalizeEmail(identifier);
      const user = users.find((item) =>
        item.is_active !== false &&
        item.is_active !== 0 &&
        (String(item.username || "").toLowerCase() === identifier.toLowerCase() ||
          (normalizeEmail(item.email || "") && normalizeEmail(item.email || "") === normalizedIdentifier))
      );
      if (!user || !normalizeEmail(user.email || "")) return { ok: true, email: "" };
      const token = crypto.randomBytes(32).toString("hex");
      user.reset_password_token_hash = hashResetToken(token);
      user.reset_password_expires_at = resetTokenExpiry();
      saveData(data);
      return {
        ok: true,
        email: normalizeEmail(user.email || ""),
        token,
        expires_at: user.reset_password_expires_at,
        user: publicUser(user),
      };
    },
    async resetPasswordWithToken(input = {}) {
      const data = ensureData();
      const users = ensureUsers(data);
      const token = String(input.token || "").trim();
      if (!token) throw new Error("ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง");
      const password = validatePassword(input.new_password);
      const tokenHash = hashResetToken(token);
      const now = Date.now();
      const user = users.find((item) =>
        item.is_active !== false &&
        item.is_active !== 0 &&
        item.reset_password_token_hash === tokenHash &&
        Date.parse(item.reset_password_expires_at || "") > now
      );
      if (!user) throw new Error("ลิงก์ตั้งรหัสผ่านหมดอายุหรือถูกใช้แล้ว");
      user.password_hash = hashPassword(password);
      delete user.reset_password_token_hash;
      delete user.reset_password_expires_at;
      saveData(data);
      return { ok: true, userId: Number(user.id) };
    },
    async users() {
      const data = ensureData();
      return ensureUsers(data)
        .map(publicUser)
        .sort((a, b) => Number(b.is_active) - Number(a.is_active) || Number(a.id) - Number(b.id));
    },
    async createUser(input = {}) {
      const data = ensureData();
      const users = ensureUsers(data);
      const username = validateUsername(input.username);
      const password = validatePassword(input.password);
      uniqueUserCheck(users, username);
      const email = validateOptionalEmail(input.email);
      if (!email) throw new Error("กรุณากรอกอีเมลผู้ใช้งาน");
      uniqueUserEmailCheck(users, email);
      const user = {
        id: nextId(users),
        username,
        email,
        password_hash: hashPassword(password),
        display_name: String(input.display_name || username).trim(),
        role: input.role === "admin" ? "admin" : "staff",
        permissions: permissionJson(input.permissions, input.role === "admin" ? "admin" : "staff"),
        is_active: true,
        created_at: new Date().toISOString(),
      };
      users.push(user);
      saveData(data);
      return publicUser(user);
    },
    async updateUser(id, input = {}) {
      const data = ensureData();
      const users = ensureUsers(data);
      const user = users.find((item) => Number(item.id) === Number(id));
      if (!user) throw new Error("ไม่พบผู้ใช้งาน");
      const username = validateUsername(input.username || user.username);
      uniqueUserCheck(users, username, id);
      const email = validateOptionalEmail(input.email ?? user.email);
      if (!email) throw new Error("กรุณากรอกอีเมลผู้ใช้งาน");
      uniqueUserEmailCheck(users, email, id);
      user.username = username;
      user.email = email;
      user.display_name = String(input.display_name || username).trim();
      user.role = input.role === "admin" ? "admin" : "staff";
      user.permissions = permissionJson(input.permissions, user.role);
      user.is_active = input.is_active === false || input.is_active === 0 ? false : true;
      saveData(data);
      return publicUser(user);
    },
    async resetUserPassword(id, input = {}) {
      const data = ensureData();
      const users = ensureUsers(data);
      const user = users.find((item) => Number(item.id) === Number(id));
      if (!user) throw new Error("ไม่พบผู้ใช้งาน");
      user.password_hash = hashPassword(validatePassword(input.password));
      delete user.reset_password_token_hash;
      delete user.reset_password_expires_at;
      saveData(data);
      return { id: Number(id), ok: true };
    },
    async changePassword(userId, input = {}) {
      const data = ensureData();
      const users = ensureUsers(data);
      const user = users.find((item) => Number(item.id) === Number(userId) && item.is_active !== false && item.is_active !== 0);
      if (!user) throw new Error("ไม่พบผู้ใช้งาน");
      if (!verifyPassword(input.current_password, user.password_hash)) throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
      user.password_hash = hashPassword(validatePassword(input.new_password));
      delete user.reset_password_token_hash;
      delete user.reset_password_expires_at;
      saveData(data);
      return { ok: true };
    },
    async deleteUser(id) {
      const data = ensureData();
      const users = ensureUsers(data);
      const user = users.find((item) => Number(item.id) === Number(id));
      if (!user) throw new Error("ไม่พบผู้ใช้งาน");
      user.is_active = false;
      saveData(data);
      return { id: Number(id), deleted: true };
    },
    async health() {
      return { ok: true, engine: "file", message: "API is running with local file persistence" };
    },
    async backupData() {
      const data = ensureData();
      ensureUsers(data);
      ensureBranches(data);
      return backupFromFileData(data);
    },
    async dashboard() {
      const data = ensureData();
      ensureBranches(data);
      const dashboard = dashboardFrom(data);
      dashboard.monthlyStockCounts = data.monthly_stock_counts || [];
      dashboard.openingBalances = await this.openingBalances();
      dashboard.cashOpenings = await this.cashOpenings();
      dashboard.bankOpenings = await this.bankOpenings();
      return dashboard;
    },
    async branches() {
      const data = ensureData();
      return ensureBranches(data).filter((branch) => branch.is_active !== false);
    },
    async createBranch(input = {}) {
      const data = ensureData();
      const branches = ensureBranches(data);
      const name = String(input.name || "").trim();
      if (!name) throw new Error("กรุณากรอกชื่อสาขา");
      const branch = {
        id: nextId(branches),
        name,
        tax_id: String(input.tax_id || "").trim(),
        phone: String(input.phone || "").trim(),
        address: String(input.address || "").trim(),
        payment_qr_image: sanitizePaymentQrImage(input.payment_qr_image),
        is_active: true,
        created_at: new Date().toISOString(),
      };
      branches.push(branch);
      saveData(data);
      return branch;
    },
    async updateBranch(id, input = {}) {
      const data = ensureData();
      const branches = ensureBranches(data);
      const branch = branches.find((item) => Number(item.id) === Number(id));
      if (!branch) throw new Error("ไม่พบสาขา");
      const name = String(input.name || branch.name || "").trim();
      if (!name) throw new Error("กรุณากรอกชื่อสาขา");
      Object.assign(branch, {
        name,
        tax_id: input.tax_id !== undefined ? String(input.tax_id || "").trim() : branch.tax_id,
        phone: input.phone !== undefined ? String(input.phone || "").trim() : branch.phone,
        address: input.address !== undefined ? String(input.address || "").trim() : branch.address,
        payment_qr_image: input.payment_qr_image !== undefined ? sanitizePaymentQrImage(input.payment_qr_image) : branch.payment_qr_image,
        updated_at: new Date().toISOString(),
      });
      saveData(data);
      return branch;
    },
    async deleteBranch(id) {
      const data = ensureData();
      const branches = ensureBranches(data);
      const branch = branches.find((item) => Number(item.id) === Number(id));
      if (!branch) throw new Error("ไม่พบสาขา");
      branch.is_active = false;
      branch.updated_at = new Date().toISOString();
      saveData(data);
      return { id: Number(id), deleted: true };
    },
    async customers() {
      return ensureData().customers.filter((c) => c.is_active !== false);
    },
    async createCustomer(input) {
      const data = ensureData();
      assertUniqueCustomerPhone(data.customers, input.phone);
      const customer = {
        id: nextId(data.customers),
        name: input.name || "ลูกค้าใหม่",
        phone: input.phone || "",
        line_id: input.line_id || "",
        address: input.address || "",
        customer_type: input.customer_type || "ทั่วไป",
        balance_due: Number(input.balance_due || 0),
        credit_limit: Number(input.credit_limit || 0),
        cylinders_on_hand: input.cylinders_on_hand || "",
        latitude: input.latitude === "" || input.latitude === undefined ? null : Number(input.latitude),
        longitude: input.longitude === "" || input.longitude === undefined ? null : Number(input.longitude),
        is_priority: booleanFlag(input.is_priority),
        is_active: true,
      };
      data.customers.push(customer);
      saveData(data);
      return customer;
    },
    async updateCustomer(id, input) {
      const data = ensureData();
      const customer = data.customers.find((item) => item.id === id);
      if (!customer) throw new Error("Customer not found");
      assertUniqueCustomerPhone(data.customers, input.phone ?? customer.phone, id);
      Object.assign(customer, {
        name: input.name ?? customer.name,
        phone: input.phone ?? customer.phone,
        line_id: input.line_id ?? customer.line_id ?? "",
        address: input.address ?? customer.address,
        customer_type: input.customer_type ?? customer.customer_type,
        credit_limit: input.credit_limit !== undefined ? Number(input.credit_limit) : Number(customer.credit_limit || 0),
        balance_due: input.balance_due !== undefined ? Number(input.balance_due) : Number(customer.balance_due || 0),
        cylinders_on_hand: input.cylinders_on_hand ?? customer.cylinders_on_hand,
        latitude: input.latitude === "" || input.latitude === undefined ? null : Number(input.latitude),
        longitude: input.longitude === "" || input.longitude === undefined ? null : Number(input.longitude),
        is_priority: input.is_priority === undefined ? booleanFlag(customer.is_priority) : booleanFlag(input.is_priority),
      });
      saveData(data);
      return customer;
    },
    async updateCustomerPriority(id, input) {
      const data = ensureData();
      const customer = data.customers.find((item) => item.id === id);
      if (!customer) throw new Error("Customer not found");
      customer.is_priority = booleanFlag(input.is_priority);
      saveData(data);
      return customer;
    },
    async deleteCustomer(id) {
      const data = ensureData();
      const customer = data.customers.find((item) => item.id === id);
      if (!customer) throw new Error("Customer not found");
      customer.is_active = false;
      saveData(data);
      return { id, deleted: true };
    },
    async suppliers() {
      const data = ensureData();
      data.suppliers ||= [];
      return data.suppliers.filter((s) => s.is_active !== false);
    },
    async createSupplier(input) {
      const data = ensureData();
      data.suppliers ||= [];
      const supplier = {
        id: nextId(data.suppliers),
        name: input.name || "ตัวแทนจำหน่ายใหม่",
        contact_name: input.contact_name || "",
        phone: input.phone || "",
        address: input.address || "",
        tax_id: input.tax_id || "",
        payment_terms: input.payment_terms || "",
        note: input.note || "",
        is_active: true,
      };
      data.suppliers.push(supplier);
      saveData(data);
      return supplier;
    },
    async updateSupplier(id, input) {
      const data = ensureData();
      data.suppliers ||= [];
      const supplier = data.suppliers.find((item) => item.id === id);
      if (!supplier) throw new Error("Supplier not found");
      Object.assign(supplier, {
        name: input.name || supplier.name,
        contact_name: input.contact_name ?? supplier.contact_name,
        phone: input.phone ?? supplier.phone,
        address: input.address ?? supplier.address,
        tax_id: input.tax_id ?? supplier.tax_id,
        payment_terms: input.payment_terms ?? supplier.payment_terms,
        note: input.note ?? supplier.note,
      });
      saveData(data);
      return supplier;
    },
    async deleteSupplier(id) {
      const data = ensureData();
      data.suppliers ||= [];
      const supplier = data.suppliers.find((item) => item.id === id);
      if (!supplier) throw new Error("Supplier not found");
      supplier.is_active = false;
      saveData(data);
      return { id, deleted: true };
    },
    async bankAccounts() {
      const data = ensureData();
      data.bank_accounts ||= [];
      return data.bank_accounts.filter((a) => a.is_active !== false);
    },
    async createBankAccount(input) {
      const data = ensureData();
      data.bank_accounts ||= [];
      const openingBalance = Number(input.opening_balance || 0);
      const account = {
        id: nextId(data.bank_accounts),
        bank_name: input.bank_name || "ธนาคาร",
        account_name: input.account_name || "บัญชีร้าน",
        account_number: input.account_number || "",
        branch_name: input.branch_name || "",
        account_type: input.account_type || "ออมทรัพย์",
        opening_balance: openingBalance,
        current_balance: input.current_balance === "" || input.current_balance === undefined ? openingBalance : Number(input.current_balance || 0),
        note: input.note || "",
        is_active: true,
      };
      data.bank_accounts.push(account);
      saveData(data);
      return account;
    },
    async updateBankAccount(id, input) {
      const data = ensureData();
      data.bank_accounts ||= [];
      const account = data.bank_accounts.find((item) => item.id === id);
      if (!account) throw new Error("Bank account not found");
      Object.assign(account, {
        bank_name: input.bank_name || account.bank_name,
        account_name: input.account_name || account.account_name,
        account_number: input.account_number || account.account_number,
        branch_name: input.branch_name ?? account.branch_name,
        account_type: input.account_type || account.account_type || "ออมทรัพย์",
        opening_balance: input.opening_balance !== undefined ? Number(input.opening_balance || 0) : Number(account.opening_balance || 0),
        current_balance: input.current_balance !== undefined ? Number(input.current_balance || 0) : Number(account.current_balance || 0),
        note: input.note ?? account.note,
      });
      saveData(data);
      return account;
    },
    async deleteBankAccount(id) {
      const data = ensureData();
      data.bank_accounts ||= [];
      const account = data.bank_accounts.find((item) => item.id === id);
      if (!account) throw new Error("Bank account not found");
      account.is_active = false;
      saveData(data);
      return { id, deleted: true };
    },
    async goodsReceipts() {
      const data = ensureData();
      data.goods_receipts ||= [];
      data.goods_receipt_items ||= [];
      return dashboardFrom(data).goodsReceipts;
    },
    async supplierPaymentVouchers() {
      const data = ensureData();
      data.supplier_payment_vouchers ||= [];
      return dashboardFrom(data).supplierPaymentVouchers;
    },
    async createSupplierPaymentVoucher(input) {
      const data = ensureData();
      data.supplier_payment_vouchers ||= [];
      const receiptId = Number(input.goods_receipt_id || 0);
      const receipt = (data.goods_receipts || []).find((item) => item.id === receiptId && item.is_active !== false);
      if (!receipt) throw new Error("Goods receipt not found");
      if (receipt.payment_status === "ชำระแล้ว") throw new Error("ใบรับนี้ชำระแล้ว");
      const paymentMethod = input.payment_method === "transfer" ? "transfer" : "cash";
      const bankAccountId = paymentMethod === "transfer" ? Number(input.bank_account_id || 0) : null;
      if (paymentMethod === "transfer" && !bankAccountId) throw new Error("Bank account is required for transfer payment");
      const amount = Number(input.amount || receipt.total_amount || 0);
      if (amount <= 0) throw new Error("Invalid payment amount");
      const voucherNo = `PV${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${String(data.supplier_payment_vouchers.length + 1).padStart(3, "0")}`;
      const referenceNo = String(input.reference_no || "").trim() || voucherNo;
      if (data.supplier_payment_vouchers.some((item) => item.is_active !== false && item.reference_no === referenceNo)) {
        throw new Error(`เลขที่อ้างอิง ${referenceNo} ถูกใช้แล้ว`);
      }
      const voucher = {
        id: nextId(data.supplier_payment_vouchers),
        voucher_no: voucherNo,
        goods_receipt_id: receiptId,
        supplier_id: receipt.supplier_id,
        paid_at: input.paid_at || new Date().toISOString().slice(0, 10),
        payment_method: paymentMethod,
        bank_account_id: bankAccountId,
        amount,
        reference_no: referenceNo,
        note: input.note || "",
        is_active: true,
        created_at: new Date().toISOString(),
      };
      data.supplier_payment_vouchers.push(voucher);
      receipt.payment_status = "ชำระแล้ว";
      receipt.payment_method = paymentMethod;
      receipt.bank_account_id = bankAccountId;
      if (paymentMethod === "transfer") {
        const account = (data.bank_accounts || []).find((item) => item.id === bankAccountId);
        if (account) account.current_balance = Number(account.current_balance || 0) - amount;
      }
      saveData(data);
      return voucher;
    },
    async deleteSupplierPaymentVoucher(id) {
      const data = ensureData();
      data.supplier_payment_vouchers ||= [];
      const voucher = data.supplier_payment_vouchers.find((item) => item.id === id && item.is_active !== false);
      if (!voucher) throw new Error("Payment voucher not found");
      const hasOtherVoucher = data.supplier_payment_vouchers.some((item) =>
        item.id !== id && item.goods_receipt_id === voucher.goods_receipt_id && item.is_active !== false
      );
      const receipt = (data.goods_receipts || []).find((item) => item.id === voucher.goods_receipt_id);
      if (receipt && !hasOtherVoucher) {
        receipt.payment_status = "เครดิต";
        receipt.payment_method = "credit";
        receipt.bank_account_id = null;
      }
      if (voucher.payment_method === "transfer" && voucher.bank_account_id) {
        const account = (data.bank_accounts || []).find((item) => item.id === Number(voucher.bank_account_id));
        if (account) account.current_balance = Number(account.current_balance || 0) + Number(voucher.amount || 0);
      }
      voucher.is_active = false;
      saveData(data);
      return { id, deleted: true };
    },
    async createGoodsReceipt(input) {
      const data = ensureData();
      data.goods_receipts ||= [];
      data.goods_receipt_items ||= [];
      data.stock_movements ||= [];
      const items = (Array.isArray(input.items) && input.items.length ? input.items : [{
        product_id: input.product_id,
        quantity_full: input.quantity_full,
        quantity_empty: input.quantity_empty,
        unit_cost: input.unit_cost,
      }]).map((item) => ({
        product_id: Number(item.product_id),
        quantity_full: Math.max(0, Number(item.quantity_full || 0)),
        quantity_empty: Math.max(0, Number(item.quantity_empty || 0)),
        unit_cost: Math.max(0, Number(item.unit_cost || 0)),
      })).filter((item) => item.product_id && (item.quantity_full || item.quantity_empty));
      if (!items.length) throw new Error("No receipt items");
      ensureEnoughEmptyStockForReceipt(data, items);
      const lineSubtotal = items.reduce((sum, item) => sum + item.quantity_full * item.unit_cost, 0);
      const vatRate = Math.max(0, Number(input.vat_rate || 0));
      const vatType = input.vat_type === "inclusive" ? "inclusive" : "exclusive";
      const vatAmount = vatType === "inclusive" ? lineSubtotal * vatRate / (100 + vatRate || 1) : lineSubtotal * vatRate / 100;
      const subtotal = vatType === "inclusive" ? lineSubtotal - vatAmount : lineSubtotal;
      const paymentMethod = ["cash", "transfer"].includes(input.payment_method) ? input.payment_method : "credit";
      const paymentStatus = paymentMethod === "credit" ? "เครดิต" : "ชำระแล้ว";
      const creditDays = paymentMethod === "credit" ? Math.max(0, Number(input.credit_days || 0)) : 0;
      const bankAccountId = paymentMethod === "transfer" ? Number(input.bank_account_id || 0) : null;
      if (paymentMethod === "transfer" && !bankAccountId) throw new Error("Bank account is required for transfer payment");
      const invoiceNo = String(input.invoice_no || "").trim();
      if (invoiceNo && data.goods_receipts.some((item) => item.is_active !== false && item.invoice_no === invoiceNo)) {
        throw new Error(`เลขที่อ้างอิง ${invoiceNo} ถูกใช้แล้ว`);
      }
      const receipt = {
        id: nextId(data.goods_receipts),
        receipt_no: `GR${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${String(data.goods_receipts.length + 1).padStart(3, "0")}`,
        supplier_id: input.supplier_id ? Number(input.supplier_id) : null,
        invoice_no: invoiceNo,
        received_at: input.received_at || new Date().toISOString().slice(0, 10),
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        credit_days: creditDays,
        bank_account_id: bankAccountId,
        subtotal_amount: subtotal,
        vat_type: vatType,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: vatType === "inclusive" ? lineSubtotal : lineSubtotal + vatAmount,
        note: input.note || "",
        is_active: true,
        created_at: new Date().toISOString(),
      };
      data.goods_receipts.push(receipt);
      if (paymentMethod === "transfer") {
        const account = (data.bank_accounts || []).find((item) => item.id === bankAccountId);
        if (account) account.current_balance = Number(account.current_balance || 0) - Number(receipt.total_amount || 0);
      }
      for (const item of items) {
        const product = data.products.find((p) => p.id === item.product_id);
        if (product) {
          product.stock_full = Number(product.stock_full || 0) + item.quantity_full;
          product.stock_empty = Number(product.stock_empty || 0) - item.quantity_empty;
        }
        data.goods_receipt_items.push({
          id: nextId(data.goods_receipt_items),
          receipt_id: receipt.id,
          product_id: item.product_id,
          quantity_full: item.quantity_full,
          quantity_empty: item.quantity_empty,
          unit_cost: item.unit_cost,
          line_total: item.quantity_full * item.unit_cost,
        });
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: item.product_id,
          movement_type: "receive",
          full_delta: item.quantity_full,
          empty_delta: -item.quantity_empty,
          note: `รับสินค้า ${receipt.receipt_no}`,
          created_at: new Date().toISOString(),
        });
      }
      saveData(data);
      return receipt;
    },
    async updateGoodsReceipt(id, input) {
      const data = ensureData();
      data.goods_receipts ||= [];
      data.goods_receipt_items ||= [];
      data.stock_movements ||= [];
      const receipt = data.goods_receipts.find((item) => item.id === id && item.is_active !== false);
      if (!receipt) throw new Error("Goods receipt not found");
      const items = (Array.isArray(input.items) && input.items.length ? input.items : [{
        product_id: input.product_id,
        quantity_full: input.quantity_full,
        quantity_empty: input.quantity_empty,
        unit_cost: input.unit_cost,
      }]).map((item) => ({
        product_id: Number(item.product_id),
        quantity_full: Math.max(0, Number(item.quantity_full || 0)),
        quantity_empty: Math.max(0, Number(item.quantity_empty || 0)),
        unit_cost: Math.max(0, Number(item.unit_cost || 0)),
      })).filter((item) => item.product_id && (item.quantity_full || item.quantity_empty));
      if (!items.length) throw new Error("No receipt items");
      const invoiceNo = String(input.invoice_no || "").trim();
      if (invoiceNo && data.goods_receipts.some((item) => item.id !== id && item.is_active !== false && item.invoice_no === invoiceNo)) {
        throw new Error(`เลขที่อ้างอิง ${invoiceNo} ถูกใช้แล้ว`);
      }

      const oldItems = data.goods_receipt_items.filter((item) => item.receipt_id === id);
      for (const item of oldItems) {
        const product = data.products.find((p) => p.id === item.product_id);
        if (product) {
          product.stock_full = Number(product.stock_full || 0) - Number(item.quantity_full || 0);
          product.stock_empty = Number(product.stock_empty || 0) + Number(item.quantity_empty || 0);
        }
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: item.product_id,
          movement_type: "edit_receive_reverse",
          full_delta: -Number(item.quantity_full || 0),
          empty_delta: Number(item.quantity_empty || 0),
          note: `แก้ไขใบรับ ${receipt.receipt_no}`,
          created_at: new Date().toISOString(),
        });
      }
      ensureEnoughEmptyStockForReceipt(data, items);
      if (receipt.payment_method === "transfer" && receipt.bank_account_id) {
        const account = (data.bank_accounts || []).find((item) => item.id === Number(receipt.bank_account_id));
        if (account) account.current_balance = Number(account.current_balance || 0) + Number(receipt.total_amount || 0);
      }

      const lineSubtotal = items.reduce((sum, item) => sum + item.quantity_full * item.unit_cost, 0);
      const vatRate = Math.max(0, Number(input.vat_rate || 0));
      const vatType = input.vat_type === "inclusive" ? "inclusive" : "exclusive";
      const vatAmount = vatType === "inclusive" ? lineSubtotal * vatRate / (100 + vatRate || 1) : lineSubtotal * vatRate / 100;
      const subtotal = vatType === "inclusive" ? lineSubtotal - vatAmount : lineSubtotal;
      const paymentMethod = ["cash", "transfer"].includes(input.payment_method) ? input.payment_method : "credit";
      const paymentStatus = paymentMethod === "credit" ? "เครดิต" : "ชำระแล้ว";
      const creditDays = paymentMethod === "credit" ? Math.max(0, Number(input.credit_days || 0)) : 0;
      const bankAccountId = paymentMethod === "transfer" ? Number(input.bank_account_id || 0) : null;
      if (paymentMethod === "transfer" && !bankAccountId) throw new Error("Bank account is required for transfer payment");

      receipt.supplier_id = input.supplier_id ? Number(input.supplier_id) : null;
      receipt.invoice_no = invoiceNo;
      receipt.received_at = input.received_at || new Date().toISOString().slice(0, 10);
      receipt.payment_status = paymentStatus;
      receipt.payment_method = paymentMethod;
      receipt.credit_days = creditDays;
      receipt.bank_account_id = bankAccountId;
      receipt.subtotal_amount = subtotal;
      receipt.vat_type = vatType;
      receipt.vat_rate = vatRate;
      receipt.vat_amount = vatAmount;
      receipt.total_amount = vatType === "inclusive" ? lineSubtotal : lineSubtotal + vatAmount;
      receipt.note = input.note || "";

      data.goods_receipt_items = data.goods_receipt_items.filter((item) => item.receipt_id !== id);
      if (paymentMethod === "transfer") {
        const account = (data.bank_accounts || []).find((item) => item.id === bankAccountId);
        if (account) account.current_balance = Number(account.current_balance || 0) - Number(receipt.total_amount || 0);
      }
      for (const item of items) {
        const product = data.products.find((p) => p.id === item.product_id);
        if (product) {
          product.stock_full = Number(product.stock_full || 0) + item.quantity_full;
          product.stock_empty = Number(product.stock_empty || 0) - item.quantity_empty;
        }
        data.goods_receipt_items.push({
          id: nextId(data.goods_receipt_items),
          receipt_id: id,
          product_id: item.product_id,
          quantity_full: item.quantity_full,
          quantity_empty: item.quantity_empty,
          unit_cost: item.unit_cost,
          line_total: item.quantity_full * item.unit_cost,
        });
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: item.product_id,
          movement_type: "edit_receive",
          full_delta: item.quantity_full,
          empty_delta: -item.quantity_empty,
          note: `แก้ไขใบรับ ${receipt.receipt_no}`,
          created_at: new Date().toISOString(),
        });
      }
      saveData(data);
      return receipt;
    },
    async deleteGoodsReceipt(id) {
      const data = ensureData();
      data.goods_receipts ||= [];
      data.goods_receipt_items ||= [];
      data.stock_movements ||= [];
      const receipt = data.goods_receipts.find((item) => item.id === id && item.is_active !== false);
      if (!receipt) throw new Error("Goods receipt not found");
      const activeVoucher = (data.supplier_payment_vouchers || []).find((item) => item.goods_receipt_id === id && item.is_active !== false);
      if (activeVoucher) throw new Error("กรุณายกเลิกใบสำคัญจ่ายเจ้าหนี้ก่อนยกเลิกใบรับสินค้า");
      const items = data.goods_receipt_items.filter((item) => item.receipt_id === id);
      for (const item of items) {
        const product = data.products.find((p) => p.id === item.product_id);
        if (product) {
          product.stock_full = Number(product.stock_full || 0) - Number(item.quantity_full || 0);
          product.stock_empty = Number(product.stock_empty || 0) + Number(item.quantity_empty || 0);
        }
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: item.product_id,
          movement_type: "void_receive",
          full_delta: -Number(item.quantity_full || 0),
          empty_delta: Number(item.quantity_empty || 0),
          note: `ยกเลิกใบรับ ${receipt.receipt_no}`,
          created_at: new Date().toISOString(),
        });
      }
      if (receipt.payment_method === "transfer" && receipt.bank_account_id) {
        const account = (data.bank_accounts || []).find((item) => item.id === Number(receipt.bank_account_id));
        if (account) account.current_balance = Number(account.current_balance || 0) + Number(receipt.total_amount || 0);
      }
      receipt.is_active = false;
      saveData(data);
      return { id, deleted: true };
    },
    async products() {
      return ensureData().products.filter((p) => p.is_active !== false);
    },
    async nextProductSku(category) {
      const data = ensureData();
      return { sku: nextSku(data.products, category || "accessory") };
    },
    async createProduct(input) {
      const data = ensureData();
      data.stock_movements ||= [];
      const initialFull = Number(input.stock_full || 0);
      const initialEmpty = Number(input.stock_empty || 0);
      const product = {
        id: nextId(data.products),
        sku: input.sku || nextSku(data.products, input.category || "accessory"),
        name: input.name || "สินค้าใหม่",
        category: input.category || "accessory",
        unit: input.unit || "ชิ้น",
        unit_price: Number(input.unit_price || 0),
        stock_full: initialFull,
        stock_empty: initialEmpty,
        reorder_level: Number(input.reorder_level || 0),
        is_active: true,
      };
      data.products.push(product);
      if (initialFull || initialEmpty) {
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: product.id,
          movement_type: "opening",
          full_delta: initialFull,
          empty_delta: initialEmpty,
          note: "ยอดตั้งต้นตอนเริ่มใช้ระบบ",
          created_at: new Date().toISOString(),
        });
      }
      saveData(data);
      return product;
    },
    async updateProduct(id, input) {
      const data = ensureData();
      data.stock_movements ||= [];
      const product = data.products.find((item) => item.id === id);
      if (!product) throw new Error("Product not found");
      const nextFull = Number(input.stock_full || 0);
      const nextEmpty = Number(input.stock_empty || 0);
      const fullDelta = nextFull - Number(product.stock_full || 0);
      const emptyDelta = nextEmpty - Number(product.stock_empty || 0);
      Object.assign(product, {
        sku: input.sku || product.sku,
        name: input.name || product.name,
        category: input.category || product.category,
        unit: input.unit || product.unit || "ชิ้น",
        unit_price: Number(input.unit_price || 0),
        stock_full: nextFull,
        stock_empty: nextEmpty,
        reorder_level: Number(input.reorder_level || 0),
      });
      if (fullDelta || emptyDelta) {
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: id,
          movement_type: "opening_adjust",
          full_delta: fullDelta,
          empty_delta: emptyDelta,
          note: "แก้ไขจำนวนสินค้าโดยตรง",
          created_at: new Date().toISOString(),
        });
      }
      saveData(data);
      return product;
    },
    async deleteProduct(id) {
      const data = ensureData();
      const product = data.products.find((item) => item.id === id);
      if (!product) throw new Error("Product not found");
      product.is_active = false;
      saveData(data);
      return { id, deleted: true };
    },
    async adjustStock(id, input) {
      const data = ensureData();
      data.stock_movements ||= [];
      const product = data.products.find((item) => item.id === id);
      if (!product) throw new Error("Product not found");
      product.stock_full = Number(product.stock_full || 0) + Number(input.full_delta || 0);
      product.stock_empty = Number(product.stock_empty || 0) + Number(input.empty_delta || 0);
      const movement = {
        id: nextId(data.stock_movements),
        product_id: id,
        movement_type: input.movement_type || "adjust",
        full_delta: Number(input.full_delta || 0),
        empty_delta: Number(input.empty_delta || 0),
        note: input.note || "",
        created_at: new Date().toISOString(),
      };
      data.stock_movements.push(movement);
      saveData(data);
      return { product, movement };
    },
    async monthlyStockCounts(month = "") {
      const data = ensureData();
      data.monthly_stock_counts ||= [];
      const activeProducts = data.products.filter((p) => p.is_active !== false);
      return data.monthly_stock_counts
        .filter((item) => !month || item.stock_month === month)
        .map((item) => {
          const product = activeProducts.find((p) => p.id === item.product_id) || {};
          return { ...item, sku: product.sku, product_name: product.name, category: product.category, unit: product.unit };
        })
        .sort((a, b) => String(b.stock_month).localeCompare(String(a.stock_month)) || Number(a.product_id) - Number(b.product_id));
    },
    async saveMonthlyStockCounts(input) {
      const data = ensureData();
      data.monthly_stock_counts ||= [];
      const stockMonth = /^\d{4}-\d{2}$/.test(String(input.stock_month || "")) ? input.stock_month : new Date().toISOString().slice(0, 7);
      const items = Array.isArray(input.items) ? input.items : [];
      for (const item of items) {
        const productId = Number(item.product_id || 0);
        if (!productId) continue;
        const product = data.products.find((p) => p.id === productId) || {};
        const existing = data.monthly_stock_counts.find((row) => row.stock_month === stockMonth && row.product_id === productId);
        const payload = {
          stock_month: stockMonth,
          product_id: productId,
          counted_full: Number(item.counted_full || 0),
          counted_empty: Number(item.counted_empty || 0),
          system_full: Number(product.stock_full || 0),
          system_empty: Number(product.stock_empty || 0),
          note: input.note || item.note || "",
          counted_at: new Date().toISOString(),
        };
        if (existing) Object.assign(existing, payload);
        else data.monthly_stock_counts.push({ id: nextId(data.monthly_stock_counts), ...payload });
      }
      saveData(data);
      return { stock_month: stockMonth, items: await this.monthlyStockCounts(stockMonth) };
    },
    async deleteMonthlyStockCount(id) {
      const data = ensureData();
      data.monthly_stock_counts ||= [];
      const before = data.monthly_stock_counts.length;
      data.monthly_stock_counts = data.monthly_stock_counts.filter((item) => Number(item.id) !== Number(id));
      saveData(data);
      return { id, deleted: data.monthly_stock_counts.length < before };
    },
    async openingBalances(month = "") {
      const data = ensureData();
      data.opening_inventory_items ||= [];
      const activeProducts = data.products.filter((p) => p.is_active !== false);
      return data.opening_inventory_items
        .filter((item) => !month || item.stock_month === month)
        .map((item) => {
          const product = activeProducts.find((p) => p.id === item.product_id) || {};
          return { ...item, sku: product.sku, product_name: product.name, category: product.category, unit: product.unit };
        })
        .sort((a, b) => String(b.stock_month).localeCompare(String(a.stock_month)) || String(a.sku || "").localeCompare(String(b.sku || ""), "th") || Number(a.id) - Number(b.id));
    },
    async saveOpeningBalance(input) {
      const data = ensureData();
      data.opening_inventory_items ||= [];
      data.stock_movements ||= [];
      const stockMonth = /^\d{4}-\d{2}$/.test(String(input.stock_month || "")) ? input.stock_month : new Date().toISOString().slice(0, 7);
      const productId = Number(input.product_id || 0);
      const product = data.products.find((p) => p.id === productId && p.is_active !== false);
      if (!product) throw new Error("Product not found");
      const quantity = Number(input.quantity || 0);
      const emptyQuantity = Number(input.empty_quantity || 0);
      const unitPrice = Number(input.unit_price || 0);
      if (quantity < 0 || emptyQuantity < 0) throw new Error("จำนวนต้องไม่ติดลบ");
      if (quantity <= 0 && emptyQuantity <= 0) throw new Error("กรุณากรอกถังเต็มหรือถังเปล่ามากกว่า 0");
      const existing = data.opening_inventory_items.find((row) => row.stock_month === stockMonth && row.product_id === productId);
      const oldQuantity = Number(existing?.quantity || 0);
      const oldEmptyQuantity = Number(existing?.empty_quantity || 0);
      const payload = {
        stock_month: stockMonth,
        product_id: productId,
        quantity,
        empty_quantity: emptyQuantity,
        unit_price: unitPrice,
        total_amount: quantity * unitPrice,
        created_at: new Date().toISOString(),
      };
      if (existing) Object.assign(existing, payload);
      else data.opening_inventory_items.push({ id: nextId(data.opening_inventory_items), ...payload });
      const delta = quantity - oldQuantity;
      const emptyDelta = emptyQuantity - oldEmptyQuantity;
      if (delta || emptyDelta) {
        product.stock_full = Number(product.stock_full || 0) + delta;
        product.stock_empty = Number(product.stock_empty || 0) + emptyDelta;
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: productId,
          movement_type: "opening_balance",
          full_delta: delta,
          empty_delta: emptyDelta,
          note: `ยอดยกมา ${stockMonth}`,
          created_at: `${stockMonth}-01T00:00:00.000Z`,
        });
      }
      saveData(data);
      return { stock_month: stockMonth, items: await this.openingBalances(stockMonth) };
    },
    async deleteOpeningBalance(id) {
      const data = ensureData();
      data.opening_inventory_items ||= [];
      data.stock_movements ||= [];
      const item = data.opening_inventory_items.find((row) => Number(row.id) === Number(id));
      if (!item) return { id, deleted: false };
      const product = data.products.find((p) => p.id === item.product_id);
      const quantity = Number(item.quantity || 0);
      const emptyQuantity = Number(item.empty_quantity || 0);
      if (product && (quantity || emptyQuantity)) {
        product.stock_full = Number(product.stock_full || 0) - quantity;
        product.stock_empty = Number(product.stock_empty || 0) - emptyQuantity;
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: item.product_id,
          movement_type: "opening_balance_delete",
          full_delta: -quantity,
          empty_delta: -emptyQuantity,
          note: `ลบยอดยกมา ${item.stock_month}`,
          created_at: `${item.stock_month}-01T00:00:01.000Z`,
        });
      }
      data.opening_inventory_items = data.opening_inventory_items.filter((row) => Number(row.id) !== Number(id));
      saveData(data);
      return { id, deleted: true };
    },
    async cashOpenings(month = "") {
      const data = ensureData();
      data.cash_openings ||= [];
      return data.cash_openings
        .filter((item) => !month || item.cash_month === month)
        .sort((a, b) => String(b.cash_month).localeCompare(String(a.cash_month)) || Number(b.id || 0) - Number(a.id || 0));
    },
    async saveCashOpening(input) {
      const data = ensureData();
      data.cash_openings ||= [];
      const cashMonth = /^\d{4}-\d{2}$/.test(String(input.cash_month || "")) ? input.cash_month : new Date().toISOString().slice(0, 7);
      const openingCash = Number(input.opening_cash || 0);
      const existing = data.cash_openings.find((row) => row.cash_month === cashMonth);
      const payload = {
        cash_month: cashMonth,
        opening_cash: openingCash,
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        Object.assign(existing, payload);
      } else {
        data.cash_openings.push({
          id: nextId(data.cash_openings),
          ...payload,
          created_at: new Date().toISOString(),
        });
      }
      saveData(data);
      return { cash_month: cashMonth, items: await this.cashOpenings(cashMonth) };
    },
    async deleteCashOpening(id) {
      const data = ensureData();
      data.cash_openings ||= [];
      const before = data.cash_openings.length;
      data.cash_openings = data.cash_openings.filter((item) => Number(item.id) !== Number(id));
      saveData(data);
      return { id, deleted: data.cash_openings.length < before };
    },
    async bankOpenings(month = "") {
      const data = ensureData();
      data.bank_openings ||= [];
      data.bank_accounts ||= [];
      return data.bank_openings
        .filter((item) => !month || item.bank_month === month)
        .map((item) => {
          const account = data.bank_accounts.find((row) => Number(row.id) === Number(item.bank_account_id)) || {};
          return {
            ...item,
            bank_name: account.bank_name || "",
            account_name: account.account_name || "",
            account_number: account.account_number || "",
          };
        })
        .sort((a, b) =>
          String(b.bank_month).localeCompare(String(a.bank_month)) ||
          String(a.bank_name || "").localeCompare(String(b.bank_name || ""), "th") ||
          Number(b.id || 0) - Number(a.id || 0)
        );
    },
    async saveBankOpening(input) {
      const data = ensureData();
      data.bank_openings ||= [];
      data.bank_accounts ||= [];
      const bankMonth = /^\d{4}-\d{2}$/.test(String(input.bank_month || "")) ? input.bank_month : new Date().toISOString().slice(0, 7);
      const bankAccountId = Number(input.bank_account_id || 0);
      if (!bankAccountId) throw new Error("Bank account is required");
      const account = data.bank_accounts.find((row) => Number(row.id) === bankAccountId && row.is_active !== false);
      if (!account) throw new Error("Bank account not found");
      const openingBalance = Number(input.opening_balance || 0);
      const existing = data.bank_openings.find((row) => row.bank_month === bankMonth && Number(row.bank_account_id) === bankAccountId);
      const payload = {
        bank_month: bankMonth,
        bank_account_id: bankAccountId,
        opening_balance: openingBalance,
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        Object.assign(existing, payload);
      } else {
        data.bank_openings.push({
          id: nextId(data.bank_openings),
          ...payload,
          created_at: new Date().toISOString(),
        });
      }
      saveData(data);
      return { bank_month: bankMonth, bank_account_id: bankAccountId, items: await this.bankOpenings(bankMonth) };
    },
    async deleteBankOpening(id) {
      const data = ensureData();
      data.bank_openings ||= [];
      const before = data.bank_openings.length;
      data.bank_openings = data.bank_openings.filter((item) => Number(item.id) !== Number(id));
      saveData(data);
      return { id, deleted: data.bank_openings.length < before };
    },
    async stockMovements(month = "") {
      const data = ensureData();
      data.stock_movements ||= [];
      return data.stock_movements
        .filter((movement) => !month || reportMonthFromDate(movement.created_at) === month)
        .map((movement) => {
          const product = data.products.find((item) => item.id === movement.product_id) || {};
          return { ...movement, sku: product.sku, product_name: product.name, category: product.category, unit: product.unit };
        })
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || Number(a.id) - Number(b.id));
    },
    async orders() {
      return enrichOrders(ensureData());
    },
    async createOrder(input) {
      const data = ensureData();
      const items = Array.isArray(input.items) && input.items.length ? input.items : [{ product_id: 1, quantity: 1, unit_price: 380 }];
      const lineSubtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
      const vatRate = Math.max(0, Number(input.vat_rate || 0));
      const vatType = input.vat_type === "inclusive" ? "inclusive" : "exclusive";
      const vatAmount = vatRate ? (vatType === "inclusive" ? lineSubtotal * vatRate / (100 + vatRate || 1) : lineSubtotal * vatRate / 100) : 0;
      const total = vatType === "inclusive" ? lineSubtotal : lineSubtotal + vatAmount;
      const orderCreatedAt = orderSqlDateTime(input.order_date);
      const requiredByProduct = new Map();
      items.forEach((item) => {
        const productId = Number(item.product_id || 0);
        if (!productId) return;
        requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + Number(item.quantity || 0));
      });
      requiredByProduct.forEach((requiredQty, productId) => {
        const product = data.products.find((productItem) => Number(productItem.id) === Number(productId));
        if (!product) throw new Error("ไม่พบสินค้าในระบบ");
        const availableQty = Number(product.stock_full || 0);
        if (requiredQty > availableQty) {
          throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} คงเหลือ ${availableQty.toLocaleString("th-TH")} แต่ต้องการขาย ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
        }
        const stockCardAvailableQty = availableFullStockAt(data, productId, orderCreatedAt);
        if (requiredQty > stockCardAvailableQty) {
          throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} คงเหลือตาม Stock card ${stockCardAvailableQty.toLocaleString("th-TH")} แต่ต้องการขาย ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
        }
      });
      let orderNo = `OD${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${String(data.orders.length + 1).padStart(3, "0")}`;
      const requestedOrderPrefix = String(input.order_prefix || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      if (requestedOrderPrefix) {
        const rawDate = String(input.order_date || new Date().toISOString().slice(0, 10));
        const year = Number(rawDate.slice(0, 4)) || new Date().getFullYear();
        const month = rawDate.slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0");
        const documentPrefix = `${requestedOrderPrefix}${String(year + 543).slice(-2)}${month}`;
        const maxRun = data.orders.reduce((highest, order) => {
          const match = String(order.order_no || "").match(new RegExp(`^${documentPrefix}(\\d{4})$`));
          return match ? Math.max(highest, Number(match[1])) : highest;
        }, 0);
        orderNo = `${documentPrefix}${String(maxRun + 1).padStart(4, "0")}`;
      }
      const order = {
        id: nextId(data.orders),
        order_no: orderNo,
        customer_id: Number(input.customer_id || 1),
        status: input.status || "รอดำเนินการ",
        delivery_address: input.delivery_address || "",
        delivery_time: input.delivery_time || "",
        payment_status: input.payment_status || "รอชำระ",
        total_amount: total,
        created_at: orderCreatedAt,
        items,
      };
      data.orders.push(order);
      data.stock_movements ||= [];
      items.forEach((item) => {
        const product = data.products.find((productItem) => productItem.id === Number(item.product_id));
        const quantity = Number(item.quantity || 0);
        if (!product) throw new Error("ไม่พบสินค้าในระบบ");
        if (Number(product.stock_full || 0) < quantity) throw new Error("สต๊อกสินค้าไม่พอ กรุณารีเฟรชข้อมูลแล้วลองใหม่");
        const emptyReturn = String(product.category || "").toLowerCase() === "gas" ? quantity : 0;
        product.stock_full = Number(product.stock_full || 0) - quantity;
        product.stock_empty = Number(product.stock_empty || 0) + emptyReturn;
        data.stock_movements.push({
          id: nextId(data.stock_movements),
          product_id: Number(item.product_id),
          movement_type: "sale",
          full_delta: -quantity,
          empty_delta: emptyReturn,
          note: `ขายสินค้า ${order.order_no}`,
          created_at: order.created_at,
        });
      });
      saveData(data);
      return order;
    },
    async updateOrderStatus(id, input) {
      const data = ensureData();
      const order = data.orders.find((item) => item.id === id);
      if (!order) throw new Error("Order not found");
      const nextStatus = input.status || order.status;
      if (nextStatus === "ยกเลิก" && order.status !== "ยกเลิก") {
        data.stock_movements ||= [];
        (order.items || []).forEach((item) => {
          const quantity = Number(item.quantity || 0);
          const product = data.products.find((productItem) => productItem.id === Number(item.product_id));
          const emptyReturn = product && String(product.category || "").toLowerCase() === "gas" ? quantity : 0;
          if (product) {
            if (Number(product.stock_empty || 0) < emptyReturn) throw new Error("ถังเปล่าไม่พอสำหรับยกเลิกเอกสารขาย กรุณาตรวจสอบสต๊อคถังเปล่าก่อน");
            product.stock_full = Number(product.stock_full || 0) + quantity;
            product.stock_empty = Number(product.stock_empty || 0) - emptyReturn;
          }
          data.stock_movements.push({
            id: nextId(data.stock_movements),
            product_id: Number(item.product_id),
            movement_type: "void_sale",
            full_delta: quantity,
            empty_delta: -emptyReturn,
            note: `ยกเลิกเอกสารขาย ${order.order_no}`,
            created_at: new Date().toISOString(),
          });
        });
        (data.payments || [])
          .filter((payment) => Number(payment.order_id || 0) === Number(order.id))
          .forEach((payment) => {
            payment.amount = 0;
            payment.debt_reduction_amount = 0;
            payment.note = `${payment.note || ""} (ยกเลิกบิล)`.trim();
          });
        order.payment_status = "ยกเลิก";
      }
      order.status = nextStatus;
      saveData(data);
      return order;
    },
    async payments() {
      const data = ensureData();
      data.payments ||= [];
      return enrichPayments(data);
    },
    async customerReceiptVouchers() {
      const data = ensureData();
      data.payments ||= [];
      return enrichPayments(data, { includeInactive: true }).filter((payment) => /^(SND|VDN)/.test(String(payment.order_no || "")));
    },
    async createCustomerReceiptVoucher(input) {
      const data = ensureData();
      data.payments ||= [];
      data.bank_accounts ||= [];
      const orderId = Number(input.order_id || 0);
      const order = data.orders.find((item) =>
        item.id === orderId &&
        /^(SND|VDN)/.test(String(item.order_no || "")) &&
        item.status !== "ยกเลิก"
      );
      if (!order) throw new Error("ไม่พบใบส่งสินค้าที่รับเงินได้");
      const paidTotal = data.payments
        .filter((payment) => payment.is_active !== false && Number(payment.order_id || 0) === orderId)
        .reduce((sum, payment) => sum + paymentSettlementAmount(payment), 0);
      const outstanding = Math.max(0, Number(order.total_amount || 0) - paidTotal);
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
      const paidAt = input.paid_at || new Date().toISOString().slice(0, 10);
      const paymentNo = monthlyDocumentNo(data.payments, "payment_no", "RV", paidAt);
      const referenceNo = String(input.reference_no || "").trim() || paymentNo;
      if (data.payments.some((item) => item.is_active !== false && String(item.reference_no || item.payment_no || "") === referenceNo)) {
        throw new Error(`เลขอ้างอิง ${referenceNo} ถูกใช้แล้ว`);
      }
      const payment = {
        id: nextId(data.payments),
        payment_no: paymentNo,
        customer_id: Number(order.customer_id || input.customer_id || 1),
        order_id: orderId,
        method: paymentMethod,
        bank_account_id: bankAccountId,
        amount,
        debt_reduction_amount: debtReductionAmount,
        reference_no: referenceNo,
        note: input.note || "",
        paid_at: `${paidAt}T00:00:00.000Z`,
        is_active: true,
        status: "รับเงินแล้ว",
        created_at: new Date().toISOString(),
      };
      data.payments.push(payment);
      if (paymentMethod === "transfer") {
        const account = data.bank_accounts.find((item) => item.id === bankAccountId);
        if (account) account.current_balance = Number(account.current_balance || 0) + amount;
      }
      const customer = data.customers.find((item) => item.id === payment.customer_id);
      if (customer) customer.balance_due = Math.max(0, Number(customer.balance_due || 0) - settlementAmount);
      const nextOutstanding = Math.max(0, outstanding - settlementAmount);
      order.payment_status = nextOutstanding <= 0 ? "ชำระแล้ว" : "รับบางส่วน";
      saveData(data);
      return enrichPayments(data).find((item) => item.id === payment.id) || payment;
    },
    async deleteCustomerReceiptVoucher(id) {
      const data = ensureData();
      data.payments ||= [];
      const payment = data.payments.find((item) => item.id === id && item.is_active !== false);
      if (!payment) throw new Error("ไม่พบใบสำคัญรับเงิน");
      const order = data.orders.find((item) => item.id === Number(payment.order_id || 0));
      const settlementAmount = paymentSettlementAmount(payment);
      if (payment.method === "transfer" && payment.bank_account_id) {
        const account = (data.bank_accounts || []).find((item) => item.id === Number(payment.bank_account_id));
        if (account) account.current_balance = Number(account.current_balance || 0) - Number(payment.amount || 0);
      }
      const customer = data.customers.find((item) => item.id === Number(payment.customer_id || 0));
      if (customer) customer.balance_due = Number(customer.balance_due || 0) + settlementAmount;
      payment.is_active = false;
      payment.status = "ยกเลิก";
      payment.canceled_at = new Date().toISOString();
      if (order && /^(SND|VDN)/.test(String(order.order_no || "")) && order.status !== "ยกเลิก") {
        const paidTotal = data.payments
          .filter((item) => item.is_active !== false && Number(item.order_id || 0) === Number(order.id))
          .reduce((sum, item) => sum + paymentSettlementAmount(item), 0);
        order.payment_status = paidTotal >= Number(order.total_amount || 0) ? "ชำระแล้ว" : "รอชำระ";
      }
      saveData(data);
      return { id, canceled: true };
    },
    async createPayment(input) {
      const data = ensureData();
      data.payments ||= [];
      data.bank_accounts ||= [];
      const isGeneralReceipt = input.source_type === "general_receipt";
      const paymentDate = input.paid_at || new Date().toISOString().slice(0, 10);
      const paymentMethod = input.payment_method || input.method || "เงินสด";
      const bankAccountId = input.bank_account_id ? Number(input.bank_account_id) : null;
      const amount = Number(input.amount || 0);
      if (amount <= 0) throw new Error("ยอดรับไม่ถูกต้อง");
      if (isTransferMethod(paymentMethod) && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
      const paymentNo = isGeneralReceipt
        ? monthlyDocumentNo(data.payments, "payment_no", "RCV", paymentDate)
        : `PAY${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${String(data.payments.length + 1).padStart(3, "0")}`;
      const referenceNo = String(input.reference_no || "").trim();
      if (referenceNo && data.payments.some((item) => item.is_active !== false && String(item.reference_no || item.payment_no || "") === referenceNo)) {
        throw new Error(`เลขอ้างอิง ${referenceNo} ถูกใช้แล้ว`);
      }
      const payment = {
        id: nextId(data.payments),
        payment_no: paymentNo,
        source_type: isGeneralReceipt ? "general_receipt" : (input.source_type || "payment"),
        party_name: input.party_name || input.received_from || "",
        description: input.description || "",
        customer_id: input.customer_id ? Number(input.customer_id) : null,
        order_id: input.order_id ? Number(input.order_id) : null,
        method: paymentMethod,
        bank_account_id: bankAccountId,
        amount,
        reference_no: referenceNo || paymentNo,
        note: input.note || "",
        is_active: true,
        status: "รับเงินแล้ว",
        paid_at: `${paymentDate}T00:00:00.000Z`,
        created_at: new Date().toISOString(),
      };
      data.payments.push(payment);
      if (bankAccountId) {
        const account = (data.bank_accounts || []).find((item) => item.id === bankAccountId);
        if (account) account.current_balance = Number(account.current_balance || 0) + payment.amount;
      }
      if (payment.customer_id) {
        const customer = data.customers.find((item) => item.id === payment.customer_id);
        if (customer) customer.balance_due = Math.max(0, Number(customer.balance_due || 0) - payment.amount);
      }
      saveData(data);
      return enrichPayments(data, { includeInactive: true }).find((item) => item.id === payment.id) || payment;
    },
    async updatePayment(id, input) {
      const data = ensureData();
      data.payments ||= [];
      data.bank_accounts ||= [];
      const payment = data.payments.find((item) => item.id === id && item.is_active !== false);
      if (!payment) throw new Error("ไม่พบใบรับเงิน");
      const isGeneralReceipt = payment.source_type === "general_receipt" || /^RCV/.test(String(payment.payment_no || ""));
      if (!isGeneralReceipt) throw new Error("แก้ไขได้เฉพาะใบรับเงินทั่วไป");
      const paymentDate = input.paid_at || String(payment.paid_at || new Date().toISOString()).slice(0, 10);
      const paymentMethod = input.payment_method || input.method || payment.method || "cash";
      const bankAccountId = input.bank_account_id ? Number(input.bank_account_id) : null;
      const amount = Number(input.amount || 0);
      if (amount <= 0) throw new Error("ยอดรับไม่ถูกต้อง");
      if (isTransferMethod(paymentMethod) && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
      const referenceNo = String(input.reference_no || "").trim() || payment.payment_no;
      if (data.payments.some((item) => item.id !== id && item.is_active !== false && String(item.reference_no || item.payment_no || "") === referenceNo)) {
        throw new Error(`เลขอ้างอิง ${referenceNo} ถูกใช้แล้ว`);
      }

      if (isTransferMethod(payment.method) && payment.bank_account_id) {
        const oldAccount = data.bank_accounts.find((item) => item.id === Number(payment.bank_account_id));
        if (oldAccount) oldAccount.current_balance = Number(oldAccount.current_balance || 0) - Number(payment.amount || 0);
      }
      if (isTransferMethod(paymentMethod) && bankAccountId) {
        const nextAccount = data.bank_accounts.find((item) => item.id === bankAccountId);
        if (nextAccount) nextAccount.current_balance = Number(nextAccount.current_balance || 0) + amount;
      }

      payment.source_type = "general_receipt";
      payment.party_name = input.party_name || input.received_from || "";
      payment.description = input.description || "";
      payment.method = paymentMethod;
      payment.bank_account_id = bankAccountId;
      payment.amount = amount;
      payment.reference_no = referenceNo;
      payment.note = input.note || "";
      payment.paid_at = `${paymentDate}T00:00:00.000Z`;
      payment.status = "รับเงินแล้ว";
      saveData(data);
      return enrichPayments(data, { includeInactive: true }).find((item) => item.id === payment.id) || payment;
    },
    async deletePayment(id) {
      const data = ensureData();
      data.payments ||= [];
      const payment = data.payments.find((item) => item.id === id && item.is_active !== false);
      if (!payment) throw new Error("ไม่พบใบรับเงิน");
      if (isTransferMethod(payment.method) && payment.bank_account_id) {
        const account = (data.bank_accounts || []).find((item) => item.id === Number(payment.bank_account_id));
        if (account) account.current_balance = Number(account.current_balance || 0) - Number(payment.amount || 0);
      }
      payment.is_active = false;
      payment.status = "ยกเลิก";
      payment.canceled_at = new Date().toISOString();
      saveData(data);
      return { id, canceled: true };
    },
    async expenses() {
      const data = ensureData();
      return dashboardFrom(data).expenses;
    },
    async createExpense(input) {
      const data = ensureData();
      data.expenses ||= [];
      data.bank_accounts ||= [];
      const paidAt = input.paid_at || new Date().toISOString().slice(0, 10);
      const paymentMethod = input.payment_method || input.paid_by || "cash";
      const bankAccountId = isTransferMethod(paymentMethod) ? Number(input.bank_account_id || 0) : null;
      const amount = Number(input.amount || 0);
      if (amount <= 0) throw new Error("ยอดจ่ายไม่ถูกต้อง");
      if (isTransferMethod(paymentMethod) && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
      const expense = {
        id: nextId(data.expenses),
        expense_no: monthlyDocumentNo(data.expenses, "expense_no", input.source_type === "general_payment" ? "GPV" : "EXP", paidAt),
        source_type: input.source_type || "expense",
        category: input.category || "ทั่วไป",
        description: input.description || "ค่าใช้จ่าย",
        payee_name: input.payee_name || "",
        payment_method: paymentMethod,
        bank_account_id: bankAccountId,
        amount,
        reference_no: input.reference_no || "",
        note: input.note || "",
        paid_by: paymentMethod,
        is_active: true,
        status: "บันทึกแล้ว",
        expense_at: `${paidAt}T00:00:00.000Z`,
        created_at: new Date().toISOString(),
      };
      data.expenses.push(expense);
      if (bankAccountId) {
        const account = data.bank_accounts.find((item) => item.id === bankAccountId);
        if (account) account.current_balance = Number(account.current_balance || 0) - amount;
      }
      saveData(data);
      return expense;
    },
    async updateExpense(id, input) {
      const data = ensureData();
      data.expenses ||= [];
      data.bank_accounts ||= [];
      const expense = data.expenses.find((item) => item.id === id && item.is_active !== false);
      if (!expense) throw new Error("ไม่พบใบสำคัญจ่าย");
      const isGeneralPayment = expense.source_type === "general_payment" || /^GPV/.test(String(expense.expense_no || ""));
      if (!isGeneralPayment) throw new Error("แก้ไขได้เฉพาะใบสำคัญจ่ายทั่วไป");
      const paidAt = input.paid_at || String(expense.expense_at || new Date().toISOString()).slice(0, 10);
      const paymentMethod = input.payment_method || input.paid_by || expense.payment_method || expense.paid_by || "cash";
      const bankAccountId = isTransferMethod(paymentMethod) ? Number(input.bank_account_id || 0) : null;
      const amount = Number(input.amount || 0);
      if (amount <= 0) throw new Error("ยอดจ่ายไม่ถูกต้อง");
      if (isTransferMethod(paymentMethod) && !bankAccountId) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");

      if (isTransferMethod(expense.payment_method || expense.paid_by) && expense.bank_account_id) {
        const oldAccount = data.bank_accounts.find((item) => item.id === Number(expense.bank_account_id));
        if (oldAccount) oldAccount.current_balance = Number(oldAccount.current_balance || 0) + Number(expense.amount || 0);
      }
      if (isTransferMethod(paymentMethod) && bankAccountId) {
        const nextAccount = data.bank_accounts.find((item) => item.id === bankAccountId);
        if (nextAccount) nextAccount.current_balance = Number(nextAccount.current_balance || 0) - amount;
      }

      expense.source_type = "general_payment";
      expense.category = input.category || "ทั่วไป";
      expense.description = input.description || "ค่าใช้จ่าย";
      expense.payee_name = input.payee_name || "";
      expense.payment_method = paymentMethod;
      expense.paid_by = paymentMethod;
      expense.bank_account_id = bankAccountId;
      expense.amount = amount;
      expense.reference_no = input.reference_no || "";
      expense.note = input.note || "";
      expense.expense_at = `${paidAt}T00:00:00.000Z`;
      expense.status = "บันทึกแล้ว";
      saveData(data);
      return dashboardFrom(data).expenses.find((item) => item.id === expense.id) || expense;
    },
    async deleteExpense(id) {
      const data = ensureData();
      data.expenses ||= [];
      const expense = data.expenses.find((item) => item.id === id && item.is_active !== false);
      if (!expense) throw new Error("ไม่พบใบสำคัญจ่าย");
      if (isTransferMethod(expense.payment_method || expense.paid_by) && expense.bank_account_id) {
        const account = (data.bank_accounts || []).find((item) => item.id === Number(expense.bank_account_id));
        if (account) account.current_balance = Number(account.current_balance || 0) + Number(expense.amount || 0);
      }
      expense.is_active = false;
      expense.status = "ยกเลิก";
      expense.canceled_at = new Date().toISOString();
      saveData(data);
      return { id, canceled: true };
    },
  };
}

module.exports = { createFileStore };

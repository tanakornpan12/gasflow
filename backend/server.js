const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const projectRoot = path.resolve(__dirname, "..");
const webRoot = path.join(projectRoot, "web-admin");

loadEnv(path.join(projectRoot, ".env"));
const isProduction = process.env.NODE_ENV === "production";
const { createStore } = require("./store/store");
const { hasFeaturePermission } = require("./store/auth-utils");
const { isEmailConfigured, sendPasswordResetEmail } = require("./mailer");

const port = Number(process.env.PORT || 5173);
const store = createStore();
const sessions = new Map();
const sessionTtlMs = Number(process.env.AUTH_SESSION_HOURS || 12) * 60 * 60 * 1000;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function listEnv(name) {
  return String(process.env[name] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value = "") {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function configuredAppBaseUrl() {
  return String(process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
}

function configuredAllowedOrigins() {
  const origins = new Set();
  for (const item of listEnv("CORS_ALLOWED_ORIGINS")) {
    const origin = normalizeOrigin(item);
    if (origin) origins.add(origin);
  }
  const appOrigin = normalizeOrigin(configuredAppBaseUrl());
  if (appOrigin) origins.add(appOrigin);
  return origins;
}

const allowedCorsOrigins = configuredAllowedOrigins();

function isLocalOrigin(origin = "") {
  try {
    const parsed = new URL(origin);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function corsHeadersForRequest(req) {
  const origin = String(req.headers.origin || "").trim();
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (!origin) return headers;
  if (allowedCorsOrigins.has(origin) || (!isProduction && isLocalOrigin(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

function applyCorsHeaders(req, res) {
  res.__corsHeaders = corsHeadersForRequest(req);
  for (const [key, value] of Object.entries(res.__corsHeaders)) {
    res.setHeader(key, value);
  }
  return res.__corsHeaders;
}

function responseHeaders(res, headers = {}) {
  return { ...(res.__corsHeaders || {}), ...headers };
}

function sendJson(res, status, payload) {
  res.writeHead(status, responseHeaders(res, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  }));
  res.end(JSON.stringify(payload));
}

function sendJsonDownload(res, status, payload, filename) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, responseHeaders(res, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    "Access-Control-Expose-Headers": "Content-Disposition",
  }));
  res.end(body);
}

function backupFilename() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `gasflow-backup-${stamp}.json`;
}

function apiErrorStatus(error) {
  if (Number(error?.statusCode)) return Number(error.statusCode);
  if (error?.code && String(error.code).startsWith("ER_")) return 500;
  const message = String(error?.message || "");
  const clientSignals = [
    "\u0e44\u0e21\u0e48",
    "\u0e15\u0e49\u0e2d\u0e07",
    "\u0e01\u0e23\u0e38\u0e13\u0e32",
    "\u0e2b\u0e49\u0e32\u0e21",
    "\u0e0b\u0e49\u0e33",
    "\u0e25\u0e34\u0e07\u0e01\u0e4c",
    "\u0e2d\u0e35\u0e40\u0e21\u0e25",
    "\u0e16\u0e39\u0e01\u0e43\u0e0a\u0e49",
    "Invalid JSON body",
    "Request body too large",
  ];
  return clientSignals.some((signal) => message.includes(signal)) ? 400 : 500;
}

function publicErrorPayload(error, status) {
  if (isProduction && Number(status) >= 500) return { error: "Internal server error" };
  return { error: error?.message || "API error" };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) sessions.delete(token);
  }
}

function createSession(user) {
  cleanupSessions();
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { user, expiresAt: Date.now() + sessionTtlMs });
  return token;
}

function getSession(req) {
  const token = bearerToken(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + sessionTtlMs;
  return { token, user: session.user };
}

function destroySession(req) {
  const token = bearerToken(req);
  if (token) sessions.delete(token);
}

function destroyUserSessions(userId) {
  for (const [token, session] of sessions.entries()) {
    if (Number(session?.user?.id) === Number(userId)) sessions.delete(token);
  }
}

function resetLinkForRequest(req, token) {
  const configuredBase = configuredAppBaseUrl();
  if (!configuredBase && isProduction) return "";
  const requestBase = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || `localhost:${port}`}`;
  const base = configuredBase || requestBase;
  return `${base}/?resetToken=${encodeURIComponent(token)}`;
}

function shouldExposeDebugResetLink() {
  return !isProduction && process.env.RESET_LINK_DEBUG !== "0";
}

function maskEmail(email = "") {
  const text = String(email || "");
  const [name, domain] = text.split("@");
  if (!name || !domain) return "";
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function refreshUserSessions(userId, user) {
  for (const session of sessions.values()) {
    if (Number(session?.user?.id) === Number(userId)) session.user = user;
  }
}

function requireSession(req, res) {
  const session = getSession(req);
  if (session) return session;
  sendJson(res, 401, { error: "กรุณาเข้าสู่ระบบก่อน" });
  return null;
}

function requireAdmin(req, res) {
  if (req.user?.role === "admin") return true;
  sendJson(res, 403, { error: "ต้องเป็นผู้ดูแลระบบเท่านั้น" });
  return false;
}

function canUse(user, permission) {
  return hasFeaturePermission(user, permission);
}

function canUseAny(user, permissions = []) {
  return permissions.some((permission) => canUse(user, permission));
}

function requireAnyPermission(req, res, permissions = []) {
  if (!permissions.length || canUseAny(req.user, permissions)) return true;
  sendJson(res, 403, { error: "ไม่มีสิทธิ์ใช้งานฟังก์ชันนี้" });
  return false;
}

function routePermissions(method, pathname) {
  if (pathname.startsWith("/api/customers")) return ["customers", "sales"];
  if (pathname.startsWith("/api/suppliers")) return ["suppliers", "goods_receipts"];
  if (pathname.startsWith("/api/goods-receipts")) return ["goods_receipts"];
  if (pathname.startsWith("/api/supplier-payment-vouchers")) return ["finance"];
  if (pathname.startsWith("/api/customer-receipt-vouchers")) return ["sales", "finance"];
  if (pathname.startsWith("/api/bank-accounts")) return method === "GET" ? ["finance", "sales", "goods_receipts"] : ["finance"];
  if (pathname.startsWith("/api/cash-openings") || pathname.startsWith("/api/bank-openings")) return ["finance"];
  if (pathname.startsWith("/api/expenses")) return ["finance"];
  if (pathname.startsWith("/api/payments")) return method === "GET" ? ["sales", "finance", "reports"] : ["sales", "finance"];
  if (pathname.startsWith("/api/products/next-sku")) return ["products", "goods_receipts"];
  if (pathname.startsWith("/api/products/") && pathname.endsWith("/stock")) return ["products"];
  if (pathname.startsWith("/api/products")) return method === "GET" ? ["products", "sales", "goods_receipts", "opening_stock", "reports"] : ["products"];
  if (pathname.startsWith("/api/monthly-stock-counts") || pathname.startsWith("/api/opening-balances")) return method === "GET" ? ["opening_stock", "products", "reports"] : ["opening_stock"];
  if (pathname.startsWith("/api/stock-movements")) return ["products", "opening_stock", "reports"];
  if (pathname.startsWith("/api/orders")) return method === "GET" ? ["sales", "delivery", "reports"] : ["sales", "delivery"];
  return [];
}

function authorizeFeatureRoute(req, res, url) {
  return requireAnyPermission(req, res, routePermissions(req.method, url.pathname));
}

function filterDashboardForUser(dashboard = {}, user = {}) {
  if (user.role === "admin") return dashboard;
  const filtered = {
    ...dashboard,
    customers: dashboard.customers || [],
    products: dashboard.products || [],
    suppliers: dashboard.suppliers || [],
    bankAccounts: dashboard.bankAccounts || [],
    goodsReceipts: dashboard.goodsReceipts || [],
    supplierPaymentVouchers: dashboard.supplierPaymentVouchers || [],
    openingBalances: dashboard.openingBalances || [],
    cashOpenings: dashboard.cashOpenings || [],
    bankOpenings: dashboard.bankOpenings || [],
    monthlyStockCounts: dashboard.monthlyStockCounts || [],
    stockMovements: dashboard.stockMovements || [],
    orders: dashboard.orders || [],
    payments: dashboard.payments || [],
    customerReceiptVouchers: dashboard.customerReceiptVouchers || [],
    generalReceiptVouchers: dashboard.generalReceiptVouchers || [],
    expenses: dashboard.expenses || [],
  };
  if (!canUseAny(user, ["customers", "sales", "reports"])) filtered.customers = [];
  if (!canUseAny(user, ["products", "sales", "goods_receipts", "opening_stock", "reports"])) filtered.products = [];
  if (!canUseAny(user, ["suppliers", "goods_receipts", "finance"])) filtered.suppliers = [];
  if (!canUseAny(user, ["finance", "sales", "goods_receipts"])) filtered.bankAccounts = [];
  if (!canUseAny(user, ["goods_receipts", "finance", "reports"])) filtered.goodsReceipts = [];
  if (!canUse(user, "finance")) {
    filtered.supplierPaymentVouchers = [];
    filtered.cashOpenings = [];
    filtered.bankOpenings = [];
    filtered.expenses = [];
    filtered.generalReceiptVouchers = [];
  }
  if (!canUseAny(user, ["opening_stock", "products", "reports"])) {
    filtered.openingBalances = [];
    filtered.monthlyStockCounts = [];
    filtered.stockMovements = [];
  }
  if (!canUseAny(user, ["sales", "delivery", "reports"])) filtered.orders = [];
  if (!canUseAny(user, ["sales", "finance", "reports"])) {
    filtered.payments = [];
    filtered.customerReceiptVouchers = [];
  }
  return filtered;
}

async function handleApi(req, res, url) {
  if (!url.pathname.startsWith("/api/")) return false;
  applyCorsHeaders(req, res);
  try {
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      res.writeHead(204, responseHeaders(res, {
        "Cache-Control": "no-store",
      }));
      res.end();
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, await store.health());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      const user = await store.authenticateUser(await readBody(req));
      if (!user) {
        sendJson(res, 401, { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        return true;
      }
      sendJson(res, 200, { token: createSession(user), user });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/forgot-password") {
      const reset = await store.createPasswordResetToken(await readBody(req));
      const configured = isEmailConfigured();
      const payload = {
        ok: true,
        mailConfigured: configured,
        mailSent: false,
        maskedEmail: !isProduction && reset.email ? maskEmail(reset.email) : "",
      };
      if (reset.email && reset.token) {
        const resetLink = resetLinkForRequest(req, reset.token);
        if (configured && resetLink) {
          const mail = await sendPasswordResetEmail({
            to: reset.email,
            username: reset.user?.display_name || reset.user?.username || "",
            resetLink,
            expiresMinutes: 60,
          });
          payload.mailSent = Boolean(mail.sent);
        }
        if (!configured && resetLink && shouldExposeDebugResetLink()) payload.devResetLink = resetLink;
      }
      sendJson(res, 200, payload);
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
      const result = await store.resetPasswordWithToken(await readBody(req));
      if (result.userId) destroyUserSessions(result.userId);
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/auth/me") {
      const session = requireSession(req, res);
      if (!session) return true;
      sendJson(res, 200, { user: session.user });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      const session = requireSession(req, res);
      if (!session) return true;
      destroySession(req);
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (url.pathname.startsWith("/api/")) {
      const session = requireSession(req, res);
      if (!session) return true;
      req.user = session.user;
    }

    if (req.method === "PATCH" && url.pathname === "/api/auth/password") {
      await store.changePassword(req.user.id, await readBody(req));
      destroyUserSessions(req.user.id);
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/users") {
      if (!requireAdmin(req, res)) return true;
      sendJson(res, 200, await store.users());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/users") {
      if (!requireAdmin(req, res)) return true;
      sendJson(res, 201, await store.createUser(await readBody(req)));
      return true;
    }

    const userPasswordMatch = url.pathname.match(/^\/api\/users\/(\d+)\/password$/);
    if (req.method === "PATCH" && userPasswordMatch) {
      if (!requireAdmin(req, res)) return true;
      const targetId = Number(userPasswordMatch[1]);
      await store.resetUserPassword(targetId, await readBody(req));
      destroyUserSessions(targetId);
      sendJson(res, 200, { ok: true });
      return true;
    }

    const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/);
    if (req.method === "PATCH" && userMatch) {
      if (!requireAdmin(req, res)) return true;
      const targetId = Number(userMatch[1]);
      const body = await readBody(req);
      if (targetId === Number(req.user.id) && (body.is_active === false || body.is_active === 0 || (body.role && body.role !== req.user.role))) {
        sendJson(res, 400, { error: "ไม่สามารถลดสิทธิ์หรือปิดผู้ใช้ของตัวเองได้" });
        return true;
      }
      const user = await store.updateUser(targetId, body);
      refreshUserSessions(targetId, user);
      sendJson(res, 200, user);
      return true;
    }

    if (req.method === "DELETE" && userMatch) {
      if (!requireAdmin(req, res)) return true;
      const targetId = Number(userMatch[1]);
      if (targetId === Number(req.user.id)) {
        sendJson(res, 400, { error: "ไม่สามารถปิดผู้ใช้ของตัวเองได้" });
        return true;
      }
      await store.deleteUser(targetId);
      destroyUserSessions(targetId);
      sendJson(res, 200, { id: targetId, deleted: true });
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/branches") {
      if (!requireAdmin(req, res)) return true;
      sendJson(res, 200, await store.branches());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/branches") {
      if (!requireAdmin(req, res)) return true;
      sendJson(res, 201, await store.createBranch(await readBody(req)));
      return true;
    }

    const branchMatch = url.pathname.match(/^\/api\/branches\/(\d+)$/);
    if (req.method === "PATCH" && branchMatch) {
      if (!requireAdmin(req, res)) return true;
      sendJson(res, 200, await store.updateBranch(Number(branchMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "DELETE" && branchMatch) {
      if (!requireAdmin(req, res)) return true;
      sendJson(res, 200, await store.deleteBranch(Number(branchMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/backup") {
      if (!requireAdmin(req, res)) return true;
      sendJsonDownload(res, 200, await store.backupData(), backupFilename());
      return true;
    }

    if (!authorizeFeatureRoute(req, res, url)) return true;

    if (req.method === "GET" && url.pathname === "/api/dashboard") {
      sendJson(res, 200, filterDashboardForUser(await store.dashboard(), req.user));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/customers") {
      sendJson(res, 200, await store.customers());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/customers") {
      sendJson(res, 201, await store.createCustomer(await readBody(req)));
      return true;
    }

    const customerPriorityMatch = url.pathname.match(/^\/api\/customers\/(\d+)\/priority$/);
    if (req.method === "PATCH" && customerPriorityMatch) {
      sendJson(res, 200, await store.updateCustomerPriority(Number(customerPriorityMatch[1]), await readBody(req)));
      return true;
    }

    const customerMatch = url.pathname.match(/^\/api\/customers\/(\d+)$/);
    if (req.method === "PATCH" && customerMatch) {
      sendJson(res, 200, await store.updateCustomer(Number(customerMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "DELETE" && customerMatch) {
      sendJson(res, 200, await store.deleteCustomer(Number(customerMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/suppliers") {
      sendJson(res, 200, await store.suppliers());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/suppliers") {
      sendJson(res, 201, await store.createSupplier(await readBody(req)));
      return true;
    }

    const supplierMatch = url.pathname.match(/^\/api\/suppliers\/(\d+)$/);
    if (req.method === "PATCH" && supplierMatch) {
      sendJson(res, 200, await store.updateSupplier(Number(supplierMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "DELETE" && supplierMatch) {
      sendJson(res, 200, await store.deleteSupplier(Number(supplierMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/bank-accounts") {
      sendJson(res, 200, await store.bankAccounts());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/bank-accounts") {
      sendJson(res, 201, await store.createBankAccount(await readBody(req)));
      return true;
    }

    const bankAccountMatch = url.pathname.match(/^\/api\/bank-accounts\/(\d+)$/);
    if (req.method === "PATCH" && bankAccountMatch) {
      sendJson(res, 200, await store.updateBankAccount(Number(bankAccountMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "DELETE" && bankAccountMatch) {
      sendJson(res, 200, await store.deleteBankAccount(Number(bankAccountMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/goods-receipts") {
      sendJson(res, 200, await store.goodsReceipts());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/goods-receipts") {
      sendJson(res, 201, await store.createGoodsReceipt(await readBody(req)));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/supplier-payment-vouchers") {
      sendJson(res, 200, await store.supplierPaymentVouchers());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/supplier-payment-vouchers") {
      sendJson(res, 201, await store.createSupplierPaymentVoucher(await readBody(req)));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/customer-receipt-vouchers") {
      sendJson(res, 200, await store.customerReceiptVouchers());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/customer-receipt-vouchers") {
      sendJson(res, 201, await store.createCustomerReceiptVoucher(await readBody(req)));
      return true;
    }

    const customerReceiptVoucherMatch = url.pathname.match(/^\/api\/customer-receipt-vouchers\/(\d+)$/);
    if (req.method === "DELETE" && customerReceiptVoucherMatch) {
      sendJson(res, 200, await store.deleteCustomerReceiptVoucher(Number(customerReceiptVoucherMatch[1])));
      return true;
    }

    const supplierPaymentVoucherMatch = url.pathname.match(/^\/api\/supplier-payment-vouchers\/(\d+)$/);
    if (req.method === "DELETE" && supplierPaymentVoucherMatch) {
      sendJson(res, 200, await store.deleteSupplierPaymentVoucher(Number(supplierPaymentVoucherMatch[1])));
      return true;
    }

    const goodsReceiptMatch = url.pathname.match(/^\/api\/goods-receipts\/(\d+)$/);
    if (req.method === "PATCH" && goodsReceiptMatch) {
      sendJson(res, 200, await store.updateGoodsReceipt(Number(goodsReceiptMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "DELETE" && goodsReceiptMatch) {
      sendJson(res, 200, await store.deleteGoodsReceipt(Number(goodsReceiptMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/products") {
      sendJson(res, 200, await store.products());
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/products/next-sku") {
      sendJson(res, 200, await store.nextProductSku(url.searchParams.get("category") || "accessory"));
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/products") {
      sendJson(res, 201, await store.createProduct(await readBody(req)));
      return true;
    }

    const productMatch = url.pathname.match(/^\/api\/products\/(\d+)$/);
    if (req.method === "PATCH" && productMatch) {
      sendJson(res, 200, await store.updateProduct(Number(productMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "DELETE" && productMatch) {
      sendJson(res, 200, await store.deleteProduct(Number(productMatch[1])));
      return true;
    }

    const productStockMatch = url.pathname.match(/^\/api\/products\/(\d+)\/stock$/);
    if (req.method === "PATCH" && productStockMatch) {
      sendJson(res, 200, await store.adjustStock(Number(productStockMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/monthly-stock-counts") {
      sendJson(res, 200, await store.monthlyStockCounts(url.searchParams.get("month") || ""));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/opening-balances") {
      sendJson(res, 200, await store.openingBalances(url.searchParams.get("month") || ""));
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/opening-balances") {
      sendJson(res, 201, await store.saveOpeningBalance(await readBody(req)));
      return true;
    }

    const openingBalanceMatch = url.pathname.match(/^\/api\/opening-balances\/(\d+)$/);
    if (req.method === "DELETE" && openingBalanceMatch) {
      sendJson(res, 200, await store.deleteOpeningBalance(Number(openingBalanceMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/cash-openings") {
      sendJson(res, 200, await store.cashOpenings(url.searchParams.get("month") || ""));
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/cash-openings") {
      sendJson(res, 201, await store.saveCashOpening(await readBody(req)));
      return true;
    }

    const cashOpeningMatch = url.pathname.match(/^\/api\/cash-openings\/(\d+)$/);
    if (req.method === "DELETE" && cashOpeningMatch) {
      sendJson(res, 200, await store.deleteCashOpening(Number(cashOpeningMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/bank-openings") {
      sendJson(res, 200, await store.bankOpenings(url.searchParams.get("month") || ""));
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/bank-openings") {
      sendJson(res, 201, await store.saveBankOpening(await readBody(req)));
      return true;
    }

    const bankOpeningMatch = url.pathname.match(/^\/api\/bank-openings\/(\d+)$/);
    if (req.method === "DELETE" && bankOpeningMatch) {
      sendJson(res, 200, await store.deleteBankOpening(Number(bankOpeningMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/stock-movements") {
      sendJson(res, 200, await store.stockMovements(url.searchParams.get("month") || ""));
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/monthly-stock-counts") {
      sendJson(res, 201, await store.saveMonthlyStockCounts(await readBody(req)));
      return true;
    }

    const monthlyStockCountMatch = url.pathname.match(/^\/api\/monthly-stock-counts\/(\d+)$/);
    if (req.method === "DELETE" && monthlyStockCountMatch) {
      sendJson(res, 200, await store.deleteMonthlyStockCount(Number(monthlyStockCountMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/orders") {
      sendJson(res, 200, await store.orders());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      sendJson(res, 201, await store.createOrder(await readBody(req)));
      return true;
    }

    const orderStatusMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/status$/);
    if (req.method === "PATCH" && orderStatusMatch) {
      sendJson(res, 200, await store.updateOrderStatus(Number(orderStatusMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/payments") {
      sendJson(res, 200, await store.payments());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/payments") {
      sendJson(res, 201, await store.createPayment(await readBody(req)));
      return true;
    }

    const paymentMatch = url.pathname.match(/^\/api\/payments\/(\d+)$/);
    if (req.method === "PATCH" && paymentMatch) {
      sendJson(res, 200, await store.updatePayment(Number(paymentMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "DELETE" && paymentMatch) {
      sendJson(res, 200, await store.deletePayment(Number(paymentMatch[1])));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/expenses") {
      sendJson(res, 200, await store.expenses());
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/expenses") {
      sendJson(res, 201, await store.createExpense(await readBody(req)));
      return true;
    }

    const expenseMatch = url.pathname.match(/^\/api\/expenses\/(\d+)$/);
    if (req.method === "PATCH" && expenseMatch) {
      sendJson(res, 200, await store.updateExpense(Number(expenseMatch[1]), await readBody(req)));
      return true;
    }

    if (req.method === "DELETE" && expenseMatch) {
      sendJson(res, 200, await store.deleteExpense(Number(expenseMatch[1])));
      return true;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "API endpoint not found" });
      return true;
    }

    return false;
  } catch (error) {
    const status = apiErrorStatus(error);
    sendJson(res, status, publicErrorPayload(error, status));
    return true;
  }
}

function sendStatic(res, requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(webRoot, safePath));

  if (!filePath.startsWith(webRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(webRoot, "index.html"), (fallbackError, fallbackData) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": types[".html"], "Cache-Control": "no-store" });
        res.end(fallbackData);
      });
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (await handleApi(req, res, url)) return;
  sendStatic(res, url.pathname);
});

server.listen(port, () => {
  console.log(`GasFlow app and API running at http://localhost:${port}`);
});

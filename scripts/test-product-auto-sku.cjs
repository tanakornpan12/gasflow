const baseUrl = "http://localhost:5173";
const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}

function loadEnv() {
  const envFile = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

async function hardDeleteProducts(ids) {
  loadEnv();
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3307),
    user: process.env.MYSQL_USER || "gasflow",
    password: process.env.MYSQL_PASSWORD || "gasflow123",
    database: process.env.MYSQL_DATABASE || "gasflow",
  });
  await conn.query("DELETE FROM products WHERE id IN (?)", [ids]);
  await conn.end();
}

(async () => {
  const nextGas = await request("/api/products/next-sku?category=gas");
  const gasProduct = await request("/api/products", {
    method: "POST",
    body: JSON.stringify({
      sku: "",
      name: `Auto SKU gas ${Date.now()}`,
      category: "gas",
      unit: "ถัง",
      unit_price: 1,
      stock_full: 0,
      stock_empty: 0,
      reorder_level: 0,
    }),
  });

  const customCategory = "หมวดทดสอบรหัสอัตโนมัติ";
  const nextCustom = await request(`/api/products/next-sku?category=${encodeURIComponent(customCategory)}`);
  const customProduct = await request("/api/products", {
    method: "POST",
    body: JSON.stringify({
      sku: "",
      name: `Auto SKU custom ${Date.now()}`,
      category: customCategory,
      unit: "ชิ้น",
      unit_price: 1,
      stock_full: 0,
      stock_empty: 0,
      reorder_level: 0,
    }),
  });

  if (gasProduct.sku !== nextGas.sku) throw new Error(`Expected ${nextGas.sku}, got ${gasProduct.sku}`);
  if (customProduct.sku !== nextCustom.sku) throw new Error(`Expected ${nextCustom.sku}, got ${customProduct.sku}`);
  if (gasProduct.sku.split("-")[0] === customProduct.sku.split("-")[0]) throw new Error("Different categories should not share SKU prefix");

  await request(`/api/products/${gasProduct.id}`, { method: "DELETE" });
  await request(`/api/products/${customProduct.id}`, { method: "DELETE" });
  await hardDeleteProducts([gasProduct.id, customProduct.id]);

  console.log(JSON.stringify({ nextGas, gasProduct, nextCustom, customProduct }, null, 2));
})();

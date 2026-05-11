const mysql = require("mysql2/promise");
const seed = require("../backend/store/seed");

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

  await conn.query("SET NAMES utf8mb4");
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  await conn.query("TRUNCATE TABLE payments");
  await conn.query("TRUNCATE TABLE order_items");
  await conn.query("TRUNCATE TABLE orders");
  await conn.query("TRUNCATE TABLE products");
  await conn.query("TRUNCATE TABLE customers");
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");

  for (const c of seed.customers) {
    await conn.execute(
      "INSERT INTO customers (id, name, phone, address, customer_type, balance_due, cylinders_on_hand, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
      [c.id, c.name, c.phone, c.address, c.customer_type, c.balance_due, c.cylinders_on_hand, c.latitude, c.longitude]
    );
  }

  for (const p of seed.products) {
    await conn.execute(
      "INSERT INTO products (id, sku, name, category, unit, unit_price, stock_full, stock_empty, reorder_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [p.id, p.sku, p.name, p.category, p.unit, p.unit_price, p.stock_full, p.stock_empty, p.reorder_level]
    );
  }

  for (const o of seed.orders) {
    await conn.execute(
      "INSERT INTO orders (id, order_no, customer_id, status, delivery_address, delivery_time, payment_status, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [o.id, o.order_no, o.customer_id, o.status, o.delivery_address, o.delivery_time, o.payment_status, o.total_amount]
    );
    for (const item of o.items) {
      await conn.execute(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)",
        [o.id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }
  }

  for (const p of seed.payments) {
    await conn.execute(
      "INSERT INTO payments (id, payment_no, customer_id, order_id, method, amount, note, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [p.id, p.payment_no, p.customer_id, p.order_id, p.method, p.amount, p.note, new Date(p.paid_at)]
    );
  }

  await conn.end();
  console.log("mysql-seed-reset-ok");
})();

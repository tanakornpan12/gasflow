const baseUrl = "http://localhost:5173";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}

(async () => {
  const product = await request("/api/products", {
    method: "POST",
    body: JSON.stringify({
      sku: `TEST-${Date.now().toString().slice(-5)}`,
      name: "สินค้าทดสอบครบฟอร์ม",
      category: "accessory",
      unit_price: 99,
      stock_full: 3,
      stock_empty: 0,
      reorder_level: 1,
    }),
  });

  const stock = await request(`/api/products/${product.id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({
      movement_type: "receive",
      full_delta: 2,
      empty_delta: 0,
      note: "ทดสอบปรับสต็อก",
    }),
  });

  const expense = await request("/api/expenses", {
    method: "POST",
    body: JSON.stringify({
      category: "ค่าน้ำมัน",
      description: "ทดสอบค่าใช้จ่ายครบฟอร์ม",
      amount: 123,
      paid_by: "เงินสด",
    }),
  });

  console.log(JSON.stringify({ product, stock, expense }, null, 2));
})();

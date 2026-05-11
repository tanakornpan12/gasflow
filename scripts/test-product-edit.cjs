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
  const created = await request("/api/products", {
    method: "POST",
    body: JSON.stringify({
      sku: `EDIT-${Date.now().toString().slice(-5)}`,
      name: "สินค้าทดสอบแก้ไข",
      category: "ทดสอบ",
      unit: "แพ็ค",
      unit_price: 111,
      stock_full: 1,
      stock_empty: 0,
      reorder_level: 1,
    }),
  });

  const updated = await request(`/api/products/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      sku: created.sku,
      name: "สินค้าทดสอบแก้ไขแล้ว",
      category: "ทดสอบ",
      unit: "กล่อง",
      unit_price: 222,
      stock_full: 2,
      stock_empty: 1,
      reorder_level: 1,
    }),
  });

  console.log(JSON.stringify({ created, updated }, null, 2));
})();

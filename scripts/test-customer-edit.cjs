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
  const created = await request("/api/customers", {
    method: "POST",
    body: JSON.stringify({
      name: "ลูกค้าทดสอบแก้ไข",
      phone: "081-000-1111",
      address: "ที่อยู่ก่อนแก้ไข",
      customer_type: "ทั่วไป",
      credit_limit: 1000,
      balance_due: 50,
      cylinders_on_hand: "15kg 1 ถัง",
    }),
  });

  const updated = await request(`/api/customers/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: "ลูกค้าทดสอบแก้ไขแล้ว",
      phone: "081-000-2222",
      address: "ที่อยู่หลังแก้ไข",
      customer_type: "VIP",
      credit_limit: 2000,
      balance_due: 25,
      cylinders_on_hand: "15kg 2 ถัง",
    }),
  });

  console.log(JSON.stringify({ created, updated }, null, 2));
})();

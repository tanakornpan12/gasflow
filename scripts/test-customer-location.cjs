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
      name: "ลูกค้าทดสอบพิกัด",
      phone: "081-999-0000",
      address: "จุดทดสอบพิกัด",
      customer_type: "ทั่วไป",
      latitude: 13.7563309,
      longitude: 100.5017651,
      balance_due: 0,
      cylinders_on_hand: "15kg 1 ถัง",
    }),
  });
  const updated = await request(`/api/customers/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...created,
      credit_limit: 0,
      latitude: 13.7565001,
      longitude: 100.5020002,
    }),
  });
  console.log(JSON.stringify({ created, updated }, null, 2));
})();

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
  const created = await request("/api/suppliers", {
    method: "POST",
    body: JSON.stringify({
      name: `ตัวแทนทดสอบ ${Date.now()}`,
      contact_name: "คุณทดสอบ",
      phone: "080-000-0000",
      address: "คลังทดสอบ",
      tax_id: "0100000000000",
      payment_terms: "เครดิต 7 วัน",
      note: "ทดสอบระบบ",
    }),
  });

  const updated = await request(`/api/suppliers/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...created,
      contact_name: "คุณทดสอบแก้ไข",
      payment_terms: "เครดิต 30 วัน",
    }),
  });

  await request(`/api/suppliers/${created.id}`, { method: "DELETE" });
  const suppliers = await request("/api/suppliers");
  if (suppliers.some((supplier) => supplier.id === created.id)) throw new Error("Deleted supplier is still active");

  console.log(JSON.stringify({ created, updated, activeSuppliers: suppliers.length }, null, 2));
})();

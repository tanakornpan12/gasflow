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
  const customer = await request("/api/customers", {
    method: "POST",
    body: JSON.stringify({
      name: "ลูกค้าทดสอบเว็บ",
      phone: "080-123-4567",
      address: "ทดสอบบันทึกลง MySQL",
      customer_type: "ทั่วไป",
    }),
  });

  const order = await request("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customer.id,
      delivery_address: customer.address,
      delivery_time: "15:30",
      payment_status: "รอชำระ",
      items: [{ product_id: 1, quantity: 1, unit_price: 380 }],
    }),
  });

  const payment = await request("/api/payments", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customer.id,
      order_id: order.id,
      method: "เงินสด",
      amount: 380,
      note: "ทดสอบรับเงินผ่าน API",
    }),
  });

  const health = await request("/api/health");
  console.log(JSON.stringify({ health, customer, order, payment }, null, 2));
})();

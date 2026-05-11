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
  const productsBefore = await request("/api/products");
  const product = productsBefore[0];
  const secondProduct = productsBefore[1] || productsBefore[0];
  const beforeFull = Number(product.stock_full || product.stock || 0);
  const beforeSecondFull = Number(secondProduct.stock_full || secondProduct.stock || 0);

  const receipt = await request("/api/goods-receipts", {
    method: "POST",
    body: JSON.stringify({
      supplier_id: 1,
      invoice_no: `TEST-GR-${Date.now()}`,
      received_at: new Date().toISOString().slice(0, 10),
      payment_status: "เครดิต",
      vat_rate: 7,
      note: "ทดสอบใบรับสินค้า",
      items: [{
        product_id: product.id,
        quantity_full: 2,
        quantity_empty: 1,
        unit_cost: 100,
      }, {
        product_id: secondProduct.id,
        quantity_full: 3,
        quantity_empty: 0,
        unit_cost: 200,
      }],
    }),
  });
  if (Number(receipt.subtotal_amount || 0) !== 800) throw new Error("Receipt subtotal did not calculate correctly");
  if (Number(receipt.vat_amount || 0) !== 56) throw new Error("Receipt VAT did not calculate correctly");
  if (Number(receipt.total_amount || 0) !== 856) throw new Error("Receipt total with VAT did not calculate correctly");

  const productsAfterReceive = await request("/api/products");
  const receivedProduct = productsAfterReceive.find((item) => item.id === product.id);
  const receivedSecondProduct = productsAfterReceive.find((item) => item.id === secondProduct.id);
  if (Number(receivedProduct.stock_full || 0) !== beforeFull + 2) throw new Error("Stock did not increase after receipt");
  if (Number(receivedSecondProduct.stock_full || 0) !== beforeSecondFull + 3) throw new Error("Second stock did not increase after receipt");

  await request(`/api/goods-receipts/${receipt.id}`, { method: "DELETE" });
  const productsAfterVoid = await request("/api/products");
  const voidedProduct = productsAfterVoid.find((item) => item.id === product.id);
  const voidedSecondProduct = productsAfterVoid.find((item) => item.id === secondProduct.id);
  if (Number(voidedProduct.stock_full || 0) !== beforeFull) throw new Error("Stock did not reverse after voiding receipt");
  if (Number(voidedSecondProduct.stock_full || 0) !== beforeSecondFull) throw new Error("Second stock did not reverse after voiding receipt");

  console.log(JSON.stringify({
    receipt,
    beforeFull,
    beforeSecondFull,
    afterReceive: Number(receivedProduct.stock_full),
    afterSecondReceive: Number(receivedSecondProduct.stock_full),
    afterVoid: Number(voidedProduct.stock_full),
    afterSecondVoid: Number(voidedSecondProduct.stock_full),
  }, null, 2));
})();

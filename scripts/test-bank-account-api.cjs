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
  const created = await request("/api/bank-accounts", {
    method: "POST",
    body: JSON.stringify({
      bank_name: "ธนาคารทดสอบ",
      account_name: `บัญชีทดสอบ ${Date.now()}`,
      account_number: "999-9-99999-9",
      branch_name: "สาขาทดสอบ",
      account_type: "ออมทรัพย์",
      opening_balance: 1000,
      current_balance: 1500,
      note: "ทดสอบระบบบัญชีธนาคาร",
    }),
  });

  const updated = await request(`/api/bank-accounts/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...created,
      branch_name: "สาขาแก้ไข",
      current_balance: 2500,
    }),
  });

  await request(`/api/bank-accounts/${created.id}`, { method: "DELETE" });
  const accounts = await request("/api/bank-accounts");
  if (accounts.some((account) => account.id === created.id)) throw new Error("Deleted bank account is still active");

  console.log(JSON.stringify({ created, updated, activeAccounts: accounts.length }, null, 2));
})();

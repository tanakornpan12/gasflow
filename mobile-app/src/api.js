const DEFAULT_API_BASE_URL = "http://localhost:5173";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json();
}

export function getDashboard() {
  return request("/api/dashboard");
}

export function getOrders() {
  return request("/api/orders");
}

export function getBankAccounts() {
  return request("/api/bank-accounts");
}

export function updateOrderStatus(orderId, status) {
  return request(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function createPayment(payload) {
  return request("/api/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

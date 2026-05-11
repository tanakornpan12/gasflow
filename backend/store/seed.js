const customers = [
  { id: 1, name: "ลูกค้าทดสอบ 001", phone: "080-000-0001", address: "ที่อยู่ตัวอย่าง 1", customer_type: "VIP", balance_due: 11000, cylinders_on_hand: "15kg 4 ถัง", latitude: 13.7000000, longitude: 100.5000000 },
  { id: 2, name: "ร้านอาหารตัวอย่าง", phone: "080-000-0002", address: "ที่อยู่ตัวอย่าง 2", customer_type: "เครดิต", balance_due: 12450, cylinders_on_hand: "48kg 2 ถัง", latitude: 13.7100000, longitude: 100.5100000 },
  { id: 3, name: "บริษัท ตัวอย่าง จำกัด", phone: "080-000-0003", address: "ที่อยู่ตัวอย่าง 3", customer_type: "เครดิต", balance_due: 18500, cylinders_on_hand: "48kg 6 ถัง", latitude: 13.7200000, longitude: 100.5200000 },
  { id: 4, name: "ร้านกาแฟตัวอย่าง", phone: "080-000-0004", address: "ที่อยู่ตัวอย่าง 4", customer_type: "ทั่วไป", balance_due: 7900, cylinders_on_hand: "15kg 3 ถัง", latitude: 13.7300000, longitude: 100.5300000 },
];

const products = [
  { id: 1, sku: "GAS-15", name: "แก๊ส 15 กก.", category: "gas", unit: "ถัง", unit_price: 380, stock_full: 90, stock_empty: 50, reorder_level: 20 },
  { id: 2, sku: "GAS-48", name: "แก๊ส 48 กก.", category: "gas", unit: "ถัง", unit_price: 1450, stock_full: 35, stock_empty: 18, reorder_level: 10 },
  { id: 3, sku: "REG-01", name: "หัวปรับแรงดัน", category: "accessory", unit: "ชิ้น", unit_price: 250, stock_full: 18, stock_empty: 0, reorder_level: 5 },
  { id: 4, sku: "HOSE-2M", name: "สายแก๊ส 2 เมตร", category: "accessory", unit: "เส้น", unit_price: 180, stock_full: 24, stock_empty: 0, reorder_level: 5 },
];

const suppliers = [
  { id: 1, name: "บริษัท ซัพพลายเออร์ตัวอย่าง จำกัด", contact_name: "ฝ่ายขายตัวอย่าง", phone: "02-000-0001", address: "ที่อยู่ซัพพลายเออร์ตัวอย่าง 1", tax_id: "0999999999999", payment_terms: "เครดิต 30 วัน", note: "ข้อมูลตัวอย่างเท่านั้น" },
  { id: 2, name: "หจก. อุปกรณ์แก๊สตัวอย่าง", contact_name: "ผู้ติดต่อทดสอบ", phone: "02-000-0002", address: "ที่อยู่ซัพพลายเออร์ตัวอย่าง 2", tax_id: "", payment_terms: "เงินสด", note: "ข้อมูลตัวอย่างเท่านั้น" },
];

const bank_accounts = [
  { id: 1, bank_name: "ธนาคารตัวอย่าง A", account_name: "ร้านแก๊สตัวอย่าง", account_number: "000-0-00001-0", branch_name: "สาขาตัวอย่าง", account_type: "ออมทรัพย์", opening_balance: 50000, current_balance: 50000, note: "บัญชีตัวอย่างเท่านั้น" },
  { id: 2, bank_name: "ธนาคารตัวอย่าง B", account_name: "ร้านแก๊สตัวอย่าง", account_number: "000-0-00002-0", branch_name: "สาขาตัวอย่าง", account_type: "กระแสรายวัน", opening_balance: 20000, current_balance: 20000, note: "บัญชีตัวอย่างเท่านั้น" },
];

const branches = [
  { id: 1, name: "สาขาตัวอย่าง", tax_id: "0999999999999", phone: "02-000-0000", address: "ที่อยู่สาขาตัวอย่าง", is_active: true },
];

const orders = [
  { id: 1, order_no: "OD670524-012", customer_id: 1, status: "รอดำเนินการ", delivery_address: "ที่อยู่ตัวอย่าง 1", delivery_time: "09:15", payment_status: "รอชำระ", total_amount: 760, items: [{ product_id: 1, quantity: 2, unit_price: 380 }] },
  { id: 2, order_no: "OD670524-013", customer_id: 2, status: "รอดำเนินการ", delivery_address: "ที่อยู่ตัวอย่าง 2", delivery_time: "09:30", payment_status: "รอชำระ", total_amount: 1450, items: [{ product_id: 2, quantity: 1, unit_price: 1450 }] },
  { id: 3, order_no: "OD670524-014", customer_id: 4, status: "กำลังจัดส่ง", delivery_address: "ที่อยู่ตัวอย่าง 4", delivery_time: "10:00", payment_status: "เก็บเงินปลายทาง", total_amount: 380, items: [{ product_id: 1, quantity: 1, unit_price: 380 }] },
];

const payments = [
  { id: 1, payment_no: "PAY670524-001", customer_id: 1, order_id: 1, method: "เงินสด", amount: 760, note: "รับเงินหน้าร้าน", paid_at: new Date().toISOString() },
];

const expenses = [
  { id: 1, expense_no: "EXP670524-001", category: "ค่าน้ำมัน", description: "ค่าน้ำมันรถส่งแก๊ส", amount: 800, paid_by: "เงินสด", expense_at: new Date().toISOString() },
];

const stock_movements = [];
const goods_receipts = [];
const goods_receipt_items = [];

module.exports = { customers, products, suppliers, bank_accounts, branches, goods_receipts, goods_receipt_items, orders, payments, expenses, stock_movements };

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS app_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(160),
  email VARCHAR(160),
  role VARCHAR(40) DEFAULT 'staff',
  permissions JSON NULL,
  reset_password_token_hash VARCHAR(128),
  reset_password_expires_at DATETIME NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  tax_id VARCHAR(40),
  phone VARCHAR(40),
  address VARCHAR(255),
  payment_qr_image LONGTEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  line_id VARCHAR(80),
  address VARCHAR(255),
  customer_type VARCHAR(40) DEFAULT 'ทั่วไป',
  credit_limit DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  cylinders_on_hand VARCHAR(80),
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_active TINYINT(1) DEFAULT 1,
  is_priority TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  unit VARCHAR(40) DEFAULT 'ชิ้น',
  unit_price DECIMAL(12,2) NOT NULL,
  stock_full INT DEFAULT 0,
  stock_empty INT DEFAULT 0,
  reorder_level INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  contact_name VARCHAR(120),
  phone VARCHAR(40),
  address VARCHAR(255),
  tax_id VARCHAR(40),
  payment_terms VARCHAR(80),
  note VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_name VARCHAR(120) NOT NULL,
  account_name VARCHAR(160) NOT NULL,
  account_number VARCHAR(60) NOT NULL,
  branch_name VARCHAR(120),
  account_type VARCHAR(60) DEFAULT 'ออมทรัพย์',
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  note VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bank_openings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_month CHAR(7) NOT NULL,
  bank_account_id INT NOT NULL,
  opening_balance DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bank_opening_month_account (bank_month, bank_account_id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goods_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_no VARCHAR(40) NOT NULL UNIQUE,
  supplier_id INT NULL,
  invoice_no VARCHAR(80),
  received_at DATE NULL,
  payment_status VARCHAR(40) DEFAULT 'รอชำระ',
  payment_method VARCHAR(40) DEFAULT 'credit',
  credit_days INT DEFAULT 0,
  bank_account_id INT NULL,
  subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_type VARCHAR(20) NOT NULL DEFAULT 'exclusive',
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  note VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_full INT DEFAULT 0,
  quantity_empty INT DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_payment_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voucher_no VARCHAR(40) NOT NULL UNIQUE,
  goods_receipt_id INT NOT NULL,
  supplier_id INT NULL,
  paid_at DATE NULL,
  payment_method VARCHAR(40) NOT NULL DEFAULT 'cash',
  bank_account_id INT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(80),
  note VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'รอดำเนินการ',
  delivery_address VARCHAR(255),
  delivery_time VARCHAR(20),
  payment_status VARCHAR(40) DEFAULT 'รอชำระ',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_no VARCHAR(40) NOT NULL UNIQUE,
  source_type VARCHAR(40) DEFAULT 'payment',
  party_name VARCHAR(160),
  description VARCHAR(255),
  customer_id INT NOT NULL,
  order_id INT NULL,
  method VARCHAR(40) NOT NULL,
  bank_account_id INT NULL,
  amount DECIMAL(12,2) NOT NULL,
  debt_reduction_amount DECIMAL(12,2) DEFAULT 0,
  reference_no VARCHAR(80),
  note VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  status VARCHAR(40) DEFAULT 'รับเงินแล้ว',
  canceled_at DATETIME NULL,
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_no VARCHAR(40) NOT NULL UNIQUE,
  source_type VARCHAR(40) DEFAULT 'expense',
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  payee_name VARCHAR(160),
  amount DECIMAL(12,2) NOT NULL,
  paid_by VARCHAR(80) DEFAULT 'เงินสด',
  payment_method VARCHAR(40) DEFAULT 'cash',
  bank_account_id INT NULL,
  reference_no VARCHAR(80),
  note VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  status VARCHAR(40) DEFAULT 'บันทึกแล้ว',
  canceled_at DATETIME NULL,
  expense_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  movement_type VARCHAR(40) NOT NULL,
  full_delta INT DEFAULT 0,
  empty_delta INT DEFAULT 0,
  note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_stock_counts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_month CHAR(7) NOT NULL,
  product_id INT NOT NULL,
  counted_full INT DEFAULT 0,
  counted_empty INT DEFAULT 0,
  system_full INT DEFAULT 0,
  system_empty INT DEFAULT 0,
  note VARCHAR(255),
  counted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_monthly_stock_product (stock_month, product_id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opening_inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_month CHAR(7) NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 0,
  empty_quantity INT DEFAULT 0,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_opening_inventory_product_month (stock_month, product_id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO customers (id, name, phone, line_id, address, customer_type, balance_due, cylinders_on_hand, latitude, longitude) VALUES
  (1, 'ลูกค้าทดสอบ 001', '080-000-0001', '', 'ที่อยู่ตัวอย่าง 1', 'VIP', 11000, '15kg 4 ถัง', 13.7000000, 100.5000000),
  (2, 'ร้านอาหารตัวอย่าง', '080-000-0002', '', 'ที่อยู่ตัวอย่าง 2', 'เครดิต', 12450, '48kg 2 ถัง', 13.7100000, 100.5100000),
  (3, 'บริษัท ตัวอย่าง จำกัด', '080-000-0003', '', 'ที่อยู่ตัวอย่าง 3', 'เครดิต', 18500, '48kg 6 ถัง', 13.7200000, 100.5200000),
  (4, 'ร้านกาแฟตัวอย่าง', '080-000-0004', '', 'ที่อยู่ตัวอย่าง 4', 'ทั่วไป', 7900, '15kg 3 ถัง', 13.7300000, 100.5300000);

INSERT IGNORE INTO products (id, sku, name, category, unit, unit_price, stock_full, stock_empty, reorder_level) VALUES
  (1, 'GAS-15', 'แก๊ส 15 กก.', 'gas', 'ถัง', 380, 90, 50, 20),
  (2, 'GAS-48', 'แก๊ส 48 กก.', 'gas', 'ถัง', 1450, 35, 18, 10),
  (3, 'REG-01', 'หัวปรับแรงดัน', 'accessory', 'ชิ้น', 250, 18, 0, 5),
  (4, 'HOSE-2M', 'สายแก๊ส 2 เมตร', 'accessory', 'เส้น', 180, 24, 0, 5);

INSERT IGNORE INTO suppliers (id, name, contact_name, phone, address, tax_id, payment_terms, note) VALUES
  (1, 'บริษัท ซัพพลายเออร์ตัวอย่าง จำกัด', 'ฝ่ายขายตัวอย่าง', '02-000-0001', 'ที่อยู่ซัพพลายเออร์ตัวอย่าง 1', '0999999999999', 'เครดิต 30 วัน', 'ข้อมูลตัวอย่างเท่านั้น'),
  (2, 'หจก. อุปกรณ์แก๊สตัวอย่าง', 'ผู้ติดต่อทดสอบ', '02-000-0002', 'ที่อยู่ซัพพลายเออร์ตัวอย่าง 2', '', 'เงินสด', 'ข้อมูลตัวอย่างเท่านั้น');

INSERT IGNORE INTO bank_accounts (id, bank_name, account_name, account_number, branch_name, account_type, opening_balance, current_balance, note) VALUES
  (1, 'ธนาคารตัวอย่าง A', 'ร้านแก๊สตัวอย่าง', '000-0-00001-0', 'สาขาตัวอย่าง', 'ออมทรัพย์', 50000, 50000, 'บัญชีตัวอย่างเท่านั้น'),
  (2, 'ธนาคารตัวอย่าง B', 'ร้านแก๊สตัวอย่าง', '000-0-00002-0', 'สาขาตัวอย่าง', 'กระแสรายวัน', 20000, 20000, 'บัญชีตัวอย่างเท่านั้น');

INSERT IGNORE INTO branches (id, name, tax_id, phone, address, is_active) VALUES
  (1, 'สาขาตัวอย่าง', '0999999999999', '02-000-0000', 'ที่อยู่สาขาตัวอย่าง', 1);

INSERT IGNORE INTO orders (id, order_no, customer_id, status, delivery_address, delivery_time, payment_status, total_amount) VALUES
  (1, 'OD670524-012', 1, 'รอดำเนินการ', 'ที่อยู่ตัวอย่าง 1', '09:15', 'รอชำระ', 760),
  (2, 'OD670524-013', 2, 'รอดำเนินการ', 'ที่อยู่ตัวอย่าง 2', '09:30', 'รอชำระ', 1450),
  (3, 'OD670524-014', 4, 'กำลังจัดส่ง', 'ที่อยู่ตัวอย่าง 4', '10:00', 'เก็บเงินปลายทาง', 380);

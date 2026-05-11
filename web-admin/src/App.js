import { createElement as h, render } from "./mini-react.js";

const todayIso = new Date().toISOString().slice(0, 10);
const AUTH_TOKEN_KEY = "gasflow_auth_token";
const SELECTED_BRANCH_KEY = "gasflow_selected_branch_id";

function readSavedAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function persistAuthToken(token = "") {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Browser storage can be unavailable in private or embedded contexts.
  }
}

function readSavedBranchId() {
  try {
    return localStorage.getItem(SELECTED_BRANCH_KEY) || "";
  } catch {
    return "";
  }
}

function persistSelectedBranchId(id = "") {
  try {
    if (id) localStorage.setItem(SELECTED_BRANCH_KEY, String(id));
    else localStorage.removeItem(SELECTED_BRANCH_KEY);
  } catch {
    // Browser storage can be unavailable in private or embedded contexts.
  }
}

const savedAuthToken = readSavedAuthToken();
const savedBranchId = readSavedBranchId();
const initialResetToken = (() => {
  try {
    return new URLSearchParams(window.location.search).get("resetToken") || "";
  } catch {
    return "";
  }
})();
if (initialResetToken) persistAuthToken("");

const state = {
  authStatus: initialResetToken ? "guest" : savedAuthToken ? "checking" : "guest",
  authToken: initialResetToken ? "" : savedAuthToken,
  authUser: null,
  authMode: initialResetToken ? "reset" : "login",
  loginError: "",
  authNotice: "",
  passwordResetToken: initialResetToken,
  authDebugResetLink: "",
  page: "แดชบอร์ด",
  orderFilter: "ทั้งหมด",
  search: "",
  customerSearch: "",
  supplierSearch: "",
  bankSearch: "",
  receiptSearch: "",
  salesSearch: "",
  payableSearch: "",
  financeTab: "overview",
  settingsTab: "account",
  generalReceiptSearch: "",
  generalPaymentSearch: "",
  customerReceiptSearch: "",
  userSearch: "",
  userEditId: "",
  branchSearch: "",
  branchEditId: "",
  selectedBranchId: savedBranchId,
  branchSelectorOpen: "",
  reportView: "",
  reportDateFrom: todayIso,
  reportDateTo: todayIso,
  reportMonth: todayIso.slice(0, 7),
  reportBestSellerPeriod: "month",
  reportProductId: "",
  reportProductSearch: "",
  reportProductOpen: false,
  reportBankAccountId: "",
  openingBalanceMonth: todayIso.slice(0, 7),
  cashOpeningMonth: todayIso.slice(0, 7),
  bankOpeningMonth: todayIso.slice(0, 7),
  bankOpeningAccountId: "",
  openingProductId: "",
  openingProductSearch: "",
  openingProductOpen: false,
  stockCountMonth: todayIso.slice(0, 7),
  stockCountProductId: "",
  stockCountProductSearch: "",
  stockCountProductOpen: false,
  monthlyStockSelectedIds: [],
  loadingCount: 0,
  loadingMessage: "",
  reportSupplierId: "",
  reportPage: 1,
  navGroupsOpen: { "การขาย": false },
  apiStatus: "กำลังเชื่อมต่อ API",
};

const navItems = [
  ["⌂", "แดชบอร์ด", ""],
  {
    icon: "▣",
    label: "การขาย",
    children: ["บิลเงินสด", "ใบส่งสินค้า", "บิลเงินสด/ใบกำกับภาษี", "ใบส่งของ/ใบกำกับภาษี", "ใบสำคัญรับเงิน"],
  },
  ["▤", "จัดส่ง", "12"],
  ["♙", "ลูกค้า", ""],
  ["▦", "ตัวแทนจำหน่าย", ""],
  ["▨", "ใบรับสินค้า", ""],
  ["▥", "สินค้าและถัง", ""],
  ["▤", "ยอดยกมาสินค้า", ""],
  ["฿", "การเงิน", ""],
  ["▧", "รายงาน", ""],
  ["⚙", "ตั้งค่า", ""],
];

const APP_PERMISSIONS = [
  { key: "dashboard", label: "แดชบอร์ด", detail: "ดูภาพรวมหน้าหลัก" },
  { key: "sales", label: "การขาย", detail: "บิลเงินสด ใบส่งสินค้า ใบกำกับ และรับเงินลูกค้า" },
  { key: "delivery", label: "จัดส่ง", detail: "ดูคิวและปรับสถานะจัดส่ง" },
  { key: "customers", label: "ลูกค้า", detail: "เพิ่ม แก้ไข ลบ และดูข้อมูลลูกค้า" },
  { key: "suppliers", label: "ตัวแทนจำหน่าย", detail: "จัดการข้อมูลตัวแทนจำหน่าย" },
  { key: "goods_receipts", label: "ใบรับสินค้า", detail: "รับสินค้าและเอกสารซื้อ" },
  { key: "products", label: "สินค้าและถัง", detail: "จัดการสินค้า สต็อก และ Stock card" },
  { key: "opening_stock", label: "ยอดยกมาสินค้า", detail: "บันทึกยอดสินค้าเริ่มต้น" },
  { key: "finance", label: "การเงิน", detail: "ธนาคาร รายรับ รายจ่าย ใบสำคัญ และยอดเงิน" },
  { key: "reports", label: "รายงาน", detail: "ดูและ export รายงาน" },
];

const PAGE_PERMISSIONS = {
  "แดชบอร์ด": "dashboard",
  "ขายหน้าร้าน": "sales",
  "บิลเงินสด": "sales",
  "ใบส่งสินค้า": "sales",
  "บิลเงินสด/ใบกำกับภาษี": "sales",
  "ใบส่งของ/ใบกำกับภาษี": "sales",
  "ใบสำคัญรับเงิน": "sales",
  "จัดส่ง": "delivery",
  "ลูกค้า": "customers",
  "ตัวแทนจำหน่าย": "suppliers",
  "ใบรับสินค้า": "goods_receipts",
  "สินค้าและถัง": "products",
  "ยอดยกมาสินค้า": "opening_stock",
  "การเงิน": "finance",
  "รายงาน": "reports",
};

let products = [
  { name: "แก๊ส 15 กก.", price: 380, stock: 90, color: "green" },
  { name: "แก๊ส 48 กก.", price: 1450, stock: 35, color: "blue" },
  { name: "หัวปรับแรงดัน", price: 250, stock: 18, color: "amber" },
  { name: "สายแก๊ส 2 เมตร", price: 180, stock: 24, color: "mint" },
];

const cart = [
  ["แก๊ส 15 กก.", 2, 380],
  ["ค่าจัดส่ง", 1, 40],
];

let orders = [
  ["OD670524-012", "คุณสมชาย ใจดี", "VIP", "15kg x 2", "หมู่บ้านนนทรีซิตี้ 3", "09:15", "รอดำเนินการ"],
  ["OD670524-013", "ร้านอาหารครัวคุณนิด", "", "48kg x 1", "ถ.ติวานนท์ ปากเกร็ด", "09:30", "รอดำเนินการ"],
  ["OD670524-014", "คุณวิไลวรรณ แซ่อึ้ง", "", "15kg x 1", "หมู่บ้านพฤกษา 58", "10:00", "กำลังจัดส่ง"],
  ["OD670524-015", "คุณธนากร สกุลไทย", "", "48kg x 1", "ซ.แจ้งวัฒนะ-ปากเกร็ด 28", "10:30", "กำลังจัดส่ง"],
  ["OD670524-016", "ร้านกาแฟ Tree House", "", "15kg x 2", "โครงการ The Connect", "11:00", "กำลังจัดส่ง"],
  ["OD670524-017", "คุณกนกพร อินทร์สร้าง", "", "15kg x 1", "หมู่บ้านธาราริน 12/45", "11:30", "รอดำเนินการ"],
  ["OD670524-018", "บริษัท สยามฟู้ด จำกัด", "", "48kg x 2", "ถนนอุตสาหกรรมบางบัวทอง", "13:00", "รอดำเนินการ"],
  ["OD670524-019", "คุณอรดี พุ่มทอง", "", "15kg x 1", "ซ.เลียบคลองประปา 9", "14:00", "จัดส่งแล้ว"],
];
let salesOrders = [];

let recentSales = [
  ["09:18", "INV670524-045", "คุณสมชาย ใจดี", "15kg x 2", "760", "ชำระแล้ว"],
  ["09:05", "INV670524-044", "ร้านอาหารครัวคุณนิด", "48kg x 1", "1,450", "ชำระแล้ว"],
  ["08:47", "INV670524-043", "คุณวิไลวรรณ แซ่อึ้ง", "15kg x 1", "380", "โอนแล้ว"],
  ["08:30", "INV670524-042", "ร้านกาแฟ Tree House", "15kg x 2", "760", "ชำระแล้ว"],
  ["08:15", "INV670524-041", "คุณธนากร สกุลไทย", "48kg x 1", "1,450", "เก็บเงินปลายทาง"],
];

let customers = [
  ["คุณสมชาย ใจดี", "081-234-5678", "หมู่บ้านนนทรีซิตี้ 3", "VIP", "฿11,000", "15kg 4 ถัง"],
  ["ร้านอาหารครัวคุณนิด", "089-111-2233", "ถ.ติวานนท์ ปากเกร็ด", "เครดิต", "฿12,450", "48kg 2 ถัง"],
  ["บริษัท อีโค่ คอร์ป จำกัด", "02-555-7788", "ถนนแจ้งวัฒนะ", "เครดิต", "฿18,500", "48kg 6 ถัง"],
  ["ร้านกาแฟ Tree House", "086-222-1111", "โครงการ The Connect", "ทั่วไป", "฿7,900", "15kg 3 ถัง"],
];

let suppliers = [];
let bankAccounts = [];
let branches = [];
let goodsReceipts = [];
let supplierPaymentVouchers = [];
let customerReceiptVouchers = [];
let openingBalances = [];
let cashOpenings = [];
let bankOpenings = [];
let monthlyStockCounts = [];
let stockMovements = [];
let payments = [];
let generalReceiptVouchers = [];
let expenses = [];
let appUsers = [];

let debtors = [
  ["ร้านอาหารครัวคุณนิด", "18 วัน", "฿12,450"],
  ["บริษัท อีโค่ คอร์ป จำกัด", "12 วัน", "฿18,500"],
  ["คุณวิไลวรรณ แซ่อึ้ง", "7 วัน", "฿6,380"],
  ["ร้านกาแฟ Tree House", "5 วัน", "฿7,900"],
  ["คุณสมชาย ใจดี", "3 วัน", "฿11,000"],
];

let kpis = [
  { icon: "↗", label: "ยอดขายวันนี้", value: "฿78,450", sub: "เพิ่มขึ้น 18.6%", tone: "green" },
  { icon: "▤", label: "ออเดอร์วันนี้", value: "24", sub: "รอจัดส่ง 12", tone: "blue" },
  { icon: "▣", label: "รับชำระวันนี้", value: "฿64,300", sub: "ค้างรับ 14,150", tone: "mint" },
  { icon: "▥", label: "ถังเต็ม", value: "125", sub: "15kg: 90  48kg: 35", tone: "violet" },
  { icon: "▥", label: "ถังเปล่า", value: "68", sub: "15kg: 50  48kg: 18", tone: "orange" },
  { icon: "□", label: "ลูกหนี้ค้างชำระ", value: "฿56,230", sub: "12 ราย", tone: "red" },
];

function App() {
  if (state.authStatus === "checking") {
    return h("main", { className: "login-shell" }, [
      h("section", { className: "login-card login-card-slim" }, [
        h("div", { className: "login-logo" }, "G"),
        h("h1", null, "กำลังตรวจสอบการเข้าใช้งาน"),
        h("p", null, "ระบบกำลังเตรียมข้อมูลร้านแก๊สให้พร้อมใช้งาน"),
      ]),
      h("div", { className: "toast-area" }),
      h(LoadingOverlay),
    ]);
  }

  if (!state.authUser) {
    return h("main", { className: "login-shell" }, [
      h(LoginPage),
      h("div", { className: "toast-area" }),
      h(LoadingOverlay),
    ]);
  }

  return h("main", { className: "app-shell" }, [
    h(Sidebar),
    h("section", { className: "workspace" }, [
      h(Topbar),
      h("div", { className: "content" }, [pageFor(state.page)]),
    ]),
    h("div", { className: "toast-area" }),
    h(LoadingOverlay),
  ]);
}

function LoadingOverlay() {
  if (!state.loadingCount) return h("span", { className: "app-loading-placeholder" });
  return h("div", { className: "app-loading", "aria-live": "polite" }, [
    h("span", { className: "loading-spinner" }),
    h("div", null, [
      h("strong", null, state.loadingMessage || "กำลังดำเนินการ"),
      h("small", null, "กรุณารอสักครู่"),
    ]),
  ]);
}

function LoginPage() {
  const formPanel = state.authMode === "forgot"
    ? h(ForgotPasswordPanel)
    : state.authMode === "reset"
      ? h(ResetPasswordPanel)
      : h(LoginFormPanel);
  return h("section", { className: "login-card" }, [
    h("div", { className: "login-brand-panel" }, [
      h("div", { className: "login-logo" }, "G"),
      h("div", null, [
        h("strong", null, "GasFlow"),
        h("span", null, "ระบบบริหารร้านแก๊ส"),
      ]),
      h("div", { className: "login-highlights" }, [
        h("p", null, "จัดการขาย สต๊อค การเงิน และรายงานในที่เดียว"),
        h("div", null, [
          h("b", null, "API"),
          h("span", null, "ล็อกอินก่อนใช้งานข้อมูลจริง"),
        ]),
      ]),
    ]),
    formPanel,
  ]);
}

function LoginFormPanel() {
  return h("form", { className: "login-form-panel", "data-login-form": "true" }, [
    h("div", { className: "login-form-head" }, [
      h("span", null, "เข้าสู่ระบบ"),
      h("h1", null, "ยินดีต้อนรับกลับ"),
      h("p", null, "กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานระบบ"),
    ]),
    state.loginError ? h("div", { className: "login-error" }, state.loginError) : null,
    state.authNotice ? h("div", { className: "login-notice" }, state.authNotice) : null,
    h("label", { className: "login-field" }, [
      h("span", null, "ชื่อผู้ใช้"),
      h("input", { name: "username", type: "text", placeholder: "admin", autocomplete: "username", required: true, autofocus: true }),
    ]),
    h("label", { className: "login-field" }, [
      h("span", null, "รหัสผ่าน"),
      h("input", { name: "password", type: "password", placeholder: "รหัสผ่าน", autocomplete: "current-password", required: true }),
    ]),
    h("button", { className: "login-submit", type: "submit" }, "เข้าสู่ระบบ"),
    h("div", { className: "login-actions" }, [
      h("button", { type: "button", "data-auth-mode": "forgot" }, "ลืมรหัสผ่าน?"),
    ]),
    h("small", { className: "login-helper" }, "ผู้ใช้เริ่มต้น: admin / admin1234"),
  ]);
}

function ForgotPasswordPanel() {
  return h("form", { className: "login-form-panel", "data-forgot-password-form": "true" }, [
    h("div", { className: "login-form-head" }, [
      h("span", null, "กู้คืนบัญชี"),
      h("h1", null, "ลืมรหัสผ่าน"),
      h("p", null, "กรอกชื่อผู้ใช้หรืออีเมล ระบบจะส่งลิงก์ตั้งรหัสใหม่ไปที่อีเมลของบัญชี"),
    ]),
    state.loginError ? h("div", { className: "login-error" }, state.loginError) : null,
    state.authNotice ? h("div", { className: "login-notice" }, state.authNotice) : null,
    h("label", { className: "login-field" }, [
      h("span", null, "ชื่อผู้ใช้หรืออีเมล"),
      h("input", { name: "identifier", type: "text", placeholder: "admin หรือ name@example.com", autocomplete: "username", required: true, autofocus: true }),
    ]),
    h("button", { className: "login-submit", type: "submit" }, "ส่งลิงก์ตั้งรหัสผ่าน"),
    state.authDebugResetLink ? h("button", { className: "login-secondary", type: "button", "data-open-reset-link": state.authDebugResetLink }, "เปิดลิงก์ตั้งรหัส (ทดสอบ)") : null,
    h("div", { className: "login-actions" }, [
      h("button", { type: "button", "data-auth-mode": "login" }, "กลับไปเข้าสู่ระบบ"),
    ]),
  ]);
}

function ResetPasswordPanel() {
  return h("form", { className: "login-form-panel", "data-reset-password-form": "true" }, [
    h("div", { className: "login-form-head" }, [
      h("span", null, "ตั้งรหัสใหม่"),
      h("h1", null, "สร้างรหัสผ่านใหม่"),
      h("p", null, "รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรกับตัวเลข"),
    ]),
    state.loginError ? h("div", { className: "login-error" }, state.loginError) : null,
    state.authNotice ? h("div", { className: "login-notice" }, state.authNotice) : null,
    h("label", { className: "login-field" }, [
      h("span", null, "รหัสผ่านใหม่"),
      h("input", { name: "new_password", type: "password", placeholder: "อย่างน้อย 8 ตัว", autocomplete: "new-password", required: true, autofocus: true }),
    ]),
    h("label", { className: "login-field" }, [
      h("span", null, "ยืนยันรหัสผ่านใหม่"),
      h("input", { name: "confirm_password", type: "password", placeholder: "พิมพ์ซ้ำอีกครั้ง", autocomplete: "new-password", required: true }),
    ]),
    h("button", { className: "login-submit", type: "submit" }, "บันทึกรหัสผ่านใหม่"),
    h("div", { className: "login-actions" }, [
      h("button", { type: "button", "data-auth-mode": "login" }, "กลับไปเข้าสู่ระบบ"),
    ]),
  ]);
}

function activeBranches() {
  return branches.filter((branch) => branch.is_active !== false && branch.is_active !== 0);
}

function selectedBranch() {
  const active = activeBranches();
  return active.find((branch) => String(branch.id) === String(state.selectedBranchId)) || active[0] || null;
}

function branchMeta(branch = selectedBranch()) {
  if (!branch) return "ยังไม่มีสาขา";
  const details = [];
  if (branch.tax_id) details.push(`เลขผู้เสียภาษี ${branch.tax_id}`);
  if (branch.phone) details.push(branch.phone);
  return details.join(" • ") || "เลือกใช้เป็นสาขาปัจจุบัน";
}

function BranchSwitcher({ slot = "top" } = {}) {
  const branch = selectedBranch();
  const active = activeBranches();
  const open = state.branchSelectorOpen === slot;
  return h("div", { className: `branch-switch ${slot === "side" ? "side" : "top"} ${open ? "open" : ""}` }, [
    h("button", { type: "button", className: slot === "side" ? "branch-card" : "select-btn branch-select-btn", "data-branch-toggle": slot }, [
      slot === "side" ? null : "▣",
      h("span", null, branch?.name || "เลือกสาขา"),
      slot === "side" ? h("small", null, branchMeta(branch)) : null,
      h("b", null, open ? "⌃" : "⌄"),
    ]),
    open ? h("div", { className: "branch-menu" }, active.length ? active.map((item) =>
      h("button", { type: "button", className: String(item.id) === String(branch?.id) ? "active" : "", "data-branch-select": item.id }, [
        h("strong", null, item.name || "ไม่ระบุชื่อสาขา"),
        h("small", null, branchMeta(item)),
      ])
    ) : [
      h("div", { className: "branch-empty" }, [
        h("strong", null, "ยังไม่มีสาขา"),
        h("small", null, "เพิ่มสาขาได้ที่ ตั้งค่า > ข้อมูลระบบ"),
      ]),
    ]) : null,
  ]);
}

function Sidebar() {
  const items = visibleNavItems();
  return h("aside", { className: "sidebar" }, [
    h("div", { className: "brand" }, [
      h("div", { className: "brand-mark" }, "♨"),
      h("div", null, [h("strong", null, "GasFlow"), h("span", null, "ระบบจัดการร้านแก๊ส")]),
    ]),
    h("nav", null, items.map((item) => {
      if (Array.isArray(item)) {
        const [icon, label, badge] = item;
        const activeBadge = label === "จัดส่ง" ? String(deliveryQueueOrders().length) : badge;
        return h("button", { className: state.page === label ? "nav-item active" : "nav-item", "data-page": label }, [
          h("span", { className: "nav-icon" }, icon),
          h("span", null, label),
          activeBadge ? h("em", null, activeBadge) : null,
        ]);
      }
      const active = item.children.includes(state.page);
      const open = state.navGroupsOpen[item.label] ?? active;
      return h("div", { className: `nav-group ${active ? "active" : ""} ${open ? "open" : ""}` }, [
        h("button", { className: "nav-group-title", type: "button", "data-nav-group": item.label }, [
          h("span", { className: "nav-icon" }, item.icon),
          h("span", null, item.label),
          h("b", null, open ? "⌃" : "⌄"),
        ]),
        open ? h("div", { className: "nav-submenu" }, item.children.map((label) =>
          h("button", { className: state.page === label ? "nav-subitem active" : "nav-subitem", "data-page": label }, label)
        )) : null,
      ]);
    })),
    h("div", { className: "sidebar-bottom" }, [
      h("div", { className: "online" }, [h("b"), h("span", null, "ระบบออนไลน์"), h("small", null, state.apiStatus)]),
      h(BranchSwitcher, { slot: "side" }),
    ]),
  ]);
}

function Topbar() {
  const user = state.authUser || {};
  const displayName = user.display_name || user.username || "ผู้ใช้งาน";
  const roleLabel = user.role === "admin" ? "ผู้ดูแลระบบ" : (user.role || "พนักงาน");
  const initial = String(displayName || "G").trim().slice(0, 1).toUpperCase();
  return h("header", { className: "topbar" }, [
    h("label", { className: "search" }, [
      h("span", null, "⌕"),
      h("input", { placeholder: "ค้นหาออเดอร์, ลูกค้า, เบอร์โทร...", value: state.search, "data-search": "true" }),
      h("kbd", null, "Ctrl /"),
    ]),
    h("div", { className: "top-actions" }, [
      h(BranchSwitcher, { slot: "top" }),
      h("button", { className: "select-btn", "data-toast": "เลือกวันที่ได้เมื่อเชื่อม backend" }, ["▣", h("span", null, "24 พฤษภาคม 2567"), "⌄"]),
      h("button", { className: "bell", "data-toast": "แจ้งเตือน: มีลูกหนี้ครบกำหนด 3 ราย" }, ["♢", h("em", null, "3")]),
      h("button", { className: "primary-action", "data-modal": "cashBill" }, ["⊕", h("span", null, "เปิดบิลด่วน")]),
      h("button", { className: "pay-action", "data-modal": "payment" }, ["▣", h("span", null, "รับเงิน")]),
      h("div", { className: "profile" }, [
        h("div", { className: "avatar" }, initial),
        h("div", null, [h("strong", null, displayName), h("span", null, roleLabel)]),
        h("button", { className: "profile-logout", "data-logout": "true", title: "ออกจากระบบ" }, "ออก"),
      ]),
    ]),
  ]);
}

function pageFor(page) {
  if (!canAccessPage(page)) return h(AccessDeniedPage, { page });
  const salePages = ["บิลเงินสด", "ใบส่งสินค้า", "บิลเงินสด/ใบกำกับภาษี", "ใบส่งของ/ใบกำกับภาษี", "ใบสำคัญรับเงิน"];
  const pages = {
    "แดชบอร์ด": h(DashboardPage),
    "ขายหน้าร้าน": h(PosPage),
    "จัดส่ง": h(DeliveryPage),
    "ลูกค้า": h(CustomersPage),
    "ตัวแทนจำหน่าย": h(SuppliersPage),
    "ใบรับสินค้า": h(GoodsReceiptsPage),
    "ธนาคาร/สมุดบัญชี": h(FinancePageTabbed),
    "สินค้าและถัง": h(StockPage),
    "ยอดยกมาสินค้า": h(OpeningBalancePage),
    "การเงิน": h(FinancePageTabbed),
    "รายงาน": h(ReportsPage),
    "ตั้งค่า": h(SettingsPage),
  };
  if (page === "บิลเงินสด") return h(CashBillsPage);
  if (page === "ใบส่งสินค้า") return h(DeliveryNotesPage);
  if (page === "บิลเงินสด/ใบกำกับภาษี") return h(CashTaxInvoicesPage);
  if (page === "ใบส่งของ/ใบกำกับภาษี") return h(DeliveryTaxInvoicesPage);
  if (page === "ใบสำคัญรับเงิน") return h(CustomerReceiptVouchersPage);
  if (salePages.includes(page)) return h(SalesDocumentPage, { type: page });
  return pages[page] || h(DashboardPage);
}

function AccessDeniedPage({ page }) {
  return h("section", { className: "panel access-denied" }, [
    h("div", { className: "empty-panel" }, [
      h("strong", null, "ไม่มีสิทธิ์เข้าใช้งาน"),
      h("p", null, `บัญชีนี้ยังไม่ได้รับสิทธิ์สำหรับฟังก์ชัน ${page || "-"}`),
      h("button", { type: "button", className: "ghost-btn", "data-page": firstAllowedPage() }, "กลับไปหน้าที่ใช้งานได้"),
    ]),
  ]);
}

function DashboardPage() {
  return h("div", null, [
    h("section", { className: "kpi-grid" }, kpis.map((kpi) => h(KpiCard, kpi))),
    h("section", { className: "main-grid" }, [
      h("div", { className: "left-stack" }, [h(DeliveryQueue), h(RecentSales)]),
      h("aside", { className: "right-stack" }, [h(StockPanel), h(CashPanel), h(DebtPanel)]),
    ]),
  ]);
}

function PosPage() {
  const total = cart.reduce((sum, item) => sum + item[1] * item[2], 0);
  return h("section", { className: "pos-grid" }, [
    h("div", { className: "left-stack" }, [
      h(PageTitle, { title: "ขายหน้าร้าน", sub: "หน้าขายแบบเร็วสำหรับแคชเชียร์ เลือกลูกค้า สินค้า และรับเงินในจอเดียว" }),
      h("div", { className: "product-grid" }, products.map((p) =>
        h("button", { className: "product-card", "data-toast": `เพิ่ม ${p.name} ลงบิลตัวอย่าง` }, [
          h("span", { className: `product-icon ${p.color}` }, p.name.includes("48") ? "48" : p.name.includes("15") ? "15" : "อุป"),
          h("strong", null, p.name),
          h("small", null, `คงเหลือ ${p.stock}`),
          h("b", null, `฿${p.price.toLocaleString()}`),
        ])
      )),
      h(Panel, { title: "ลูกค้าแนะนำ", actionPage: "ลูกค้า" }, h("div", { className: "customer-strip" }, customers.slice(0, 3).map((c) =>
        h("button", { "data-toast": `เลือก ${c[0]} เป็นลูกค้าในบิล` }, [h("b", null, c[0]), h("span", null, c[1])])
      ))),
    ]),
    h("aside", { className: "checkout-panel panel" }, [
      h("div", { className: "panel-head" }, [h("h2", null, "บิลขายใหม่"), h("button", { "data-toast": "ล้างบิลตัวอย่างแล้ว" }, "ล้าง")]),
      h("label", { className: "form-line" }, ["ลูกค้า", h("input", { value: "คุณสมชาย ใจดี" })]),
      h("div", { className: "cart-list" }, cart.map((item) =>
        h("div", null, [h("span", null, item[0]), h("em", null, `x${item[1]}`), h("strong", null, `฿${(item[1] * item[2]).toLocaleString()}`)])
      )),
      h("div", { className: "total-box" }, [h("span", null, "ยอดสุทธิ"), h("strong", null, `฿${total.toLocaleString()}`)]),
      h("div", { className: "pay-methods" }, ["เงินสด", "โอน/QR", "เครดิต"].map((x, i) => h("button", { className: i === 0 ? "active" : "", "data-toast": `เลือกชำระแบบ${x}` }, x))),
      h("button", { className: "wide-primary", "data-modal": "cashBill" }, "ยืนยันเปิดบิล"),
      h("button", { className: "wide-secondary", "data-toast": "พิมพ์ใบเสร็จตัวอย่าง" }, "พิมพ์ใบเสร็จ"),
    ]),
  ]);
}

function SalesDocumentPage({ type }) {
  const descriptions = {
    "บิลเงินสด": "ขายสินค้าแบบรับเงินทันที ใช้กับลูกค้าทั่วไปหรือหน้าร้าน",
    "ใบส่งสินค้า": "เปิดเอกสารส่งสินค้าให้ลูกค้า ใช้คุมรายการจัดส่งก่อนรับชำระ",
    "บิลเงินสด/ใบกำกับภาษี": "ขายเงินสดพร้อมออกใบกำกับภาษีเต็มรูปแบบ",
    "ใบส่งของ/ใบกำกับภาษี": "ส่งของพร้อมใบกำกับภาษี สำหรับลูกค้าเครดิตหรือนิติบุคคล",
    "ใบสำคัญรับเงิน": "บันทึกรับเงินจากลูกค้า อ้างอิงบิลหรือเอกสารค้างชำระ",
  };
  const sampleRows = [
    ["วันนี้", "ยังไม่มีเอกสาร", "-", "-", "-"],
  ];
  return h("div", null, [
    h(PageTitle, { title: type, sub: descriptions[type] || "เอกสารการขาย" }),
    h("section", { className: "sales-doc-grid" }, [
      h("section", { className: "panel sales-doc-main" }, [
        h("div", { className: "panel-head" }, [
          h("div", null, [h("h2", null, `รายการ${type}`), h("span", null, "เตรียมพร้อมสำหรับเชื่อม API จริง")]),
          h("button", { className: "primary-action", "data-toast": `เริ่มทำ${type} ในขั้นถัดไป` }, ["⊕", h("span", null, "เปิดเอกสารใหม่")]),
        ]),
        h("div", { className: "sales-doc-toolbar" }, [
          h("label", { className: "panel-search" }, [
            h("span", null, "⌕"),
            h("input", { placeholder: `ค้นหาเลขที่${type}, ลูกค้า, สินค้า...` }),
          ]),
          h("button", { "data-toast": "ตัวกรองวันที่จะต่อในขั้นถัดไป" }, "วันนี้"),
        ]),
        h(SimpleTable, {
          heads: ["วันที่", "เลขที่เอกสาร", "ลูกค้า", "ยอดสุทธิ", "สถานะ"],
          rows: sampleRows,
          className: "sales-doc-table",
        }),
      ]),
      h("aside", { className: "panel sales-doc-side" }, [
        h("h2", null, "ข้อมูลเอกสาร"),
        h("div", { className: "sales-doc-info" }, [
          h("span", null, "ประเภท"),
          h("strong", null, type),
          h("span", null, "วันที่เอกสาร"),
          h("strong", null, thaiDateInputValue(todayIso)),
          h("span", null, "เลขที่"),
          h("strong", null, "ระบบจะรันให้อัตโนมัติ"),
        ]),
      ]),
    ]),
  ]);
}

function saleItemsText(items = []) {
  return items.map((item) => `${item.product_name || "สินค้า"} x ${item.quantity || 0}`).join(", ") || "-";
}

function saleQuantityText(items = []) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function deliveryDocumentType(order = {}) {
  const orderNo = String(order.order_no || "");
  if (orderNo.startsWith("VCS")) return "บิลเงินสด/ใบกำกับ";
  if (orderNo.startsWith("CSH")) return "บิลเงินสด";
  return "เอกสารขาย";
}

function isDeliverySourceOrder(order = {}) {
  const orderNo = String(order.order_no || "");
  return order.status !== "ยกเลิก" && (orderNo.startsWith("CSH") || orderNo.startsWith("VCS"));
}

function deliveryStatus(order = {}) {
  return ["รอดำเนินการ", "กำลังจัดส่ง", "จัดส่งแล้ว"].includes(order.status) ? order.status : "รอดำเนินการ";
}

function deliveryQueueOrders() {
  return salesOrders
    .filter(isDeliverySourceOrder)
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")) || String(a.order_no || "").localeCompare(String(b.order_no || "")));
}

function deliveryQueueRows() {
  return deliveryQueueOrders().map((order) => [
    order.order_no,
    order.customer_name,
    order.customer_type === "VIP" ? "VIP" : "",
    saleItemsText(order.items),
    order.delivery_address || "-",
    order.delivery_time || "-",
    deliveryStatus(order),
    order.id,
    order.customer_latitude,
    order.customer_longitude,
    deliveryDocumentType(order),
  ]);
}

function CashBillsPage() {
  const query = state.salesSearch.trim().toLowerCase();
  const cashOrders = salesOrders.filter((order) => {
    const orderNo = String(order.order_no || "");
    const isOtherSalesDoc = orderNo.startsWith("VCS") || orderNo.startsWith("SND") || orderNo.startsWith("VDN");
    return orderNo.startsWith("CSH") || (!isOtherSalesDoc && (order.payment_status === "ชำระแล้ว" || order.status === "ขายหน้าร้าน"));
  });
  const filtered = cashOrders.filter((order) =>
    [order.order_no, order.customer_name, order.payment_status, order.status, saleItemsText(order.items)]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  const total = filtered.reduce((sum, order) => order.status === "ยกเลิก" ? sum : sum + Number(order.total_amount || 0), 0);
  return h("div", null, [
    h(PageTitle, { title: "บิลเงินสด", sub: "ขายสินค้าแบบรับเงินทันที เลือกลูกค้า เพิ่มสินค้าได้หลายรายการ และบันทึกเป็นออเดอร์พร้อมรับเงิน" }),
    h("section", { className: "panel" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [h("h2", null, "รายการบิลเงินสด"), h("span", null, `${filtered.length} รายการ`)]),
        h("button", { "data-modal": "cashBill" }, "เพิ่มบิลเงินสด"),
      ]),
      h("div", { className: "cash-bill-summary" }, [
        h("span", null, ["จำนวนบิล ", h("strong", null, String(filtered.length))]),
        h("span", null, ["ยอดขายรวม ", h("strong", null, money(total, { decimals: 2 }))]),
      ]),
      h("label", { className: "panel-search" }, [
        h("span", null, "⌕"),
        h("input", { "data-sales-search": "true", placeholder: "ค้นหาเลขที่บิล, ลูกค้า, สินค้า, สถานะ...", value: state.salesSearch }),
      ]),
      h(CashBillTable, { items: filtered }),
    ]),
  ]);
}

function taxInvoiceSubtotal(order = {}) {
  return (Array.isArray(order.items) ? order.items : []).reduce((sum, item) => sum + cashBillLineAmount(item), 0);
}

function taxInvoiceVat(order = {}) {
  const subtotal = taxInvoiceSubtotal(order);
  const total = Number(order.total_amount || subtotal);
  return Math.max(0, total - subtotal);
}

function CashTaxInvoicesPage() {
  const query = state.salesSearch.trim().toLowerCase();
  const invoices = salesOrders.filter((order) => String(order.order_no || "").startsWith("VCS") || order.status === "บิลเงินสด/ใบกำกับภาษี");
  const filtered = invoices.filter((order) =>
    [order.order_no, order.customer_name, order.payment_status, order.status, saleItemsText(order.items)]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  const activeOrders = filtered.filter((order) => order.status !== "ยกเลิก");
  const subtotal = activeOrders.reduce((sum, order) => sum + taxInvoiceSubtotal(order), 0);
  const vat = activeOrders.reduce((sum, order) => sum + taxInvoiceVat(order), 0);
  const total = activeOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  return h("div", null, [
    h(PageTitle, { title: "บิลเงินสด/ใบกำกับภาษี", sub: "ขายเงินสดพร้อมภาษีมูลค่าเพิ่ม เลือกลูกค้า เพิ่มสินค้าได้หลายรายการ และพิมพ์เอกสารได้", actionText: "เพิ่มบิลเงินสด/ใบกำกับภาษี", actionModal: "cashTaxInvoice" }),
    h("section", { className: "panel" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [h("h2", null, "รายการบิลเงินสด/ใบกำกับภาษี"), h("span", null, `${filtered.length} รายการ`)]),
        h("button", { "data-modal": "cashTaxInvoice" }, "เพิ่มบิลเงินสด/ใบกำกับภาษี"),
      ]),
      h("div", { className: "cash-bill-summary" }, [
        h("span", null, ["จำนวนเอกสาร ", h("strong", null, String(filtered.length))]),
        h("span", null, ["ก่อน VAT ", h("strong", null, money(subtotal, { decimals: 2 }))]),
        h("span", null, ["VAT ", h("strong", null, money(vat, { decimals: 2 }))]),
        h("span", null, ["รวมสุทธิ ", h("strong", null, money(total, { decimals: 2 }))]),
      ]),
      h("label", { className: "panel-search" }, [
        h("span", null, "⌕"),
        h("input", { "data-sales-search": "true", placeholder: "ค้นหาเลขที่เอกสาร, ลูกค้า, สินค้า, สถานะ...", value: state.salesSearch }),
      ]),
      h("div", { className: "table-scroll cash-tax-table-scroll" }, h(CashTaxInvoiceTable, { items: filtered })),
    ]),
  ]);
}

function DeliveryTaxInvoicesPage() {
  const query = state.salesSearch.trim().toLowerCase();
  const invoices = salesOrders.filter((order) => String(order.order_no || "").startsWith("VDN") || order.status === "ใบส่งของ/ใบกำกับภาษี");
  const filtered = invoices.filter((order) =>
    [order.order_no, order.customer_name, order.payment_status, order.status, saleItemsText(order.items)]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  const activeOrders = filtered.filter((order) => order.status !== "ยกเลิก");
  const subtotal = activeOrders.reduce((sum, order) => sum + taxInvoiceSubtotal(order), 0);
  const vat = activeOrders.reduce((sum, order) => sum + taxInvoiceVat(order), 0);
  const total = activeOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  return h("div", null, [
    h(PageTitle, { title: "ใบส่งของ/ใบกำกับภาษี", sub: "ขายเครดิตพร้อมภาษีมูลค่าเพิ่ม เลือกลูกค้า เพิ่มสินค้าได้หลายรายการ ตัดสต๊อกปลอดภัย และพิมพ์เอกสารได้", actionText: "เพิ่มใบส่งของ/ใบกำกับภาษี", actionModal: "deliveryTaxInvoice" }),
    h("section", { className: "panel" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [h("h2", null, "รายการใบส่งของ/ใบกำกับภาษี"), h("span", null, `${filtered.length} รายการ`)]),
        h("button", { "data-modal": "deliveryTaxInvoice" }, "เพิ่มใบส่งของ/ใบกำกับภาษี"),
      ]),
      h("div", { className: "cash-bill-summary" }, [
        h("span", null, ["จำนวนเอกสาร ", h("strong", null, String(filtered.length))]),
        h("span", null, ["ก่อน VAT ", h("strong", null, money(subtotal, { decimals: 2 }))]),
        h("span", null, ["VAT ", h("strong", null, money(vat, { decimals: 2 }))]),
        h("span", null, ["รวมสุทธิ ", h("strong", null, money(total, { decimals: 2 }))]),
      ]),
      h("label", { className: "panel-search" }, [
        h("span", null, "⌕"),
        h("input", { "data-sales-search": "true", placeholder: "ค้นหาเลขที่เอกสาร, ลูกค้า, สินค้า, สถานะ...", value: state.salesSearch }),
      ]),
      h("div", { className: "table-scroll cash-tax-table-scroll" }, h(DeliveryTaxInvoiceTable, { items: filtered })),
    ]),
  ]);
}

function DeliveryNotesPage() {
  const query = state.salesSearch.trim().toLowerCase();
  const deliveryOrders = salesOrders.filter((order) => String(order.order_no || "").startsWith("SND") || order.status === "ใบส่งสินค้า");
  const filtered = deliveryOrders.filter((order) =>
    [order.order_no, order.customer_name, order.payment_status, order.status, saleItemsText(order.items)]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  const activeOrders = filtered.filter((order) => order.status !== "ยกเลิก");
  const total = activeOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  return h("div", null, [
    h(PageTitle, { title: "ใบส่งสินค้า", sub: "ขายสินค้าแบบเครดิต เลือกลูกค้า เพิ่มสินค้าได้หลายรายการ และพิมพ์ใบส่งสินค้าได้ทันที", actionText: "เพิ่มใบส่งสินค้า", actionModal: "deliveryNote" }),
    h("section", { className: "panel" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [h("h2", null, "รายการใบส่งสินค้า"), h("span", null, `${filtered.length} รายการ`)]),
        h("button", { "data-modal": "deliveryNote" }, "เพิ่มใบส่งสินค้า"),
      ]),
      h("div", { className: "cash-bill-summary" }, [
        h("span", null, ["จำนวนเอกสาร ", h("strong", null, String(filtered.length))]),
        h("span", null, ["ยอดเครดิตรวม ", h("strong", null, money(total, { decimals: 2 }))]),
      ]),
      h("label", { className: "panel-search" }, [
        h("span", null, "⌕"),
        h("input", { "data-sales-search": "true", placeholder: "ค้นหาเลขที่ใบส่งสินค้า, ลูกค้า, สินค้า, สถานะ...", value: state.salesSearch }),
      ]),
      h(DeliveryNoteTable, { items: filtered }),
    ]),
  ]);
}

function isCreditSalesOrder(order = {}) {
  const orderNo = String(order.order_no || "");
  return /^(SND|VDN)/.test(orderNo) && order.status !== "ยกเลิก";
}

function isActivePayment(payment = {}) {
  return payment.is_active !== false && payment.is_active !== 0 && payment.status !== "ยกเลิก";
}

function paymentSettlementAmount(payment = {}) {
  return Number(payment.amount || 0) + Number(payment.debt_reduction_amount || 0);
}

function paidAmountForOrder(orderId) {
  return payments
    .filter((payment) => isActivePayment(payment) && Number(payment.order_id || 0) === Number(orderId))
    .reduce((sum, payment) => sum + paymentSettlementAmount(payment), 0);
}

function receivableOutstanding(order = {}) {
  return Math.max(0, Number(order.total_amount || 0) - paidAmountForOrder(order.id));
}

function customerReceivableOrders(selectedId = "") {
  return salesOrders
    .filter((order) => isCreditSalesOrder(order) && (receivableOutstanding(order) > 0 || String(order.id) === String(selectedId)))
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")) || String(a.order_no || "").localeCompare(String(b.order_no || "")));
}

function nextCustomerReceiptNo(dateValue = todayIso) {
  const rawDate = String(dateValue || todayIso);
  const year = Number(rawDate.slice(0, 4)) || new Date().getFullYear();
  const month = rawDate.slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0");
  const prefix = `RV${String(year + 543).slice(-2)}${month}`;
  const maxRun = payments.reduce((highest, payment) => {
    const match = String(payment.payment_no || "").match(new RegExp(`^${prefix}(\\d{4})$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(maxRun + 1).padStart(4, "0")}`;
}

function CustomerReceiptVouchersPage() {
  const receivables = customerReceivableOrders();
  const query = state.customerReceiptSearch.trim().toLowerCase();
  const filteredVouchers = customerReceiptVouchers.filter((voucher) =>
    [voucher.payment_no, voucher.reference_no, voucher.customer_name, voucher.order_no, voucher.method, voucher.bank_name, voucher.debt_reduction_amount, voucher.note, voucher.status]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  const totalOutstanding = receivables.reduce((sum, order) => sum + receivableOutstanding(order), 0);
  const activeVouchers = filteredVouchers.filter(isActivePayment);
  const canceledCount = filteredVouchers.length - activeVouchers.length;
  const totalReceived = activeVouchers.reduce((sum, voucher) => sum + Number(voucher.amount || 0), 0);
  const totalDebtReduction = activeVouchers.reduce((sum, voucher) => sum + Number(voucher.debt_reduction_amount || 0), 0);
  const totalSettlement = activeVouchers.reduce((sum, voucher) => sum + paymentSettlementAmount(voucher), 0);
  return h("div", null, [
    h(PageTitle, { title: "ใบสำคัญรับเงิน", sub: "รับเงินจากลูกค้าโดยอ้างอิงใบส่งสินค้าและใบส่งของ/ใบกำกับภาษี", actionText: "เพิ่มใบสำคัญรับเงิน", actionModal: "customerReceiptVoucher" }),
    h("section", { className: "customer-receipt-summary" }, [
      h("span", null, ["เอกสารค้างรับ ", h("strong", null, receivables.length)]),
      h("span", null, ["ยอดค้างรับ ", h("strong", null, money(totalOutstanding, { decimals: 2 }))]),
      h("span", null, ["ใบสำคัญรับเงิน ", h("strong", null, filteredVouchers.length)]),
      h("span", null, ["ยกเลิก ", h("strong", null, canceledCount)]),
      h("span", null, ["รับแล้ว ", h("strong", null, money(totalReceived, { decimals: 2 }))]),
      h("span", null, ["ลดหนี้ ", h("strong", null, money(totalDebtReduction, { decimals: 2 }))]),
      h("span", null, ["ตัดหนี้รวม ", h("strong", null, money(totalSettlement, { decimals: 2 }))]),
    ]),
    h("section", { className: "customer-receipt-grid" }, [
      h("section", { className: "panel span-2" }, [
        h("div", { className: "panel-head" }, [h("h2", null, "เอกสารค้างรับ"), h("button", { "data-modal": "customerReceiptVoucher" }, "รับเงิน")]),
        h(CustomerReceivableTable, { items: receivables }),
      ]),
      h("section", { className: "panel span-2" }, [
        h("div", { className: "panel-head" }, [h("h2", null, "รายการใบสำคัญรับเงิน"), h("button", { "data-modal": "customerReceiptVoucher" }, "เพิ่มใบสำคัญ")]),
        h("label", { className: "panel-search" }, [
          h("span", null, "⌕"),
          h("input", { "data-customer-receipt-search": "true", placeholder: "ค้นหาเลขใบสำคัญ, ลูกค้า, เอกสารอ้างอิง, ธนาคาร...", value: state.customerReceiptSearch }),
        ]),
        h(CustomerReceiptVoucherTable, { items: filteredVouchers }),
      ]),
    ]),
  ]);
}

function CustomerReceivableTable({ items = [] } = {}) {
  return h("table", { className: "data-table customer-receivable-table" }, [
    h("thead", null, h("tr", null, ["วันที่", "เอกสาร", "ลูกค้า", "ประเภท", "ยอดสุทธิ", "ค้างรับ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((order) => h("tr", null, [
      h("td", null, thaiDateInputValue(order.created_at || "")),
      h("td", null, order.order_no || "-"),
      h("td", null, order.customer_name || "-"),
      h("td", null, String(order.order_no || "").startsWith("VDN") ? "ใบส่งของ/ใบกำกับ" : "ใบส่งสินค้า"),
      h("td", null, money(order.total_amount, { decimals: 2 })),
      h("td", null, money(receivableOutstanding(order), { decimals: 2 })),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { "data-customer-receive-pay": order.id, title: "รับเงินจากเอกสารนี้" }, "฿"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 7 }, "ยังไม่มีใบส่งสินค้าหรือใบส่งของ/ใบกำกับที่ค้างรับ"))),
  ]);
}

function CustomerReceiptVoucherTable({ items = [] } = {}) {
  return h("table", { className: "data-table customer-receipt-table" }, [
    h("thead", null, h("tr", null, ["วันที่รับ", "เลขที่", "ลูกค้า", "อ้างอิง", "วิธีรับ", "ธนาคาร", "ยอดรับ", "ลดหนี้", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((voucher) => {
      const canceled = !isActivePayment(voucher);
      return h("tr", { className: canceled ? "is-canceled" : "" }, [
      h("td", null, thaiDateInputValue(voucher.paid_at || voucher.created_at || "")),
      h("td", null, voucher.payment_no || "-"),
      h("td", null, voucher.customer_name || "-"),
      h("td", null, voucher.order_no || "-"),
      h("td", null, voucher.method === "transfer" ? "เงินโอน" : "เงินสด"),
      h("td", null, voucher.method === "transfer" ? (voucher.bank_name || "-") : "-"),
      h("td", null, money(voucher.amount, { decimals: 2 })),
      h("td", null, money(voucher.debt_reduction_amount || 0, { decimals: 2 })),
      h("td", null, h("span", { className: canceled ? "status red" : "status green" }, canceled ? "ยกเลิก" : "รับเงินแล้ว")),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", {
          className: "danger-icon",
          "data-customer-receipt-delete": voucher.id,
          disabled: canceled,
          title: canceled ? "ใบสำคัญนี้ยกเลิกแล้ว" : "ยกเลิกใบสำคัญรับเงิน",
        }, "×"),
      ])),
    ]);
    }) : h("tr", null, h("td", { colSpan: 10 }, state.customerReceiptSearch ? "ไม่พบใบสำคัญรับเงินที่ค้นหา" : "ยังไม่มีใบสำคัญรับเงินจากลูกค้า"))),
  ]);
}

function CashBillTable({ items = salesOrders } = {}) {
  const statusTone = (order) => order.status === "ยกเลิก" ? "status red" : order.payment_status === "ชำระแล้ว" ? "status green" : "status amber";
  const isCanceled = (order) => order.status === "ยกเลิก";
  return h("table", { className: "data-table receipt-table cash-bill-table" }, [
    h("thead", null, h("tr", null, ["วันที่", "เลขที่บิล", "ลูกค้า", "รายการ", "จำนวน", "ยอดสุทธิ", "ชำระเงิน", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((order) => h("tr", null, [
      h("td", null, thaiDateInputValue(order.created_at || todayIso)),
      h("td", null, order.order_no || "-"),
      h("td", null, order.customer_name || "-"),
      h("td", null, saleItemsText(order.items)),
      h("td", null, saleQuantityText(order.items)),
      h("td", null, money(order.total_amount, { decimals: 2 })),
      h("td", null, order.payment_status || "-"),
      h("td", null, h("span", { className: statusTone(order) }, order.status || "-")),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { className: "detail-icon", "data-cash-bill-view": order.id, title: "ดูรายละเอียดบิลเงินสด" }, "ดู"),
        h("button", { className: "print-icon", "data-cash-bill-print": order.id, title: "พิมพ์บิลเงินสด" }, "พิมพ์"),
        h("button", { className: "danger-icon", "data-cash-bill-cancel": order.id, disabled: isCanceled(order), title: isCanceled(order) ? "บิลนี้ยกเลิกแล้ว" : "ยกเลิกบิลเงินสด" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 9 }, state.salesSearch ? "ไม่พบบิลเงินสดที่ค้นหา" : "ยังไม่มีบิลเงินสด"))),
  ]);
}

function CashTaxInvoiceTable({ items = [] } = {}) {
  const statusTone = (order) => order.status === "ยกเลิก" ? "status red" : "status green";
  const isCanceled = (order) => order.status === "ยกเลิก";
  const statusLabel = (order) => isCanceled(order) ? "ยกเลิก" : "VAT";
  return h("table", { className: "data-table receipt-table cash-bill-table cash-tax-invoice-table" }, [
    h("thead", null, h("tr", null, ["วันที่", "เลขที่เอกสาร", "ลูกค้า", "รายการ", "จำนวน", "ก่อน VAT", "VAT", "รวมสุทธิ", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((order) => h("tr", null, [
      h("td", null, thaiDateInputValue(order.created_at || todayIso)),
      h("td", null, order.order_no || "-"),
      h("td", null, order.customer_name || "-"),
      h("td", null, saleItemsText(order.items)),
      h("td", null, saleQuantityText(order.items)),
      h("td", null, money(taxInvoiceSubtotal(order), { decimals: 2 })),
      h("td", null, money(taxInvoiceVat(order), { decimals: 2 })),
      h("td", null, money(order.total_amount, { decimals: 2 })),
      h("td", null, h("span", { className: statusTone(order), title: order.status || "-" }, statusLabel(order))),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { className: "detail-icon", "data-cash-tax-invoice-view": order.id, title: "ดูรายละเอียดบิลเงินสด/ใบกำกับภาษี" }, "ดู"),
        h("button", { className: "print-icon", "data-cash-tax-invoice-print": order.id, title: "พิมพ์บิลเงินสด/ใบกำกับภาษี" }, "พิมพ์"),
        h("button", { className: "danger-icon", "data-cash-tax-invoice-cancel": order.id, disabled: isCanceled(order), title: isCanceled(order) ? "เอกสารนี้ยกเลิกแล้ว" : "ยกเลิกบิลเงินสด/ใบกำกับภาษี" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 10 }, state.salesSearch ? "ไม่พบบิลเงินสด/ใบกำกับภาษีที่ค้นหา" : "ยังไม่มีบิลเงินสด/ใบกำกับภาษี"))),
  ]);
}

function DeliveryTaxInvoiceTable({ items = [] } = {}) {
  const isCanceled = (order) => order.status === "ยกเลิก";
  const statusTone = (order) => isCanceled(order) ? "status red" : "status amber";
  const statusLabel = (order) => isCanceled(order) ? "ยกเลิก" : "เครดิต VAT";
  return h("table", { className: "data-table receipt-table cash-bill-table cash-tax-invoice-table delivery-tax-invoice-table" }, [
    h("thead", null, h("tr", null, ["วันที่", "เลขที่เอกสาร", "ลูกค้า", "รายการ", "จำนวน", "ก่อน VAT", "VAT", "รวมสุทธิ", "เครดิต", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((order) => h("tr", null, [
      h("td", null, thaiDateInputValue(order.created_at || todayIso)),
      h("td", null, order.order_no || "-"),
      h("td", null, order.customer_name || "-"),
      h("td", null, saleItemsText(order.items)),
      h("td", null, saleQuantityText(order.items)),
      h("td", null, money(taxInvoiceSubtotal(order), { decimals: 2 })),
      h("td", null, money(taxInvoiceVat(order), { decimals: 2 })),
      h("td", null, money(order.total_amount, { decimals: 2 })),
      h("td", null, order.payment_status || "รอชำระ"),
      h("td", null, h("span", { className: statusTone(order), title: order.status || "-" }, statusLabel(order))),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { className: "detail-icon", "data-delivery-tax-invoice-view": order.id, title: "ดูรายละเอียดใบส่งของ/ใบกำกับภาษี" }, "ดู"),
        h("button", { className: "print-icon", "data-delivery-tax-invoice-print": order.id, title: "พิมพ์ใบส่งของ/ใบกำกับภาษี" }, "พิมพ์"),
        h("button", { className: "danger-icon", "data-delivery-tax-invoice-cancel": order.id, disabled: isCanceled(order), title: isCanceled(order) ? "เอกสารนี้ยกเลิกแล้ว" : "ยกเลิกใบส่งของ/ใบกำกับภาษี" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 11 }, state.salesSearch ? "ไม่พบใบส่งของ/ใบกำกับภาษีที่ค้นหา" : "ยังไม่มีใบส่งของ/ใบกำกับภาษี"))),
  ]);
}

function DeliveryNoteTable({ items = [] } = {}) {
  const statusTone = (order) => order.status === "ยกเลิก" ? "status red" : "status amber";
  return h("table", { className: "data-table receipt-table cash-bill-table" }, [
    h("thead", null, h("tr", null, ["วันที่", "เลขที่ใบส่ง", "ลูกค้า", "รายการ", "จำนวน", "ยอดสุทธิ", "เครดิต", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((order) => h("tr", null, [
      h("td", null, thaiDateInputValue(order.created_at || todayIso)),
      h("td", null, order.order_no || "-"),
      h("td", null, order.customer_name || "-"),
      h("td", null, saleItemsText(order.items)),
      h("td", null, saleQuantityText(order.items)),
      h("td", null, money(order.total_amount, { decimals: 2 })),
      h("td", null, order.payment_status || "รอชำระ"),
      h("td", null, h("span", { className: statusTone(order) }, order.status || "-")),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { className: "detail-icon", "data-delivery-note-view": order.id, title: "ดูรายละเอียดใบส่งสินค้า" }, "ดู"),
        h("button", { className: "print-icon", "data-delivery-note-print": order.id, title: "พิมพ์ใบส่งสินค้า" }, "พิมพ์"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 9 }, state.salesSearch ? "ไม่พบใบส่งสินค้าที่ค้นหา" : "ยังไม่มีใบส่งสินค้า"))),
  ]);
}

function cashBillLineAmount(item) {
  return Number(item.line_total ?? (Number(item.quantity || 0) * Number(item.unit_price || item.price || 0))) || 0;
}

function saleStockAvailableAt(product = {}, soldAt = todayIso) {
  const saleDate = thaiDateToIso(soldAt || todayIso).slice(0, 10);
  const saleMonth = saleDate.slice(0, 7);
  const relevantMovements = stockReportMovements()
    .filter((movement) => String(movement.product_id) === String(product.id))
    .filter((movement) => reportIsoDate(movement.created_at) <= saleDate);
  if (!relevantMovements.length) return Number(product.stock_full ?? product.stock ?? 0);
  const monthMovements = relevantMovements.filter((movement) => reportIsoDate(movement.created_at).slice(0, 7) === saleMonth);
  const openingMovements = monthMovements.filter(isOpeningStockMovement);
  if (openingMovements.length) {
    const openingFull = openingMovements.reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0);
    const movementFull = monthMovements
      .filter((movement) => !isOpeningStockMovement(movement))
      .reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0);
    return openingFull + movementFull;
  }
  return relevantMovements.reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0);
}

function saleStockLimit(product = {}, soldAt = todayIso) {
  if (!product?.id) return 0;
  const productAvailable = Number(product.stock_full ?? product.stock ?? 0);
  const stockCardAvailable = Number(saleStockAvailableAt(product, soldAt) || 0);
  return Math.max(0, Math.min(productAvailable, stockCardAvailable));
}

function validateSaleStock(items = [], soldAt = todayIso) {
  const requiredByProduct = new Map();
  items.forEach((item) => {
    const productId = String(item.product_id || "");
    if (!productId) return;
    requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + Number(item.quantity || 0));
  });
  for (const [productId, requiredQty] of requiredByProduct.entries()) {
    const product = products.find((item) => String(item.id) === productId);
    const availableQty = Number(product?.stock_full ?? product?.stock ?? 0);
    if (!product) throw new Error("ไม่พบสินค้าในระบบ กรุณาเลือกสินค้าใหม่");
    if (requiredQty > availableQty) {
      throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} คงเหลือ ${availableQty.toLocaleString("th-TH")} แต่ต้องการขาย ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
    }
    const stockCardAvailableQty = saleStockAvailableAt(product, soldAt);
    if (requiredQty > stockCardAvailableQty) {
      throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} คงเหลือตาม Stock card ${stockCardAvailableQty.toLocaleString("th-TH")} แต่ต้องการขาย ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
    }
  }
}

function validateReceiptEmptyExchange(items = [], receiptId = 0) {
  const availableByProduct = new Map(products.map((product) => [String(product.id), Number(product.stock_empty || 0)]));
  const existingReceipt = receiptId ? goodsReceipts.find((receipt) => String(receipt.id) === String(receiptId)) : null;
  (existingReceipt?.items || []).forEach((item) => {
    const productId = String(item.product_id || "");
    if (!productId) return;
    availableByProduct.set(productId, (availableByProduct.get(productId) || 0) + Number(item.quantity_empty || 0));
  });
  const requiredByProduct = new Map();
  items.forEach((item) => {
    const productId = String(item.product_id || "");
    if (!productId) return;
    requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + Number(item.quantity_empty || 0));
  });
  for (const [productId, requiredQty] of requiredByProduct.entries()) {
    if (requiredQty <= 0) continue;
    const product = products.find((item) => String(item.id) === productId);
    if (!product) throw new Error("ไม่พบสินค้าในระบบ กรุณาเลือกสินค้าใหม่");
    const availableQty = Number(availableByProduct.get(productId) || 0);
    if (requiredQty > availableQty) {
      throw new Error(`${product.sku ? `${product.sku} - ` : ""}${product.name} ถังเปล่าคงเหลือ ${availableQty.toLocaleString("th-TH")} แต่ต้องใช้แลก ${requiredQty.toLocaleString("th-TH")} กรุณาปรับจำนวนก่อนบันทึก`);
    }
  }
}

function openCashBillDetailModal(order = {}, kind = "cashBill") {
  const orderNo = String(order.order_no || "");
  const isDeliveryTaxInvoice = kind === "deliveryTaxInvoice" || orderNo.startsWith("VDN");
  const isCashTaxInvoice = kind === "cashTaxInvoice" || orderNo.startsWith("VCS");
  const isTaxInvoice = isCashTaxInvoice || isDeliveryTaxInvoice;
  const isDeliveryNote = !isDeliveryTaxInvoice && (kind === "deliveryNote" || orderNo.startsWith("SND"));
  const detailTitle = isDeliveryTaxInvoice ? "รายละเอียดใบส่งของ/ใบกำกับภาษี" : isCashTaxInvoice ? "รายละเอียดบิลเงินสด/ใบกำกับภาษี" : isDeliveryNote ? "รายละเอียดใบส่งสินค้า" : "รายละเอียดบิลเงินสด";
  const detailSub = isDeliveryTaxInvoice ? "เอกสารขายเครดิตพร้อมภาษีมูลค่าเพิ่ม" : isCashTaxInvoice ? "เอกสารขายเงินสดพร้อมภาษีมูลค่าเพิ่ม" : isDeliveryNote ? "เอกสารขายเครดิต / รอชำระ" : "เอกสารขายเงินสด";
  const numberLabel = isDeliveryTaxInvoice ? "เลขที่ใบส่งของ/ใบกำกับ" : isCashTaxInvoice ? "เลขที่ใบกำกับ" : isDeliveryNote ? "เลขที่ใบส่ง" : "เลขที่บิล";
  const dateLabel = (isDeliveryNote || isDeliveryTaxInvoice) ? "วันที่ส่ง" : "วันที่ขาย";
  const paymentLabel = (isDeliveryNote || isDeliveryTaxInvoice) ? "เงื่อนไขเครดิต" : "ชำระเงิน";
  const printAttr = isDeliveryTaxInvoice ? "data-delivery-tax-invoice-print" : isCashTaxInvoice ? "data-cash-tax-invoice-print" : isDeliveryNote ? "data-delivery-note-print" : "data-cash-bill-print";
  const printLabel = isDeliveryTaxInvoice ? "พิมพ์ใบส่งของ/ใบกำกับ" : isCashTaxInvoice ? "พิมพ์ใบกำกับ" : isDeliveryNote ? "พิมพ์ใบส่งสินค้า" : "พิมพ์บิล";
  const items = Array.isArray(order.items) ? order.items : [];
  const itemTotal = items.reduce((sum, item) => sum + cashBillLineAmount(item), 0);
  const total = Number(order.total_amount || itemTotal || 0);
  const vatAmount = isTaxInvoice ? Math.max(0, total - itemTotal) : 0;
  const statusClass = order.status === "ยกเลิก" ? "status red" : (isDeliveryNote || isDeliveryTaxInvoice) ? "status amber" : "status green";
  const rows = items.length ? items.map((item, index) => {
    const price = Number(item.unit_price || item.price || 0);
    const quantity = Number(item.quantity || 0);
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${html(item.product_sku || item.sku || "-")}</td>
        <td>${html(item.product_name || item.name || "สินค้า")}</td>
        <td class="num">${quantity.toLocaleString("th-TH")}</td>
        <td class="num">${money(price, { decimals: 2 })}</td>
        <td class="num strong">${money(cashBillLineAmount(item), { decimals: 2 })}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="6" class="empty-cell">ไม่มีรายการสินค้า</td></tr>`;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal wide cash-bill-detail-modal">
      <button class="modal-close" type="button">×</button>
      <div class="detail-modal-head">
        <div>
          <h2>${html(detailTitle)}</h2>
          <p>${html(order.order_no || "-")} • ${html(thaiDateInputValue(order.created_at || todayIso))} • ${html(detailSub)}</p>
        </div>
        <span class="${statusClass}">${html(order.status || "-")}</span>
      </div>
      <div class="cash-bill-detail-grid">
        <div><span>${html(numberLabel)}</span><strong>${html(order.order_no || "-")}</strong></div>
        <div><span>${html(dateLabel)}</span><strong>${html(thaiDateInputValue(order.created_at || todayIso))}</strong></div>
        <div><span>ลูกค้า</span><strong>${html(order.customer_name || "-")}</strong></div>
        <div><span>${html(paymentLabel)}</span><strong>${html(order.payment_status || "-")}</strong></div>
      </div>
      <div class="cash-bill-detail-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัส</th>
              <th>สินค้า</th>
              <th class="num">จำนวน</th>
              <th class="num">ราคา</th>
              <th class="num">รวมเงิน</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="cash-bill-detail-total">
        <span>จำนวนรายการ <strong>${items.length.toLocaleString("th-TH")}</strong></span>
        ${isTaxInvoice ? `<span>ก่อน VAT <strong>${money(itemTotal, { decimals: 2 })}</strong></span>` : ""}
        ${isTaxInvoice ? `<span>VAT <strong>${money(vatAmount, { decimals: 2 })}</strong></span>` : ""}
        <span>รวมสุทธิ <strong>${money(total, { decimals: 2 })}</strong></span>
      </div>
      <div class="modal-actions">
        <button class="secondary print-secondary" type="button" ${printAttr}="${html(order.id || "")}">${html(printLabel)}</button>
        <button class="secondary" type="button">ปิด</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelectorAll(".secondary").forEach((button) => {
    if (!button.matches("[data-cash-bill-print], [data-delivery-note-print], [data-cash-tax-invoice-print], [data-delivery-tax-invoice-print]")) button.addEventListener("click", close);
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
}

function thaiBahtText(value) {
  const number = Math.round(Number(value || 0) * 100) / 100;
  const [bahtText, satangText = "0"] = number.toFixed(2).split(".");
  const digits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const units = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  const readGroup = (group) => {
    const chars = String(group).replace(/^0+/, "").split("");
    if (!chars.length) return "";
    return chars.map((char, index) => {
      const digit = Number(char);
      const place = chars.length - index - 1;
      if (!digit) return "";
      if (place === 0 && digit === 1 && chars.length > 1) return "เอ็ด";
      if (place === 1 && digit === 1) return "สิบ";
      if (place === 1 && digit === 2) return "ยี่สิบ";
      return `${digits[digit]}${units[place] || ""}`;
    }).join("");
  };
  const readInteger = (text) => {
    const clean = String(Number(text || 0));
    if (clean === "0") return "ศูนย์";
    const groups = [];
    for (let end = clean.length; end > 0; end -= 6) {
      groups.unshift(clean.slice(Math.max(0, end - 6), end));
    }
    return groups.map((group, index) => {
      const read = readGroup(group);
      if (!read) return "";
      return `${read}${index < groups.length - 1 ? "ล้าน" : ""}`;
    }).join("");
  };
  const baht = `${readInteger(bahtText)}บาท`;
  const satang = Number(satangText) ? `${readInteger(satangText)}สตางค์` : "ถ้วน";
  return `${baht}${satang}`;
}

function cashBillPrintHtml(order = {}, options = {}) {
  const documentTitle = options.documentTitle || "บิลเงินสด";
  const documentBadge = options.documentBadge || "ชำระเงินสด";
  const documentLabel = options.documentLabel || "เลขที่บิล";
  const dateLabel = options.dateLabel || "วันที่";
  const payerLabel = options.payerLabel || "ผู้จ่ายเงิน";
  const receiverLabel = options.receiverLabel || "ผู้รับเงิน";
  const profile = businessTaxProfile();
  const items = Array.isArray(order.items) ? order.items : [];
  const showVat = Boolean(options.showVat);
  const showPaymentQr = options.showPaymentQr === true && Boolean(profile.paymentQrImage);
  const itemSubtotal = items.reduce((sum, item) => sum + cashBillLineAmount(item), 0);
  const total = Number(order.total_amount || (showVat ? itemSubtotal * 1.07 : itemSubtotal));
  const vatAmount = showVat ? Math.max(0, total - itemSubtotal) : 0;
  const rows = items.length ? items.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.unit_price || item.price || 0);
    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${html(item.product_name || item.name || "สินค้า")}</td>
        <td class="center">${quantity.toLocaleString("th-TH")}</td>
        <td class="right">${price.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="right">${cashBillLineAmount(item).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join("") : `<tr><td class="center" colspan="5">ไม่มีรายการสินค้า</td></tr>`;
  const fillerRows = Array.from({ length: Math.max(0, 6 - items.length) }, () => `
    <tr class="blank-row">
      <td>&nbsp;</td><td></td><td></td><td></td><td></td>
    </tr>
  `).join("");
  const paymentQrBlock = showPaymentQr ? `
    <div class="payment-qr-card">
      <span>QR รับเงิน</span>
      <img src="${html(profile.paymentQrImage)}" alt="QR Code รับเงิน">
      <b>สแกนจ่าย</b>
    </div>
  ` : "";
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>${html(order.order_no || "cash-bill")}</title>
  <style>
    @page { size: A5 portrait; margin: 7mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #102033;
      background: #eef4f1;
      font-family: "Tahoma", "Sarabun", sans-serif;
      font-size: 10.5px;
    }
    .sheet {
      width: 100%;
      max-width: 134mm;
      margin: 0 auto;
      padding: 7mm;
      background: #fff;
      border: 1px solid #d5e4dc;
      border-radius: 12px;
      box-shadow: 0 16px 45px rgba(15, 23, 42, .10);
    }
    .invoice-hero {
      display: grid;
      grid-template-columns: 1fr 40mm;
      gap: 7px;
      align-items: stretch;
      margin-bottom: 7px;
    }
    .brand-card,
    .doc-card,
    .info-card,
    .note-card,
    .total-card,
    .signature-card {
      border: 1px solid #dbe8e0;
      border-radius: 9px;
      background: #fbfefd;
    }
    .brand-card {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 8px;
      align-items: center;
      padding: 9px 10px;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      color: #078b32;
      background: #e8f8ee;
      border: 1px solid #beeccc;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 900;
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 15px; line-height: 1; }
    .shop-meta { margin-top: 4px; color: #52627a; line-height: 1.45; font-size: 8.5px; font-weight: 700; }
    .doc-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      padding: 9px 10px;
      border-color: #b7efc8;
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 68%);
    }
    .doc-card span,
    .info-card span,
    .note-card span,
    .total-row span {
      color: #64748b;
      font-size: 8.5px;
      font-weight: 800;
    }
    .doc-card strong { color: #0f9f42; font-size: 16px; line-height: 1; }
    .doc-card b {
      display: inline-flex;
      width: fit-content;
      padding: 3px 7px;
      color: #087d31;
      background: #dcfce7;
      border-radius: 999px;
      font-size: 8.5px;
    }
    .bill-info {
      display: grid;
      grid-template-columns: 1fr 43mm;
      gap: 5px;
      margin-bottom: 5px;
    }
    .party-card {
      position: relative;
      min-height: 36px;
      padding: 5px 8px 5px 11px;
      overflow: hidden;
    }
    .party-card:before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: linear-gradient(180deg, #10b981, #86efac);
    }
    .party-card span,
    .doc-meta span {
      display: block;
      margin-bottom: 1px;
      color: #64748b;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: .2px;
    }
    .party-card strong,
    .doc-meta strong {
      display: block;
      color: #102033;
      font-size: 10px;
      line-height: 1.2;
    }
    .party-card p {
      margin: 3px 0 0;
      color: #334155;
      font-size: 8.5px;
      line-height: 1.2;
    }
    .doc-meta {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 4px;
    }
    .doc-meta div {
      padding: 5px 8px;
      border: 1px solid #dbe8e0;
      border-radius: 9px;
      background: linear-gradient(180deg, #fbfefd, #f6fbf8);
    }
    table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
    .items {
      overflow: hidden;
      border: 1px solid #dbe8e0;
      border-radius: 9px;
    }
    .items th {
      padding: 6px 5px;
      color: #334155;
      background: #f3f8f5;
      border-bottom: 1px solid #dbe8e0;
      text-align: center;
      font-size: 9.5px;
      font-weight: 900;
    }
    .items td {
      height: 24px;
      padding: 5px;
      border-bottom: 1px solid #e6eee9;
      vertical-align: middle;
    }
    .items tr:last-child td { border-bottom: 0; }
    .items .blank-row td { height: 22px; color: transparent; }
    .center { text-align: center; }
    .right { text-align: right; }
    .money { font-variant-numeric: tabular-nums; }
    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 44mm;
      gap: 6px;
      margin-top: 7px;
      align-items: stretch;
    }
    .bottom-grid.with-qr { grid-template-columns: 25mm 1fr 44mm; }
    .payment-qr-card {
      display: grid;
      justify-items: center;
      gap: 2px;
      min-height: 34px;
      padding: 4px 5px;
      border: 1px solid #dbe8e0;
      border-radius: 9px;
      background: #fbfefd;
    }
    .payment-qr-card span,
    .payment-qr-card b {
      color: #087d31;
      font-size: 7px;
      font-weight: 900;
      line-height: 1;
    }
    .payment-qr-card img {
      width: 18mm;
      height: 18mm;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      background: #fff;
    }
    .note-card {
      min-height: 34px;
      padding: 6px 8px;
      display: flex;
      align-items: center;
    }
    .amount-text {
      width: 100%;
      padding: 5px 8px;
      text-align: center;
      color: #0f9f42;
      background: #ecfdf3;
      border: 1px dashed #9fe6b7;
      border-radius: 8px;
      font-weight: 900;
    }
    .note-line {
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 5px;
      margin-top: 5px;
      color: #334155;
      font-weight: 800;
    }
    .total-card {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .total-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px;
      align-items: center;
      min-height: 34px;
      padding: 6px 8px;
      border-bottom: 1px solid #e6eee9;
      width: 100%;
    }
    .total-row:last-child {
      min-height: 34px;
      color: #087d31;
      background: #ecfdf3;
      border-bottom: 0;
      font-size: 12px;
      font-weight: 900;
    }
    .total-row strong { font-variant-numeric: tabular-nums; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-top: 7px;
    }
    .signature-card {
      min-height: 50px;
      padding: 7px 8px;
      font-weight: 900;
    }
    .signature-line {
      margin-top: 22px;
      border-top: 1px dotted #94a3b8;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet { padding: 0; border: 0; border-radius: 0; box-shadow: none; }
    }
    .print-toolbar { display: flex; justify-content: flex-end; gap: 8px; margin: 0 auto 10px; max-width: 134mm; }
    .print-toolbar button { height: 36px; padding: 0 14px; color: #087d31; border: 1px solid #b7efc8; background: #fff; border-radius: 8px; font-weight: 900; cursor: pointer; }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <button onclick="window.print()">พิมพ์</button>
    <button onclick="window.close()">ปิด</button>
  </div>
  <div class="sheet">
    <header class="invoice-hero">
      <section class="brand-card">
        <div class="brand-mark">GF</div>
        <div>
          <h1>${html(profile.name)}</h1>
          <div class="shop-meta">
            ${html(profile.placeName)} ${html(profile.branch || "")}<br>
            เลขประจำตัวผู้เสียภาษีอากร ${html(profile.taxId)}
          </div>
        </div>
      </section>
      <section class="doc-card">
        <span>เอกสารขาย</span>
        <strong>${html(documentTitle)}</strong>
        <b>${html(documentBadge)}</b>
      </section>
    </header>
    <section class="bill-info">
      <div class="info-card party-card">
        <span>ลูกค้า</span>
        <strong>${html(order.customer_name || "-")}</strong>
        <p>ที่อยู่: ${html(order.delivery_address || "-")}</p>
      </div>
      <div class="doc-meta">
        <div><span>${html(documentLabel)}</span><strong>${html(order.order_no || "-")}</strong></div>
        <div><span>${html(dateLabel)}</span><strong>${html(thaiDateInputValue(order.created_at || todayIso))}</strong></div>
      </div>
    </section>
    <table class="items">
      <thead>
        <tr>
          <th style="width: 7%;">ที่</th>
          <th>รายการ</th>
          <th style="width: 9%;">จำนวน</th>
          <th style="width: 14%;">ราคาต่อหน่วย</th>
          <th style="width: 16%;">จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>${rows}${fillerRows}</tbody>
    </table>
    <section class="bottom-grid${showPaymentQr ? " with-qr" : ""}">
      ${paymentQrBlock}
      <div class="note-card">
        <div class="amount-text">(${html(thaiBahtText(total))})</div>
      </div>
      <div class="total-card">
        ${showVat ? `<div class="total-row"><span>มูลค่าสินค้า</span><strong>${itemSubtotal.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>` : ""}
        ${showVat ? `<div class="total-row"><span>ภาษีมูลค่าเพิ่ม</span><strong>${vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>` : ""}
        <div class="total-row"><span>รวมเงินทั้งสิ้น</span><strong>${total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
      </div>
    </section>
    <section class="signatures">
      <div class="signature-card">${html(payerLabel)}<div class="signature-line"></div></div>
      <div class="signature-card">${html(receiverLabel)}<div class="signature-line"></div></div>
    </section>
  </div>
  <script>
    setTimeout(() => window.print(), 250);
  </script>
</body>
</html>`;
}

function printCashBill(order = {}) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    toast("Browser บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต popup แล้วลองใหม่");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(cashBillPrintHtml(order, { showPaymentQr: true }));
  printWindow.document.close();
}

function printDeliveryNote(order = {}) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    toast("Browser บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต popup แล้วลองใหม่");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(cashBillPrintHtml(order, {
    documentTitle: "ใบส่งสินค้า",
    documentBadge: order.payment_status || "เครดิต / รอชำระ",
    documentLabel: "เลขที่ใบส่ง",
    dateLabel: "วันที่ส่ง",
    payerLabel: "ผู้ส่งสินค้า",
    receiverLabel: "ผู้รับสินค้า",
  }));
  printWindow.document.close();
}

function printCashTaxInvoice(order = {}) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    toast("Browser บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต popup แล้วลองใหม่");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(cashBillPrintHtml(order, {
    documentTitle: "บิลเงินสด/ใบกำกับภาษี",
    documentBadge: "VAT 7%",
    documentLabel: "เลขที่ใบกำกับ",
    dateLabel: "วันที่ขาย",
    showVat: true,
  }));
  printWindow.document.close();
}

function printDeliveryTaxInvoice(order = {}) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    toast("Browser บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต popup แล้วลองใหม่");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(cashBillPrintHtml(order, {
    documentTitle: "ใบส่งของ/ใบกำกับภาษี",
    documentBadge: order.payment_status || "เครดิต / VAT 7%",
    documentLabel: "เลขที่ใบส่งของ/ใบกำกับ",
    dateLabel: "วันที่ส่ง",
    payerLabel: "ผู้ส่งสินค้า",
    receiverLabel: "ผู้รับสินค้า",
    showVat: true,
  }));
  printWindow.document.close();
}

function generalPaymentVoucherPrintHtml(expense = {}) {
  const amount = Number(expense.amount || 0);
  const method = financeMethodLabel(expense.payment_method || expense.paid_by);
  const isCanceled = isCanceledRecord(expense);
  const bankLine = isTransferMethod(expense.payment_method || expense.paid_by)
    ? [expense.bank_name, expense.bank_account_name, expense.bank_account_number].filter(Boolean).join(" / ") || "-"
    : "-";
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>${html(expense.expense_no || "ใบสำคัญจ่ายทั่วไป")}</title>
  <style>
    @page { size: A5; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      background: #eef2f7;
      font-family: Tahoma, "Noto Sans Thai", Arial, sans-serif;
      font-size: 12px;
    }
    .no-print {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 10px;
    }
    .no-print button {
      min-height: 34px;
      padding: 0 14px;
      color: #fff;
      background: #12b84f;
      border: 0;
      border-radius: 8px;
      font-weight: 900;
      cursor: pointer;
    }
    .sheet {
      width: 148mm;
      min-height: 210mm;
      margin: 0 auto;
      padding: 10mm;
      background: #fff;
      border: 1px solid #dbe4f0;
      box-shadow: 0 18px 42px rgba(15,23,42,.14);
    }
    .head {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 14px;
      padding-bottom: 12px;
      border-bottom: 2px solid #0f172a;
    }
    .brand h1 {
      margin: 0 0 3px;
      font-size: 18px;
      letter-spacing: 0;
    }
    .brand p {
      margin: 0;
      color: #64748b;
      line-height: 1.55;
    }
    .doc-title {
      min-width: 46mm;
      padding: 10px 12px;
      text-align: center;
      background: #ecfdf3;
      border: 1px solid #b7efc8;
      border-radius: 12px;
    }
    .doc-title strong {
      display: block;
      color: #078b32;
      font-size: 18px;
    }
    .doc-title span {
      color: #475569;
      font-weight: 900;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin: 12px 0;
    }
    .box {
      min-height: 44px;
      padding: 9px 11px;
      border: 1px solid #dbe4f0;
      border-radius: 10px;
      background: #fbfdff;
    }
    .box span {
      display: block;
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }
    .box strong {
      display: block;
      margin-top: 3px;
      color: #0f172a;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      padding: 9px 10px;
      border: 1px solid #dbe4f0;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 950;
    }
    td.amount {
      text-align: right;
      font-weight: 950;
      font-variant-numeric: tabular-nums;
    }
    .amount-text {
      margin-top: 10px;
      padding: 10px 12px;
      text-align: center;
      color: #166534;
      background: #ecfdf3;
      border: 1px dashed #86efac;
      border-radius: 10px;
      font-weight: 950;
    }
    .total {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }
    .total div {
      min-width: 58mm;
      padding: 11px 14px;
      background: #f8fafc;
      border: 1px solid #dbe4f0;
      border-radius: 12px;
    }
    .total span {
      color: #64748b;
      font-weight: 900;
    }
    .total strong {
      float: right;
      color: #0f9f42;
      font-size: 18px;
      font-variant-numeric: tabular-nums;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 18mm;
    }
    .sig {
      min-height: 28mm;
      padding: 10px;
      border: 1px solid #dbe4f0;
      border-radius: 10px;
    }
    .sig b { display: block; margin-bottom: 18mm; }
    .sig i {
      display: block;
      border-top: 1px dotted #94a3b8;
      font-style: normal;
      text-align: center;
      padding-top: 5px;
      color: #64748b;
    }
    .status {
      display: inline-block;
      margin-top: 5px;
      padding: 3px 8px;
      border-radius: 999px;
      background: ${isCanceled ? "#fff1f2" : "#ecfdf3"};
      color: ${isCanceled ? "#e11d48" : "#078b32"};
      font-weight: 950;
    }
    @media print {
      body { background: #fff; }
      .no-print { display: none; }
      .sheet {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        border: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">พิมพ์</button><button onclick="window.close()">ปิด</button></div>
  <main class="sheet">
    <header class="head">
      <section class="brand">
        <h1>GasFlow</h1>
        <p>ระบบบริหารร้านแก๊ส<br>เอกสารการเงินภายในกิจการ</p>
      </section>
      <section class="doc-title">
        <strong>ใบสำคัญจ่าย</strong>
        <span>ทั่วไป</span>
        <div class="status">${html(expense.status || (isCanceled ? "ยกเลิก" : "บันทึกแล้ว"))}</div>
      </section>
    </header>
    <section class="meta">
      <div class="box"><span>เลขที่เอกสาร</span><strong>${html(expense.expense_no || "-")}</strong></div>
      <div class="box"><span>วันที่จ่าย</span><strong>${html(thaiDateInputValue(expense.expense_at || expense.created_at || todayIso))}</strong></div>
      <div class="box"><span>จ่ายให้</span><strong>${html(expense.payee_name || "-")}</strong></div>
      <div class="box"><span>หมวดหมู่</span><strong>${html(expense.category || "-")}</strong></div>
      <div class="box"><span>วิธีจ่าย</span><strong>${html(method)}</strong></div>
      <div class="box"><span>บัญชีธนาคาร</span><strong>${html(bankLine)}</strong></div>
      <div class="box"><span>อ้างอิง</span><strong>${html(expense.reference_no || "-")}</strong></div>
      <div class="box"><span>หมายเหตุ</span><strong>${html(expense.note || "-")}</strong></div>
    </section>
    <table>
      <thead><tr><th style="width:14mm">ลำดับ</th><th>รายการจ่าย</th><th style="width:34mm">จำนวนเงิน</th></tr></thead>
      <tbody>
        <tr>
          <td style="text-align:center">1</td>
          <td>${html(expense.description || expense.category || "-")}</td>
          <td class="amount">${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
    <div class="amount-text">(${html(thaiBahtText(amount))})</div>
    <section class="total"><div><span>รวมจ่ายสุทธิ</span><strong>${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div></section>
    <section class="signatures">
      <div class="sig"><b>ผู้จ่ายเงิน</b><i>ลงชื่อ / วันที่</i></div>
      <div class="sig"><b>ผู้รับเงิน</b><i>ลงชื่อ / วันที่</i></div>
    </section>
  </main>
  <script>setTimeout(() => window.print(), 250);</script>
</body>
</html>`;
}

function printGeneralPaymentVoucher(expense = {}) {
  const printWindow = window.open("", "_blank", "width=760,height=820");
  if (!printWindow) {
    toast("Browser บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต popup แล้วลองใหม่");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(generalPaymentVoucherPrintHtml(expense));
  printWindow.document.close();
}

function DeliveryPage() {
  const deliveryRows = deliveryQueueRows();
  return h("div", null, [
    h(PageTitle, { title: "จัดส่ง", sub: "ดึงคิวจากบิลเงินสดและบิลเงินสด/ใบกำกับภาษี เพื่อจัดส่งและอัปเดตสถานะงาน" }),
    h("section", { className: "kanban" }, ["รอดำเนินการ", "กำลังจัดส่ง", "จัดส่งแล้ว"].map((status) =>
      h("div", { className: "panel lane" }, [
        h("div", { className: "panel-head" }, [h("h2", null, status), h("em", null, String(deliveryRows.filter((o) => o[6] === status).length))]),
        ...deliveryRows.filter((o) => o[6] === status).map((o) => h("article", { className: "delivery-card" }, [
          h("strong", null, [o[0], h("em", null, o[10])]),
          h("span", null, o[1]),
          h("small", null, `${o[3]} • ${o[5]}`),
          h("p", null, o[4]),
          h("div", { className: "row-actions" }, [
            h("button", { "data-toast": `โทรหา ${o[1]}` }, "☎"),
            h("button", o[8] && o[9] ? { "data-map-lat": o[8], "data-map-lng": o[9] } : { "data-toast": `ยังไม่มีพิกัด: ${o[4]}` }, "⌖"),
            h("button", { "data-toast": `มอบหมายงาน ${o[0]} ให้รถ 01` }, "รถ"),
          ]),
        ])),
      ])
    )),
  ]);
}

function customerListSearchText(customer = []) {
  return [customer[0], customer[1], customer[12], customer[2], customer[3], customer[4], customer[5], customer[6], customer[7], customer[8], customer[9], customer[10]]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
}

function normalizeCustomerPhone(phone = "") {
  return String(phone || "").replace(/\D/g, "");
}

function duplicateCustomerPhone(phone = "", currentId = "") {
  const normalized = normalizeCustomerPhone(phone);
  if (!normalized) return null;
  return customers.find((customer) =>
    String(customer[6]) !== String(currentId || "") &&
    normalizeCustomerPhone(customer[1]) === normalized
  );
}

function filteredCustomerRows() {
  const query = state.customerSearch.trim().toLowerCase();
  if (!query) return customers;
  return customers.filter((customer) => customerListSearchText(customer).includes(query));
}

function CustomersPage() {
  const allHistorySummaries = regularCustomerHistories();
  const historySummaries = allHistorySummaries.slice(0, 4);
  const customerRows = filteredCustomerRows();
  return h("div", null, [
    h(PageTitle, { title: "ลูกค้า", sub: "ดูประวัติซื้อ ยอดค้าง และถังที่อยู่กับลูกค้า" }),
    h("section", { className: "panel customer-history-panel" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [
          h("h2", null, "ประวัติลูกค้าประจำ"),
          h("span", null, allHistorySummaries.length ? `แสดง ${historySummaries.length} จาก ${allHistorySummaries.length} ราย` : "ยังไม่มีข้อมูลประวัติ"),
        ]),
        allHistorySummaries.length > historySummaries.length
          ? h("button", { type: "button", className: "ghost-btn", "data-customer-history-all": "true" }, "ดูทั้งหมด")
          : null,
      ]),
      h("div", { className: "customer-history-grid" }, historySummaries.length ? historySummaries.map((summary) =>
        h("button", { type: "button", className: `customer-history-card${summary.isPriority ? " priority" : ""}`, "data-customer-history": summary.id }, [
          h("div", { className: "customer-history-card-head" }, [
            h("strong", null, summary.name),
            h("div", { className: "customer-history-badges" }, [
              summary.isPriority ? h("span", { className: "priority-chip" }, "ปักหมุด") : null,
              h("span", { className: summary.outstanding > 0 ? "status amber" : "status green" }, summary.outstanding > 0 ? "ค้างรับ" : "ปกติ"),
            ]),
          ]),
          h("small", null, `${summary.phone || "-"} • ${summary.customerType || "ทั่วไป"}`),
          h("div", { className: "customer-history-metrics" }, [
            h("span", null, ["บิล ", h("b", null, summary.orderCount.toLocaleString("th-TH"))]),
            h("span", null, ["ยอดซื้อ ", h("b", null, money(summary.totalSales))]),
            h("span", null, ["ล่าสุด ", h("b", null, summary.lastActivity ? thaiDateInputValue(summary.lastActivity) : "-")]),
          ]),
          h("em", null, summary.favoriteProduct ? `ซื้อบ่อย: ${summary.favoriteProduct}` : "ยังไม่มีสินค้าซื้อซ้ำ"),
        ])
      ) : [
        h("div", { className: "empty-panel" }, [
          h("strong", null, "ยังไม่มีประวัติลูกค้าประจำ"),
          h("p", null, "เมื่อมีบิลขายหรือรับเงิน ระบบจะนำมาสรุปให้ในส่วนนี้"),
        ]),
      ]),
    ]),
    h("section", { className: "panel" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [
          h("h2", null, "รายชื่อลูกค้า"),
          h("span", null, state.customerSearch ? `พบ ${customerRows.length.toLocaleString("th-TH")} จาก ${customers.length.toLocaleString("th-TH")} รายการ` : `ทั้งหมด ${customers.length.toLocaleString("th-TH")} รายการ`),
        ]),
        h("button", { "data-modal": "customer" }, "เพิ่มลูกค้า"),
      ]),
      h("label", { className: "panel-search" }, [
        h("span", null, "⌕"),
        h("input", { "data-customer-list-search": "true", placeholder: "ค้นหาชื่อ เบอร์โทร LINE ที่อยู่ ประเภท หรือยอดค้าง...", value: state.customerSearch }),
      ]),
      h("div", { className: "table-scroll" }, h(CustomerTable, { items: customerRows })),
    ]),
  ]);
}

function CustomerTable({ items = customers } = {}) {
  return h("table", { className: "data-table customer-table" }, [
    h("thead", null, h("tr", null, ["ลูกค้า", "เบอร์โทร", "LINE", "ที่อยู่", "ประเภท", "ยอดค้าง", "ถังอยู่กับลูกค้า", "พิกัด", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((c) => h("tr", null, [
      h("td", null, c[0]),
      h("td", null, c[1]),
      h("td", null, c[12] || "-"),
      h("td", null, c[2]),
      h("td", null, c[3]),
      h("td", null, c[4]),
      h("td", null, c[5]),
      h("td", null, c[9] && c[10] ? h("button", { className: "map-link", "data-map-lat": c[9], "data-map-lng": c[10] }, "เปิดแผนที่") : "-"),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { className: "history-icon", "data-customer-history": c[6], title: "ดูประวัติลูกค้า" }, "ประวัติ"),
        h("button", { "data-customer-edit": c[6], title: "แก้ไขลูกค้า" }, "✎"),
        h("button", { className: "danger-icon", "data-customer-delete": c[6], title: "ลบลูกค้า" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 9 }, state.customerSearch ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีข้อมูลลูกค้า"))),
  ]);
}

function activeCustomerOrders(customerId) {
  return salesOrders
    .filter((order) => Number(order.customer_id || 0) === Number(customerId) && order.status !== "ยกเลิก")
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

function activeCustomerPayments(customerId) {
  return payments
    .filter((payment) => Number(payment.customer_id || 0) === Number(customerId) && isActivePayment(payment))
    .sort((a, b) => String(b.paid_at || b.created_at || "").localeCompare(String(a.paid_at || a.created_at || "")));
}

function booleanFlag(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function customerHistorySummary(customer = []) {
  const id = customer[6] || customer.id;
  const orders = activeCustomerOrders(id);
  const customerPayments = activeCustomerPayments(id);
  const totalSales = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const totalPaid = customerPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const productCount = new Map();
  orders.forEach((order) => (order.items || []).forEach((item) => {
    const key = item.product_name || "สินค้า";
    productCount.set(key, (productCount.get(key) || 0) + Number(item.quantity || 0));
  }));
  const favorite = [...productCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const lastOrder = orders[0]?.created_at || "";
  const lastPayment = customerPayments[0]?.paid_at || customerPayments[0]?.created_at || "";
  const lastActivity = [lastOrder, lastPayment].filter(Boolean).sort().pop() || "";
  return {
    id,
    name: customer[0] || customer.name || "-",
    phone: customer[1] === "-" ? "" : (customer[1] || customer.phone || ""),
    address: customer[2] === "-" ? "" : (customer[2] || customer.address || ""),
    customerType: customer[3] || customer.customer_type || "ทั่วไป",
    cylinders: customer[5] === "-" ? "" : (customer[5] || customer.cylinders_on_hand || ""),
    outstanding: Number(customer[7] ?? plainMoney(customer[4])),
    creditLimit: Number(customer[8] || customer.credit_limit || 0),
    latitude: customer[9] || customer.latitude || "",
    longitude: customer[10] || customer.longitude || "",
    isPriority: booleanFlag(customer[11] ?? customer.is_priority),
    orders,
    payments: customerPayments,
    orderCount: orders.length,
    paymentCount: customerPayments.length,
    totalSales,
    totalPaid,
    favoriteProduct: favorite ? `${favorite[0]} ${favorite[1].toLocaleString("th-TH")} หน่วย` : "",
    lastActivity,
  };
}

function regularCustomerHistories() {
  return customers
    .map(customerHistorySummary)
    .filter((summary) => summary.isPriority || summary.orderCount > 0 || summary.paymentCount > 0 || summary.outstanding > 0 || summary.cylinders)
    .sort((a, b) =>
      Number(b.isPriority) - Number(a.isPriority) ||
      b.orderCount - a.orderCount ||
      b.totalSales - a.totalSales ||
      String(b.lastActivity || "").localeCompare(String(a.lastActivity || ""))
    );
}

function openAllCustomerHistoryModal() {
  let summaries = regularCustomerHistories();
  const modal = document.createElement("div");
  const rowHtml = (items) => items.length ? items.map((summary, index) => `
    <tr class="${summary.isPriority ? "is-priority" : ""}">
      <td class="center">${html((index + 1).toLocaleString("th-TH"))}</td>
      <td>
        <div class="customer-history-name-line">
          <strong>${html(summary.name)}</strong>
          ${summary.isPriority ? '<span class="priority-chip">ปักหมุด</span>' : ""}
        </div>
        <small>${html(summary.phone || "-")} • ${html(summary.customerType || "ทั่วไป")}</small>
      </td>
      <td class="num">${html(summary.orderCount.toLocaleString("th-TH"))}</td>
      <td class="num">${html(money(summary.totalSales, { decimals: 2 }))}</td>
      <td class="num">${html(money(summary.outstanding, { decimals: 2 }))}</td>
      <td>${html(summary.favoriteProduct || "-")}</td>
      <td>${html(summary.lastActivity ? thaiDateInputValue(summary.lastActivity) : "-")}</td>
      <td>
        <div class="customer-history-actions">
          <button type="button" class="pin-btn${summary.isPriority ? " active" : ""}" data-customer-priority="${html(summary.id)}" data-customer-priority-next="${summary.isPriority ? "0" : "1"}">${summary.isPriority ? "เลิกปัก" : "ปักหมุด"}</button>
          <button type="button" class="ghost-btn" data-customer-history-detail="${html(summary.id)}">ดูประวัติ</button>
        </div>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="8" class="empty-cell">ไม่พบลูกค้าตามคำค้นหา</td></tr>`;
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal wide customer-history-list-modal">
      <button class="modal-close" type="button">×</button>
      <div class="detail-modal-head">
        <div>
          <h2>ลูกค้าประจำทั้งหมด</h2>
          <p>ค้นหาจากชื่อ เบอร์โทร ประเภทลูกค้า หรือสินค้าที่ซื้อบ่อย</p>
        </div>
        <span class="status green" data-customer-history-modal-count>${summaries.length.toLocaleString("th-TH")} ราย</span>
      </div>
      <label class="customer-history-list-search">
        <span>⌕</span>
        <input type="search" data-customer-history-modal-search placeholder="พิมพ์ค้นหาลูกค้าประจำ..." autocomplete="off">
      </label>
      <div class="table-scroll">
        <table class="data-table customer-history-list-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ลูกค้า</th>
              <th>บิล</th>
              <th>ยอดซื้อ</th>
              <th>ค้างรับ</th>
              <th>ซื้อบ่อย</th>
              <th>ล่าสุด</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody data-customer-history-modal-body>${rowHtml(summaries)}</tbody>
        </table>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const input = modal.querySelector("[data-customer-history-modal-search]");
  const body = modal.querySelector("[data-customer-history-modal-body]");
  const count = modal.querySelector("[data-customer-history-modal-count]");
  const close = () => modal.remove();
  const render = () => {
    const query = input.value.trim().toLowerCase();
    const filtered = summaries.filter((summary) => [
      summary.name,
      summary.phone,
      summary.customerType,
      summary.favoriteProduct,
      summary.address,
    ].join(" ").toLowerCase().includes(query));
    body.innerHTML = rowHtml(filtered);
    count.textContent = `${filtered.length.toLocaleString("th-TH")} ราย`;
  };
  input.addEventListener("input", render);
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.addEventListener("click", async (event) => {
    if (event.target === modal) {
      close();
      return;
    }
    const priorityButton = event.target.closest("[data-customer-priority]");
    if (priorityButton) {
      const customerId = priorityButton.dataset.customerPriority;
      const isPriority = priorityButton.dataset.customerPriorityNext === "1";
      priorityButton.disabled = true;
      try {
        await api(`/api/customers/${customerId}/priority`, {
          method: "PATCH",
          body: JSON.stringify({ is_priority: isPriority }),
        });
        await loadDashboard();
        summaries = regularCustomerHistories();
        render();
        toast(isPriority ? "ปักหมุดลูกค้าแล้ว" : "ยกเลิกปักหมุดแล้ว");
      } catch (error) {
        toast(error.message);
        render();
      }
      return;
    }
    const detailButton = event.target.closest("[data-customer-history-detail]");
    if (!detailButton) return;
    const customer = customers.find((item) => String(item[6]) === String(detailButton.dataset.customerHistoryDetail));
    if (!customer) return;
    close();
    openCustomerHistoryModal(customer);
  });
  setTimeout(() => input.focus(), 0);
}

function openCustomerHistoryModal(customer = []) {
  const summary = customerHistorySummary(customer);
  const orderRows = summary.orders.slice(0, 8).map((order) => `
    <tr>
      <td>${html(thaiDateInputValue(order.created_at || ""))}</td>
      <td>${html(order.order_no || "-")}</td>
      <td>${html(saleItemsText(order.items))}</td>
      <td class="num">${html(money(order.total_amount, { decimals: 2 }))}</td>
      <td>${html(order.payment_status || "-")}</td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="empty-cell">ยังไม่มีประวัติบิลขาย</td></tr>`;
  const paymentRows = summary.payments.slice(0, 8).map((payment) => `
    <tr>
      <td>${html(thaiDateInputValue(payment.paid_at || payment.created_at || ""))}</td>
      <td>${html(payment.payment_no || payment.reference_no || "-")}</td>
      <td>${html(payment.method === "transfer" ? "เงินโอน" : payment.method || "เงินสด")}</td>
      <td class="num">${html(money(payment.amount, { decimals: 2 }))}</td>
      <td>${html(payment.order_no || payment.note || "-")}</td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="empty-cell">ยังไม่มีประวัติรับเงิน</td></tr>`;
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal wide customer-history-modal">
      <button class="modal-close" type="button">×</button>
      <div class="detail-modal-head">
        <div>
          <h2>ประวัติลูกค้าประจำ</h2>
          <p>${html(summary.name)} • ${html(summary.phone || "ไม่ระบุเบอร์")} • ${html(summary.customerType)}</p>
        </div>
        <span class="${summary.outstanding > 0 ? "status amber" : "status green"}">${summary.outstanding > 0 ? "ค้างรับ" : "ปกติ"}</span>
      </div>
      <div class="customer-history-profile">
        <div><span>ที่อยู่</span><strong>${html(summary.address || "-")}</strong></div>
        <div><span>ถังอยู่กับลูกค้า</span><strong>${html(summary.cylinders || "-")}</strong></div>
        <div><span>วงเงินเครดิต</span><strong>${html(money(summary.creditLimit))}</strong></div>
        <div><span>พิกัด</span><strong>${summary.latitude && summary.longitude ? `<button class="map-link" data-map-lat="${html(summary.latitude)}" data-map-lng="${html(summary.longitude)}">เปิดแผนที่</button>` : "-"}</strong></div>
      </div>
      <div class="customer-history-kpis">
        <span>จำนวนบิล <strong>${html(summary.orderCount.toLocaleString("th-TH"))}</strong></span>
        <span>ยอดซื้อรวม <strong>${html(money(summary.totalSales, { decimals: 2 }))}</strong></span>
        <span>รับเงินแล้ว <strong>${html(money(summary.totalPaid, { decimals: 2 }))}</strong></span>
        <span>ยอดค้าง <strong>${html(money(summary.outstanding, { decimals: 2 }))}</strong></span>
        <span>ซื้อล่าสุด <strong>${html(summary.lastActivity ? thaiDateInputValue(summary.lastActivity) : "-")}</strong></span>
        <span>ซื้อบ่อย <strong>${html(summary.favoriteProduct || "-")}</strong></span>
      </div>
      <div class="customer-history-columns">
        <section>
          <h3>บิลขายล่าสุด</h3>
          <div class="table-scroll">
            <table class="data-table customer-history-mini-table">
              <thead><tr><th>วันที่</th><th>เลขที่</th><th>รายการ</th><th>ยอดเงิน</th><th>สถานะ</th></tr></thead>
              <tbody>${orderRows}</tbody>
            </table>
          </div>
        </section>
        <section>
          <h3>รับเงินล่าสุด</h3>
          <div class="table-scroll">
            <table class="data-table customer-history-mini-table">
              <thead><tr><th>วันที่</th><th>เลขที่</th><th>วิธีรับ</th><th>ยอดรับ</th><th>อ้างอิง</th></tr></thead>
              <tbody>${paymentRows}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
}

function SuppliersPage() {
  const query = state.supplierSearch.trim().toLowerCase();
  const filtered = suppliers.filter((supplier) =>
    [supplier.name, supplier.contact_name, supplier.phone, supplier.address, supplier.tax_id, supplier.payment_terms, supplier.note]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  return h("div", null, [
    h(PageTitle, { title: "ตัวแทนจำหน่าย", sub: "จัดการรายชื่อซัพพลายเออร์ ผู้ติดต่อ เงื่อนไขเครดิต และข้อมูลออกใบกำกับ" }),
    h("section", { className: "panel" }, [
      h("div", { className: "panel-head" }, [h("h2", null, "รายชื่อตัวแทนจำหน่าย"), h("button", { "data-modal": "supplier" }, "เพิ่มตัวแทน")]),
      h("label", { className: "panel-search" }, [
        h("span", null, "⌕"),
        h("input", { "data-supplier-search": "true", placeholder: "ค้นหาชื่อตัวแทน, ผู้ติดต่อ, เบอร์โทร, เลขผู้เสียภาษี...", value: state.supplierSearch }),
      ]),
      h(SupplierTable, { items: filtered }),
    ]),
  ]);
}

function SupplierTable({ items = suppliers } = {}) {
  return h("table", { className: "data-table supplier-table" }, [
    h("thead", null, h("tr", null, ["ตัวแทนจำหน่าย", "ผู้ติดต่อ", "เบอร์โทร", "ที่อยู่", "เลขผู้เสียภาษี", "เงื่อนไขชำระ", "หมายเหตุ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((s) => h("tr", null, [
      h("td", null, s.name || "-"),
      h("td", null, s.contact_name || "-"),
      h("td", null, s.phone || "-"),
      h("td", null, s.address || "-"),
      h("td", null, s.tax_id || "-"),
      h("td", null, s.payment_terms || "-"),
      h("td", null, s.note || "-"),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { "data-supplier-edit": s.id, title: "แก้ไขตัวแทน" }, "✎"),
        h("button", { className: "danger-icon", "data-supplier-delete": s.id, title: "ลบตัวแทน" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 8 }, state.supplierSearch ? "ไม่พบตัวแทนจำหน่ายที่ค้นหา" : "ยังไม่มีตัวแทนจำหน่าย"))),
  ]);
}

function receiptItemsText(items = []) {
  return items.map((item) => `${item.product_name || "สินค้า"} เต็มเข้า ${item.quantity_full || 0} / เปล่าแลก ${item.quantity_empty || 0}`).join(", ") || "-";
}

function receiptQuantityText(items = []) {
  const full = items.reduce((sum, item) => sum + Number(item.quantity_full || 0), 0);
  const empty = items.reduce((sum, item) => sum + Number(item.quantity_empty || 0), 0);
  return `เต็มเข้า ${full} / เปล่าแลก ${empty}`;
}

function customerNameById(id) {
  const customer = customers.find((item) => Number(item[6]) === Number(id) || Number(item.id) === Number(id));
  return customer?.[0] || customer?.name || "-";
}

function isReceiptPayable(receipt) {
  return receipt.payment_method === "credit" && receipt.payment_status !== "ชำระแล้ว";
}

function payableReceiptOptions(selectedId = "") {
  return goodsReceipts
    .filter((receipt) => isReceiptPayable(receipt) || String(receipt.id) === String(selectedId))
    .map((receipt) => `<option value="${html(receipt.id)}" data-supplier="${html(receipt.supplier_name || "-")}" data-total="${html(receipt.total_amount)}" ${String(receipt.id) === String(selectedId) ? "selected" : ""}>${html(receipt.invoice_no || receipt.receipt_no)} - ${html(receipt.supplier_name || "-")} - ${money(receipt.total_amount)}</option>`)
    .join("");
}

function receivableDocumentLabel(order = {}) {
  return `${order.order_no || "-"} - ${order.customer_name || "-"} - ${money(receivableOutstanding(order), { decimals: 2 })}`;
}

function customerReceiptDocumentSearchField(selectedOrderId = "") {
  const selected = customerReceivableOrders(selectedOrderId).find((order) => String(order.id) === String(selectedOrderId)) || customerReceivableOrders()[0] || {};
  const detail = selected.id
    ? `${selected.customer_name || "-"} • ค้างรับ ${money(receivableOutstanding(selected), { decimals: 2 })}`
    : "เลือกใบส่งสินค้าหรือใบส่งของ/ใบกำกับภาษีที่ค้างรับ";
  return `
    <div class="customer-search span-2 receivable-doc-search">
      <label>เอกสารที่รับเงิน
        <input type="hidden" name="order_id" value="${html(selected.id || "")}">
        <input name="receivable_search" data-receivable-search placeholder="ค้นหาเลขเอกสาร, ลูกค้า, สินค้า..." value="${html(selected.id ? receivableDocumentLabel(selected) : "")}">
      </label>
      <small data-selected-receivable>${html(detail)}</small>
      <div class="customer-results receivable-results">
        ${receivableResultItems(customerReceivableOrders(selectedOrderId))}
      </div>
    </div>
  `;
}

function receivableResultItems(items = []) {
  return items.length ? items.map((order) => `
    <button type="button" data-pick-receivable="${html(order.id)}">
      <strong>${html(order.order_no || "-")}</strong>
      <span>${html(order.customer_name || "-")} • ${html(saleItemsText(order.items))}</span>
      <b>${html(money(receivableOutstanding(order), { decimals: 2 }))}</b>
    </button>
  `).join("") : `<div class="empty-search">ยังไม่มีเอกสารค้างรับ</div>`;
}

function nextSupplierPaymentReference() {
  const now = new Date();
  const datePart = `${String(now.getFullYear() + 543).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const used = new Set(supplierPaymentVouchers.map((voucher) => String(voucher.reference_no || "").trim()).filter(Boolean));
  let sequence = supplierPaymentVouchers.length + 1;
  let referenceNo = "";
  do {
    referenceNo = `PV-REF-${datePart}-${String(sequence).padStart(4, "0")}`;
    sequence += 1;
  } while (used.has(referenceNo));
  return referenceNo;
}

function nextSalesDocumentNo(prefixCode = "CSH", dateValue = todayIso) {
  const iso = thaiDateToIso(dateValue || todayIso);
  const year = Number(String(iso).slice(0, 4)) || new Date().getFullYear();
  const month = String(iso).slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0");
  const safePrefix = String(prefixCode || "CSH").replace(/[^A-Z0-9]/gi, "").toUpperCase() || "CSH";
  const prefix = `${safePrefix}${String(year + 543).slice(-2)}${month}`;
  const maxRun = salesOrders.reduce((highest, order) => {
    const match = String(order.order_no || "").match(new RegExp(`^${prefix}(\\d{4})$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(maxRun + 1).padStart(4, "0")}`;
}

function nextFinanceDocumentNo(prefixCode = "RCV", records = [], field = "payment_no", dateValue = todayIso) {
  const iso = thaiDateToIso(dateValue || todayIso);
  const year = Number(String(iso).slice(0, 4)) || new Date().getFullYear();
  const month = String(iso).slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0");
  const prefix = `${prefixCode}${String(year + 543).slice(-2)}${month}`;
  const maxRun = records.reduce((highest, record) => {
    const match = String(record[field] || "").match(new RegExp(`^${prefix}(\\d{4})$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(maxRun + 1).padStart(4, "0")}`;
}

function nextGeneralReceiptNo(dateValue = todayIso) {
  return nextFinanceDocumentNo("RCV", generalReceiptVouchers, "payment_no", dateValue);
}

function nextGeneralPaymentNo(dateValue = todayIso) {
  return nextFinanceDocumentNo("GPV", expenses.filter(isGeneralPayment), "expense_no", dateValue);
}

function nextCashBillNo(dateValue = todayIso) {
  return nextSalesDocumentNo("CSH", dateValue);
}

function nextDeliveryNoteNo(dateValue = todayIso) {
  return nextSalesDocumentNo("SND", dateValue);
}

function nextCashTaxInvoiceNo(dateValue = todayIso) {
  return nextSalesDocumentNo("VCS", dateValue);
}

function nextDeliveryTaxInvoiceNo(dateValue = todayIso) {
  return nextSalesDocumentNo("VDN", dateValue);
}

function GoodsReceiptsPage() {
  const query = state.receiptSearch.trim().toLowerCase();
  const filtered = goodsReceipts.filter((receipt) =>
    [receipt.receipt_no, receipt.supplier_name, receipt.invoice_no, receipt.payment_status, receipt.payment_method, receipt.note, receiptItemsText(receipt.items)]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  return h("div", null, [
    h(PageTitle, { title: "ใบรับสินค้า", sub: "บันทึกรับสินค้าเข้าสต็อกจากตัวแทนจำหน่าย พร้อมอัปเดต Stock card" }),
    h("section", { className: "panel" }, [
      h("div", { className: "panel-head" }, [h("h2", null, "รายการใบรับสินค้า"), h("button", { "data-modal": "goodsReceipt" }, "เพิ่มใบรับ")]),
      h("label", { className: "panel-search" }, [
        h("span", null, "⌕"),
        h("input", { "data-receipt-search": "true", placeholder: "ค้นหาเลขที่ใบรับ, ตัวแทน, เลขอ้างอิง, สินค้า...", value: state.receiptSearch }),
      ]),
      h(GoodsReceiptTable, { items: filtered }),
    ]),
  ]);
}

function GoodsReceiptTable({ items = goodsReceipts } = {}) {
  return h("table", { className: "data-table receipt-table" }, [
    h("thead", null, h("tr", null, ["วันที่รับ", "ตัวแทนจำหน่าย", "อ้างอิง", "รายการ", "จำนวน", "VAT", "รวมสุทธิ", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((r) => h("tr", null, [
      h("td", null, thaiDateInputValue(r.received_at || r.created_at || "")),
      h("td", null, r.supplier_name || "-"),
      h("td", null, r.invoice_no || "-"),
      h("td", null, receiptItemsText(r.items)),
      h("td", null, receiptQuantityText(r.items)),
      h("td", null, Number(r.vat_amount || 0) ? `${money(r.vat_amount)} (${r.vat_type === "inclusive" ? "ใน" : "นอก"} ${Number(r.vat_rate || 0)}%)` : "-"),
      h("td", null, money(r.total_amount)),
      h("td", null, h("span", { className: r.payment_status === "ชำระแล้ว" ? "status green" : "status amber" }, r.payment_method === "credit" && r.credit_days ? `เครดิต ${r.credit_days} วัน` : r.payment_status || "-")),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { "data-receipt-edit": r.id, title: "แก้ไขใบรับสินค้า" }, "✎"),
        h("button", { className: "danger-icon", "data-receipt-delete": r.id, title: "ยกเลิกใบรับ" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 9 }, state.receiptSearch ? "ไม่พบใบรับสินค้าที่ค้นหา" : "ยังไม่มีใบรับสินค้า"))),
  ]);
}

function BankAccountsPage() {
  const query = state.bankSearch.trim().toLowerCase();
  const filtered = bankAccounts.filter((account) =>
    [account.bank_name, account.account_name, account.account_number, account.branch_name, account.account_type, account.note]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  return h("div", null, [
    h(PageTitle, { title: "ธนาคาร/สมุดบัญชี", sub: "จัดการบัญชีธนาคารของร้าน เลขบัญชี ยอดตั้งต้น และยอดคงเหลือ" }),
    h("section", { className: "panel" }, [
      h("div", { className: "panel-head" }, [h("h2", null, "สมุดบัญชีธนาคาร"), h("button", { "data-modal": "bankAccount" }, "เพิ่มบัญชี")]),
      h("label", { className: "panel-search" }, [
        h("span", null, "⌕"),
        h("input", { "data-bank-search": "true", placeholder: "ค้นหาธนาคาร, ชื่อบัญชี, เลขบัญชี, สาขา...", value: state.bankSearch }),
      ]),
      h(BankAccountTable, { items: filtered }),
    ]),
  ]);
}

function BankAccountsPanel() {
  const query = state.bankSearch.trim().toLowerCase();
  const filtered = bankAccounts.filter((account) =>
    [account.bank_name, account.account_name, account.account_number, account.branch_name, account.account_type, account.note]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  const totalBalance = filtered.reduce((sum, account) => sum + Number(account.current_balance || 0), 0);
  return h("section", { className: "panel finance-bank-panel" }, [
    h("div", { className: "panel-head finance-bank-head" }, [
      h("div", null, [
        h("h2", null, "สมุดบัญชีธนาคาร"),
        h("span", null, `${filtered.length} บัญชี · ยอดรวม ${money(totalBalance)}`),
      ]),
      h("button", { "data-modal": "bankAccount" }, "เพิ่มบัญชี"),
    ]),
    h("label", { className: "panel-search" }, [
      h("span", null, "⌕"),
      h("input", { "data-bank-search": "true", placeholder: "ค้นหาธนาคาร, ชื่อบัญชี, เลขบัญชี, สาขา...", value: state.bankSearch }),
    ]),
    h("div", { className: "table-scroll" }, h(BankAccountTable, { items: filtered })),
  ]);
}

function BankAccountTable({ items = bankAccounts } = {}) {
  return h("table", { className: "data-table bank-table" }, [
    h("thead", null, h("tr", null, ["ธนาคาร", "ชื่อบัญชี", "เลขบัญชี", "สาขา", "ประเภท", "ยอดตั้งต้น", "ยอดคงเหลือ", "หมายเหตุ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((a) => h("tr", null, [
      h("td", null, a.bank_name || "-"),
      h("td", null, a.account_name || "-"),
      h("td", null, a.account_number || "-"),
      h("td", null, a.branch_name || "-"),
      h("td", null, a.account_type || "-"),
      h("td", null, money(a.opening_balance)),
      h("td", null, money(a.current_balance)),
      h("td", null, a.note || "-"),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { "data-bank-edit": a.id, title: "แก้ไขบัญชี" }, "✎"),
        h("button", { className: "danger-icon", "data-bank-delete": a.id, title: "ลบบัญชี" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 9 }, state.bankSearch ? "ไม่พบบัญชีธนาคารที่ค้นหา" : "ยังไม่มีบัญชีธนาคาร"))),
  ]);
}

function bankAccountById(id) {
  return bankAccounts.find((account) => String(account.id) === String(id));
}

function isCanceledRecord(record = {}) {
  const status = String(record.status || "").toLowerCase();
  return record.is_active === false || record.is_active === 0 || status === "ยกเลิก" || status.includes("ยกเลิก") || status.includes("cancel");
}

function bankTransferBank(record = {}) {
  const account = bankAccountById(record.bank_account_id);
  return {
    id: account?.id || record.bank_account_id || "",
    bank_name: account?.bank_name || record.bank_name || "ไม่ระบุธนาคาร",
    account_name: account?.account_name || record.bank_account_name || "",
    account_number: account?.account_number || record.bank_account_number || "",
    current_balance: Number(account?.current_balance || 0),
  };
}

function bankTransferKey(bank = {}) {
  return String(bank.id || `${bank.bank_name}-${bank.account_name}-${bank.account_number}` || "unknown");
}

function bankTransferLabel(bank = {}) {
  return [bank.bank_name, bank.account_name, bank.account_number].filter(Boolean).join(" / ") || "ไม่ระบุบัญชี";
}

function bankForReport(record = {}) {
  return bankTransferBank({
    bank_account_id: record.bank_account_id || record.id,
    bank_name: record.bank_name,
    bank_account_name: record.bank_account_name || record.account_name,
    bank_account_number: record.bank_account_number || record.account_number,
  });
}

function isGeneralReceipt(payment = {}) {
  return payment.source_type === "general_receipt" || /^RCV/.test(String(payment.payment_no || ""));
}

function isGeneralPayment(expense = {}) {
  return expense.source_type === "general_payment" || /^GPV/.test(String(expense.expense_no || ""));
}

function isInMonth(value = "", month = todayIso.slice(0, 7)) {
  return reportIsoDate(value).slice(0, 7) === month;
}

function currentMonthLabel(month = todayIso.slice(0, 7)) {
  const year = Number(month.slice(0, 4)) || new Date().getFullYear();
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return `${thaiMonthNames()[monthIndex] || ""} ${year + 543}`.trim();
}

function buildMonthlyFinanceSummary(month = todayIso.slice(0, 7)) {
  const supplierVoucherReceiptIds = new Set(supplierPaymentVouchers.map((voucher) => String(voucher.goods_receipt_id || "")).filter(Boolean));
  const activePayments = payments.filter((payment) =>
    isActivePayment(payment) &&
    !isCanceledRecord(payment) &&
    !isCanceledRecord({ status: payment.order_status }) &&
    isInMonth(payment.paid_at || payment.created_at, month)
  );
  const generalReceiptIds = new Set(generalReceiptVouchers.map((voucher) => String(voucher.id)));
  const customerReceiptIds = new Set(customerReceiptVouchers.map((voucher) => String(voucher.id)));
  const incomeGeneral = activePayments
    .filter((payment) => generalReceiptIds.has(String(payment.id)) || isGeneralReceipt(payment))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const incomeCredit = activePayments
    .filter((payment) => customerReceiptIds.has(String(payment.id)) || /^RV/.test(String(payment.payment_no || "")) || /^(SND|VDN)/.test(String(payment.order_no || "")))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const incomeSales = activePayments
    .filter((payment) =>
      !generalReceiptIds.has(String(payment.id)) &&
      !customerReceiptIds.has(String(payment.id)) &&
      !isGeneralReceipt(payment) &&
      !/^RV/.test(String(payment.payment_no || "")) &&
      !/^(SND|VDN)/.test(String(payment.order_no || ""))
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paidSupplierReceipts = goodsReceipts
    .filter((receipt) =>
      !isCanceledRecord(receipt) &&
      !supplierVoucherReceiptIds.has(String(receipt.id)) &&
      receipt.payment_method !== "credit" &&
      isInMonth(receipt.received_at || receipt.created_at, month)
    )
    .reduce((sum, receipt) => sum + Number(receipt.total_amount || 0), 0);
  const supplierVoucherTotal = supplierPaymentVouchers
    .filter((voucher) => !isCanceledRecord(voucher) && isInMonth(voucher.paid_at || voucher.created_at, month))
    .reduce((sum, voucher) => sum + Number(voucher.amount || 0), 0);
  const generalExpenseTotal = expenses
    .filter((expense) => !isCanceledRecord(expense) && isInMonth(expense.expense_at || expense.created_at, month))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const incomeTotal = incomeSales + incomeCredit + incomeGeneral;
  const expenseGoods = paidSupplierReceipts + supplierVoucherTotal;
  const expenseTotal = expenseGoods + generalExpenseTotal;
  const expenseCount =
    supplierPaymentVouchers.filter((voucher) => !isCanceledRecord(voucher) && isInMonth(voucher.paid_at || voucher.created_at, month)).length +
    goodsReceipts.filter((receipt) => !isCanceledRecord(receipt) && !supplierVoucherReceiptIds.has(String(receipt.id)) && receipt.payment_method !== "credit" && isInMonth(receipt.received_at || receipt.created_at, month)).length +
    expenses.filter((expense) => !isCanceledRecord(expense) && isInMonth(expense.expense_at || expense.created_at, month)).length;
  return {
    month,
    label: currentMonthLabel(month),
    incomeSales,
    incomeCredit,
    incomeGeneral,
    incomeTotal,
    expenseGoods,
    expenseGeneral: generalExpenseTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    incomeCount: activePayments.filter((payment) => Number(payment.amount || 0) > 0).length,
    expenseCount,
  };
}

function financeMethodLabel(method = "") {
  return isTransferMethod(method) ? "เงินโอน" : "เงินสด";
}

function makeBankTransferRow(input) {
  const bank = bankTransferBank(input);
  const amountIn = Number(input.amountIn || 0);
  const amountOut = Number(input.amountOut || 0);
  return {
    id: input.id,
    date: input.date || "",
    source: input.source || "-",
    document_no: input.document_no || "-",
    reference_no: input.reference_no || "-",
    party: input.party || "-",
    detail: input.detail || "-",
    bank,
    bankKey: bankTransferKey(bank),
    amountIn,
    amountOut,
    net: amountIn - amountOut,
  };
}

function buildBankTransferReport() {
  const rows = [];
  const voucherReceiptIds = new Set(supplierPaymentVouchers.map((voucher) => String(voucher.goods_receipt_id || "")).filter(Boolean));
  const customerReceiptPaymentIds = new Set(customerReceiptVouchers.map((voucher) => String(voucher.id || "")).filter(Boolean));

  customerReceiptVouchers.forEach((voucher) => {
    if (!isActivePayment(voucher) || isCanceledRecord(voucher) || !isTransferMethod(voucher.method)) return;
    rows.push(makeBankTransferRow({
      id: `rv-${voucher.id}`,
      source: "รับโอน",
      date: voucher.paid_at || voucher.created_at,
      document_no: voucher.payment_no || voucher.reference_no,
      reference_no: voucher.order_no || voucher.reference_no,
      party: voucher.customer_name,
      detail: "ใบสำคัญรับเงิน",
      bank_account_id: voucher.bank_account_id,
      bank_name: voucher.bank_name,
      bank_account_name: voucher.bank_account_name,
      bank_account_number: voucher.bank_account_number,
      amountIn: voucher.amount,
    }));
  });

  payments.forEach((payment) => {
    if (!isActivePayment(payment) || isCanceledRecord(payment) || isCanceledRecord({ status: payment.order_status }) || !isTransferMethod(payment.method) || customerReceiptPaymentIds.has(String(payment.id)) || isGeneralReceipt(payment)) return;
    rows.push(makeBankTransferRow({
      id: `pay-${payment.id}`,
      source: "รับโอน",
      date: payment.paid_at || payment.created_at,
      document_no: payment.payment_no || payment.reference_no,
      reference_no: payment.order_no || payment.reference_no,
      party: payment.customer_name,
      detail: "รับชำระ",
      bank_account_id: payment.bank_account_id,
      bank_name: payment.bank_name,
      bank_account_name: payment.bank_account_name,
      bank_account_number: payment.bank_account_number,
      amountIn: payment.amount,
    }));
  });

  supplierPaymentVouchers.forEach((voucher) => {
    if (isCanceledRecord(voucher) || !isTransferMethod(voucher.payment_method)) return;
    rows.push(makeBankTransferRow({
      id: `pv-${voucher.id}`,
      source: "จ่ายโอน",
      date: voucher.paid_at || voucher.created_at,
      document_no: voucher.voucher_no,
      reference_no: voucher.reference_no || voucher.invoice_no || voucher.receipt_no,
      party: voucher.supplier_name,
      detail: "ใบสำคัญจ่าย",
      bank_account_id: voucher.bank_account_id,
      amountOut: voucher.amount,
    }));
  });

  generalReceiptVouchers.forEach((voucher) => {
    if (isCanceledRecord(voucher) || !isTransferMethod(voucher.method)) return;
    rows.push(makeBankTransferRow({
      id: `grv-${voucher.id}`,
      source: "รับโอน",
      date: voucher.paid_at || voucher.created_at,
      document_no: voucher.payment_no,
      reference_no: voucher.reference_no || voucher.payment_no,
      party: voucher.party_name || voucher.customer_name,
      detail: voucher.description || "ใบรับเงินทั่วไป",
      bank_account_id: voucher.bank_account_id,
      bank_name: voucher.bank_name,
      bank_account_name: voucher.bank_account_name,
      bank_account_number: voucher.bank_account_number,
      amountIn: voucher.amount,
    }));
  });

  expenses.forEach((expense) => {
    if (!isGeneralPayment(expense) || isCanceledRecord(expense) || !isTransferMethod(expense.payment_method || expense.paid_by)) return;
    rows.push(makeBankTransferRow({
      id: `gpay-${expense.id}`,
      source: "จ่ายโอน",
      date: expense.expense_at || expense.created_at,
      document_no: expense.expense_no,
      reference_no: expense.reference_no || expense.expense_no,
      party: expense.payee_name || expense.description,
      detail: "ใบสำคัญจ่ายทั่วไป",
      bank_account_id: expense.bank_account_id,
      bank_name: expense.bank_name,
      bank_account_name: expense.bank_account_name,
      bank_account_number: expense.bank_account_number,
      amountOut: expense.amount,
    }));
  });

  goodsReceipts.forEach((receipt) => {
    if (isCanceledRecord(receipt) || !isTransferMethod(receipt.payment_method) || voucherReceiptIds.has(String(receipt.id))) return;
    rows.push(makeBankTransferRow({
      id: `gr-${receipt.id}`,
      source: "จ่ายโอน",
      date: receipt.received_at || receipt.created_at,
      document_no: receipt.receipt_no,
      reference_no: receipt.invoice_no || receipt.receipt_no,
      party: receipt.supplier_name,
      detail: "ใบรับสินค้า",
      bank_account_id: receipt.bank_account_id,
      amountOut: receipt.total_amount,
    }));
  });

  rows.sort((a, b) =>
    String(a.date || "").localeCompare(String(b.date || "")) ||
    bankTransferLabel(a.bank).localeCompare(bankTransferLabel(b.bank), "th") ||
    String(a.document_no || "").localeCompare(String(b.document_no || ""), "th")
  );

  const accountMap = new Map();
  rows.forEach((row) => {
    if (!accountMap.has(row.bankKey)) {
      accountMap.set(row.bankKey, {
        key: row.bankKey,
        bank: row.bank,
        count: 0,
        amountIn: 0,
        amountOut: 0,
        net: 0,
      });
    }
    const summary = accountMap.get(row.bankKey);
    summary.count += 1;
    summary.amountIn += row.amountIn;
    summary.amountOut += row.amountOut;
    summary.net += row.net;
  });

  const accounts = Array.from(accountMap.values()).sort((a, b) => bankTransferLabel(a.bank).localeCompare(bankTransferLabel(b.bank), "th"));
  const totalIn = rows.reduce((sum, row) => sum + row.amountIn, 0);
  const totalOut = rows.reduce((sum, row) => sum + row.amountOut, 0);
  return {
    rows,
    accounts,
    totals: {
      count: rows.length,
      accountCount: accounts.length,
      amountIn: totalIn,
      amountOut: totalOut,
      net: totalIn - totalOut,
    },
  };
}

function BankTransferReportPanel({ report = buildBankTransferReport() } = {}) {
  const amountClass = (value) => value > 0 ? "amount-positive" : value < 0 ? "amount-negative" : "";
  return h("section", { className: "panel bank-transfer-report-panel" }, [
    h("div", { className: "panel-head finance-bank-head" }, [
      h("div", null, [
        h("h2", null, "รายงานเงินโอนแยกตามบัญชีธนาคาร"),
        h("span", null, `${report.totals.count} รายการ · ${report.totals.accountCount} บัญชี`),
      ]),
    ]),
    h("div", { className: "bank-transfer-summary" }, [
      h("span", null, ["บัญชีที่มีรายการ ", h("strong", null, String(report.totals.accountCount))]),
      h("span", null, ["รับโอน ", h("strong", null, money(report.totals.amountIn, { decimals: 2 }))]),
      h("span", null, ["จ่ายโอน ", h("strong", null, money(report.totals.amountOut, { decimals: 2 }))]),
      h("span", { className: amountClass(report.totals.net) }, ["สุทธิ ", h("strong", null, money(report.totals.net, { decimals: 2 }))]),
    ]),
    h("div", { className: "bank-transfer-account-grid" }, report.accounts.length ? report.accounts.map((account) =>
      h("article", { className: "bank-transfer-account-card" }, [
        h("div", null, [
          h("strong", null, account.bank.bank_name || "ไม่ระบุธนาคาร"),
          h("span", null, account.bank.account_name || account.bank.account_number || "-"),
          h("small", null, account.bank.account_number || "-"),
        ]),
        h("dl", null, [
          h("div", null, [h("dt", null, "รับ"), h("dd", null, money(account.amountIn, { decimals: 2 }))]),
          h("div", null, [h("dt", null, "จ่าย"), h("dd", null, money(account.amountOut, { decimals: 2 }))]),
          h("div", { className: amountClass(account.net) }, [h("dt", null, "สุทธิ"), h("dd", null, money(account.net, { decimals: 2 }))]),
        ]),
      ])
    ) : h("p", { className: "empty-search" }, "ยังไม่มีรายการเงินโอน")),
    h("div", { className: "report-table-scroll bank-transfer-table-scroll" }, h("table", { className: "data-table bank-transfer-table" }, [
      h("thead", null, h("tr", null, ["วันที่", "บัญชีธนาคาร", "ประเภท", "เลขที่เอกสาร", "อ้างอิง", "ลูกค้า/ตัวแทน", "รับโอน", "จ่ายโอน", "สุทธิ"].map((head) => h("th", null, head)))),
      h("tbody", null, report.rows.length ? report.rows.map((row) => h("tr", null, [
        h("td", null, thaiDateInputValue(row.date)),
        h("td", { className: "bank-transfer-bank-cell" }, [
          h("strong", null, row.bank.bank_name || "-"),
          h("small", null, [row.bank.account_name, row.bank.account_number].filter(Boolean).join(" / ") || "-"),
        ]),
        h("td", null, h("span", { className: row.amountIn > 0 ? "status green" : "status amber" }, row.source)),
        h("td", null, row.document_no || "-"),
        h("td", null, row.reference_no || "-"),
        h("td", null, row.party || "-"),
        h("td", null, row.amountIn ? money(row.amountIn, { decimals: 2 }) : "-"),
        h("td", null, row.amountOut ? money(row.amountOut, { decimals: 2 }) : "-"),
        h("td", { className: amountClass(row.net) }, money(row.net, { decimals: 2 })),
      ])) : h("tr", null, h("td", { colSpan: 9 }, "ยังไม่มีรายการเงินโอน"))),
      h("tfoot", null, h("tr", null, [
        h("td", { colSpan: 6 }, "รวมทั้งหมด"),
        h("td", null, money(report.totals.amountIn, { decimals: 2 })),
        h("td", null, money(report.totals.amountOut, { decimals: 2 })),
        h("td", { className: amountClass(report.totals.net) }, money(report.totals.net, { decimals: 2 })),
      ])),
    ])),
  ]);
}

function StockPage() {
  return h("div", null, [
    h(PageTitle, { title: "สินค้าและถัง", sub: "ตรวจสต็อกถังเต็ม ถังเปล่า และสินค้าอุปกรณ์" }),
    h("section", { className: "stock-layout" }, [
      h(StockPanel),
      h("section", { className: "panel" }, [
        h("div", { className: "panel-head" }, [
          h("h2", null, "Stock card ล่าสุด"),
          h("button", { "data-modal": "stock" }, "ปรับสต็อก"),
        ]),
        h(SimpleTable, { heads: ["เวลา", "รายการ", "เข้า", "ออก", "คงเหลือ", "ผู้ทำรายการ"], rows: [
          ["09:40", "ขายแก๊ส 15 กก.", "-", "2", "90", "พนักงาน"],
          ["09:05", "รับถังเปล่ากลับ", "2", "-", "50", "คนขับรถ 01"],
          ["08:30", "รับแก๊ส 48 กก. เข้า", "10", "-", "35", "เจ้าของร้าน"],
        ] }),
      ]),
    ]),
    h("section", { className: "panel product-list-panel" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [h("h2", null, "รายการสินค้าทั้งหมด")]),
        h("button", { "data-modal": "product" }, "เพิ่มสินค้า"),
      ]),
      h(ProductTable),
    ]),
  ]);
}

function categoryLabel(value) {
  return { gas: "แก๊ส/ถัง", accessory: "อุปกรณ์", service: "บริการ" }[value] || value || "-";
}

function ProductTable() {
  return h("table", { className: "data-table product-table" }, [
    h("thead", null, h("tr", null, ["รหัสสินค้า", "สินค้า", "หมวดหมู่", "หน่วยนับ", "ราคา", "ถังเต็ม/คงเหลือ", "ถังเปล่า", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, products.map((p) => h("tr", null, [
      h("td", null, p.sku || "-"),
      h("td", null, p.name),
      h("td", null, categoryLabel(p.category)),
      h("td", null, p.unit || "-"),
      h("td", null, `฿${p.price.toLocaleString()}`),
      h("td", null, String(p.stock)),
      h("td", null, String(p.stock_empty || 0)),
      h("td", null, h("div", { className: "row-actions product-actions" }, [
        h("button", { "data-product-edit": p.id, title: "แก้ไขสินค้า" }, "✎"),
        h("button", { "data-open-stock": p.id, title: "ปรับสต็อก" }, "▥"),
        h("button", { className: "danger-icon", "data-product-delete": p.id, title: "ลบสินค้า" }, "×"),
      ])),
    ]))),
  ]);
}

function productMatchesSearch(product, search = "") {
  return [product.sku, product.name, product.category, categoryLabel(product.category), product.unit]
    .join(" ")
    .toLowerCase()
    .includes(String(search || "").trim().toLowerCase());
}

function OpeningBalancePage() {
  const selectedYear = Number(state.openingBalanceMonth.slice(0, 4)) || new Date().getFullYear();
  const selectedMonth = Number(state.openingBalanceMonth.slice(5, 7)) || new Date().getMonth() + 1;
  const productSearch = (state.openingProductSearch || "").trim();
  const selectedProduct = products.find((product) => String(product.id) === String(state.openingProductId));
  const productOptions = productSearch ? products.filter((product) => productMatchesSearch(product, productSearch)) : products;
  const productDisplayValue = state.openingProductSearch || (selectedProduct ? `${selectedProduct.sku || "-"} - ${selectedProduct.name}` : "");
  const monthRows = openingBalances
    .filter((item) => item.stock_month === state.openingBalanceMonth)
    .sort((a, b) => String(a.sku || "").localeCompare(String(b.sku || ""), "th") || Number(a.id) - Number(b.id));
  const totalAmount = monthRows.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const totalFullQuantity = monthRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalEmptyQuantity = monthRows.reduce((sum, item) => sum + Number(item.empty_quantity || 0), 0);

  return h("div", null, [
    h(PageTitle, {
      title: "ยอดยกมาสินค้า",
      sub: "บันทึกจำนวนและมูลค่าสินค้าคงเหลือเริ่มต้นตอนเริ่มใช้ระบบ ระบบจะอัปเดตสต๊อคและลง Stock card เป็นยอดยกมา",
    }),
    h("section", { className: "report-filters opening-balance-filters" }, [
      h("label", null, ["ประจำเดือน", h("select", { "data-opening-month": "true" }, thaiMonthNames().map((month, index) =>
        h("option", { value: String(index + 1).padStart(2, "0"), selected: selectedMonth === index + 1 }, month)
      ))]),
      h("label", null, ["ปี พ.ศ.", h("select", { "data-opening-year": "true" }, reportYearOptions(selectedYear).map((year) =>
        h("option", { value: String(year), selected: year === selectedYear }, String(year + 543))
      ))]),
      h("div", { className: "opening-period-card" }, [
        h("span", null, "งวดเริ่มต้น"),
        h("strong", null, `${thaiMonthNames()[selectedMonth - 1]} ${selectedYear + 543}`),
      ]),
    ]),
    h("form", { className: "panel opening-balance-form", "data-opening-balance-form": "true" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [
          h("h2", null, "รายละเอียด"),
          h("p", null, "เลือกสินค้า กรอกจำนวนตั้งต้นและราคาต่อหน่วย แล้วกดเพิ่มรายการ"),
        ]),
      ]),
      h("div", { className: "opening-entry-grid" }, [
        h("label", { className: "opening-product-field" }, [
          h("span", null, "ชื่อสินค้า"),
          h("div", { className: `stock-product-combo opening-product-combo ${state.openingProductOpen ? "open" : ""}` }, [
            h("input", {
              type: "search",
              name: "product_display",
              "data-opening-product-search": "true",
              placeholder: "พิมพ์รหัส / ชื่อสินค้า / หมวดหมู่...",
              value: productDisplayValue,
            }),
            h("input", { type: "hidden", name: "product_id", value: state.openingProductId }),
            h("button", { type: "button", className: "stock-product-combo-toggle", "data-opening-product-toggle": "true" }, "⌄"),
            h("div", { className: "stock-product-combo-menu" }, [
              ...productOptions.map((product) => h("button", {
                type: "button",
                className: String(state.openingProductId) === String(product.id) ? "active" : "",
                "data-opening-product-pick": product.id,
              }, [
                h("strong", null, `${product.sku || "-"} - ${product.name}`),
                h("span", null, `${categoryLabel(product.category)} · ${product.unit || "-"} · ${money(product.price)}`),
              ])),
              productOptions.length ? null : h("p", { className: "empty-search" }, "ไม่พบสินค้า"),
            ]),
          ]),
        ]),
        h("label", null, [h("span", null, "ถังเต็ม/สินค้า"), h("input", { name: "quantity", type: "number", min: "0", step: "1", placeholder: "0", "data-opening-quantity": "true" })]),
        h("label", null, [h("span", null, "ถังเปล่า"), h("input", { name: "empty_quantity", type: "number", min: "0", step: "1", placeholder: "0", "data-opening-empty-quantity": "true" })]),
        h("label", null, [h("span", null, "ราคาต่อหน่วย"), h("input", { name: "unit_price", type: "number", min: "0", step: "0.01", value: selectedProduct ? String(selectedProduct.price || 0) : "", placeholder: "0.00", "data-opening-unit-price": "true" })]),
        h("label", null, [h("span", null, "รวมเงิน"), h("input", { type: "text", readOnly: true, value: money(0, { decimals: 2 }), "data-opening-line-total": "true" })]),
        h("button", { type: "submit", className: "primary-action opening-add-button" }, "+ เพิ่มรายการ"),
      ]),
    ]),
    h("section", { className: "panel opening-balance-list" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [
          h("h2", null, `รายการยอดยกมา ${thaiMonthNames()[selectedMonth - 1]} ${selectedYear + 543}`),
          h("p", null, `${monthRows.length} รายการ`),
        ]),
        h("div", { className: "opening-total-group" }, [
          h("div", { className: "opening-total-chip" }, [
            h("span", null, "ถังเต็ม"),
            h("strong", null, totalFullQuantity.toLocaleString("th-TH")),
          ]),
          h("div", { className: "opening-total-chip" }, [
            h("span", null, "ถังเปล่า"),
            h("strong", null, totalEmptyQuantity.toLocaleString("th-TH")),
          ]),
          h("div", { className: "opening-total-chip" }, [
            h("span", null, "รวมเงิน"),
            h("strong", null, money(totalAmount, { decimals: 2 })),
          ]),
        ]),
      ]),
      h("div", { className: "report-table-scroll" }, h("table", { className: "data-table opening-balance-table" }, [
        h("thead", null, h("tr", null, ["ที่", "รหัส", "ชื่อสินค้า", "ถังเต็ม", "ถังเปล่า", "@ราคา", "รวมเงิน", "จัดการ"].map((head) => h("th", null, head)))),
        h("tbody", null, monthRows.length ? monthRows.map((item, index) => h("tr", null, [
          h("td", null, String(index + 1)),
          h("td", null, item.sku || "-"),
          h("td", null, item.product_name || "-"),
          h("td", null, Number(item.quantity || 0).toLocaleString("th-TH")),
          h("td", null, Number(item.empty_quantity || 0).toLocaleString("th-TH")),
          h("td", null, money(item.unit_price, { decimals: 2 })),
          h("td", null, money(item.total_amount, { decimals: 2 })),
          h("td", null, h("button", { type: "button", className: "danger-icon", "data-opening-balance-delete": item.id, title: "ลบยอดยกมารายการนี้" }, "ลบ")),
        ])) : h("tr", null, h("td", { colSpan: 8 }, "ยังไม่มียอดยกมาของเดือนนี้"))),
        h("tfoot", null, h("tr", null, [
          h("td", { colSpan: 3 }, "รวม"),
          h("td", null, totalFullQuantity.toLocaleString("th-TH")),
          h("td", null, totalEmptyQuantity.toLocaleString("th-TH")),
          h("td", null, ""),
          h("td", null, money(totalAmount, { decimals: 2 })),
          h("td", null, ""),
        ])),
      ])),
    ]),
  ]);
}

function MonthlyStockCountPage() {
  const selectedYear = Number(state.stockCountMonth.slice(0, 4)) || new Date().getFullYear();
  const selectedMonth = Number(state.stockCountMonth.slice(5, 7)) || new Date().getMonth() + 1;
  const productSearch = (state.stockCountProductSearch || "").trim().toLowerCase();
  const matchesProductSearch = (product) =>
    [product.sku, product.name, product.category, categoryLabel(product.category), product.unit]
      .join(" ")
      .toLowerCase()
      .includes(productSearch);
  const selectedStockProduct = products.find((product) => String(product.id) === String(state.stockCountProductId));
  const stockProductOptions = productSearch ? products.filter(matchesProductSearch) : products;
  const stockProductDisplayValue = state.stockCountProductSearch || (selectedStockProduct ? `${selectedStockProduct.sku || "-"} - ${selectedStockProduct.name}` : "");
  const countsByProduct = new Map(
    monthlyStockCounts
      .filter((item) => item.stock_month === state.stockCountMonth)
      .map((item) => [String(item.product_id), item])
  );
  const savedStockProductIds = new Set(countsByProduct.keys());
  const selectedProducts = state.stockCountProductId
    ? products.filter((product) => String(product.id) === String(state.stockCountProductId))
    : productSearch
      ? products.filter(matchesProductSearch)
    : products.filter((product) => savedStockProductIds.has(String(product.id)));
  const totalSystemFull = selectedProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const totalSystemEmpty = selectedProducts.reduce((sum, product) => sum + Number(product.stock_empty || 0), 0);
  const totalCountedFull = selectedProducts.reduce((sum, product) => {
    const count = countsByProduct.get(String(product.id));
    return sum + Number(count?.counted_full ?? product.stock ?? 0);
  }, 0);
  const totalCountedEmpty = selectedProducts.reduce((sum, product) => {
    const count = countsByProduct.get(String(product.id));
    return sum + Number(count?.counted_empty ?? product.stock_empty ?? 0);
  }, 0);
  const visibleStockCountIds = selectedProducts
    .map((product) => countsByProduct.get(String(product.id))?.id)
    .filter(Boolean)
    .map(String);
  const selectedMonthlyIds = state.monthlyStockSelectedIds.filter((id) => visibleStockCountIds.includes(String(id)));
  const allVisibleSelected = visibleStockCountIds.length > 0 && selectedMonthlyIds.length === visibleStockCountIds.length;
  return h("div", null, [
    h(PageTitle, { title: "บันทึกสต๊อคสินค้า", sub: "บันทึกยอดตรวจนับสิ้นเดือน แยกถังเต็ม/คงเหลือ และถังเปล่า เพื่อเก็บเป็นประวัติรายเดือน" }),
    h("section", { className: "report-filters stock-count-filters" }, [
      h("label", null, ["ประจำเดือน", h("select", { "data-stock-count-month": "true" }, thaiMonthNames().map((month, index) =>
        h("option", { value: String(index + 1).padStart(2, "0"), selected: selectedMonth === index + 1 }, month)
      ))]),
      h("label", null, ["ปี พ.ศ.", h("select", { "data-stock-count-year": "true" }, reportYearOptions(selectedYear).map((year) =>
        h("option", { value: String(year), selected: year === selectedYear }, String(year + 543))
      ))]),
      h("label", { className: "stock-count-product-field" }, [
        "สินค้า",
        h("div", { className: `stock-product-combo ${state.stockCountProductOpen ? "open" : ""}` }, [
          h("input", {
            type: "search",
            "data-stock-count-product-search": "true",
            placeholder: "ทั้งหมด",
            value: stockProductDisplayValue,
          }),
          h("button", { type: "button", className: "stock-product-combo-toggle", "data-stock-count-product-toggle": "true" }, "⌄"),
          h("div", { className: "stock-product-combo-menu" }, [
            h("button", { type: "button", className: !state.stockCountProductId && !productSearch ? "active" : "", "data-stock-count-product-pick": "" }, [
              h("strong", null, "ทั้งหมด"),
              h("span", null, "แสดงสินค้าทุกรายการ"),
            ]),
            ...stockProductOptions.map((product) => h("button", {
              type: "button",
              className: String(state.stockCountProductId) === String(product.id) ? "active" : "",
              "data-stock-count-product-pick": product.id,
            }, [
              h("strong", null, `${product.sku || "-"} - ${product.name}`),
              h("span", null, `${categoryLabel(product.category)} · ${product.unit || "-"}`),
            ])),
            stockProductOptions.length ? null : h("p", { className: "empty-search" }, "ไม่พบสินค้า"),
          ]),
        ]),
      ]),
      h("div", { className: "stock-count-stats" }, [
        h("span", null, ["ระบบ", h("strong", null, `${totalSystemFull} / ${totalSystemEmpty}`)]),
        h("span", null, ["ตรวจนับ", h("strong", null, `${totalCountedFull} / ${totalCountedEmpty}`)]),
      ]),
    ]),
    h("form", { className: "panel monthly-stock-form", "data-monthly-stock-form": "true" }, [
      h("div", { className: "panel-head" }, [
        h("div", null, [h("h2", null, `ยอดสต๊อคประจำเดือน ${thaiMonthNames()[selectedMonth - 1]} ${selectedYear + 543}`)]),
        h("div", { className: "monthly-stock-actions" }, [
          selectedMonthlyIds.length ? h("button", { type: "button", className: "danger-outline", "data-monthly-stock-bulk-delete": "true" }, `ลบที่เลือก ${selectedMonthlyIds.length}`) : null,
        ]),
      ]),
      h("label", { className: "panel-search monthly-stock-note" }, [
        h("span", null, "หมายเหตุ"),
        h("input", { name: "note", placeholder: "เช่น ตรวจนับสิ้นเดือน / ปรับยอดตามคลังจริง" }),
      ]),
      h("div", { className: "monthly-stock-help" }, [
        h("strong", null, "วิธีใช้"),
        h("span", null, "กรอกยอดที่ตรวจนับจริงในช่อง ตรวจนับถังเต็ม/คงเหลือ และ ตรวจนับถังเปล่า แล้วกด บันทึก รายแถวนั้น"),
        h("span", null, "ระบบจะเก็บเป็นยอดตรวจนับประจำเดือนเพื่อเทียบกับยอดระบบ ส่วนต่างสีแดง/เขียวคือผลต่าง ไม่ได้ปรับสต๊อคสินค้าหลักอัตโนมัติ"),
      ]),
      h("div", { className: "report-table-scroll" }, h("table", { className: "data-table monthly-stock-table" }, [
        h("thead", null, h("tr", null, [
          h("th", null, h("input", { type: "checkbox", "data-monthly-stock-select-all": "true", checked: allVisibleSelected, disabled: !visibleStockCountIds.length })),
          ...["รหัสสินค้า", "สินค้า", "หมวดหมู่", "หน่วยนับ", "ระบบเต็ม", "นับเต็ม", "ต่าง", "ระบบเปล่า", "นับเปล่า", "ต่าง", "สถานะ", "จัดการ"].map((head) => h("th", null, head)),
        ])),
        h("tbody", null, selectedProducts.length ? selectedProducts.map((product) => {
          const count = countsByProduct.get(String(product.id));
          const countId = count?.id ? String(count.id) : "";
          const countedFull = Number(count?.counted_full ?? product.stock ?? 0);
          const countedEmpty = Number(count?.counted_empty ?? product.stock_empty ?? 0);
          const diffFull = countedFull - Number(product.stock || 0);
          const diffEmpty = countedEmpty - Number(product.stock_empty || 0);
          return h("tr", null, [
            h("td", null, h("input", { type: "checkbox", "data-monthly-stock-select": countId, checked: Boolean(countId && selectedMonthlyIds.includes(countId)), disabled: !countId })),
            h("td", null, product.sku || "-"),
            h("td", null, product.name),
            h("td", null, categoryLabel(product.category)),
            h("td", null, product.unit || "-"),
            h("td", null, String(product.stock || 0)),
            h("td", null, h("input", { type: "number", min: "0", name: `full_${product.id}`, "data-monthly-product-id": product.id, value: String(countedFull) })),
            h("td", { className: diffFull === 0 ? "" : diffFull > 0 ? "diff-plus" : "diff-minus" }, diffFull > 0 ? `+${diffFull}` : String(diffFull)),
            h("td", null, String(product.stock_empty || 0)),
            h("td", null, h("input", { type: "number", min: "0", name: `empty_${product.id}`, value: String(countedEmpty) })),
            h("td", { className: diffEmpty === 0 ? "" : diffEmpty > 0 ? "diff-plus" : "diff-minus" }, diffEmpty > 0 ? `+${diffEmpty}` : String(diffEmpty)),
            h("td", null, countId ? h("span", { className: "stock-save-status saved" }, [
              h("b", null, "บันทึกแล้ว"),
              h("small", null, stockCountSavedText(count?.counted_at)),
            ]) : h("span", { className: "stock-save-status pending" }, [
              h("b", null, "ยังไม่บันทึก"),
              h("small", null, "กดบันทึกแถวนี้"),
            ])),
            h("td", null, h("div", { className: "row-actions product-actions" }, [
              h("button", { type: "button", className: "row-save-button", "data-monthly-stock-edit": product.id, title: "บันทึกสต๊อครายการนี้" }, "บันทึก"),
              h("button", { type: "button", className: "danger-icon row-delete-button", "data-monthly-stock-delete": count?.id || "", disabled: !count?.id, title: count?.id ? "ลบยอดตรวจนับเดือนนี้" : "ยังไม่มีรายการให้ลบ" }, "ลบ"),
            ])),
          ]);
        }) : h("tr", null, h("td", { colSpan: 13 }, "ยังไม่มีรายการบันทึกสต๊อคในเดือนนี้ ค้นหาหรือเลือกสินค้าเพื่อเพิ่มรายการ"))),
      ])),
    ]),
  ]);
}

function FinancePage() {
  const payableReceipts = goodsReceipts.filter(isReceiptPayable);
  const query = state.payableSearch.trim().toLowerCase();
  const filteredVouchers = supplierPaymentVouchers.filter((voucher) =>
    [voucher.voucher_no, voucher.supplier_name, voucher.receipt_no, voucher.invoice_no, voucher.reference_no, voucher.payment_method, voucher.note]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  return h("div", null, [
    h(PageTitle, { title: "การเงิน", sub: "รับเงิน จ่ายเงิน ลูกหนี้ เจ้าหนี้ และปิดยอดสิ้นวัน" }),
    h("section", { className: "finance-grid" }, [
      h(CashPanel),
      h(DebtPanel),
      h("section", { className: "panel span-2" }, [
        h("div", { className: "panel-head" }, [h("h2", null, "เจ้าหนี้ค้างจ่าย"), h("button", { "data-modal": "supplierPaymentVoucher" }, "ออกใบสำคัญจ่าย")]),
        h(PayableReceiptTable, { items: payableReceipts }),
      ]),
      h("section", { className: "panel span-2" }, [
        h("div", { className: "panel-head" }, [h("h2", null, "ใบสำคัญจ่ายเจ้าหนี้"), h("button", { "data-modal": "supplierPaymentVoucher" }, "เพิ่มใบสำคัญจ่าย")]),
        h("label", { className: "panel-search" }, [
          h("span", null, "⌕"),
          h("input", { "data-payable-search": "true", placeholder: "ค้นหาเลขใบสำคัญจ่าย, ตัวแทน, ใบรับ, อ้างอิง...", value: state.payableSearch }),
        ]),
        h(SupplierPaymentVoucherTable, { items: filteredVouchers }),
      ]),
      h("section", { className: "panel" }, [
        h("div", { className: "panel-head" }, [h("h2", null, "รายการเงินสด"), h("button", { "data-modal": "expense" }, "บันทึกจ่าย")]),
        h(SimpleTable, { heads: ["เวลา", "ประเภท", "รายละเอียด", "รับ", "จ่าย"], rows: [
          ["09:18", "รับเงิน", "INV670524-045", "760", "-"],
          ["09:05", "รับเงิน", "INV670524-044", "1,450", "-"],
          ["08:25", "จ่ายเงิน", "ค่าน้ำมันรถส่ง", "-", "800"],
        ] }),
      ]),
      h(BankAccountsPanel),
    ]),
  ]);
}

function FinancePageTabbed() {
  const payableReceipts = goodsReceipts.filter(isReceiptPayable);
  const query = state.payableSearch.trim().toLowerCase();
  const filteredVouchers = supplierPaymentVouchers.filter((voucher) =>
    [voucher.voucher_no, voucher.supplier_name, voucher.receipt_no, voucher.invoice_no, voucher.reference_no, voucher.payment_method, voucher.note]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
  const generalReceiptQuery = state.generalReceiptSearch.trim().toLowerCase();
  const filteredGeneralReceipts = generalReceiptVouchers.filter((voucher) =>
    [voucher.payment_no, voucher.reference_no, voucher.party_name, voucher.customer_name, voucher.description, voucher.method, voucher.bank_name, voucher.note, voucher.status]
      .join(" ")
      .toLowerCase()
      .includes(generalReceiptQuery)
  );
  const generalPaymentQuery = state.generalPaymentSearch.trim().toLowerCase();
  const generalPayments = expenses.filter(isGeneralPayment);
  const filteredGeneralPayments = generalPayments.filter((expense) =>
    [expense.expense_no, expense.reference_no, expense.payee_name, expense.category, expense.description, expense.payment_method, expense.bank_name, expense.note, expense.status]
      .join(" ")
      .toLowerCase()
      .includes(generalPaymentQuery)
  );
  const bankTransferReport = buildBankTransferReport();
  const monthlyFinanceSummary = buildMonthlyFinanceSummary(todayIso.slice(0, 7));
  const financeTabs = [
    { key: "overview", label: "ภาพรวม", count: "" },
    { key: "generalReceipts", label: "ใบรับเงินทั่วไป", count: generalReceiptVouchers.length },
    { key: "generalPayments", label: "ใบสำคัญจ่ายทั่วไป", count: generalPayments.length },
    { key: "payables", label: "เจ้าหนี้ค้างจ่าย", count: payableReceipts.length },
    { key: "vouchers", label: "ใบสำคัญจ่าย", count: supplierPaymentVouchers.length },
    { key: "bankTransfers", label: "รายงานเงินโอน", count: bankTransferReport.rows.length },
    { key: "cash", label: "รายการเงินสด", count: "" },
    { key: "cashOpening", label: "เงินสดต้นเดือน", count: cashOpenings.length },
    { key: "bankOpening", label: "เงินฝากต้นเดือน", count: bankOpenings.length },
    { key: "banks", label: "สมุดบัญชีธนาคาร", count: bankAccounts.length },
  ];
  const activeTab = financeTabs.some((tab) => tab.key === state.financeTab) ? state.financeTab : "overview";
  const payablesPanel = h("section", { className: "panel" }, [
    h("div", { className: "panel-head" }, [h("h2", null, "เจ้าหนี้ค้างจ่าย"), h("button", { "data-modal": "supplierPaymentVoucher" }, "ออกใบสำคัญจ่าย")]),
    h(PayableReceiptTable, { items: payableReceipts }),
  ]);
  const voucherPanel = h("section", { className: "panel" }, [
    h("div", { className: "panel-head" }, [h("h2", null, "ใบสำคัญจ่ายเจ้าหนี้"), h("button", { "data-modal": "supplierPaymentVoucher" }, "เพิ่มใบสำคัญจ่าย")]),
    h("label", { className: "panel-search" }, [
      h("span", null, "⌕"),
      h("input", { "data-payable-search": "true", placeholder: "ค้นหาเลขใบสำคัญจ่าย, ตัวแทน, ใบรับ, อ้างอิง...", value: state.payableSearch }),
    ]),
    h(SupplierPaymentVoucherTable, { items: filteredVouchers }),
  ]);
  const generalReceiptsPanel = h("section", { className: "panel" }, [
    h("div", { className: "panel-head" }, [h("h2", null, "ใบรับเงินทั่วไป"), h("button", { "data-modal": "generalReceipt" }, "เพิ่มใบรับเงิน")]),
    h("label", { className: "panel-search" }, [
      h("span", null, "⌕"),
      h("input", { "data-general-receipt-search": "true", placeholder: "ค้นหาเลขที่, ผู้จ่าย, รายการรับ, อ้างอิง, ธนาคาร...", value: state.generalReceiptSearch }),
    ]),
    h(GeneralReceiptVoucherTable, { items: filteredGeneralReceipts }),
  ]);
  const generalPaymentsPanel = h("section", { className: "panel" }, [
    h("div", { className: "panel-head" }, [h("h2", null, "ใบสำคัญจ่ายทั่วไป"), h("button", { "data-modal": "generalPayment" }, "เพิ่มใบสำคัญจ่าย")]),
    h("label", { className: "panel-search" }, [
      h("span", null, "⌕"),
      h("input", { "data-general-payment-search": "true", placeholder: "ค้นหาเลขที่, ผู้รับเงิน, หมวดหมู่, อ้างอิง, ธนาคาร...", value: state.generalPaymentSearch }),
    ]),
    h(GeneralPaymentVoucherTable, { items: filteredGeneralPayments }),
  ]);
  const cashPanel = h("section", { className: "panel" }, [
    h("div", { className: "panel-head" }, [h("h2", null, "รายการเงินสด"), h("button", { "data-modal": "expense" }, "บันทึกจ่าย")]),
    h(SimpleTable, { heads: ["เวลา", "ประเภท", "รายละเอียด", "รับ", "จ่าย"], rows: [
      ["09:18", "รับเงิน", "INV670524-045", "760", "-"],
      ["09:05", "รับเงิน", "INV670524-044", "1,450", "-"],
      ["08:25", "จ่ายเงิน", "ค่าน้ำมันรถส่ง", "-", "800"],
    ] }),
  ]);
  const tabContent = {
    overview: h("section", { className: "finance-tab-grid finance-overview-grid" }, [h(MonthlyFinanceSummaryPanel, { summary: monthlyFinanceSummary }), h(CashPanel), h(DebtPanel)]),
    generalReceipts: h("section", { className: "finance-tab-stack" }, generalReceiptsPanel),
    generalPayments: h("section", { className: "finance-tab-stack" }, generalPaymentsPanel),
    payables: h("section", { className: "finance-tab-stack" }, payablesPanel),
    vouchers: h("section", { className: "finance-tab-stack" }, voucherPanel),
    bankTransfers: h("section", { className: "finance-tab-stack" }, h(BankTransferReportPanel, { report: bankTransferReport })),
    cash: h("section", { className: "finance-tab-stack" }, cashPanel),
    cashOpening: h("section", { className: "finance-tab-stack" }, h(CashOpeningPanel)),
    bankOpening: h("section", { className: "finance-tab-stack" }, h(BankOpeningPanel)),
    banks: h("section", { className: "finance-tab-stack" }, h(BankAccountsPanel)),
  }[activeTab];
  return h("div", null, [
    h(PageTitle, { title: "การเงิน", sub: "รับเงิน จ่ายเงิน ลูกหนี้ เจ้าหนี้ สมุดบัญชีธนาคาร และปิดยอดสิ้นวัน" }),
    h("section", { className: "finance-tabs" }, financeTabs.map((tab) =>
      h("button", { type: "button", className: activeTab === tab.key ? "finance-tab active" : "finance-tab", "data-finance-tab": tab.key }, [
        h("span", { className: "finance-tab-label" }, tab.label),
        tab.count !== "" ? h("b", { className: "finance-tab-count" }, String(tab.count)) : null,
      ])
    )),
    tabContent,
  ]);
}

function CashOpeningPanel() {
  const selectedYear = Number(state.cashOpeningMonth.slice(0, 4)) || new Date().getFullYear();
  const selectedMonth = Number(state.cashOpeningMonth.slice(5, 7)) || new Date().getMonth() + 1;
  const current = cashOpenings.find((item) => item.cash_month === state.cashOpeningMonth);
  const rows = [...cashOpenings].sort((a, b) => String(b.cash_month || "").localeCompare(String(a.cash_month || "")));
  const monthTitle = `${thaiMonthNames()[selectedMonth - 1]} ${selectedYear + 543}`;
  return h("section", { className: "panel cash-opening-panel" }, [
    h("div", { className: "panel-head cash-opening-head" }, [
      h("div", null, [
        h("h2", null, "กำหนดเงินสดวันที่ 1 ของเดือน"),
        h("p", null, "ยอดนี้จะเป็นยอดเปิดในรายงานเงินสดประจำวันของเดือนที่เลือก"),
      ]),
      h("div", { className: "cash-opening-chip" }, [
        h("span", null, "งวด"),
        h("strong", null, monthTitle),
      ]),
    ]),
    h("form", { className: "cash-opening-form", "data-cash-opening-form": "true" }, [
      h("label", null, ["เดือน", h("select", { "data-cash-opening-month": "true" }, thaiMonthNames().map((month, index) =>
        h("option", { value: String(index + 1).padStart(2, "0"), selected: selectedMonth === index + 1 }, month)
      ))]),
      h("label", null, ["ปี พ.ศ.", h("select", { "data-cash-opening-year": "true" }, reportYearOptions(selectedYear).map((year) =>
        h("option", { value: String(year), selected: year === selectedYear }, String(year + 543))
      ))]),
      h("label", { className: "cash-opening-amount-field" }, [
        "เงินสดวันที่ 1",
        h("input", {
          name: "opening_cash",
          "data-cash-opening-amount": "true",
          inputMode: "decimal",
          value: formatMoneyInputFixed(current?.opening_cash || 0),
          placeholder: "0.00",
        }),
      ]),
      h("button", { type: "submit", className: "primary-action cash-opening-save" }, current ? "อัปเดตยอด" : "บันทึกยอด"),
    ]),
    h("div", { className: "cash-opening-summary" }, [
      h("div", null, [h("span", null, "ยอดตั้งต้นเดือนนี้"), h("strong", null, money(current?.opening_cash || 0, { decimals: 2 }))]),
      h("div", null, [h("span", null, "บันทึกทั้งหมด"), h("strong", null, `${rows.length} เดือน`)]),
      h("div", null, [h("span", null, "อัปเดตล่าสุด"), h("strong", null, current?.updated_at || current?.created_at ? thaiDateInputValue(current.updated_at || current.created_at) : "-")]),
    ]),
    h("div", { className: "report-table-scroll" }, h("table", { className: "data-table cash-opening-table" }, [
      h("thead", null, h("tr", null, ["เดือน", "เงินสดวันที่ 1", "อัปเดตล่าสุด", "จัดการ"].map((head) => h("th", null, head)))),
      h("tbody", null, rows.length ? rows.map((item) => {
        const year = Number(String(item.cash_month || "").slice(0, 4)) || selectedYear;
        const month = Number(String(item.cash_month || "").slice(5, 7)) || 1;
        return h("tr", null, [
          h("td", null, `${thaiMonthNames()[month - 1]} ${year + 543}`),
          h("td", null, money(item.opening_cash || 0, { decimals: 2 })),
          h("td", null, item.updated_at || item.created_at ? thaiDateInputValue(item.updated_at || item.created_at) : "-"),
          h("td", null, h("div", { className: "row-actions" }, [
            h("button", { type: "button", "data-cash-opening-edit": item.id, title: "แก้ไขยอดเงินสดต้นเดือน" }, "แก้"),
            h("button", { type: "button", className: "danger-icon", "data-cash-opening-delete": item.id, title: "ลบยอดเงินสดต้นเดือน" }, "ลบ"),
          ])),
        ]);
      }) : h("tr", null, h("td", { colSpan: 4 }, "ยังไม่มียอดเงินสดต้นเดือน"))),
    ])),
  ]);
}

function BankOpeningPanel() {
  const selectedYear = Number(state.bankOpeningMonth.slice(0, 4)) || new Date().getFullYear();
  const selectedMonth = Number(state.bankOpeningMonth.slice(5, 7)) || new Date().getMonth() + 1;
  const selectedAccountId = state.bankOpeningAccountId || String(bankAccounts[0]?.id || "");
  const selectedAccount = bankAccountById(selectedAccountId);
  const current = bankOpenings.find((item) =>
    item.bank_month === state.bankOpeningMonth &&
    String(item.bank_account_id) === String(selectedAccountId)
  );
  const rows = [...bankOpenings].sort((a, b) =>
    String(b.bank_month || "").localeCompare(String(a.bank_month || "")) ||
    bankTransferLabel(a).localeCompare(bankTransferLabel(b), "th")
  );
  const monthTitle = `${thaiMonthNames()[selectedMonth - 1]} ${selectedYear + 543}`;
  const monthTotal = bankOpenings
    .filter((item) => item.bank_month === state.bankOpeningMonth)
    .reduce((sum, item) => sum + Number(item.opening_balance || 0), 0);
  return h("section", { className: "panel cash-opening-panel bank-opening-panel" }, [
    h("div", { className: "panel-head cash-opening-head" }, [
      h("div", null, [
        h("h2", null, "กำหนดเงินฝากธนาคารวันที่ 1 ของเดือน"),
        h("p", null, "บันทึกยอดเงินฝากต้นเดือนแยกตามสมุดบัญชีธนาคาร เพื่อใช้เป็นยอดยกมาของรายงานบัญชีธนาคาร"),
      ]),
      h("div", { className: "cash-opening-chip" }, [
        h("span", null, "งวด"),
        h("strong", null, monthTitle),
      ]),
    ]),
    h("form", { className: "cash-opening-form bank-opening-form", "data-bank-opening-form": "true" }, [
      h("label", null, ["เดือน", h("select", { "data-bank-opening-month": "true" }, thaiMonthNames().map((month, index) =>
        h("option", { value: String(index + 1).padStart(2, "0"), selected: selectedMonth === index + 1 }, month)
      ))]),
      h("label", null, ["ปี พ.ศ.", h("select", { "data-bank-opening-year": "true" }, reportYearOptions(selectedYear).map((year) =>
        h("option", { value: String(year), selected: year === selectedYear }, String(year + 543))
      ))]),
      h("label", { className: "bank-opening-account-field" }, [
        "บัญชีธนาคาร",
        h("select", { name: "bank_account_id", "data-bank-opening-account": "true", disabled: !bankAccounts.length }, bankAccounts.length ? bankAccounts.map((account) =>
          h("option", { value: String(account.id), selected: String(account.id) === String(selectedAccountId) }, bankTransferLabel(account))
        ) : h("option", { value: "" }, "ยังไม่มีบัญชีธนาคาร")),
      ]),
      h("label", { className: "cash-opening-amount-field" }, [
        "เงินฝากวันที่ 1",
        h("input", {
          name: "opening_balance",
          "data-bank-opening-amount": "true",
          inputMode: "decimal",
          value: formatMoneyInputFixed(current?.opening_balance || 0),
          placeholder: "0.00",
          disabled: !bankAccounts.length,
        }),
      ]),
      h("button", { type: "submit", className: "primary-action cash-opening-save", disabled: !bankAccounts.length }, current ? "อัปเดตยอด" : "บันทึกยอด"),
    ]),
    h("div", { className: "cash-opening-summary" }, [
      h("div", null, [h("span", null, "ยอดบัญชีที่เลือก"), h("strong", null, money(current?.opening_balance || 0, { decimals: 2 }))]),
      h("div", null, [h("span", null, "รวมเงินฝากงวดนี้"), h("strong", null, money(monthTotal, { decimals: 2 }))]),
      h("div", null, [h("span", null, "บัญชีที่เลือก"), h("strong", null, selectedAccount ? selectedAccount.bank_name : "-")]),
    ]),
    h("div", { className: "report-table-scroll" }, h("table", { className: "data-table cash-opening-table bank-opening-table" }, [
      h("thead", null, h("tr", null, ["เดือน", "บัญชีธนาคาร", "เงินฝากวันที่ 1", "อัปเดตล่าสุด", "จัดการ"].map((head) => h("th", null, head)))),
      h("tbody", null, rows.length ? rows.map((item) => {
        const year = Number(String(item.bank_month || "").slice(0, 4)) || selectedYear;
        const month = Number(String(item.bank_month || "").slice(5, 7)) || 1;
        const accountLabel = bankTransferLabel(item);
        return h("tr", null, [
          h("td", null, `${thaiMonthNames()[month - 1]} ${year + 543}`),
          h("td", null, accountLabel),
          h("td", null, money(item.opening_balance || 0, { decimals: 2 })),
          h("td", null, item.updated_at || item.created_at ? thaiDateInputValue(item.updated_at || item.created_at) : "-"),
          h("td", null, h("div", { className: "row-actions" }, [
            h("button", { type: "button", "data-bank-opening-edit": item.id, title: "แก้ไขเงินฝากต้นเดือน" }, "แก้"),
            h("button", { type: "button", className: "danger-icon", "data-bank-opening-delete": item.id, title: "ลบเงินฝากต้นเดือน" }, "ลบ"),
          ])),
        ]);
      }) : h("tr", null, h("td", { colSpan: 5 }, bankAccounts.length ? "ยังไม่มีเงินฝากต้นเดือน" : "เพิ่มสมุดบัญชีธนาคารก่อนบันทึกเงินฝากต้นเดือน"))),
    ])),
  ]);
}

function PayableReceiptTable({ items = [] } = {}) {
  return h("table", { className: "data-table" }, [
    h("thead", null, h("tr", null, ["วันที่รับ", "ตัวแทนจำหน่าย", "อ้างอิง", "ยอดค้าง", "เครดิต", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((receipt) => h("tr", null, [
      h("td", null, thaiDateInputValue(receipt.received_at || receipt.created_at || "")),
      h("td", null, receipt.supplier_name || "-"),
      h("td", null, receipt.invoice_no || receipt.receipt_no || "-"),
      h("td", null, money(receipt.total_amount, { decimals: 2 })),
      h("td", null, receipt.credit_days ? `${receipt.credit_days} วัน` : "-"),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { "data-payable-pay": receipt.id, title: "ออกใบสำคัญจ่าย" }, "฿"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 6 }, "ยังไม่มีใบรับสินค้าเครดิตที่ค้างจ่าย"))),
  ]);
}

function SupplierPaymentVoucherTable({ items = [] } = {}) {
  return h("table", { className: "data-table" }, [
    h("thead", null, h("tr", null, ["วันที่จ่าย", "เลขที่", "ตัวแทนจำหน่าย", "ใบรับ/อ้างอิง", "วิธีจ่าย", "ยอดจ่าย", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((voucher) => h("tr", null, [
      h("td", null, thaiDateInputValue(voucher.paid_at || voucher.created_at || "")),
      h("td", null, voucher.voucher_no || "-"),
      h("td", null, voucher.supplier_name || "-"),
      h("td", null, voucher.invoice_no || voucher.receipt_no || "-"),
      h("td", null, voucher.payment_method === "transfer" ? "เงินโอน" : "เงินสด"),
      h("td", null, money(voucher.amount, { decimals: 2 })),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { className: "danger-icon", "data-payable-delete": voucher.id, title: "ยกเลิกใบสำคัญจ่าย" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 7 }, state.payableSearch ? "ไม่พบใบสำคัญจ่ายที่ค้นหา" : "ยังไม่มีใบสำคัญจ่ายเจ้าหนี้"))),
  ]);
}

function GeneralReceiptVoucherTable({ items = [] } = {}) {
  return h("div", { className: "table-scroll" }, h("table", { className: "data-table finance-document-table" }, [
    h("thead", null, h("tr", null, ["วันที่", "เลขที่", "ผู้จ่ายเงิน", "รายการรับ", "วิธีรับ", "ธนาคาร", "อ้างอิง", "ยอดรับ", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((voucher) => h("tr", { className: isCanceledRecord(voucher) ? "muted-row" : "" }, [
      h("td", null, thaiDateInputValue(voucher.paid_at || voucher.created_at || "")),
      h("td", null, h("strong", null, voucher.payment_no || "-")),
      h("td", null, voucher.party_name || voucher.customer_name || "-"),
      h("td", null, voucher.description || "-"),
      h("td", null, financeMethodLabel(voucher.method)),
      h("td", null, isTransferMethod(voucher.method) ? (voucher.bank_name || "-") : "-"),
      h("td", null, voucher.reference_no || "-"),
      h("td", null, money(voucher.amount, { decimals: 2 })),
      h("td", null, h("span", { className: isCanceledRecord(voucher) ? "pill danger" : "pill ok" }, voucher.status || "รับเงินแล้ว")),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { "data-general-receipt-edit": voucher.id, disabled: isCanceledRecord(voucher), title: "แก้ไขใบรับเงินทั่วไป" }, "✎"),
        h("button", { className: "danger-icon", "data-general-receipt-delete": voucher.id, disabled: isCanceledRecord(voucher), title: "ยกเลิกใบรับเงินทั่วไป" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 10 }, state.generalReceiptSearch ? "ไม่พบใบรับเงินทั่วไปที่ค้นหา" : "ยังไม่มีใบรับเงินทั่วไป"))),
  ]));
}

function GeneralPaymentVoucherTable({ items = [] } = {}) {
  return h("div", { className: "table-scroll" }, h("table", { className: "data-table finance-document-table" }, [
    h("thead", null, h("tr", null, ["วันที่", "เลขที่", "ผู้รับเงิน", "หมวดหมู่", "วิธีจ่าย", "ธนาคาร", "อ้างอิง", "ยอดจ่าย", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
    h("tbody", null, items.length ? items.map((expense) => h("tr", { className: isCanceledRecord(expense) ? "muted-row" : "" }, [
      h("td", null, thaiDateInputValue(expense.expense_at || expense.created_at || "")),
      h("td", null, h("strong", null, expense.expense_no || "-")),
      h("td", null, expense.payee_name || "-"),
      h("td", null, expense.category || "-"),
      h("td", null, financeMethodLabel(expense.payment_method || expense.paid_by)),
      h("td", null, isTransferMethod(expense.payment_method || expense.paid_by) ? (expense.bank_name || "-") : "-"),
      h("td", null, expense.reference_no || "-"),
      h("td", null, money(expense.amount, { decimals: 2 })),
      h("td", null, h("span", { className: isCanceledRecord(expense) ? "pill danger" : "pill ok" }, expense.status || "บันทึกแล้ว")),
      h("td", null, h("div", { className: "row-actions" }, [
        h("button", { className: "print-icon", "data-general-payment-print": expense.id, title: "พิมพ์ใบสำคัญจ่ายทั่วไป" }, "พิมพ์"),
        h("button", { "data-general-payment-edit": expense.id, disabled: isCanceledRecord(expense), title: "แก้ไขใบสำคัญจ่ายทั่วไป" }, "✎"),
        h("button", { className: "danger-icon", "data-general-payment-delete": expense.id, disabled: isCanceledRecord(expense), title: "ยกเลิกใบสำคัญจ่ายทั่วไป" }, "×"),
      ])),
    ])) : h("tr", null, h("td", { colSpan: 10 }, state.generalPaymentSearch ? "ไม่พบใบสำคัญจ่ายทั่วไปที่ค้นหา" : "ยังไม่มีใบสำคัญจ่ายทั่วไป"))),
  ]));
}

function ReportsPage() {
  const reportGroups = [
    { label: "ซื้อ / ภาษี", reports: ["รายรับ/ใบรับสินค้า", "ภาษีซื้อ"] },
    { label: "การเงิน", reports: ["สรุปรายรับรายจ่ายประจำวัน", "รายงานเงินสดประจำวัน", "รายงานเงินฝากธนาคารประจำวัน", "รับเงิน", "จ่ายเงิน"] },
    { label: "ขาย / ลูกหนี้", reports: ["ยอดขายรายวัน", "10 อันดับสินค้าขายดี", "10 อันดับลูกค้าซื้อมาก", "ลูกหนี้ค้างชำระ", "ภาษีขาย"] },
    { label: "สต็อก / ถัง", reports: ["Stock card", "สินค้าคงเหลือ", "ยืม/คืนถัง"] },
  ];
  const reportCount = reportGroups.reduce((sum, group) => sum + group.reports.length, 0);
  return h("div", null, [
    h(PageTitle, { title: "รายงาน", sub: "รายงานหลักที่ดึงจากระบบเดิม เช่น สต็อก ลูกหนี้ ภาษี และยอดขาย", actionText: "" }),
    h("section", { className: "report-picker" }, [
      h("div", { className: "report-picker-head" }, [
        h("div", null, [h("strong", null, "เลือกรายงาน"), h("span", null, `${reportCount} รายงาน`)]),
        state.reportView ? h("span", { className: "active-report-pill" }, ["กำลังดู", h("strong", null, state.reportView)]) : null,
      ]),
      h("div", { className: "report-group-list" }, reportGroups.map((group) =>
        h("div", { className: "report-group-row" }, [
          h("span", { className: "report-group-label" }, group.label),
          h("div", { className: "report-choice-row" }, group.reports.map((name) =>
            h("button", { type: "button", className: state.reportView === name ? "report-choice active" : "report-choice", "data-report-view": name }, name)
          )),
        ])
      )),
    ]),
    state.reportView ? h(ReportDetail, { type: state.reportView }) : h("section", { className: "panel report-empty" }, [
      h("strong", null, "เลือกรายงานจากหมวดด้านบน"),
      h("span", null, "เช่น รายรับ/ใบรับสินค้า, Stock card, รายงานเงินสดประจำวัน"),
    ]),
  ]);
}

function ReportDetail({ type }) {
  const supportedReports = ["รายรับ/ใบรับสินค้า", "สรุปรายรับรายจ่ายประจำวัน", "รายงานเงินสดประจำวัน", "รายงานเงินฝากธนาคารประจำวัน", "ภาษีซื้อ", "10 อันดับสินค้าขายดี", "10 อันดับลูกค้าซื้อมาก", "Stock card", "สินค้าคงเหลือ"];
  if (!supportedReports.includes(type)) {
    return h("section", { className: "panel report-empty" }, [
      h("strong", null, type),
      h("span", null, "รายงานนี้จะเชื่อมข้อมูลและรูปแบบพิมพ์ในรอบถัดไป"),
    ]);
  }
  const report = buildReport(type);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(report.rows.length / pageSize));
  const currentPage = Math.min(Math.max(Number(state.reportPage || 1), 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const dataRows = report.displayRows.slice(0, report.rows.length);
  const summaryRow = report.rows.length ? report.displayRows[report.displayRows.length - 1] : null;
  const pagedRows = report.rows.length
    ? [...dataRows.slice(startIndex, startIndex + pageSize), summaryRow]
    : report.displayRows;
  return h("section", { className: "panel report-panel", "data-report-panel": type }, [
    h("div", { className: "panel-head report-panel-head" }, [
      h("div", null, [h("h2", null, type), h("span", null, `${report.rows.length} รายการ`)]),
      h("div", { className: "report-actions" }, [
        h("button", { "data-report-export": "pdf", "data-report-type": type }, "พิมพ์ PDF"),
        h("button", { "data-report-export": "excel", "data-report-type": type }, "ส่งออก Excel"),
      ]),
    ]),
    h(ReportFilters, { type }),
    h("div", { className: "report-summary-strip" }, report.summaryItems.map((item) =>
      h("span", null, [item.label, h("strong", null, item.value)])
    )),
    h("div", { className: "report-table-scroll" }, h(SimpleTable, { heads: report.heads, rows: pagedRows, className: ["report-wide-table", report.tableClass || ""].filter(Boolean).join(" ") })),
    report.rows.length > pageSize ? h("div", { className: "report-pagination" }, [
      h("span", null, `หน้า ${currentPage} / ${totalPages} · แสดง ${startIndex + 1}-${Math.min(startIndex + pageSize, report.rows.length)} จาก ${report.rows.length} รายการ`),
      h("div", null, [
        h("button", { "data-report-page": String(currentPage - 1), disabled: currentPage <= 1 }, "‹ ก่อนหน้า"),
        ...Array.from({ length: totalPages }, (_, index) => index + 1).map((page) =>
          h("button", { className: page === currentPage ? "active" : "", "data-report-page": String(page) }, String(page))
        ),
        h("button", { "data-report-page": String(currentPage + 1), disabled: currentPage >= totalPages }, "ถัดไป ›"),
      ]),
    ]) : null,
  ]);
}

function ReportFilters({ type }) {
  if (isRankingPeriodReport(type)) {
    const selectedYear = Number(state.reportMonth.slice(0, 4)) || new Date().getFullYear();
    const selectedMonth = Number(state.reportMonth.slice(5, 7)) || new Date().getMonth() + 1;
    const isYearly = state.reportBestSellerPeriod === "year";
    return h("div", { className: "report-filters report-best-seller-filters" }, [
      h("label", null, ["ช่วงรายงาน", h("select", { "data-report-filter": "bestSellerPeriod" }, [
        h("option", { value: "month", selected: !isYearly }, "ประจำเดือน"),
        h("option", { value: "year", selected: isYearly }, "ประจำปี"),
      ])]),
      isYearly ? null : h("label", null, ["ประจำเดือน", h("select", { "data-report-filter": "month" }, thaiMonthNames().map((month, index) =>
        h("option", { value: String(index + 1).padStart(2, "0"), selected: selectedMonth === index + 1 }, month)
      ))]),
      h("label", null, ["ปี พ.ศ.", h("select", { "data-report-filter": "year" }, reportYearOptions(selectedYear).map((year) =>
        h("option", { value: String(year), selected: year === selectedYear }, String(year + 543))
      ))]),
      h("button", { "data-report-clear": "true" }, "ล้างเงื่อนไข"),
    ]);
  }
  if (["Stock card", "สินค้าคงเหลือ"].includes(type)) {
    const selectedYear = Number(state.reportMonth.slice(0, 4)) || new Date().getFullYear();
    const selectedMonth = Number(state.reportMonth.slice(5, 7)) || new Date().getMonth() + 1;
    const isInventoryReport = type === "สินค้าคงเหลือ";
    const productSearch = (state.reportProductSearch || "").trim().toLowerCase();
    const matchesProductSearch = (product) =>
      [product.sku, product.name, product.category, categoryLabel(product.category), product.unit]
        .join(" ")
        .toLowerCase()
        .includes(productSearch);
    const selectedProduct = products.find((product) => String(product.id) === String(state.reportProductId));
    const options = productSearch ? products.filter(matchesProductSearch) : products;
    const displayValue = state.reportProductSearch || (selectedProduct ? `${selectedProduct.sku || "-"} - ${selectedProduct.name}` : "");
    return h("div", { className: "report-filters report-stock-filters" }, [
      h("label", null, ["ประจำเดือน", h("select", { "data-report-filter": "month" }, thaiMonthNames().map((month, index) =>
        h("option", { value: String(index + 1).padStart(2, "0"), selected: selectedMonth === index + 1 }, month)
      ))]),
      h("label", null, ["ปี พ.ศ.", h("select", { "data-report-filter": "year" }, reportYearOptions(selectedYear).map((year) =>
        h("option", { value: String(year), selected: year === selectedYear }, String(year + 543))
      ))]),
      h("label", { className: "stock-count-product-field" }, [
        "สินค้า",
        h("div", { className: `stock-product-combo ${state.reportProductOpen ? "open" : ""}` }, [
          h("input", {
            type: "search",
            "data-report-product-search": "true",
            placeholder: "ทั้งหมด",
            value: displayValue,
          }),
          h("button", { type: "button", className: "stock-product-combo-toggle", "data-report-product-toggle": "true" }, "⌄"),
          h("div", { className: "stock-product-combo-menu" }, [
            isInventoryReport ? h("button", {
              type: "button",
              className: !state.reportProductId && !state.reportProductSearch ? "active" : "",
              "data-report-product-pick": "",
            }, [
              h("strong", null, "ทั้งหมด"),
              h("span", null, "แสดงสินค้าทุกรายการ"),
            ]) : null,
            ...options.map((product) => h("button", {
              type: "button",
              className: String(state.reportProductId) === String(product.id) ? "active" : "",
              "data-report-product-pick": product.id,
            }, [
              h("strong", null, `${product.sku || "-"} - ${product.name}`),
              h("span", null, `${categoryLabel(product.category)} · ${product.unit || "-"}`),
            ])),
            options.length ? null : h("p", { className: "empty-search" }, "ไม่พบสินค้า"),
          ]),
        ]),
      ]),
      h("button", { "data-report-clear": "true" }, "ล้างเงื่อนไข"),
    ]);
  }
  if (type === "ภาษีซื้อ") {
    const selectedYear = Number(state.reportMonth.slice(0, 4)) || new Date().getFullYear();
    const selectedMonth = Number(state.reportMonth.slice(5, 7)) || new Date().getMonth() + 1;
    return h("div", { className: "report-filters report-month-filters" }, [
      h("label", null, ["ประจำเดือน", h("select", { "data-report-filter": "month" }, thaiMonthNames().map((month, index) =>
        h("option", { value: String(index + 1).padStart(2, "0"), selected: selectedMonth === index + 1 }, month)
      ))]),
      h("label", null, ["ปี พ.ศ.", h("select", { "data-report-filter": "year" }, reportYearOptions(selectedYear).map((year) =>
        h("option", { value: String(year), selected: year === selectedYear }, String(year + 543))
      ))]),
      h("label", null, ["ตัวแทนจำหน่าย", h("select", { "data-report-filter": "supplierId" }, [
        h("option", { value: "" }, "ทั้งหมด"),
        ...suppliers.map((supplier) => h("option", { value: supplier.id, selected: String(state.reportSupplierId) === String(supplier.id) }, supplier.name)),
      ])]),
      h("button", { "data-report-clear": "true" }, "ล้างเงื่อนไข"),
    ]);
  }
  return h("div", { className: "report-filters" }, [
    h("label", { className: "thai-date-field report-date-field" }, [
      "วันที่",
      h("input", { type: "text", inputmode: "numeric", "data-thai-date-display": true, "data-report-date-display": "dateFrom", value: thaiDateInputValue(state.reportDateFrom) }),
      h("button", { type: "button", "data-thai-date-toggle": true, "aria-label": "เลือกวันที่" }, "▣"),
      h("div", { className: "thai-calendar", "data-thai-calendar": true }),
    ]),
    h("label", { className: "thai-date-field report-date-field" }, [
      "ถึงวันที่",
      h("input", { type: "text", inputmode: "numeric", "data-thai-date-display": true, "data-report-date-display": "dateTo", value: thaiDateInputValue(state.reportDateTo) }),
      h("button", { type: "button", "data-thai-date-toggle": true, "aria-label": "เลือกวันที่" }, "▣"),
      h("div", { className: "thai-calendar", "data-thai-calendar": true }),
    ]),
    ["รายรับ/ใบรับสินค้า", "ภาษีซื้อ"].includes(type) ? h("label", null, ["ตัวแทนจำหน่าย", h("select", { "data-report-filter": "supplierId" }, [
      h("option", { value: "" }, "ทั้งหมด"),
      ...suppliers.map((supplier) => h("option", { value: supplier.id, selected: String(state.reportSupplierId) === String(supplier.id) }, supplier.name)),
    ])]) : null,
    type === "รายงานเงินฝากธนาคารประจำวัน" ? h("label", null, ["เลขบัญชี", h("select", { "data-report-filter": "bankAccountId" }, [
      h("option", { value: "", selected: !state.reportBankAccountId }, "ทุกบัญชี"),
      ...bankAccounts.map((account) => h("option", {
        value: account.id,
        selected: String(state.reportBankAccountId) === String(account.id),
      }, `${account.account_number || "-"} - ${account.bank_name || "-"}${account.account_name ? ` / ${account.account_name}` : ""}`)),
    ])]) : null,
    h("button", { "data-report-clear": "true" }, "ล้างเงื่อนไข"),
  ]);
}

function buildReport(type) {
  if (type === "สรุปรายรับรายจ่ายประจำวัน") return buildDailyFinanceSummaryReport();
  if (type === "รายงานเงินสดประจำวัน") return buildDailyCashReport();
  if (type === "รายงานเงินฝากธนาคารประจำวัน") return buildDailyBankDepositReport();
  if (type === "ภาษีซื้อ") return buildPurchaseTaxReport();
  if (type === "10 อันดับสินค้าขายดี") return buildBestSellerReport();
  if (type === "10 อันดับลูกค้าซื้อมาก") return buildTopCustomerBuyerReport();
  if (type === "Stock card") return buildMonthlyStockCardReport();
  if (type === "สินค้าคงเหลือ") return buildMonthlyInventoryReport();
  return buildIncomeGoodsReceiptReport();
}

function buildDailyFinanceSummaryReport() {
  const rowsByDate = new Map();
  const supplierVoucherReceiptIds = new Set(supplierPaymentVouchers.map((voucher) => String(voucher.goods_receipt_id || "")).filter(Boolean));
  const ensureRow = (dateIso) => {
    const key = dateIso || "-";
    if (!rowsByDate.has(key)) {
      rowsByDate.set(key, {
        dateIso: key,
        date: dateIso ? thaiDateInputValue(dateIso) : "-",
        incomeCash: 0,
        incomeBank: 0,
        expenseCash: 0,
        expenseBank: 0,
        incomeTotal: 0,
        expenseTotal: 0,
        netTotal: 0,
      });
    }
    return rowsByDate.get(key);
  };
  const addIncome = (dateValue, method, amount) => {
    const value = Number(amount || 0);
    if (!value) return;
    const iso = reportIsoDate(dateValue);
    if (!isInReportDateRange(iso)) return;
    const row = ensureRow(iso);
    if (isTransferMethod(method)) row.incomeBank += value;
    else row.incomeCash += value;
  };
  const addExpense = (dateValue, method, amount) => {
    const value = Number(amount || 0);
    if (!value) return;
    const iso = reportIsoDate(dateValue);
    if (!isInReportDateRange(iso)) return;
    const row = ensureRow(iso);
    if (isTransferMethod(method)) row.expenseBank += value;
    else row.expenseCash += value;
  };

  payments.forEach((payment) => {
    if (!isActivePayment(payment) || isCanceledRecord(payment) || isCanceledRecord({ status: payment.order_status })) return;
    addIncome(payment.paid_at || payment.created_at, payment.method, payment.amount);
  });
  supplierPaymentVouchers.forEach((voucher) => {
    if (isCanceledRecord(voucher)) return;
    addExpense(voucher.paid_at || voucher.created_at, voucher.payment_method, voucher.amount);
  });
  goodsReceipts.forEach((receipt) => {
    if (isCanceledRecord(receipt) || supplierVoucherReceiptIds.has(String(receipt.id)) || receipt.payment_method === "credit") return;
    addExpense(receipt.received_at || receipt.created_at, receipt.payment_method, receipt.total_amount);
  });
  expenses.forEach((expense) => {
    if (isCanceledRecord(expense)) return;
    addExpense(expense.expense_at || expense.created_at, expense.payment_method || expense.paid_by, expense.amount);
  });

  const rows = Array.from(rowsByDate.values())
    .map((row) => ({
      ...row,
      incomeTotal: row.incomeCash + row.incomeBank,
      expenseTotal: row.expenseCash + row.expenseBank,
      netTotal: row.incomeCash + row.incomeBank - row.expenseCash - row.expenseBank,
    }))
    .sort((a, b) => String(a.dateIso).localeCompare(String(b.dateIso), "th", { numeric: true }));
  const total = (key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  const heads = ["ลำดับที่", "วันที่", "รับเงินสด", "รับเงินฝากธนาคาร", "จ่ายเงินสด", "จ่ายเงินฝากธนาคาร", "รายรับรวม", "รายจ่ายรวม", "คงเหลือสุทธิ"];
  const summary = [
    "",
    "รวมทั้งหมด",
    reportMoney(total("incomeCash")),
    reportMoney(total("incomeBank")),
    reportMoney(total("expenseCash")),
    reportMoney(total("expenseBank")),
    reportMoney(total("incomeTotal")),
    reportMoney(total("expenseTotal")),
    reportMoney(total("netTotal")),
  ];
  return {
    heads,
    rows,
    tableClass: "daily-finance-summary-table",
    summaryItems: [
      { label: "จำนวนวัน", value: String(rows.length) },
      { label: "รายรับรวม", value: money(total("incomeTotal"), { decimals: 2 }) },
      { label: "รายจ่ายรวม", value: money(total("expenseTotal"), { decimals: 2 }) },
      { label: "คงเหลือสุทธิ", value: money(total("netTotal"), { decimals: 2 }) },
      { label: "เงินสดสุทธิ", value: money(total("incomeCash") - total("expenseCash"), { decimals: 2 }) },
      { label: "เงินฝากสุทธิ", value: money(total("incomeBank") - total("expenseBank"), { decimals: 2 }) },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.date,
        reportMoney(row.incomeCash),
        reportMoney(row.incomeBank),
        reportMoney(row.expenseCash),
        reportMoney(row.expenseBank),
        reportMoney(row.incomeTotal),
        reportMoney(row.expenseTotal),
        reportMoney(row.netTotal),
      ]),
      summary,
    ] : [Array.from({ length: heads.length }, (_, index) => index === 1 ? "ยังไม่มีข้อมูลตามเงื่อนไข" : "-")],
  };
}

function cashOpeningForMonth(month = "") {
  return cashOpenings.find((item) => item.cash_month === month);
}

function cashBalanceBeforeDate(dateIso, entries = cashMovementEntries()) {
  const sortedOpenings = [...cashOpenings]
    .filter((item) => item.cash_month && `${item.cash_month}-01` <= dateIso)
    .sort((a, b) => String(b.cash_month).localeCompare(String(a.cash_month)));
  const opening = sortedOpenings[0];
  if (opening) {
    const openingDate = `${opening.cash_month}-01`;
    return Number(opening.opening_cash || 0) + entries
      .filter((entry) => entry.dateIso && entry.dateIso >= openingDate && entry.dateIso < dateIso)
      .reduce((sum, entry) => sum + entry.incomeCash - entry.expenseCash, 0);
  }
  return entries
    .filter((entry) => entry.dateIso && entry.dateIso < dateIso)
    .reduce((sum, entry) => sum + entry.incomeCash - entry.expenseCash, 0);
}

function buildDailyCashReport() {
  const entries = cashMovementEntries();
  const cashMoney = (value) => money(value || 0, { decimals: 2 });
  const todayIso = reportIsoDate(new Date());
  const fromIso = state.reportDateFrom || todayIso;
  const toIso = state.reportDateTo || fromIso;
  const dates = isoDateRange(fromIso, toIso);
  let runningBalance = cashBalanceBeforeDate(fromIso, entries);
  const rows = dates.map((dateIso) => {
    const monthOpening = cashOpeningForMonth(dateIso.slice(0, 7));
    if (dateIso.endsWith("-01") && monthOpening) runningBalance = Number(monthOpening.opening_cash || 0);
    const openingBalance = runningBalance;
    const incomeTotal = entries
      .filter((entry) => entry.dateIso === dateIso)
      .reduce((sum, entry) => sum + entry.incomeCash, 0);
    const expenseTotal = entries
      .filter((entry) => entry.dateIso === dateIso)
      .reduce((sum, entry) => sum + entry.expenseCash, 0);
    runningBalance = openingBalance + incomeTotal - expenseTotal;
    return {
      dateIso,
      date: thaiDateInputValue(dateIso),
      openingBalance,
      incomeTotal,
      expenseTotal,
      closingBalance: runningBalance,
    };
  });
  const firstOpening = rows[0]?.openingBalance || 0;
  const lastClosing = rows[rows.length - 1]?.closingBalance || firstOpening;
  const totalIncome = rows.reduce((sum, row) => sum + row.incomeTotal, 0);
  const totalExpense = rows.reduce((sum, row) => sum + row.expenseTotal, 0);
  const heads = ["ลำดับที่", "วันที่", "ยอดยกมา", "รวมรายรับ", "รวมรายจ่าย", "คงเหลือประจำวัน"];
  const summary = [
    "",
    "รวมทั้งหมด",
    cashMoney(firstOpening),
    cashMoney(totalIncome),
    cashMoney(totalExpense),
    cashMoney(lastClosing),
  ];
  return {
    heads,
    rows,
    tableClass: "daily-cash-report-table",
    summaryItems: [
      { label: "จำนวนวัน", value: String(rows.length) },
      { label: "ยอดยกมา", value: money(firstOpening, { decimals: 2 }) },
      { label: "รวมรายรับ", value: money(totalIncome, { decimals: 2 }) },
      { label: "รวมรายจ่าย", value: money(totalExpense, { decimals: 2 }) },
      { label: "คงเหลือประจำวัน", value: money(lastClosing, { decimals: 2 }) },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.date,
        cashMoney(row.openingBalance),
        cashMoney(row.incomeTotal),
        cashMoney(row.expenseTotal),
        cashMoney(row.closingBalance),
      ]),
      summary,
    ] : [Array.from({ length: heads.length }, (_, index) => index === 1 ? "ยังไม่มีข้อมูลตามเงื่อนไข" : "-")],
  };
}

function bankOpeningForMonth(bank = {}, month = "") {
  const bankId = bank.id || bank.bank_account_id;
  return bankOpenings.find((item) => String(item.bank_account_id || "") === String(bankId || "") && item.bank_month === month);
}

function bankReportAccounts(entries = []) {
  const accountMap = new Map();
  const addAccount = (record = {}) => {
    const bank = bankForReport(record);
    const key = bankTransferKey(bank);
    if (!key || accountMap.has(key)) return;
    accountMap.set(key, { key, bank });
  };
  bankAccounts.forEach(addAccount);
  bankOpenings.forEach((opening) => addAccount({
    bank_account_id: opening.bank_account_id,
    bank_name: opening.bank_name,
    account_name: opening.account_name,
    account_number: opening.account_number,
  }));
  entries.forEach((entry) => addAccount(entry.bank));
  return Array.from(accountMap.values()).sort((a, b) => bankTransferLabel(a.bank).localeCompare(bankTransferLabel(b.bank), "th"));
}

function bankBalanceBeforeDate(bank = {}, entries = [], dateIso = "") {
  const bankId = bank.id || bank.bank_account_id;
  const bankKey = bankTransferKey(bank);
  const sortedOpenings = [...bankOpenings]
    .filter((item) => String(item.bank_account_id || "") === String(bankId || "") && item.bank_month && `${item.bank_month}-01` <= dateIso)
    .sort((a, b) => String(b.bank_month).localeCompare(String(a.bank_month)));
  const opening = sortedOpenings[0];
  if (opening) {
    const openingDate = `${opening.bank_month}-01`;
    return Number(opening.opening_balance || 0) + entries
      .filter((entry) => entry.bankKey === bankKey && entry.dateIso && entry.dateIso >= openingDate && entry.dateIso < dateIso)
      .reduce((sum, entry) => sum + entry.incomeBank - entry.expenseBank, 0);
  }
  return entries
    .filter((entry) => entry.bankKey === bankKey && entry.dateIso && entry.dateIso < dateIso)
    .reduce((sum, entry) => sum + entry.incomeBank - entry.expenseBank, 0);
}

function bankTransferMovementEntries() {
  return buildBankTransferReport().rows
    .map((row) => ({
      dateIso: reportIsoDate(row.date),
      bank: row.bank,
      bankKey: row.bankKey,
      incomeBank: Number(row.amountIn || 0),
      expenseBank: Number(row.amountOut || 0),
    }))
    .filter((entry) => entry.dateIso && entry.bankKey && (entry.incomeBank || entry.expenseBank))
    .sort((a, b) =>
      String(a.dateIso).localeCompare(String(b.dateIso), "th", { numeric: true }) ||
      bankTransferLabel(a.bank).localeCompare(bankTransferLabel(b.bank), "th")
    );
}

function buildDailyBankDepositReport() {
  const entries = bankTransferMovementEntries();
  const bankMoney = (value) => money(value || 0, { decimals: 2 });
  const todayIsoValue = reportIsoDate(new Date());
  const fromIso = state.reportDateFrom || todayIsoValue;
  const toIso = state.reportDateTo || fromIso;
  const dates = isoDateRange(fromIso, toIso);
  const rangeStart = dates[0] || fromIso;
  const accounts = bankReportAccounts(entries)
    .filter((account) => !state.reportBankAccountId || String(account.bank.id || account.bank.bank_account_id || "") === String(state.reportBankAccountId));
  const rows = [];

  accounts.forEach((account) => {
    let runningBalance = bankBalanceBeforeDate(account.bank, entries, rangeStart);
    dates.forEach((dateIso) => {
      const monthOpening = bankOpeningForMonth(account.bank, dateIso.slice(0, 7));
      if (dateIso.endsWith("-01") && monthOpening) runningBalance = Number(monthOpening.opening_balance || 0);
      const openingBalance = runningBalance;
      const incomeTotal = entries
        .filter((entry) => entry.bankKey === account.key && entry.dateIso === dateIso)
        .reduce((sum, entry) => sum + entry.incomeBank, 0);
      const expenseTotal = entries
        .filter((entry) => entry.bankKey === account.key && entry.dateIso === dateIso)
        .reduce((sum, entry) => sum + entry.expenseBank, 0);
      runningBalance = openingBalance + incomeTotal - expenseTotal;
      rows.push({
        dateIso,
        date: thaiDateInputValue(dateIso),
        bank: account.bank,
        accountLabel: bankTransferLabel(account.bank),
        openingBalance,
        incomeTotal,
        expenseTotal,
        closingBalance: runningBalance,
      });
    });
  });

  rows.sort((a, b) =>
    String(a.dateIso).localeCompare(String(b.dateIso), "th", { numeric: true }) ||
    String(a.accountLabel).localeCompare(String(b.accountLabel), "th")
  );

  const firstDate = dates[0] || "";
  const lastDate = dates[dates.length - 1] || firstDate;
  const firstOpening = rows
    .filter((row) => row.dateIso === firstDate)
    .reduce((sum, row) => sum + Number(row.openingBalance || 0), 0);
  const lastClosing = rows
    .filter((row) => row.dateIso === lastDate)
    .reduce((sum, row) => sum + Number(row.closingBalance || 0), 0);
  const totalIncome = rows.reduce((sum, row) => sum + Number(row.incomeTotal || 0), 0);
  const totalExpense = rows.reduce((sum, row) => sum + Number(row.expenseTotal || 0), 0);
  const heads = ["ลำดับที่", "วันที่", "บัญชีธนาคาร", "ยอดยกมา", "เงินฝากเข้า", "เงินฝากออก", "คงเหลือ"];
  const summary = [
    "",
    "รวมทั้งหมด",
    `${accounts.length} บัญชี`,
    bankMoney(firstOpening),
    bankMoney(totalIncome),
    bankMoney(totalExpense),
    bankMoney(lastClosing),
  ];

  return {
    heads,
    rows,
    tableClass: "daily-bank-deposit-report-table",
    summaryItems: [
      { label: "บัญชี", value: String(accounts.length) },
      { label: "ยอดยกมา", value: bankMoney(firstOpening) },
      { label: "เงินฝากเข้า", value: bankMoney(totalIncome) },
      { label: "เงินฝากออก", value: bankMoney(totalExpense) },
      { label: "คงเหลือ", value: bankMoney(lastClosing) },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.date,
        row.accountLabel,
        bankMoney(row.openingBalance),
        bankMoney(row.incomeTotal),
        bankMoney(row.expenseTotal),
        bankMoney(row.closingBalance),
      ]),
      summary,
    ] : [Array.from({ length: heads.length }, (_, index) => index === 2 ? "ยังไม่มีบัญชีธนาคารหรือรายการเงินฝากตามเงื่อนไข" : "-")],
  };
}

function cashMovementEntries() {
  const entries = [];
  const supplierVoucherReceiptIds = new Set(supplierPaymentVouchers.map((voucher) => String(voucher.goods_receipt_id || "")).filter(Boolean));
  const addEntry = (kind, dateValue, method, amount) => {
    const value = Number(amount || 0);
    const dateIso = reportIsoDate(dateValue);
    if (!value || !dateIso || !isCashMethod(method)) return;
    entries.push({
      dateIso,
      incomeCash: kind === "income" ? value : 0,
      expenseCash: kind === "expense" ? value : 0,
    });
  };

  payments.forEach((payment) => {
    if (!isActivePayment(payment) || isCanceledRecord(payment) || isCanceledRecord({ status: payment.order_status })) return;
    addEntry("income", payment.paid_at || payment.created_at, payment.method, payment.amount);
  });
  supplierPaymentVouchers.forEach((voucher) => {
    if (isCanceledRecord(voucher)) return;
    addEntry("expense", voucher.paid_at || voucher.created_at, voucher.payment_method, voucher.amount);
  });
  goodsReceipts.forEach((receipt) => {
    if (isCanceledRecord(receipt) || supplierVoucherReceiptIds.has(String(receipt.id)) || receipt.payment_method === "credit") return;
    addEntry("expense", receipt.received_at || receipt.created_at, receipt.payment_method, receipt.total_amount);
  });
  expenses.forEach((expense) => {
    if (isCanceledRecord(expense)) return;
    addEntry("expense", expense.expense_at || expense.created_at, expense.payment_method || expense.paid_by, expense.amount);
  });

  return entries.sort((a, b) => a.dateIso.localeCompare(b.dateIso, "th", { numeric: true }));
}

function buildIncomeGoodsReceiptReport() {
  const incomeRows = payments
    .filter(() => !state.reportSupplierId)
    .filter((payment) => isInReportDateRange(payment.paid_at || payment.created_at))
    .map((payment) => ({
      source: "รายรับ",
      date: thaiDateInputValue(payment.paid_at || payment.created_at || ""),
      reference: payment.payment_no || "-",
      supplier: customerNameById(payment.customer_id),
      product: payment.method || "-",
      quantity: "-",
      unit: "-",
      unitPrice: 0,
      lineAmount: Number(payment.amount || 0),
      billTotal: Number(payment.amount || 0),
      vat: 0,
      netTotal: Number(payment.amount || 0),
      cash: isCashMethod(payment.method) ? Number(payment.amount || 0) : 0,
      transfer: isTransferMethod(payment.method) ? Number(payment.amount || 0) : 0,
      bank: "-",
      voucherNo: "-",
      voucherDate: "-",
      sortDate: reportIsoDate(payment.paid_at || payment.created_at),
      sortNo: payment.payment_no || "-",
    }));
  const receiptRows = goodsReceipts
    .filter((receipt) => isInReportDateRange(receipt.received_at || receipt.created_at))
    .filter((receipt) => !state.reportSupplierId || String(receipt.supplier_id) === String(state.reportSupplierId))
    .flatMap((receipt) => {
      const voucher = supplierPaymentVouchers.find((item) => String(item.goods_receipt_id) === String(receipt.id));
      const paymentMethod = voucher?.payment_method || receipt.payment_method;
      const paymentAmount = Number(voucher?.amount || receipt.total_amount || 0);
      const bankAccountId = voucher?.bank_account_id || receipt.bank_account_id;
      const items = receipt.items?.length ? receipt.items : [{}];
      return items.map((item, itemIndex) => {
        const product = products.find((productItem) => String(productItem.id) === String(item.product_id));
        const quantity = Number(item.quantity_full || item.quantity || 0);
        const unitPrice = Number(item.unit_cost || item.unit_price || 0);
        const lineAmount = Number(item.line_total || quantity * unitPrice || 0);
        const isFirstLine = itemIndex === 0;
        return {
          source: "ใบรับสินค้า",
          date: thaiDateInputValue(receipt.received_at || receipt.created_at || ""),
          reference: receipt.invoice_no || receipt.receipt_no || "-",
          supplier: receipt.supplier_name || "-",
          product: item.product_name || product?.name || "-",
          quantity: quantity || "-",
          unit: item.unit || product?.unit || "-",
          unitPrice,
          lineAmount,
          billTotal: isFirstLine ? Number(receipt.subtotal_amount || 0) : 0,
          vat: isFirstLine ? Number(receipt.vat_amount || 0) : 0,
          netTotal: isFirstLine ? Number(receipt.total_amount || 0) : 0,
          cash: isFirstLine && isCashMethod(paymentMethod) ? paymentAmount : 0,
          transfer: isFirstLine && isTransferMethod(paymentMethod) ? paymentAmount : 0,
          bank: isTransferMethod(paymentMethod) ? bankAccountNameById(bankAccountId) : "-",
          voucherNo: isFirstLine ? voucher?.voucher_no || "-" : "-",
          voucherDate: isFirstLine && voucher?.paid_at ? thaiDateInputValue(voucher.paid_at) : "-",
          sortDate: reportIsoDate(receipt.received_at || receipt.created_at),
          sortNo: receipt.invoice_no || receipt.receipt_no || "-",
        };
      });
    });
  const rows = [...incomeRows, ...receiptRows].sort((a, b) => {
    const dateCompare = String(a.sortDate).localeCompare(String(b.sortDate), "th", { numeric: true });
    if (dateCompare) return dateCompare;
    return String(a.sortNo).localeCompare(String(b.sortNo), "th", { numeric: true, sensitivity: "base" });
  });
  const heads = ["ลำดับที่", "วันที่", "เลขที่อ้างอิง", "ผู้แทนจำหน่าย", "สินค้า", "จำนวน", "หน่วยนับ", "ราคาต่อหน่วย", "จำนวนเงิน", "รวมเงินต่อบิล", "ภาษีมูลค่าเพิ่ม", "รวมสุทธิ", "เงินสด", "เงินโอน", "ธนาคาร", "ใบสำคัญจ่าย", "วันที่"];
  return {
    heads,
    rows,
    summaryItems: [
      { label: "จำนวนรายการ", value: String(rows.length) },
      { label: "รายรับ", value: money(rows.reduce((sum, row) => row.source === "รายรับ" ? sum + Number(row.netTotal || 0) : sum, 0), { decimals: 2 }) },
      { label: "ใบรับสินค้า", value: money(rows.reduce((sum, row) => row.source === "ใบรับสินค้า" ? sum + Number(row.billTotal || 0) : sum, 0), { decimals: 2 }) },
      { label: "VAT", value: money(rows.reduce((sum, row) => sum + Number(row.vat || 0), 0), { decimals: 2 }) },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.date,
        row.reference,
        row.supplier,
        row.product,
        String(row.quantity),
        row.unit,
        reportMoney(row.unitPrice),
        reportMoney(row.lineAmount),
        reportMoney(row.billTotal),
        reportMoney(row.vat),
        reportMoney(row.netTotal),
        reportMoney(row.cash),
        reportMoney(row.transfer),
        row.bank,
        row.voucherNo,
        row.voucherDate,
      ]),
      reportSummaryRow(rows),
    ] : [Array.from({ length: heads.length }, (_, index) => index === 2 ? "ยังไม่มีข้อมูลตามเงื่อนไข" : "-")],
  };
}

function isRankingPeriodReport(type) {
  return ["10 อันดับสินค้าขายดี", "10 อันดับลูกค้าซื้อมาก"].includes(type);
}

function bestSellerPeriodTitle() {
  const year = Number(state.reportMonth.slice(0, 4)) || new Date().getFullYear();
  if (state.reportBestSellerPeriod === "year") return `ประจำปี ${year + 543}`;
  return `ประจำเดือน ${reportMonthTitle()}`;
}

function isInBestSellerPeriod(value) {
  const iso = reportIsoDate(value);
  if (!iso) return false;
  const year = state.reportMonth.slice(0, 4) || todayIso.slice(0, 4);
  if (state.reportBestSellerPeriod === "year") return iso.slice(0, 4) === year;
  return iso.slice(0, 7) === state.reportMonth;
}

function formatReportQuantity(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function buildBestSellerReport() {
  const productMap = new Map();
  const activeOrders = salesOrders
    .filter((order) => !isCanceledRecord(order))
    .filter((order) => isInBestSellerPeriod(order.created_at));

  activeOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const quantity = Number(item.quantity || 0);
      if (!quantity) return;
      const product = products.find((productItem) => String(productItem.id) === String(item.product_id));
      const key = String(item.product_id || item.product_name || item.name || product?.name || "unknown");
      if (!productMap.has(key)) {
        productMap.set(key, {
          sku: product?.sku || item.product_sku || item.sku || "-",
          name: item.product_name || item.name || product?.name || "สินค้า",
          category: categoryLabel(product?.category || item.category || "-"),
          unit: item.unit || product?.unit || "-",
          quantity: 0,
          amount: 0,
          orderNos: new Set(),
          lastDate: "",
        });
      }
      const row = productMap.get(key);
      row.quantity += quantity;
      row.amount += cashBillLineAmount(item);
      if (order.order_no) row.orderNos.add(order.order_no);
      const orderDate = reportIsoDate(order.created_at);
      if (orderDate && orderDate > row.lastDate) row.lastDate = orderDate;
    });
  });

  const rows = Array.from(productMap.values())
    .map((row) => ({
      ...row,
      billCount: row.orderNos.size,
      averagePrice: row.quantity ? row.amount / row.quantity : 0,
    }))
    .sort((a, b) =>
      Number(b.quantity || 0) - Number(a.quantity || 0) ||
      Number(b.amount || 0) - Number(a.amount || 0) ||
      String(a.name).localeCompare(String(b.name), "th")
    )
    .slice(0, 10);
  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalBills = new Set(rows.flatMap((row) => Array.from(row.orderNos))).size;
  const heads = ["ลำดับ", "รหัสสินค้า", "สินค้า", "หมวดหมู่", "จำนวนขาย", "หน่วยนับ", "ยอดขาย", "จำนวนบิล", "ราคาเฉลี่ย", "ขายล่าสุด"];
  const summary = [
    "",
    "",
    "รวม Top 10",
    "",
    formatReportQuantity(totalQuantity),
    "",
    reportMoney(totalAmount),
    totalBills ? totalBills.toLocaleString("th-TH") : "-",
    "",
    "",
  ];
  return {
    heads,
    rows,
    tableClass: "best-seller-report-table",
    summaryItems: [
      { label: "ช่วงรายงาน", value: bestSellerPeriodTitle() },
      { label: "สินค้าในอันดับ", value: `${rows.length.toLocaleString("th-TH")} รายการ` },
      { label: "จำนวนขายรวม", value: formatReportQuantity(totalQuantity) },
      { label: "ยอดขายรวม", value: money(totalAmount, { decimals: 2 }) },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.sku,
        row.name,
        row.category,
        formatReportQuantity(row.quantity),
        row.unit,
        reportMoney(row.amount),
        row.billCount ? row.billCount.toLocaleString("th-TH") : "-",
        reportMoney(row.averagePrice),
        row.lastDate ? thaiDateInputValue(row.lastDate) : "-",
      ]),
      summary,
    ] : [Array.from({ length: heads.length }, (_, index) => index === 2 ? "ยังไม่มีข้อมูลขายตามเงื่อนไข" : "-")],
  };
}

function buildTopCustomerBuyerReport() {
  const customerMap = new Map();
  const activeOrders = salesOrders
    .filter((order) => !isCanceledRecord(order))
    .filter((order) => isInBestSellerPeriod(order.created_at));

  activeOrders.forEach((order) => {
    const customer = customers.find((item) => String(item[6] || item.id || "") === String(order.customer_id || ""));
    const key = String(order.customer_id || order.customer_name || customer?.[0] || "unknown");
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: order.customer_name || customer?.[0] || "ลูกค้า",
        phone: customer?.[1] || "-",
        type: order.customer_type || customer?.[3] || "-",
        billCount: 0,
        quantity: 0,
        amount: 0,
        balanceDue: Number(customer?.[7] || 0),
        lastDate: "",
        orderNos: new Set(),
      });
    }
    const row = customerMap.get(key);
    const orderAmount = Number(order.total_amount || 0) || (order.items || []).reduce((sum, item) => sum + cashBillLineAmount(item), 0);
    const orderQuantity = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    row.amount += orderAmount;
    row.quantity += orderQuantity;
    if (order.order_no) row.orderNos.add(order.order_no);
    row.billCount = row.orderNos.size;
    const orderDate = reportIsoDate(order.created_at);
    if (orderDate && orderDate > row.lastDate) row.lastDate = orderDate;
  });

  const rows = Array.from(customerMap.values())
    .map((row) => ({
      ...row,
      averageBill: row.billCount ? row.amount / row.billCount : 0,
    }))
    .sort((a, b) =>
      Number(b.amount || 0) - Number(a.amount || 0) ||
      Number(b.billCount || 0) - Number(a.billCount || 0) ||
      String(b.lastDate || "").localeCompare(String(a.lastDate || ""), "th") ||
      String(a.name).localeCompare(String(b.name), "th")
    )
    .slice(0, 10);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const totalBills = rows.reduce((sum, row) => sum + Number(row.billCount || 0), 0);
  const totalBalance = rows.reduce((sum, row) => sum + Number(row.balanceDue || 0), 0);
  const heads = ["ลำดับ", "ลูกค้า", "เบอร์โทร", "ประเภท", "จำนวนบิล", "จำนวนสินค้า", "ยอดซื้อรวม", "เฉลี่ย/บิล", "ยอดค้างปัจจุบัน", "ซื้อล่าสุด"];
  const summary = [
    "",
    "รวม Top 10",
    "",
    "",
    totalBills ? totalBills.toLocaleString("th-TH") : "-",
    formatReportQuantity(totalQuantity),
    reportMoney(totalAmount),
    "",
    reportMoney(totalBalance),
    "",
  ];
  return {
    heads,
    rows,
    tableClass: "top-customer-report-table",
    summaryItems: [
      { label: "ช่วงรายงาน", value: bestSellerPeriodTitle() },
      { label: "ลูกค้าในอันดับ", value: `${rows.length.toLocaleString("th-TH")} ราย` },
      { label: "ยอดซื้อรวม", value: money(totalAmount, { decimals: 2 }) },
      { label: "จำนวนบิลรวม", value: totalBills ? totalBills.toLocaleString("th-TH") : "0" },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.name,
        row.phone,
        row.type,
        row.billCount ? row.billCount.toLocaleString("th-TH") : "-",
        formatReportQuantity(row.quantity),
        reportMoney(row.amount),
        reportMoney(row.averageBill),
        reportMoney(row.balanceDue),
        row.lastDate ? thaiDateInputValue(row.lastDate) : "-",
      ]),
      summary,
    ] : [Array.from({ length: heads.length }, (_, index) => index === 1 ? "ยังไม่มีข้อมูลลูกค้าซื้อตามเงื่อนไข" : "-")],
  };
}

function buildPurchaseTaxReport() {
  const rows = goodsReceipts
    .filter((receipt) => isInReportMonth(receipt.received_at || receipt.created_at))
    .filter((receipt) => !state.reportSupplierId || String(receipt.supplier_id) === String(state.reportSupplierId))
    .filter((receipt) => Number(receipt.vat_amount || 0) > 0)
    .map((receipt) => {
      const supplier = suppliers.find((item) => String(item.id) === String(receipt.supplier_id));
      return {
        date: thaiDateInputValue(receipt.received_at || receipt.created_at || ""),
        reference: receipt.invoice_no || receipt.receipt_no || "-",
        bookNo: "-",
        supplier: receipt.supplier_name || supplier?.name || "-",
        taxId: supplier?.tax_id || "-",
        branch: "00000",
        subtotal: Number(receipt.subtotal_amount || 0),
        vat: Number(receipt.vat_amount || 0),
        sortDate: reportIsoDate(receipt.received_at || receipt.created_at),
        sortNo: receipt.invoice_no || receipt.receipt_no || "-",
      };
    })
    .sort((a, b) => {
      const dateCompare = String(a.sortDate).localeCompare(String(b.sortDate), "th", { numeric: true });
      if (dateCompare) return dateCompare;
      return String(a.sortNo).localeCompare(String(b.sortNo), "th", { numeric: true, sensitivity: "base" });
    });
  const heads = ["ลำดับที่", "ใบกำกับภาษี วันเดือนปี", "เลขที่", "เล่มที่", "ชื่อผู้ขายสินค้า/ผู้ให้บริการ", "เลขประจำตัวผู้เสียภาษีอากรของผู้ขายสินค้า/ผู้ให้บริการ", "สถานประกอบการ", "มูลค่าสินค้าหรือบริการ", "จำนวนเงินภาษีมูลค่าเพิ่ม"];
  return {
    heads,
    rows,
    tableClass: "report-tax-table",
    summaryItems: [
      { label: "จำนวนรายการ", value: String(rows.length) },
      { label: "มูลค่าสินค้า", value: money(rows.reduce((sum, row) => sum + Number(row.subtotal || 0), 0), { decimals: 2 }) },
      { label: "ภาษีซื้อ", value: money(rows.reduce((sum, row) => sum + Number(row.vat || 0), 0), { decimals: 2 }) },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.date,
        row.reference,
        row.bookNo,
        row.supplier,
        row.taxId,
        row.branch,
        reportMoney(row.subtotal),
        reportMoney(row.vat),
      ]),
      purchaseTaxSummaryRow(rows),
    ] : [Array.from({ length: heads.length }, (_, index) => index === 2 ? "ยังไม่มีข้อมูลภาษีซื้อตามเงื่อนไข" : "-")],
  };
}

function buildMonthlyStockCardReport() {
  const month = state.reportMonth || todayIso.slice(0, 7);
  const productSearch = (state.reportProductSearch || "").trim().toLowerCase();
  const selectedProducts = state.reportProductId
    ? products.filter((product) => String(product.id) === String(state.reportProductId))
    : [];
  const selectedIds = new Set(selectedProducts.map((product) => String(product.id)));
  const monthStart = `${month}-01`;
  const nextMonth = nextReportMonth(month);
  const reportMovements = stockReportMovements();
  const monthMovements = reportMovements
    .filter((movement) => selectedIds.has(String(movement.product_id)))
    .filter((movement) => {
      const iso = reportIsoDate(movement.created_at);
      return iso >= monthStart && iso < nextMonth;
    })
    .sort((a, b) => {
      const dateCompare = String(a.created_at).localeCompare(String(b.created_at), "th", { numeric: true });
      if (dateCompare) return dateCompare;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  const visibleMonthMovements = monthMovements.filter((movement) =>
    !isOpeningStockMovement(movement) && hasStockMovementQuantity(movement)
  );
  const rows = [];
  selectedProducts.forEach((product) => {
    const openingMonthMovements = monthMovements.filter((movement) =>
      String(movement.product_id) === String(product.id)
      && isOpeningStockMovement(movement)
    );
    const productMovements = visibleMonthMovements.filter((movement) => String(movement.product_id) === String(product.id));
    const opening = stockOpeningBalance(product, month, reportMovements);
    const openingFullDelta = openingMonthMovements.reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0);
    const openingEmptyDelta = openingMonthMovements.reduce((sum, movement) => sum + Number(movement.empty_delta || 0), 0);
    const hasManualOpening = openingMonthMovements.length > 0;
    let balanceFull = hasManualOpening ? openingFullDelta : opening.full;
    let balanceEmpty = hasManualOpening ? openingEmptyDelta : opening.empty;
    rows.push({
      isOpening: true,
      date: `01/${month.slice(5, 7)}/${Number(month.slice(0, 4)) + 543}`,
      sku: product.sku || "-",
      product: product.name || "-",
      unit: product.unit || "-",
      type: "ยอดยกมา",
      reference: "-",
      inFull: 0,
      outFull: 0,
      balanceFull,
      inEmpty: 0,
      outEmpty: 0,
      balanceEmpty,
      operator: "-",
      sortDate: monthStart,
    });
    productMovements.forEach((movement) => {
      const fullDelta = Number(movement.full_delta || 0);
      const emptyDelta = Number(movement.empty_delta || 0);
      balanceFull += fullDelta;
      balanceEmpty += emptyDelta;
      rows.push({
        date: thaiDateInputValue(movement.created_at || ""),
        sku: product.sku || movement.sku || "-",
        product: product.name || movement.product_name || "-",
        unit: product.unit || movement.unit || "-",
        type: stockMovementLabel(movement.movement_type),
        reference: stockMovementReference(movement) || "-",
        inFull: fullDelta > 0 ? fullDelta : 0,
        outFull: fullDelta < 0 ? Math.abs(fullDelta) : 0,
        balanceFull,
        inEmpty: emptyDelta > 0 ? emptyDelta : 0,
        outEmpty: emptyDelta < 0 ? Math.abs(emptyDelta) : 0,
        balanceEmpty,
        operator: "ระบบ",
        sortDate: reportIsoDate(movement.created_at),
      });
    });
  });
  const heads = ["ลำดับที่", "วันที่", "รหัสสินค้า", "สินค้า", "ประเภท", "เลขอ้างอิง", "ถังเต็มรับเข้า", "ถังเต็มจ่ายออก", "คงเหลือถังเต็ม", "ถังเปล่ารับเข้า", "ถังเปล่าจ่ายออก", "คงเหลือถังเปล่า", "หน่วยนับ", "ผู้ทำรายการ"];
  if (!state.reportProductId) {
    return {
      heads,
      rows: [],
      tableClass: "report-stock-card-table",
      summaryItems: [
        { label: "สินค้า", value: "กรุณาเลือกสินค้า" },
        { label: "รายการเคลื่อนไหว", value: "0" },
        { label: "เข้าเต็ม", value: "0" },
        { label: "ออกเต็ม", value: "0" },
        { label: "เข้าเปล่า", value: "0" },
        { label: "ออกเปล่า", value: "0" },
      ],
      displayRows: [Array.from({ length: heads.length }, (_, index) => index === 3 ? "กรุณาเลือกสินค้า 1 รายการเพื่อดู Stock card" : "-")],
    };
  }
  const movementRows = rows.filter((row) => !row.isOpening);
  const total = (key) => movementRows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return {
    heads,
    rows,
    tableClass: "report-stock-card-table",
    summaryItems: [
      { label: "สินค้า", value: String(selectedProducts.length) },
      { label: "รายการเคลื่อนไหว", value: String(movementRows.length) },
      { label: "เข้าเต็ม", value: String(total("inFull")) },
      { label: "ออกเต็ม", value: String(total("outFull")) },
      { label: "เข้าเปล่า", value: String(total("inEmpty")) },
      { label: "ออกเปล่า", value: String(total("outEmpty")) },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.date,
        row.sku,
        row.product,
        row.type,
        row.reference,
        stockQty(row.inFull),
        stockQty(row.outFull),
        stockQty(row.balanceFull),
        stockQty(row.inEmpty),
        stockQty(row.outEmpty),
        stockQty(row.balanceEmpty),
        row.unit,
        row.operator,
      ]),
      stockCardSummaryRow(movementRows),
    ] : [Array.from({ length: heads.length }, (_, index) => index === 3 ? "ยังไม่มีข้อมูล Stock card ตามเงื่อนไข" : "-")],
  };
}

function buildMonthlyInventoryReport() {
  const month = state.reportMonth || todayIso.slice(0, 7);
  const monthStart = `${month}-01`;
  const nextMonth = nextReportMonth(month);
  const productSearch = (state.reportProductSearch || "").trim().toLowerCase();
  const matchesProductSearch = (product) =>
    [product.sku, product.name, product.category, categoryLabel(product.category), product.unit]
      .join(" ")
      .toLowerCase()
      .includes(productSearch);
  const selectedProducts = products
    .filter((product) => !state.reportProductId || String(product.id) === String(state.reportProductId))
    .filter((product) => state.reportProductId || !productSearch || matchesProductSearch(product))
    .sort((a, b) => String(a.sku || "").localeCompare(String(b.sku || ""), "th", { numeric: true }));
  const reportMovements = stockReportMovements();
  const monthMovements = reportMovements
    .filter((movement) => {
      const iso = reportIsoDate(movement.created_at);
      return iso >= monthStart && iso < nextMonth;
    })
    .sort((a, b) => {
      const dateCompare = String(a.created_at).localeCompare(String(b.created_at), "th", { numeric: true });
      if (dateCompare) return dateCompare;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  const rows = selectedProducts.map((product) => {
    const productMovements = monthMovements.filter((movement) => String(movement.product_id) === String(product.id));
    const openingMovements = productMovements.filter(isOpeningStockMovement);
    const movementRows = productMovements.filter((movement) => !isOpeningStockMovement(movement) && hasStockMovementQuantity(movement));
    const opening = stockOpeningBalance(product, month, reportMovements);
    const openingFull = openingMovements.length
      ? openingMovements.reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0)
      : opening.full;
    const openingEmpty = openingMovements.length
      ? openingMovements.reduce((sum, movement) => sum + Number(movement.empty_delta || 0), 0)
      : opening.empty;
    const inFull = movementRows.reduce((sum, movement) => sum + Math.max(Number(movement.full_delta || 0), 0), 0);
    const outFull = movementRows.reduce((sum, movement) => sum + Math.abs(Math.min(Number(movement.full_delta || 0), 0)), 0);
    const inEmpty = movementRows.reduce((sum, movement) => sum + Math.max(Number(movement.empty_delta || 0), 0), 0);
    const outEmpty = movementRows.reduce((sum, movement) => sum + Math.abs(Math.min(Number(movement.empty_delta || 0), 0)), 0);
    const closingFull = openingFull + inFull - outFull;
    const closingEmpty = openingEmpty + inEmpty - outEmpty;
    return {
      sku: product.sku || "-",
      product: product.name || "-",
      category: categoryLabel(product.category),
      unit: product.unit || "-",
      unitPrice: Number(product.price || 0),
      openingFull,
      inFull,
      outFull,
      closingFull,
      openingEmpty,
      inEmpty,
      outEmpty,
      closingEmpty,
      value: closingFull * Number(product.price || 0),
    };
  });
  const heads = ["ลำดับที่", "รหัสสินค้า", "สินค้า", "หมวดหมู่", "หน่วยนับ", "ราคาต่อหน่วย", "ยอดยกมาเต็ม", "รับเข้าเต็ม", "จ่ายออกเต็ม", "คงเหลือเต็ม", "ยอดยกมาเปล่า", "รับเข้าเปล่า", "จ่ายออกเปล่า", "คงเหลือเปล่า", "มูลค่าคงเหลือ"];
  const total = (key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return {
    heads,
    rows,
    tableClass: "report-inventory-table",
    summaryItems: [
      { label: "สินค้า", value: String(rows.length) },
      { label: "คงเหลือเต็ม", value: stockQty(total("closingFull")) },
      { label: "คงเหลือเปล่า", value: stockQty(total("closingEmpty")) },
      { label: "มูลค่าคงเหลือ", value: money(total("value"), { decimals: 2 }) },
    ],
    displayRows: rows.length ? [
      ...rows.map((row, index) => [
        String(index + 1),
        row.sku,
        row.product,
        row.category,
        row.unit,
        reportMoney(row.unitPrice),
        stockQty(row.openingFull),
        stockQty(row.inFull),
        stockQty(row.outFull),
        stockQty(row.closingFull),
        stockQty(row.openingEmpty),
        stockQty(row.inEmpty),
        stockQty(row.outEmpty),
        stockQty(row.closingEmpty),
        reportMoney(row.value),
      ]),
      inventorySummaryRow(rows),
    ] : [Array.from({ length: heads.length }, (_, index) => index === 2 ? "ยังไม่มีข้อมูลสินค้าคงเหลือตามเงื่อนไข" : "-")],
  };
}

function thaiMonthNames() {
  return ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
}

function reportYearOptions(selectedYear) {
  const start = selectedYear - 3;
  return Array.from({ length: 7 }, (_, index) => start + index);
}

function reportMonthTitle() {
  const year = Number(state.reportMonth.slice(0, 4)) || new Date().getFullYear();
  const month = Number(state.reportMonth.slice(5, 7)) || new Date().getMonth() + 1;
  return `${thaiMonthNames()[month - 1]} ${year + 543}`;
}

function purchaseTaxSummaryRow(rows) {
  const total = (key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return [
    "",
    "",
    "",
    "รวมทั้งหมด",
    "",
    "",
    "",
    reportMoney(total("subtotal")),
    reportMoney(total("vat")),
  ];
}

function stockCardSummaryRow(rows) {
  const total = (key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return [
    "",
    "",
    "",
    "รวมทั้งหมด",
    "",
    "",
    stockQty(total("inFull")),
    stockQty(total("outFull")),
    "",
    stockQty(total("inEmpty")),
    stockQty(total("outEmpty")),
    "",
    "",
    "",
  ];
}

function inventorySummaryRow(rows) {
  const total = (key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return [
    "",
    "",
    "รวมทั้งหมด",
    "",
    "",
    "",
    stockQty(total("openingFull")),
    stockQty(total("inFull")),
    stockQty(total("outFull")),
    stockQty(total("closingFull")),
    stockQty(total("openingEmpty")),
    stockQty(total("inEmpty")),
    stockQty(total("outEmpty")),
    stockQty(total("closingEmpty")),
    reportMoney(total("value")),
  ];
}

function reportSummaryRow(rows) {
  const total = (key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  return [
    "",
    "",
    "",
    "รวมทั้งหมด",
    "",
    "",
    "",
    reportMoney(total("unitPrice")),
    reportMoney(total("lineAmount")),
    reportMoney(total("billTotal")),
    reportMoney(total("vat")),
    reportMoney(total("netTotal")),
    reportMoney(total("cash")),
    reportMoney(total("transfer")),
    "",
    "",
    "",
  ];
}

function stockQty(value) {
  return Number(value || 0) ? Number(value || 0).toLocaleString("th-TH") : "-";
}

function isOpeningStockMovement(movement = {}) {
  return ["opening", "opening_adjust", "opening_balance", "opening_balance_delete"].includes(movement.movement_type);
}

function hasStockMovementQuantity(movement = {}) {
  return Number(movement.full_delta || 0) !== 0 || Number(movement.empty_delta || 0) !== 0;
}

function nextReportMonth(month = "") {
  const year = Number(month.slice(0, 4)) || new Date().getFullYear();
  const monthIndex = (Number(month.slice(5, 7)) || 1) - 1;
  const date = new Date(year, monthIndex + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function stockOpeningBalance(product, month, movements = stockReportMovements()) {
  const nextMonth = nextReportMonth(month);
  const laterMovements = movements.filter((movement) =>
    String(movement.product_id) === String(product.id) && reportIsoDate(movement.created_at) >= nextMonth
  );
  const currentMonthMovements = movements
    .filter((movement) => String(movement.product_id) === String(product.id))
    .filter((movement) => {
      const iso = reportIsoDate(movement.created_at);
      return iso >= `${month}-01` && iso < nextMonth;
    });
  return {
    full: Number(product.stock_full ?? product.stock ?? 0) - laterMovements.reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0)
      - currentMonthMovements.reduce((sum, movement) => sum + Number(movement.full_delta || 0), 0),
    empty: Number(product.stock_empty || 0) - laterMovements.reduce((sum, movement) => sum + Number(movement.empty_delta || 0), 0)
      - currentMonthMovements.reduce((sum, movement) => sum + Number(movement.empty_delta || 0), 0),
  };
}

function stockReportMovements() {
  const canceledReceiveRefs = new Set(
    stockMovements
      .filter((movement) => movement.movement_type === "void_receive")
      .map(stockMovementReference)
      .filter(Boolean)
  );
  const canceledSaleRefs = new Set(
    stockMovements
      .filter((movement) => movement.movement_type === "void_sale")
      .map(stockMovementReference)
      .filter(Boolean)
  );
  return stockMovements.filter((movement) => {
    const ref = stockMovementReference(movement);
    if (movement.movement_type === "void_receive") return false;
    if (movement.movement_type === "void_sale") return false;
    if (ref && canceledReceiveRefs.has(ref) && ["receive", "edit_receive", "edit_receive_reverse"].includes(movement.movement_type)) return false;
    if (ref && canceledSaleRefs.has(ref) && movement.movement_type === "sale") return false;
    return true;
  });
}

function stockMovementReference(movement = {}) {
  const text = `${movement.note || ""} ${movement.reference_no || ""}`;
  const match = text.match(/\b(?:GR\d{6,}-\d+|CSH\d{8}|SND\d{8}|VCS\d{8}|VDN\d{8})\b/i);
  return match ? match[0].toUpperCase() : "";
}

function stockMovementLabel(type = "") {
  return {
    opening: "ยอดตั้งต้น",
    opening_adjust: "แก้ไขยอดตั้งต้น",
    opening_balance: "ยอดยกมา",
    opening_balance_delete: "ลบยอดยกมา",
    receive: "รับเข้า",
    sale: "ขายออก",
    return_empty: "รับถังเปล่ากลับ",
    adjust: "ปรับยอดตรวจนับ",
    edit_receive: "แก้ไขใบรับ",
    edit_receive_reverse: "ย้อนรายการแก้ไขใบรับ",
    void_receive: "ยกเลิกใบรับ",
    void_sale: "ยกเลิกบิลขาย",
  }[type] || type || "-";
}

function reportMoney(value) {
  return Number(value || 0) ? money(value, { decimals: 2 }) : "-";
}

function isCashMethod(method = "") {
  return String(method).includes("สด") || method === "cash";
}

function isTransferMethod(method = "") {
  const text = String(method || "").toLowerCase();
  return text === "transfer" || text.includes("โอน") || text.includes("qr");
}

function bankAccountNameById(id) {
  const account = bankAccounts.find((item) => String(item.id) === String(id));
  if (!account) return "-";
  return [account.bank_name, account.account_number].filter(Boolean).join(" / ") || "-";
}

function isInReportDateRange(value) {
  const iso = reportIsoDate(value);
  if (!iso) return true;
  if (state.reportDateFrom && iso < state.reportDateFrom) return false;
  if (state.reportDateTo && iso > state.reportDateTo) return false;
  return true;
}

function isInReportMonth(value) {
  const iso = reportIsoDate(value);
  return !iso || iso.slice(0, 7) === state.reportMonth;
}

function reportIsoDate(value = "") {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value).slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = thaiDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addIsoDays(value, days) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isoDateRange(fromIso, toIso) {
  if (!fromIso || !toIso) return [];
  const start = fromIso <= toIso ? fromIso : toIso;
  const end = fromIso <= toIso ? toIso : fromIso;
  const dates = [];
  let cursor = start;
  while (cursor && cursor <= end && dates.length < 370) {
    dates.push(cursor);
    cursor = addIsoDays(cursor, 1);
  }
  return dates;
}

function thaiDateParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === "24" ? "00" : parts.hour,
    minute: parts.minute,
  };
}

function reportFileName(type) {
  if (isRankingPeriodReport(type)) {
    const suffix = state.reportBestSellerPeriod === "year" ? state.reportMonth.slice(0, 4) : state.reportMonth;
    return `${type.replace(/\s+/g, "-")}-${suffix || "all"}`;
  }
  if (["ภาษีซื้อ", "Stock card", "สินค้าคงเหลือ"].includes(type)) return `${type.replace(/\s+/g, "-")}-${state.reportMonth || "all"}`;
  const suffix = [state.reportDateFrom || "all", state.reportDateTo || "all"].join("_");
  return `${type.replace(/\s+/g, "-")}-${suffix}`;
}

function reportExportRows(type) {
  const report = buildReport(type);
  return [report.heads, ...report.displayRows];
}

function exportReportExcel(type) {
  const rows = reportExportRows(type);
  const title = reportPrintTitle(type);
  const exportedAt = thaiDateTimeText(new Date());
  const columnCount = rows[0]?.length || 1;
  const htmlTable = `
    <html><head><meta charset="utf-8"></head><body>
      <table border="1">
        <tr><th colspan="${columnCount}" style="font-size:18px;text-align:center;font-weight:bold;border:0;">${html(title)}</th></tr>
        <tr><td colspan="${columnCount}" style="text-align:center;border:0;font-weight:bold;">วันเวลาที่ส่งออก ${html(exportedAt)}</td></tr>
        ${reportOfficialExcelHeader(type, columnCount)}
        <tr>${Array.from({ length: columnCount }, () => `<td style="border:0;">&nbsp;</td>`).join("")}</tr>
        ${rows.map((row, index) => `<tr>${row.map((cell) => index === 0 ? `<th>${html(cell)}</th>` : `<td>${html(cell)}</td>`).join("")}</tr>`).join("")}
      </table>
    </body></html>
  `;
  const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${reportFileName(type)}.xls`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function printReportPdf(type) {
  const report = buildReport(type);
  const rows = [report.heads, ...report.displayRows];
  const title = reportPrintTitle(type);
  const printedAt = thaiDateTimeText(new Date());
  const printWindow = window.open("", "_blank", "width=1024,height=720");
  if (!printWindow) {
    toast("กรุณาอนุญาต popup เพื่อพิมพ์ PDF");
    return;
  }
  printWindow.document.write(`
    <html>
      <head>
        <meta charset="utf-8">
        <title></title>
        <style>
          @page { size: A4 landscape; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 14mm 18mm; color: #0f172a; font-family: Arial, Tahoma, sans-serif; font-size: 10px; }
          h1 { margin: 0 0 6px; text-align: center; font-size: 20px; line-height: 1.25; }
          .print-meta { margin-bottom: 14px; text-align: center; color: #475569; font-size: 11px; font-weight: 700; }
          .official-tax-head {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px 18px;
            margin: 0 0 10px;
            color: #0f172a;
            font-size: 10px;
            font-weight: 700;
          }
          .official-tax-head span { border-bottom: 1px dotted #cbd5e1; padding-bottom: 2px; }
          table { width: 100%; margin: 0 auto; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
          th, td { border: 1px solid #d8e0ea; padding: 6px 5px; vertical-align: middle; }
          th { text-align: center; background: #f1f5f9; font-weight: 800; }
          td { text-align: left; word-break: break-word; }
          td:nth-child(1), td:nth-child(2), td:nth-child(3), td:nth-child(6), td:nth-child(7), td:nth-child(17) { text-align: center; }
          td:nth-child(8), td:nth-child(9), td:nth-child(10), td:nth-child(11), td:nth-child(12), td:nth-child(13), td:nth-child(14) { text-align: right; white-space: nowrap; }
          table.daily-cash-report-table td:nth-child(3),
          table.daily-cash-report-table td:nth-child(4),
          table.daily-cash-report-table td:nth-child(5),
          table.daily-cash-report-table td:nth-child(6) { text-align: right; white-space: nowrap; }
          table.best-seller-report-table td:nth-child(5),
          table.best-seller-report-table td:nth-child(7),
          table.best-seller-report-table td:nth-child(8),
          table.best-seller-report-table td:nth-child(9) { text-align: right; white-space: nowrap; }
          table.top-customer-report-table td:nth-child(5),
          table.top-customer-report-table td:nth-child(6),
          table.top-customer-report-table td:nth-child(7),
          table.top-customer-report-table td:nth-child(8),
          table.top-customer-report-table td:nth-child(9) { text-align: right; white-space: nowrap; }
          tr:last-child td { background: #eefbf3; font-weight: 800; border-top: 2px solid #9fe6b7; }
          .print-footer {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            color: #475569;
            font-size: 10px;
            font-weight: 700;
          }
          @media print {
            .print-footer { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${html(title)}</h1>
        <div class="print-meta">วันเวลาที่พิมพ์ ${html(printedAt)}</div>
        ${reportOfficialPrintHeader(type)}
        <table class="${html(report.tableClass || "")}">${rows.map((row, index) => `<tr>${row.map((cell) => index === 0 ? `<th>${html(cell)}</th>` : `<td>${html(cell)}</td>`).join("")}</tr>`).join("")}</table>
        <div class="print-footer">
          <span>วันเวลาที่พิมพ์ ${html(printedAt)}</span>
          <span>แผ่นที่ 1</span>
        </div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function reportPrintTitle(type) {
  if (isRankingPeriodReport(type)) return `${type} ${bestSellerPeriodTitle()}`;
  if (type === "ภาษีซื้อ") return `${type} ประจำเดือน ${reportMonthTitle()}`;
  if (type === "Stock card") return `${type} ประจำเดือน ${reportMonthTitle()}`;
  if (type === "สินค้าคงเหลือ") return `${type} ประจำเดือน ${reportMonthTitle()}`;
  return `${type}${state.reportDateFrom || state.reportDateTo ? ` (${reportDisplayDate(state.reportDateFrom, "เริ่มต้น")} ถึง ${reportDisplayDate(state.reportDateTo, "ล่าสุด")})` : ""}`;
}

function businessTaxProfile() {
  const branch = selectedBranch();
  return {
    name: "GasFlow",
    taxId: branch?.tax_id || "0100000000000",
    placeName: branch?.name || "สาขาปากเกร็ด",
    branch: "สำนักงานใหญ่",
    branchNo: "00000",
    address: branch?.address || "",
    phone: branch?.phone || "",
    paymentQrImage: branch?.payment_qr_image || "",
  };
}

function reportOfficialPrintHeader(type) {
  if (type !== "ภาษีซื้อ") return "";
  const profile = businessTaxProfile();
  return `
    <div class="official-tax-head">
      <span>เดือนภาษี ${html(reportMonthTitle())}</span>
      <span>ชื่อผู้ประกอบการ ${html(profile.name)}</span>
      <span>เลขประจำตัวผู้เสียภาษีอากร ${html(profile.taxId)}</span>
      <span>ชื่อสถานประกอบการ ${html(profile.placeName)} / ${html(profile.branch)} ${html(profile.branchNo)}</span>
    </div>
  `;
}

function reportOfficialExcelHeader(type, columnCount) {
  if (type !== "ภาษีซื้อ") return "";
  const profile = businessTaxProfile();
  return `
    <tr><td colspan="${columnCount}" style="border:0;font-weight:bold;">เดือนภาษี ${html(reportMonthTitle())}</td></tr>
    <tr><td colspan="${columnCount}" style="border:0;font-weight:bold;">ชื่อผู้ประกอบการ ${html(profile.name)} / เลขประจำตัวผู้เสียภาษีอากร ${html(profile.taxId)}</td></tr>
    <tr><td colspan="${columnCount}" style="border:0;font-weight:bold;">ชื่อสถานประกอบการ ${html(profile.placeName)} / ${html(profile.branch)} ${html(profile.branchNo)}</td></tr>
  `;
}

function reportDisplayDate(value, fallback = "-") {
  return value ? thaiDateInputValue(value) : fallback;
}

function thaiDateTimeText(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = thaiDateParts(date);
  const year = Number(parts.year) + 543;
  const time = `${parts.hour}:${parts.minute}`;
  return `${parts.day}/${parts.month}/${year} ${time}`;
}

function stockCountSavedText(value = "") {
  const text = thaiDateTimeText(value);
  return text ? `ล่าสุด ${text}` : "บันทึกแล้ว";
}

function userRoleLabel(role = "") {
  return role === "admin" ? "ผู้ดูแลระบบ" : "พนักงาน";
}

function userStatusChip(user = {}) {
  return h("span", { className: user.is_active ? "status green" : "status red" }, user.is_active ? "ใช้งาน" : "ปิดใช้งาน");
}

function SettingsPage() {
  const isAdmin = isAdminUser();
  const editingUser = appUsers.find((user) => String(user.id) === String(state.userEditId));
  const editingBranch = branches.find((branch) => String(branch.id) === String(state.branchEditId));
  const selectedPermissions = new Set(normalizeUserPermissions(editingUser || { role: "staff" }));
  const userKeyword = state.userSearch.trim().toLowerCase();
  const filteredUsers = appUsers.filter((user) =>
    [user.username, user.email, user.display_name, user.role, userRoleLabel(user.role), permissionSummary(user.permissions, user.role), user.is_active ? "ใช้งาน" : "ปิดใช้งาน"]
      .join(" ")
      .toLowerCase()
      .includes(userKeyword)
  );
  const branchKeyword = state.branchSearch.trim().toLowerCase();
  const filteredBranches = branches.filter((branch) =>
    [branch.name, branch.tax_id, branch.phone, branch.address]
      .join(" ")
      .toLowerCase()
      .includes(branchKeyword)
  );
  const settingsTabs = [
    { key: "account", label: "บัญชีของฉัน", sub: "รหัสผ่าน" },
    ...(isAdmin ? [{ key: "users", label: "ผู้ใช้งาน", sub: `${appUsers.length} บัญชี` }] : []),
    ...(isAdmin ? [{ key: "system", label: "ข้อมูลระบบ", sub: `${branches.length} สาขา` }] : []),
    ...(isAdmin ? [{ key: "documents", label: "เลขเอกสาร", sub: "เลขรัน" }] : []),
    ...(isAdmin ? [{ key: "backup", label: "สำรองข้อมูล", sub: "ลงเครื่อง" }] : []),
  ];
  const activeSettingsTab = settingsTabs.some((tab) => tab.key === state.settingsTab) ? state.settingsTab : "account";
  return h("div", null, [
    h(PageTitle, { title: "ตั้งค่า", sub: "ข้อมูลสาขา ผู้ใช้ เลขเอกสาร และค่าเริ่มต้นของระบบ", actionText: "" }),
    h("section", { className: "settings-tabs" }, settingsTabs.map((tab) =>
      h("button", { type: "button", className: activeSettingsTab === tab.key ? "settings-tab active" : "settings-tab", "data-settings-tab": tab.key }, [
        h("strong", null, tab.label),
        h("span", null, tab.sub),
      ])
    )),
    ["system", "documents", "backup"].includes(activeSettingsTab) ? null : h("section", { className: "settings-security-grid settings-tab-content" }, [
      activeSettingsTab === "account" ? h(Panel, { title: "บัญชีของฉัน", action: "" }, [
        h("div", { className: "user-profile-card" }, [
          h("div", { className: "avatar" }, String(state.authUser?.display_name || "G").slice(0, 1).toUpperCase()),
          h("div", null, [
            h("strong", null, state.authUser?.display_name || state.authUser?.username || "-"),
            h("span", null, `${state.authUser?.username || "-"} • ${userRoleLabel(state.authUser?.role)}`),
          ]),
        ]),
        h("form", { className: "password-form", "data-change-password-form": "true" }, [
          h("label", { className: "form-line" }, ["รหัสผ่านเดิม", h("input", { name: "current_password", type: "password", autocomplete: "current-password", required: true })]),
          h("label", { className: "form-line" }, ["รหัสผ่านใหม่", h("input", { name: "new_password", type: "password", autocomplete: "new-password", minlength: "8", required: true, placeholder: "อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข" })]),
          h("label", { className: "form-line" }, ["ยืนยันรหัสใหม่", h("input", { name: "confirm_password", type: "password", autocomplete: "new-password", minlength: "8", required: true })]),
          h("button", { type: "submit", className: "wide-primary" }, "เปลี่ยนรหัสผ่าน"),
        ]),
      ]) : null,
      activeSettingsTab === "users" ? h(Panel, { title: "จัดการผู้ใช้งาน", action: "" }, isAdmin ? [
        h("form", { className: "user-form", "data-user-form": "true" }, [
          h("input", { type: "hidden", name: "id", value: editingUser?.id || "" }),
          h("div", { className: "user-form-head" }, [
            h("strong", null, editingUser ? `แก้ไขผู้ใช้ ${editingUser.username}` : "เพิ่มผู้ใช้งานใหม่"),
            editingUser ? h("button", { type: "button", className: "ghost-btn", "data-user-form-cancel": "true" }, "ยกเลิกแก้ไข") : null,
          ]),
          h("div", { className: "user-form-grid" }, [
            h("label", { className: "form-line" }, ["ชื่อผู้ใช้", h("input", { name: "username", required: true, placeholder: "เช่น cashier01", value: editingUser?.username || "" })]),
            h("label", { className: "form-line" }, ["ชื่อที่แสดง", h("input", { name: "display_name", required: true, placeholder: "เช่น แคชเชียร์ 1", value: editingUser?.display_name || "" })]),
            h("label", { className: "form-line" }, ["อีเมล", h("input", { name: "email", type: "email", required: true, placeholder: "name@example.com", value: editingUser?.email || "" })]),
            h("label", { className: "form-line" }, ["สิทธิ์", h("select", { name: "role" }, [
              h("option", { value: "staff", selected: (editingUser?.role || "staff") === "staff" }, "พนักงาน"),
              h("option", { value: "admin", selected: editingUser?.role === "admin" }, "ผู้ดูแลระบบ"),
            ])]),
            h("label", { className: "form-line" }, ["สถานะ", h("select", { name: "is_active" }, [
              h("option", { value: "1", selected: editingUser?.is_active !== false }, "ใช้งาน"),
              h("option", { value: "0", selected: editingUser?.is_active === false }, "ปิดใช้งาน"),
            ])]),
            editingUser ? null : h("label", { className: "form-line span-2" }, ["รหัสผ่านเริ่มต้น", h("input", { name: "password", type: "password", required: true, minlength: "8", placeholder: "อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข" })]),
          ]),
          h("div", { className: "permission-picker" }, [
            h("div", { className: "permission-picker-head" }, [
              h("strong", null, "สิทธิ์ใช้งานฟังก์ชัน"),
              h("span", null, "ผู้ดูแลระบบจะใช้งานได้ทุกฟังก์ชันอัตโนมัติ"),
            ]),
            h("div", { className: "permission-grid" }, APP_PERMISSIONS.map((permission) =>
              h("label", { className: "permission-check" }, [
                h("input", {
                  type: "checkbox",
                  name: "permissions",
                  value: permission.key,
                  checked: selectedPermissions.has(permission.key),
                }),
                h("span", null, [
                  h("strong", null, permission.label),
                  h("small", null, permission.detail),
                ]),
              ])
            )),
          ]),
          h("button", { type: "submit", className: "wide-primary" }, editingUser ? "บันทึกการแก้ไขผู้ใช้" : "เพิ่มผู้ใช้งาน"),
        ]),
        h("div", { className: "user-toolbar" }, [
          h("label", { className: "panel-search" }, [
            h("span", null, "⌕"),
            h("input", { placeholder: "ค้นหาชื่อผู้ใช้, อีเมล, ชื่อแสดง, สิทธิ์...", value: state.userSearch, "data-user-search": "true" }),
          ]),
          h("span", null, `${filteredUsers.length} / ${appUsers.length} ผู้ใช้`),
        ]),
        h("div", { className: "report-table-scroll" }, h("table", { className: "data-table user-table" }, [
          h("thead", null, h("tr", null, ["ผู้ใช้", "สิทธิ์ / ฟังก์ชัน", "สถานะ", "จัดการ"].map((head) => h("th", null, head)))),
          h("tbody", null, filteredUsers.map((user) => {
            const isSelf = Number(user.id) === Number(state.authUser?.id);
            const permissionText = permissionSummary(user.permissions, user.role);
            return h("tr", null, [
              h("td", null, h("div", { className: "user-identity-cell" }, [
                h("strong", null, user.username),
                h("span", null, user.display_name || "-"),
                h("small", null, user.email || "ยังไม่มีอีเมล"),
              ])),
              h("td", null, h("div", { className: "user-permission-cell" }, [
                h("strong", null, userRoleLabel(user.role)),
                h("span", { className: "permission-summary", title: permissionText }, permissionText),
              ])),
              h("td", null, userStatusChip(user)),
              h("td", null, h("div", { className: "row-actions user-actions" }, [
                h("button", { type: "button", "data-user-edit": user.id }, "แก้"),
                h("button", { type: "button", "data-user-reset": user.id }, "รีเซ็ต"),
                h("button", {
                  type: "button",
                  className: isSelf || !user.is_active ? "danger-icon disabled" : "danger-icon",
                  disabled: isSelf || !user.is_active,
                  "data-user-delete": isSelf || !user.is_active ? "" : user.id,
                }, user.is_active ? "ปิด" : "ปิดแล้ว"),
              ])),
            ]);
          })),
        ])),
      ] : [
        h("div", { className: "empty-panel" }, [
          h("strong", null, "เฉพาะผู้ดูแลระบบ"),
          h("p", null, "บัญชีนี้สามารถเปลี่ยนรหัสผ่านของตัวเองได้ แต่ยังไม่มีสิทธิ์จัดการผู้ใช้งานคนอื่น"),
        ]),
      ]) : null,
    ]),
    activeSettingsTab === "system" ? h("section", { className: "settings-grid settings-tab-content settings-system-grid" }, [
      h(Panel, { title: editingBranch ? `แก้ไขสาขา ${editingBranch.name}` : "เพิ่มสาขา", action: "" }, [
        h("form", { className: "branch-form", "data-branch-form": "true" }, [
          h("input", { type: "hidden", name: "id", value: editingBranch?.id || "" }),
          h("div", { className: "user-form-head" }, [
            h("strong", null, editingBranch ? "ปรับข้อมูลสาขา" : "บันทึกสาขาใหม่"),
            editingBranch ? h("button", { type: "button", className: "ghost-btn", "data-branch-form-cancel": "true" }, "ยกเลิกแก้ไข") : null,
          ]),
          h("div", { className: "branch-form-grid" }, [
            h("label", { className: "form-line" }, ["ชื่อสาขา", h("input", { name: "name", required: true, placeholder: "เช่น สาขาปากเกร็ด", value: editingBranch?.name || "" })]),
            h("label", { className: "form-line" }, ["เลขผู้เสียภาษี", h("input", { name: "tax_id", placeholder: "0100000000000", value: editingBranch?.tax_id || "" })]),
            h("label", { className: "form-line" }, ["เบอร์โทร", h("input", { name: "phone", placeholder: "02-000-0000", value: editingBranch?.phone || "" })]),
            h("label", { className: "form-line span-2" }, ["ที่อยู่สาขา", h("textarea", { name: "address", rows: 3, placeholder: "ที่อยู่สำหรับหัวเอกสาร / ใบพิมพ์" }, editingBranch?.address || "")]),
            h("div", { className: "branch-qr-upload span-2" }, [
              h("div", { className: "branch-qr-preview", "data-branch-qr-preview": "true" }, editingBranch?.payment_qr_image
                ? h("img", { src: editingBranch.payment_qr_image, alt: "QR Code รับเงิน" })
                : h("span", null, "ยังไม่มี QR")),
              h("div", { className: "branch-qr-copy" }, [
                h("strong", null, "QR Code รับเงินในบิลเงินสด"),
                h("p", null, "อัปโหลดรูป QR พร้อมเพย์หรือ QR บัญชีธนาคารของสาขานี้ ระบบจะแสดงในแบบพิมพ์บิลเงินสด"),
                h("input", { type: "hidden", name: "payment_qr_image", value: editingBranch?.payment_qr_image || "", "data-branch-qr-value": "true" }),
                h("div", { className: "branch-qr-actions" }, [
                  h("label", { className: "qr-upload-button" }, [
                    "เลือกรูป QR",
                    h("input", { type: "file", accept: "image/png,image/jpeg,image/webp", "data-branch-qr-upload": "true" }),
                  ]),
                  h("button", { type: "button", className: "ghost-btn", "data-branch-qr-clear": "true" }, "ลบ QR"),
                ]),
              ]),
            ]),
          ]),
          h("button", { type: "submit", className: "wide-primary" }, editingBranch ? "บันทึกการแก้ไขสาขา" : "เพิ่มสาขา"),
        ]),
      ]),
      h("div", { className: "settings-side-stack" }, [
        h(Panel, { title: "สาขาทั้งหมด", action: "" }, [
          h("div", { className: "user-toolbar" }, [
            h("label", { className: "panel-search" }, [
              h("span", null, "⌕"),
              h("input", { placeholder: "ค้นหาชื่อสาขา, เลขผู้เสียภาษี, เบอร์โทร...", value: state.branchSearch, "data-branch-search": "true" }),
            ]),
            h("span", null, `${filteredBranches.length} / ${branches.length} สาขา`),
          ]),
          h("div", { className: "report-table-scroll" }, h("table", { className: "data-table branch-table" }, [
            h("thead", null, h("tr", null, ["สาขา", "ข้อมูลติดต่อ", "จัดการ"].map((head) => h("th", null, head)))),
            h("tbody", null, filteredBranches.length ? filteredBranches.map((branch) => h("tr", null, [
              h("td", null, h("div", { className: "branch-name-cell" }, [
                h("strong", null, branch.name),
                h("span", null, branch.tax_id ? `เลขผู้เสียภาษี ${branch.tax_id}` : "ยังไม่ระบุเลขผู้เสียภาษี"),
              ])),
              h("td", null, h("div", { className: "branch-meta-cell" }, [
                h("span", null, branch.phone || "-"),
                h("small", null, branch.address || "ยังไม่ระบุที่อยู่"),
              ])),
              h("td", null, h("div", { className: "row-actions branch-actions" }, [
                h("button", { type: "button", "data-branch-edit": branch.id }, "แก้"),
                h("button", { type: "button", className: "danger-icon", "data-branch-delete": branch.id }, "ลบ"),
              ])),
            ])) : [
              h("tr", null, h("td", { colSpan: 3 }, "ยังไม่มีสาขา")),
            ]),
          ])),
        ]),
      ]),
    ]) : null,
    activeSettingsTab === "documents" ? h("section", { className: "settings-tab-content settings-document-tab" }, [
      h(Panel, { title: "เลขเอกสาร", action: "" }, [
        h("div", { className: "document-setting-grid" }, [
          h("label", { className: "form-line" }, ["บิลเงินสดล่าสุด", h("input", { value: "CSH6905XXXX", readOnly: true })]),
          h("label", { className: "form-line" }, ["ใบส่งสินค้าล่าสุด", h("input", { value: "SND6905XXXX", readOnly: true })]),
        ]),
      ]),
    ]) : null,
    activeSettingsTab === "backup" ? h("section", { className: "settings-tab-content settings-backup-tab" }, [
      h(Panel, { title: "สำรองข้อมูลลงเครื่อง", action: "" }, [
        h("div", { className: "backup-card" }, [
          h("div", { className: "backup-icon" }, "⇩"),
          h("div", { className: "backup-copy" }, [
            h("strong", null, "ดาวน์โหลดข้อมูลระบบทั้งหมดเป็นไฟล์ JSON"),
            h("p", null, "รวมลูกค้า สินค้า เอกสารขาย ใบรับสินค้า การเงิน สต๊อค สาขา และผู้ใช้งาน สำหรับเก็บสำรองไว้ในเครื่อง"),
            h("small", null, "ไฟล์ backup ไม่มีรหัสผ่านแบบอ่านได้ และไม่เก็บ token ลืมรหัสผ่านที่หมดอายุ/ใช้งานอยู่"),
          ]),
          h("button", { type: "button", className: "wide-primary backup-download-btn", "data-backup-download": "true" }, "ดาวน์โหลด Backup"),
        ]),
      ]),
    ]) : null,
  ]);
}

function PageTitle({ title, sub, actionText = "เปิดบิลเงินสดใหม่", actionModal = "cashBill" }) {
  return h("div", { className: "page-title" }, [
    h("div", null, [h("h1", null, title), h("p", null, sub)]),
    actionText ? h("button", { className: "primary-action", "data-modal": actionModal }, actionText) : null,
  ]);
}

function KpiCard({ icon, label, value, sub, tone }) {
  return h("article", { className: "kpi-card" }, [
    h("span", { className: `icon ${tone}` }, icon),
    h("div", null, [h("p", null, label), h("strong", null, value), h("small", { className: tone }, sub)]),
  ]);
}

function defaultPanelActionProps(title, action) {
  const targets = {
    "ลูกค้าแนะนำ": { "data-page": "ลูกค้า" },
    "คิวส่งของวันนี้": { "data-page": "จัดส่ง" },
    "รายการขายล่าสุด": { "data-page": "บิลเงินสด" },
    "สต็อกถัง": { "data-page": "สินค้าและถัง" },
    "รับเงินวันนี้": { "data-page": "การเงิน", "data-next-finance-tab": "cash" },
    "ลูกค้าค้างชำระ": { "data-page": "ลูกค้า" },
  };
  return targets[title] || { "data-toast": `${action}: ${title}` };
}

function Panel({ title, children, action = "ดูทั้งหมด", actionPage = "", actionModal = "", actionFinanceTab = "", actionReport = "" }) {
  const actionProps = actionPage
    ? { "data-page": actionPage }
    : actionModal
      ? { "data-modal": actionModal }
      : actionReport
        ? { "data-page": "รายงาน", "data-next-report-view": actionReport }
        : defaultPanelActionProps(title, action);
  if (actionFinanceTab) actionProps["data-next-finance-tab"] = actionFinanceTab;
  return h("section", { className: "panel" }, [
    h("div", { className: "panel-head" }, [
      h("div", null, [h("h2", null, title)]),
      action ? h("button", actionProps, [action, "›"]) : null,
    ]),
    children,
  ]);
}

function DeliveryQueue() {
  const deliveryRows = deliveryQueueRows();
  const filtered = deliveryRows.filter((row) => {
    const matchFilter = state.orderFilter === "ทั้งหมด" || row[6] === state.orderFilter;
    const matchSearch = row.join(" ").toLowerCase().includes(state.search.toLowerCase());
    return matchFilter && matchSearch;
  });
  return h(Panel, { title: "คิวส่งของวันนี้", actionPage: "จัดส่ง" }, [
    h("div", { className: "tabs" }, ["ทั้งหมด", "รอดำเนินการ", "กำลังจัดส่ง", "จัดส่งแล้ว"].map((tab) =>
      h("button", { className: state.orderFilter === tab ? "active" : "", "data-filter": tab }, `${tab} ${tab === "ทั้งหมด" ? deliveryRows.length : deliveryRows.filter((o) => o[6] === tab).length}`)
    )),
    h("table", { className: "data-table orders" }, [
      h("thead", null, h("tr", null, ["#", "เอกสาร", "ลูกค้า", "สินค้า", "ที่อยู่จัดส่ง", "เวลา", "สถานะ", "จัดการ"].map((x) => h("th", null, x)))),
      h("tbody", null, filtered.map((row, i) => h("tr", null, [
        h("td", null, String(i + 1)),
        h("td", null, [h("strong", null, row[0]), h("small", null, row[10])]),
        h("td", null, [row[1], row[2] ? h("span", { className: "vip" }, row[2]) : null]),
        h("td", null, row[3]),
        h("td", null, row[4]),
        h("td", null, row[5]),
        h("td", null, h("span", { className: row[6] === "รอดำเนินการ" ? "status blue" : row[6] === "กำลังจัดส่ง" ? "status amber" : "status green" }, row[6])),
        h("td", null, h("div", { className: "row-actions" }, [
          h("button", { "data-toast": `โทรหา ${row[1]}` }, "☎"),
          h("button", row[8] && row[9] ? { "data-map-lat": row[8], "data-map-lng": row[9] } : { "data-toast": `ยังไม่มีพิกัด: ${row[4]}` }, "⌖"),
          h("button", { "data-next-status": row[7], "data-current-status": row[6] }, "✓"),
        ])),
      ]))),
    ]),
    h("div", { className: "table-foot" }, [h("span", null, `แสดง ${filtered.length} จาก ${deliveryRows.length} รายการ`), h("button", { "data-page": "จัดส่ง" }, "ดูทั้งหมด ›")]),
  ]);
}

function RecentSales() {
  return h(Panel, { title: "รายการขายล่าสุด", actionPage: "บิลเงินสด" }, [
    h(SimpleTable, { heads: ["เวลา", "เลขที่บิล", "ลูกค้า", "สินค้า", "จำนวนเงิน", "สถานะชำระเงิน", "จัดการ"], rows: recentSales.map((r) => [...r, "พิมพ์"]) }),
  ]);
}

function StockPanel() {
  return h(Panel, { title: "สต็อกถัง", actionPage: "สินค้าและถัง" }, [
    h(CylinderStock, { color: "green", size: "ถัง 15 กก.", full: 90, empty: 50, total: 140 }),
    h(CylinderStock, { color: "blue", size: "ถัง 48 กก.", full: 35, empty: 18, total: 53 }),
  ]);
}

function CylinderStock({ color, size, full, empty, total }) {
  const fullPct = Math.round((full / total) * 100);
  return h("div", { className: "stock-item" }, [
    h("div", { className: `tank ${color}` }, [h("b", null, size.includes("15") ? "15kg" : "48kg"), h("small", null, "Gas")]),
    h("div", { className: "stock-meta" }, [
      h("strong", null, size),
      h("div", { className: "stock-cols" }, [
        h("span", null, ["ถังเต็ม", h("b", null, full)]),
        h("span", null, ["ถังเปล่า", h("b", null, empty)]),
        h("span", null, ["รวม", h("b", null, `${total} ถัง`)]),
      ]),
      h("div", { className: "bar" }, [h("i", { style: `width:${fullPct}%` }), h("em", { style: `width:${100 - fullPct}%` })]),
    ]),
  ]);
}

function CashPanel() {
  return h(Panel, { title: "รับเงินวันนี้", actionPage: "การเงิน", actionFinanceTab: "cash" }, [
    h("div", { className: "cash" }, [h("div", { className: "cash-icon" }, "▣"), h("div", null, [h("span", null, "ยอดรับเงินสด"), h("strong", null, "฿12,450")])]),
    h("ul", { className: "cash-list" }, [
      h("li", null, [h("b", { className: "dot green" }), "ธนบัตร", h("strong", null, "10,650")]),
      h("li", null, [h("b", { className: "dot amber" }), "เหรียญ", h("strong", null, "1,300")]),
      h("li", null, [h("b", { className: "dot red" }), "โอน/QR", h("strong", null, "500")]),
    ]),
  ]);
}

function MonthlyFinanceSummaryPanel({ summary } = {}) {
  const data = summary || buildMonthlyFinanceSummary();
  const netPositive = Number(data.netTotal || 0) >= 0;
  return h("section", { className: "panel monthly-finance-panel" }, [
    h("div", { className: "panel-head monthly-finance-head" }, [
      h("div", null, [
        h("h2", null, "สรุปรายรับ / รายจ่ายประจำเดือน"),
        h("span", null, data.label),
      ]),
      h("span", { className: netPositive ? "monthly-net-chip positive" : "monthly-net-chip negative" }, [
        "คงเหลือสุทธิ ",
        h("strong", null, money(data.netTotal, { decimals: 2 })),
      ]),
    ]),
    h("div", { className: "monthly-finance-cards" }, [
      h("div", { className: "monthly-finance-card income" }, [
        h("span", null, "รายรับรวม"),
        h("strong", null, money(data.incomeTotal, { decimals: 2 })),
        h("small", null, `${data.incomeCount} รายการ`),
      ]),
      h("div", { className: "monthly-finance-card expense" }, [
        h("span", null, "รายจ่ายรวม"),
        h("strong", null, money(data.expenseTotal, { decimals: 2 })),
        h("small", null, `${data.expenseCount} รายการ`),
      ]),
      h("div", { className: netPositive ? "monthly-finance-card net positive" : "monthly-finance-card net negative" }, [
        h("span", null, "สุทธิ"),
        h("strong", null, money(data.netTotal, { decimals: 2 })),
        h("small", null, netPositive ? "เงินเข้า มากกว่า เงินออก" : "เงินออก มากกว่า เงินเข้า"),
      ]),
    ]),
    h("div", { className: "monthly-finance-breakdown" }, [
      h("div", null, [
        h("h3", null, "รายรับ"),
        h("p", null, ["ขาย/รับชำระทันที", h("strong", null, money(data.incomeSales, { decimals: 2 }))]),
        h("p", null, ["รับจากลูกหนี้", h("strong", null, money(data.incomeCredit, { decimals: 2 }))]),
        h("p", null, ["รับเงินทั่วไป", h("strong", null, money(data.incomeGeneral, { decimals: 2 }))]),
      ]),
      h("div", null, [
        h("h3", null, "รายจ่าย"),
        h("p", null, ["จ่ายค่าสินค้า/เจ้าหนี้", h("strong", null, money(data.expenseGoods, { decimals: 2 }))]),
        h("p", null, ["จ่ายทั่วไป", h("strong", null, money(data.expenseGeneral, { decimals: 2 }))]),
      ]),
    ]),
  ]);
}

function DebtPanel() {
  return h(Panel, { title: "ลูกค้าค้างชำระ", actionPage: "ลูกค้า" }, [
    h("div", { className: "debt-list" }, debtors.map((debt, i) =>
      h("div", { className: "debt-row" }, [
        h("div", { className: "mini-avatar" }, ["ร", "บ", "ว", "T", "ส"][i]),
        h("span", null, debt[0]),
        h("em", null, `ค้างชำระ ${debt[1]}`),
        h("strong", null, debt[2]),
        h("button", { "data-toast": `เตรียมโทรติดตามยอด ${debt[0]}` }, "☎"),
      ])
    )),
    h("div", { className: "debt-foot" }, [h("button", { type: "button", "data-page": "ลูกค้า" }, "ทั้งหมด 12 รายการ"), h("strong", null, "ยอดรวมค้างชำระ ฿56,230")]),
  ]);
}

function SimpleTable({ heads, rows, className = "" }) {
  return h("table", { className: `data-table ${className}`.trim() }, [
    h("thead", null, h("tr", null, heads.map((x) => h("th", null, x)))),
    h("tbody", null, rows.map((row, rowIndex) => h("tr", { className: rowIndex === rows.length - 1 && rows.length > 1 ? "summary-row" : "" }, row.map((cell, i) => h("td", null,
      i === row.length - 1 && ["ดู", "พิมพ์"].includes(cell)
        ? h("button", { className: "ghost-icon", "data-toast": `${cell}รายการตัวอย่าง` }, "▣")
        : cell
    ))))),
  ]);
}

function rerender() {
  const root = document.getElementById("root");
  render(h(App), root);
  wireThaiDatePicker(root);
}

function toast(message) {
  const area = document.querySelector(".toast-area");
  if (!area) return;
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  area.appendChild(item);
  window.setTimeout(() => item.classList.add("show"), 10);
  window.setTimeout(() => {
    item.classList.remove("show");
    window.setTimeout(() => item.remove(), 220);
  }, 2400);
}

async function withLoading(message, task) {
  state.loadingCount += 1;
  state.loadingMessage = message || "กำลังดำเนินการ";
  rerender();
  try {
    return await task();
  } finally {
    state.loadingCount = Math.max(0, state.loadingCount - 1);
    if (!state.loadingCount) state.loadingMessage = "";
    rerender();
  }
}

function openModal(type) {
  const labels = {
    bill: ["เปิดบิลใหม่", "สร้างออเดอร์ขายแก๊สและจัดส่งให้ลูกค้า", "สร้างบิล"],
    payment: ["รับเงิน", "บันทึกการรับชำระเงินจากลูกค้า", "บันทึกรับเงิน"],
    customer: ["เพิ่มลูกค้า", "บันทึกข้อมูลลูกค้าใหม่เข้าระบบ", "บันทึกลูกค้า"],
    expense: ["บันทึกจ่ายเงิน", "เพิ่มรายการจ่ายประจำวัน", "บันทึกจ่าย"],
  }[type] || ["ทำรายการ", "กรอกข้อมูลตัวอย่าง", "บันทึก"];
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <section class="modal">
      <button class="modal-close" aria-label="close">×</button>
      <h2>${labels[0]}</h2>
      <p>${labels[1]}</p>
      <label>ลูกค้า / รายการ<input value="${type === "expense" ? "ค่าน้ำมันรถส่ง" : "คุณสมชาย ใจดี"}"></label>
      <label>รายละเอียด<input value="${type === "bill" ? "ถังแก๊ส 15kg x 2" : "12,450"}"></label>
      <label>ช่องทาง<select><option>เงินสด</option><option>โอน/QR</option><option>เครดิตลูกค้า</option></select></label>
      <div class="modal-actions">
        <button class="secondary">ยกเลิก</button>
        <button class="confirm">${labels[2]}</button>
      </div>
    </section>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelector(".secondary").addEventListener("click", close);
  modal.querySelector(".confirm").addEventListener("click", () => {
    withLoading("กำลังบันทึกข้อมูล", () => submitModal(type, modal)).then(() => {
      close();
      toast(`${labels[2]}เรียบร้อย`);
    }).catch((error) => toast(error.message));
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
}

function formOptions(list, valueIndex = 6) {
  return list.map((item) => `<option value="${item[valueIndex]}">${item[0]}</option>`).join("");
}

function customerSearchField() {
  const first = customers[0] || [];
  return `
    <label class="customer-search span-2">ลูกค้า
      <input type="hidden" name="customer_id" value="${html(first[6] || "")}">
      <input name="customer_search" data-customer-search autocomplete="off" placeholder="ค้นหาชื่อ, เบอร์โทร, ที่อยู่..." value="${html(first[0] || "")}">
      <div class="customer-results">
        ${customerResultItems(customers)}
      </div>
      <small data-selected-customer>${first[1] ? `${html(first[1])} • ${html(first[2])}` : "พิมพ์เพื่อค้นหาลูกค้าในระบบ"}</small>
    </label>
  `;
}

function customerResultItems(items) {
  return items.slice(0, 8).map((item) => `
    <button type="button" data-pick-customer="${html(item[6])}">
      <strong>${html(item[0])}</strong>
      <span>${html(item[1])} • ${html(item[2])}</span>
    </button>
  `).join("") || `<div class="empty-result">ไม่พบลูกค้า</div>`;
}

function productOptions(selectedId = "") {
  return products.map((item) => `<option value="${item.id}" data-price="${item.price}" ${String(item.id) === String(selectedId) ? "selected" : ""}>${item.name} - ฿${item.price.toLocaleString()}</option>`).join("");
}

function receiptProductResults(items = products) {
  return items.slice(0, 8).map((item) => `
    <button type="button" data-pick-receipt-product="${html(item.id)}" data-price="${html(item.price)}" data-name="${html(item.name)}">
      <strong>${html(item.name)}</strong>
      <span>${html(item.sku || "-")} • ${html(item.category || "-")} • ${money(item.price)} • เปล่า ${Number(item.stock_empty || 0).toLocaleString("th-TH")}</span>
    </button>
  `).join("") || `<div class="empty-search">ไม่พบสินค้า</div>`;
}

function receiptItemRow(index = 0, item = {}) {
  const selectedProduct = products.find((product) => String(product.id) === String(item.product_id)) || null;
  const firstProduct = selectedProduct || products[0] || {};
  const unitCost = item.unit_cost ?? firstProduct.price ?? 0;
  const quantityFull = item.quantity_full ?? 0;
  const quantityEmpty = item.quantity_empty ?? 0;
  const lineTotal = Number(unitCost || 0) * Number(quantityFull || 0);
  return `
    <div class="receipt-item-row" data-receipt-item-row>
      <div class="receipt-product-search">
        <input type="hidden" name="items[${index}][product_id]" data-receipt-product value="${html(firstProduct.id || "")}">
        <input data-receipt-product-search autocomplete="off" value="${html(firstProduct.name ? `${firstProduct.name} - ${money(firstProduct.price)}` : "")}" placeholder="ค้นหาสินค้า..." aria-label="ค้นหาสินค้า">
        <div class="receipt-product-results">${receiptProductResults(products)}</div>
      </div>
        <input name="items[${index}][unit_cost]" data-receipt-cost type="number" min="0" step="0.01" value="${html(unitCost)}" aria-label="ต้นทุน">
      <input name="items[${index}][quantity_full]" type="number" min="0" value="${html(quantityFull)}" aria-label="ถังเต็มหรือสินค้าเข้า">
      <input name="items[${index}][quantity_empty]" type="number" min="0" value="${html(quantityEmpty)}" placeholder="แลก" aria-label="ถังเปล่าไปแลก">
      <strong data-receipt-line-total>${money(lineTotal)}</strong>
      <button type="button" class="danger-icon" data-remove-receipt-item title="ลบรายการ">×</button>
    </div>
  `;
}

function salesProductResults(items = products) {
  return items.slice(0, 8).map((item) => `
    <button type="button" data-pick-sales-product="${html(item.id)}" data-price="${html(item.price)}" data-name="${html(item.name)}">
      <strong>${html(item.sku ? `${item.sku} - ${item.name}` : item.name)}</strong>
      <span>${html(item.category || "-")} • ${html(item.unit || "-")} • ${money(item.price)}</span>
    </button>
  `).join("") || `<div class="empty-search">ไม่พบสินค้า</div>`;
}

function salesItemRow(index = 0, item = {}) {
  const selectedProduct = products.find((product) => String(product.id) === String(item.product_id)) || null;
  const firstProduct = selectedProduct || products[0] || {};
  const unitPrice = item.unit_price ?? firstProduct.price ?? 0;
  const quantity = item.quantity ?? 1;
  const lineTotal = Number(unitPrice || 0) * Number(quantity || 0);
  const productText = firstProduct.name ? `${firstProduct.sku ? `${firstProduct.sku} - ` : ""}${firstProduct.name} - ${money(firstProduct.price)}` : "";
  const stockLimit = firstProduct.id ? saleStockLimit(firstProduct, todayIso) : 0;
  return `
    <div class="receipt-item-row sales-item-row" data-sales-item-row>
      <div class="receipt-product-search">
        <input type="hidden" name="items[${index}][product_id]" data-sales-product value="${html(firstProduct.id || "")}">
        <input data-sales-product-search autocomplete="off" value="${html(productText)}" placeholder="ค้นหาสินค้า..." aria-label="ค้นหาสินค้า">
        <div class="receipt-product-results">${salesProductResults(products)}</div>
        <small class="sales-stock-limit" data-sales-stock-limit>${firstProduct.id ? `Stock card ${stockLimit.toLocaleString("th-TH")}` : ""}</small>
      </div>
      <input name="items[${index}][unit_price]" data-sales-price type="number" min="0" step="0.01" value="${html(unitPrice)}" aria-label="ราคาขาย">
      <input name="items[${index}][quantity]" type="number" min="1" step="1" ${firstProduct.id ? `max="${html(stockLimit)}"` : ""} value="${html(quantity)}" aria-label="จำนวน">
      <strong data-sales-line-total>${money(lineTotal)}</strong>
      <button type="button" class="danger-icon" data-remove-sales-item title="ลบรายการ">×</button>
    </div>
  `;
}

function supplierOptions(selectedId = "") {
  return suppliers.map((item) => `<option value="${html(item.id)}" ${String(item.id) === String(selectedId) ? "selected" : ""}>${html(item.name)}</option>`).join("");
}

function supplierSearchField(selectedId = "") {
  const first = suppliers.find((item) => String(item.id) === String(selectedId)) || suppliers[0] || {};
  return `
    <label class="customer-search span-2">ตัวแทนจำหน่าย
      <input type="hidden" name="supplier_id" value="${html(first.id || "")}">
      <input name="supplier_search" data-supplier-picker autocomplete="off" placeholder="ค้นหาชื่อตัวแทน, ผู้ติดต่อ, เบอร์โทร..." value="${html(first.name || "")}">
      <div class="customer-results supplier-results">
        ${supplierResultItems(suppliers)}
      </div>
      <small data-selected-supplier>${first.phone ? `${html(first.contact_name || "-")} • ${html(first.phone || "-")}` : "พิมพ์เพื่อค้นหาตัวแทนจำหน่ายในระบบ"}</small>
    </label>
  `;
}

function supplierResultItems(items) {
  return items.slice(0, 8).map((item) => `
    <button type="button" data-pick-supplier="${html(item.id)}">
      <strong>${html(item.name || "-")}</strong>
      <span>${html(item.contact_name || "-")} • ${html(item.phone || "-")}</span>
    </button>
  `).join("") || `<div class="empty-result">ไม่พบตัวแทนจำหน่าย</div>`;
}

function categoryOptions(selected = "") {
  const base = [
    ["gas", "แก๊ส/ถัง"],
    ["accessory", "อุปกรณ์"],
    ["service", "บริการ"],
  ];
  const dynamic = [...new Set(products.map((item) => item.category).filter(Boolean))]
    .filter((category) => !base.some(([value]) => value === category))
    .map((category) => [category, category]);
  return [...base, ...dynamic]
    .map(([value, label]) => `<option value="${html(value)}" ${value === selected ? "selected" : ""}>${html(label)}</option>`)
    .join("");
}

function categorySkuPrefix(category = "") {
  const known = { gas: "GAS", accessory: "ACC", service: "SRV" };
  if (known[category]) return known[category];
  const ascii = String(category).replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
  if (ascii) {
    const code = ascii.padEnd(3, "X");
    return /^[A-Z]/.test(code) ? code : `C${code}`;
  }
  const hash = [...String(category || "product")].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 46656, 0);
  return `C${hash.toString(36).toUpperCase().padStart(3, "0")}`;
}

function nextSkuFromProducts(category = "accessory") {
  const prefix = categorySkuPrefix(category);
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d{4})$`);
  const max = products.reduce((highest, product) => {
    const match = String(product.sku || "").match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function unitOptions(selected = "") {
  const base = ["ถัง", "ชิ้น", "เส้น", "ชุด", "ใบ", "อัน", "ครั้ง", "กิโลกรัม"];
  const dynamic = [...new Set(products.map((item) => item.unit).filter(Boolean))]
    .filter((unit) => !base.includes(unit));
  return [...base, ...dynamic]
    .map((unit) => `<option value="${html(unit)}" ${unit === selected ? "selected" : ""}>${html(unit)}</option>`)
    .join("");
}

function bankOptions(selected = "") {
  const base = [
    "กสิกรไทย",
    "ไทยพาณิชย์",
    "กรุงเทพ",
    "กรุงไทย",
    "กรุงศรีอยุธยา",
    "ทหารไทยธนชาต",
    "ออมสิน",
    "ธ.ก.ส.",
    "ซีไอเอ็มบีไทย",
    "ยูโอบี",
    "แลนด์ แอนด์ เฮ้าส์",
    "เกียรตินาคินภัทร",
    "พร้อมเพย์",
  ];
  const dynamic = [...new Set(bankAccounts.map((item) => item.bank_name).filter(Boolean))]
    .filter((bank) => !base.includes(bank));
  return [...base, ...dynamic]
    .map((bank) => `<option value="${html(bank)}" ${bank === selected ? "selected" : ""}>${html(bank)}</option>`)
    .join("");
}

function bankAccountOptions(selectedId = "") {
  return bankAccounts.map((account) => {
    const label = account.bank_name || "ธนาคาร";
    return `<option value="${html(account.id)}" data-bank-name="${html(account.bank_name)}" data-account-name="${html(account.account_name)}" data-account-number="${html(account.account_number)}" data-balance="${html(account.current_balance)}" ${String(account.id) === String(selectedId) ? "selected" : ""}>${html(label)}</option>`;
  }).join("");
}

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plainMoney(value) {
  return Number(String(value || "0").replace(/[^\d.-]/g, "")) || 0;
}

function formatMoneyInput(value) {
  const raw = String(value ?? "").replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!raw) return "";
  const hasDot = raw.includes(".");
  const [integerRaw, ...decimalParts] = raw.split(".");
  const integerPart = Number(integerRaw || 0).toLocaleString("th-TH");
  const decimalPart = decimalParts.join("").slice(0, 2);
  return `${integerPart}${hasDot ? `.${decimalPart}` : ""}`;
}

function formatMoneyInputFixed(value, decimals = 2) {
  return plainMoney(value).toLocaleString("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function thaiDateInputValue(value = "") {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const parts = thaiDateParts(date);
  return `${parts.day}/${parts.month}/${Number(parts.year) + 543}`;
}

function thaiDateToIso(value = "") {
  const match = String(value).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return value;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = Number(match[3]) > 2400 ? Number(match[3]) - 543 : Number(match[3]);
  return `${year}-${month}-${day}`;
}

function isoDateInputValue(value = "") {
  const iso = thaiDateToIso(value);
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function thaiCalendarTitle(date) {
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function thaiMonthOptions(selectedMonth) {
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return months.map((month, index) => `<option value="${index}" ${index === selectedMonth ? "selected" : ""}>${month}</option>`).join("");
}

function thaiYearOptions(selectedYear) {
  const start = selectedYear - 5;
  return Array.from({ length: 11 }, (_, index) => start + index)
    .map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year + 543}</option>`)
    .join("");
}

function openBusinessModal(type, record = {}) {
  const isEditCustomer = type === "customer" && record.id;
  const templates = {
    customer: {
      title: isEditCustomer ? "แก้ไขลูกค้า" : "เพิ่มลูกค้า",
      subtitle: isEditCustomer ? "ปรับข้อมูลลูกค้า เบอร์ ที่อยู่ เครดิต และข้อมูลถัง" : "บันทึกข้อมูลลูกค้าให้ครบสำหรับขาย เครดิต และติดตามถัง",
      submit: isEditCustomer ? "บันทึกการแก้ไข" : "บันทึกลูกค้า",
      body: `
        <div class="modal-grid">
          <input type="hidden" name="id" value="${html(record.id || "")}">
          <label>ชื่อลูกค้า / ร้านค้า<input name="name" required placeholder="เช่น ร้านอาหารครัวคุณนิด" value="${html(record.name || "")}"></label>
          <label>เบอร์โทร<input name="phone" placeholder="081-234-5678" value="${html(record.phone || "")}"></label>
          <label>LINE<input name="line_id" placeholder="เช่น lineid หรือ @ร้านแก๊ส" value="${html(record.line_id || "")}"></label>
          <label class="span-2">ที่อยู่จัดส่ง<textarea name="address" placeholder="บ้านเลขที่ หมู่บ้าน ถนน อำเภอ จังหวัด">${html(record.address || "")}</textarea></label>
          <label>ประเภทลูกค้า<select name="customer_type">
            ${["ทั่วไป", "VIP", "เครดิต", "ร้านค้า"].map((option) => `<option ${option === record.customer_type ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label>วงเงินเครดิต<input name="credit_limit" type="number" min="0" value="${html(record.credit_limit || 0)}"></label>
          <label>ยอดค้าง<input name="balance_due" type="number" min="0" value="${html(record.balance_due || 0)}"></label>
          <label>ถังอยู่กับลูกค้า<input name="cylinders_on_hand" placeholder="เช่น 15kg 2 ถัง, 48kg 1 ถัง" value="${html(record.cylinders_on_hand || "")}"></label>
          <label>Latitude<input name="latitude" inputmode="decimal" placeholder="13.9121827" value="${html(record.latitude || "")}"></label>
          <label>Longitude<input name="longitude" inputmode="decimal" placeholder="100.4988192" value="${html(record.longitude || "")}"></label>
          <div class="span-2 geo-actions">
            <button type="button" class="wide-secondary" data-use-current-location>ใช้พิกัดตำแหน่งปัจจุบัน</button>
            <small>ใช้ตอนพนักงานอยู่หน้าบ้านลูกค้าเพื่อปักหมุดจัดส่งครั้งต่อไป</small>
          </div>
        </div>
      `,
    },
    supplier: {
      title: record.id ? "แก้ไขตัวแทนจำหน่าย" : "เพิ่มตัวแทนจำหน่าย",
      subtitle: record.id ? "ปรับข้อมูลผู้จำหน่าย ผู้ติดต่อ เครดิต และหมายเหตุ" : "บันทึกข้อมูลผู้จำหน่ายสำหรับสั่งซื้อแก๊ส อุปกรณ์ และบริการจากภายนอก",
      submit: record.id ? "บันทึกการแก้ไข" : "บันทึกตัวแทน",
      body: `
        <div class="modal-grid">
          <input type="hidden" name="id" value="${html(record.id || "")}">
          <label>ชื่อตัวแทน / บริษัท<input name="name" required placeholder="เช่น บริษัท แก๊สไทย จำกัด" value="${html(record.name || "")}"></label>
          <label>ชื่อผู้ติดต่อ<input name="contact_name" placeholder="เช่น คุณสมชาย ฝ่ายขาย" value="${html(record.contact_name || "")}"></label>
          <label>เบอร์โทร<input name="phone" placeholder="02-000-0000, 081-234-5678" value="${html(record.phone || "")}"></label>
          <label>เลขผู้เสียภาษี<input name="tax_id" placeholder="0100000000000" value="${html(record.tax_id || "")}"></label>
          <label class="span-2">ที่อยู่<textarea name="address" placeholder="ที่อยู่บริษัท / คลังสินค้า">${html(record.address || "")}</textarea></label>
          <label>เงื่อนไขชำระเงิน<input name="payment_terms" placeholder="เช่น เงินสด, เครดิต 7 วัน, เครดิต 30 วัน" value="${html(record.payment_terms || "")}"></label>
          <label>หมายเหตุ<input name="note" placeholder="เช่น ส่งของทุกวันจันทร์, ราคาพิเศษ LPG" value="${html(record.note || "")}"></label>
        </div>
      `,
    },
    bankAccount: {
      title: record.id ? "แก้ไขบัญชีธนาคาร" : "เพิ่มบัญชีธนาคาร",
      subtitle: record.id ? "ปรับข้อมูลธนาคาร เลขบัญชี และยอดคงเหลือ" : "บันทึกสมุดบัญชีธนาคารของร้านสำหรับรับเงินและจ่ายซัพพลายเออร์",
      submit: record.id ? "บันทึกการแก้ไข" : "บันทึกบัญชี",
      body: `
        <div class="modal-grid">
          <input type="hidden" name="id" value="${html(record.id || "")}">
          <label>ธนาคาร<select name="bank_name" data-bank-select>${bankOptions(record.bank_name)}<option value="__new">+ เพิ่มธนาคารใหม่</option></select></label>
          <label data-new-bank-wrap style="display:none">ชื่อธนาคารใหม่<input name="bank_name_new" placeholder="เช่น ธนาคารท้องถิ่น หรือบัญชีเงินสด"></label>
          <label>ชื่อบัญชี<input name="account_name" required placeholder="เช่น ร้านแก๊ส GasFlow" value="${html(record.account_name || "")}"></label>
          <label>เลขบัญชี<input name="account_number" required placeholder="123-1-23456-7" value="${html(record.account_number || "")}"></label>
          <label>สาขา<input name="branch_name" placeholder="เช่น ปากเกร็ด" value="${html(record.branch_name || "")}"></label>
          <label>ประเภทบัญชี<select name="account_type">
            ${["ออมทรัพย์", "กระแสรายวัน", "ฝากประจำ", "พร้อมเพย์", "อื่นๆ"].map((option) => `<option ${option === record.account_type ? "selected" : ""}>${option}</option>`).join("")}
          </select></label>
          <label>ยอดตั้งต้น<input name="opening_balance" type="number" min="0" step="0.01" value="${html(record.opening_balance ?? 0)}"></label>
          <label>ยอดคงเหลือ<input name="current_balance" type="number" min="0" step="0.01" value="${html(record.current_balance ?? record.opening_balance ?? 0)}"></label>
          <label>หมายเหตุ<input name="note" placeholder="เช่น บัญชีหลักรับโอน/QR" value="${html(record.note || "")}"></label>
        </div>
      `,
    },
    goodsReceipt: {
      title: record.id ? "แก้ไขใบรับสินค้า" : "เพิ่มใบรับสินค้า",
      subtitle: "รับถังเต็มเข้าสต็อกจากตัวแทนจำหน่าย และตัดถังเปล่าที่นำไปแลกทันที",
      submit: record.id ? "บันทึกการแก้ไข" : "บันทึกใบรับ",
      body: `
        <div class="modal-grid">
          <input type="hidden" name="id" value="${html(record.id || "")}">
          ${supplierSearchField(record.supplier_id)}
          <label class="thai-date-field">วันที่รับ
            <input name="received_at" data-thai-date-display inputmode="numeric" placeholder="04/05/2569" value="${html(thaiDateInputValue(record.received_at))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่รับ">▣</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label>เลขอ้างอิง / ใบส่งของ<input name="invoice_no" placeholder="เช่น INV-SUP-0001" value="${html(record.invoice_no || "")}"></label>
          <label>วิธีจ่ายเงิน<select name="payment_method" data-receipt-payment-method>
            <option value="credit" ${record.payment_method === "credit" ? "selected" : ""}>เครดิต / ยังไม่จ่าย</option>
            <option value="cash" ${record.payment_method === "cash" ? "selected" : ""}>เงินสด</option>
            <option value="transfer" ${record.payment_method === "transfer" ? "selected" : ""}>เงินโอน</option>
          </select></label>
          <label data-receipt-credit-wrap>จำนวนวันเครดิต<input name="credit_days" type="number" min="0" step="1" value="${html(record.credit_days ?? 30)}" placeholder="เช่น 7, 15, 30"></label>
          <label>ประเภท VAT<select name="vat_type" data-receipt-vat-type><option value="exclusive" ${record.vat_type !== "inclusive" ? "selected" : ""}>VAT นอก</option><option value="inclusive" ${record.vat_type === "inclusive" ? "selected" : ""}>VAT ใน</option></select></label>
          <label>ภาษีมูลค่าเพิ่ม (VAT %)<input name="vat_rate" data-receipt-vat-rate type="number" min="0" max="100" step="0.01" value="${html(record.vat_rate ?? 7)}"></label>
          <label class="span-2 goods-note">หมายเหตุ<input name="note" placeholder="เช่น รับจากรถ supplier รอบเช้า" value="${html(record.note || "")}"></label>
          <label class="span-3 receipt-bank-field" data-receipt-bank-wrap style="display:none">บัญชีธนาคารของร้านที่ใช้โอน<select name="bank_account_id">${bankAccountOptions(record.bank_account_id)}</select><small data-receipt-bank-detail></small></label>
          <div class="span-2 receipt-items">
            <div class="receipt-items-head">
              <strong>รายการสินค้า</strong>
              <button type="button" data-add-receipt-item>+ เพิ่มรายการ</button>
            </div>
            <div class="receipt-items-grid-head">
              <span>สินค้า</span>
              <span>ต้นทุน</span>
              <span>ถังเต็ม/เข้า</span>
              <span>ถังเปล่าไปแลก</span>
              <span>รวมเงิน</span>
              <span></span>
            </div>
            <div data-receipt-items>
              ${(record.items && record.items.length ? record.items : [{}]).map((item, index) => receiptItemRow(index, item)).join("")}
            </div>
            <div class="receipt-summary">
              <div class="receipt-summary-title">สรุปยอดรับสินค้า</div>
              <div class="receipt-summary-row"><span>ยอดก่อน VAT</span><strong data-receipt-subtotal>฿0</strong></div>
              <div class="receipt-summary-row"><span>ภาษีมูลค่าเพิ่ม</span><strong data-receipt-vat-amount>฿0</strong></div>
              <div class="receipt-summary-row total"><span>รวมสุทธิทั้งใบ</span><strong data-receipt-grand-total>฿0</strong></div>
            </div>
          </div>
        </div>
      `,
    },
    customerReceiptVoucher: {
      title: "ใบสำคัญรับเงินจากลูกค้า",
      subtitle: "รับชำระจากใบส่งสินค้า หรือใบส่งของ/ใบกำกับภาษีที่เป็นเครดิต",
      submit: "บันทึกใบสำคัญรับเงิน",
      body: `
        <div class="modal-grid">
          ${customerReceiptDocumentSearchField(record.order_id || record.id)}
          <label class="thai-date-field">วันที่รับเงิน
            <input name="paid_at" data-thai-date-display inputmode="numeric" placeholder="05/05/2569" value="${html(thaiDateInputValue(record.paid_at || new Date().toISOString().slice(0, 10)))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่รับเงิน">▣</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label>วิธีรับเงิน<select name="payment_method" data-customer-receipt-method>
            <option value="cash">เงินสด</option>
            <option value="transfer">เงินโอน</option>
          </select></label>
          <label>เลขที่ใบสำคัญ<input name="reference_no" data-customer-receipt-no readonly value="${html(record.reference_no || nextCustomerReceiptNo(todayIso))}"></label>
          <label>ยอดรับ<input name="amount" data-customer-receipt-amount inputmode="decimal" autocomplete="off" value="0.00"></label>
          <label>ลดหนี้<input name="debt_reduction_amount" data-customer-receipt-reduction inputmode="decimal" autocomplete="off" value="0.00"></label>
          <label>ตัดหนี้รวม<input data-customer-receipt-settlement readonly value="0.00"></label>
          <label class="span-2 payable-bank-field" data-customer-receipt-bank-wrap style="display:none">บัญชีธนาคารของร้าน<select name="bank_account_id">${bankAccountOptions(record.bank_account_id)}</select><small data-customer-receipt-bank-detail></small></label>
          <label class="span-2">หมายเหตุ<input name="note" placeholder="เช่น รับชำระจากลูกค้า / เลขสลิป / รอบวางบิล"></label>
          <div class="span-2 payable-preview customer-receipt-preview" data-customer-receipt-preview></div>
        </div>
      `,
    },
    supplierPaymentVoucher: {
      title: "ใบสำคัญจ่ายเจ้าหนี้",
      subtitle: "บันทึกจ่ายเงินให้ตัวแทนจำหน่ายจากใบรับสินค้าที่เป็นเครดิต",
      submit: "บันทึกใบสำคัญจ่าย",
      body: `
        <div class="modal-grid">
          <label class="span-2">ใบรับสินค้าที่ค้างจ่าย<select name="goods_receipt_id" data-payable-receipt required>${payableReceiptOptions(record.goods_receipt_id || record.id)}</select></label>
          <label class="thai-date-field">วันที่จ่าย
            <input name="paid_at" data-thai-date-display inputmode="numeric" placeholder="05/05/2569" value="${html(thaiDateInputValue(record.paid_at || new Date().toISOString().slice(0, 10)))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่จ่าย">▣</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label>วิธีจ่ายเงิน<select name="payment_method" data-payable-method>
            <option value="cash">เงินสด</option>
            <option value="transfer">เงินโอน</option>
          </select></label>
          <label class="span-2 payable-bank-field" data-payable-bank-wrap style="display:none">บัญชีธนาคารของร้าน<select name="bank_account_id">${bankAccountOptions()}</select><small data-payable-bank-detail></small></label>
          <label>ยอดจ่าย<input name="amount" data-payable-amount type="number" min="0" step="0.01" value="0"></label>
          <label>เลขอ้างอิง / เลขสลิป<input name="reference_no" readonly value="${html(record.reference_no || nextSupplierPaymentReference())}"></label>
          <label class="span-2">หมายเหตุ<input name="note" placeholder="เช่น จ่ายค่าสินค้ารอบเช้า"></label>
          <div class="span-2 payable-preview" data-payable-preview></div>
        </div>
      `,
    },
    cashBill: {
      title: "เพิ่มบิลเงินสด",
      subtitle: "ขายสินค้าแบบรับเงินทันที แนวคิดเดียวกับใบรับสินค้า: เลือกลูกค้า เพิ่มสินค้าได้หลายรายการ และเห็นสรุปยอดก่อนบันทึก",
      submit: "บันทึกบิลเงินสด",
      body: `
        <div class="modal-grid">
          ${customerSearchField()}
          <input type="hidden" name="payment_method" value="cash">
          <label>เลขที่เอกสาร<input name="document_no" data-sales-document-no readonly value="${html(nextCashBillNo(todayIso))}"></label>
          <label class="thai-date-field">วันที่ขาย
            <input name="sold_at" data-thai-date-display inputmode="numeric" placeholder="05/05/2569" value="${html(thaiDateInputValue(todayIso))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่ขาย">▾</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label class="span-2">หมายเหตุ<input name="note" placeholder="เช่น ขายหน้าร้าน / ลูกค้ารับเอง / ส่งทันที"></label>
          <div class="span-2 receipt-items sales-bill-items">
            <div class="receipt-items-head">
              <strong>รายการสินค้า</strong>
              <button type="button" data-add-sales-item>+ เพิ่มรายการ</button>
            </div>
            <div class="receipt-items-grid-head sales-items-grid-head">
              <span>สินค้า</span>
              <span>ราคา</span>
              <span>จำนวน</span>
              <span>รวมเงิน</span>
              <span></span>
            </div>
            <div data-sales-items>
              ${salesItemRow(0)}
            </div>
            <div class="receipt-summary sales-summary">
              <div class="receipt-summary-row"><span>ยอดขาย</span><strong data-sales-subtotal>฿0.00</strong></div>
              <div class="receipt-summary-row"><span>จำนวนรายการ</span><strong data-sales-count>0</strong></div>
              <div class="receipt-summary-row total"><span>รวมสุทธิ</span><strong data-sales-grand-total>฿0.00</strong></div>
            </div>
          </div>
        </div>
      `,
    },
    cashTaxInvoice: {
      title: "เพิ่มบิลเงินสด/ใบกำกับภาษี",
      subtitle: "ขายเงินสดพร้อมภาษีมูลค่าเพิ่ม เลือกลูกค้า เพิ่มสินค้าได้หลายรายการ และเห็นยอดก่อน VAT / VAT / รวมสุทธิก่อนบันทึก",
      submit: "บันทึกบิลเงินสด/ใบกำกับภาษี",
      body: `
        <div class="modal-grid">
          ${customerSearchField()}
          <input type="hidden" name="payment_method" value="cash">
          <label>เลขที่เอกสาร<input name="document_no" data-sales-document-no data-sales-document-prefix="VCS" readonly value="${html(nextCashTaxInvoiceNo(todayIso))}"></label>
          <label class="thai-date-field">วันที่ขาย
            <input name="sold_at" data-thai-date-display inputmode="numeric" placeholder="05/05/2569" value="${html(thaiDateInputValue(todayIso))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่ขาย">▾</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label>ประเภท VAT<select name="vat_type" data-sales-vat-type>
            <option value="exclusive" selected>VAT นอก</option>
            <option value="inclusive">VAT ใน</option>
          </select></label>
          <label>ภาษีมูลค่าเพิ่ม (VAT %)<input name="vat_rate" data-sales-vat-rate type="number" min="0" step="0.01" value="7"></label>
          <label class="span-2">หมายเหตุ<input name="note" placeholder="เช่น ขายหน้าร้าน / ลูกค้ารับเอง / ส่งทันที"></label>
          <div class="span-2 receipt-items sales-bill-items">
            <div class="receipt-items-head">
              <strong>รายการสินค้า</strong>
              <button type="button" data-add-sales-item>+ เพิ่มรายการ</button>
            </div>
            <div class="receipt-items-grid-head sales-items-grid-head">
              <span>สินค้า</span>
              <span>ราคา</span>
              <span>จำนวน</span>
              <span>รวมเงิน</span>
              <span></span>
            </div>
            <div data-sales-items>
              ${salesItemRow(0)}
            </div>
            <div class="receipt-summary sales-summary">
              <div class="receipt-summary-row"><span>ยอดก่อน VAT</span><strong data-sales-subtotal>฿0.00</strong></div>
              <div class="receipt-summary-row"><span>VAT</span><strong data-sales-vat-amount>฿0.00</strong></div>
              <div class="receipt-summary-row"><span>จำนวนรายการ</span><strong data-sales-count>0</strong></div>
              <div class="receipt-summary-row total"><span>รวมสุทธิ</span><strong data-sales-grand-total>฿0.00</strong></div>
            </div>
          </div>
        </div>
      `,
    },
    deliveryTaxInvoice: {
      title: "เพิ่มใบส่งของ/ใบกำกับภาษี",
      subtitle: "ขายเครดิตพร้อมภาษีมูลค่าเพิ่ม แนวคิดเดียวกับบิลเงินสด/ใบกำกับภาษี แต่บันทึกเป็นยอดค้างชำระและพิมพ์ใบส่งของได้",
      submit: "บันทึกใบส่งของ/ใบกำกับภาษี",
      body: `
        <div class="modal-grid">
          ${customerSearchField()}
          <input type="hidden" name="payment_method" value="credit">
          <label>เลขที่เอกสาร<input name="document_no" data-sales-document-no data-sales-document-prefix="VDN" readonly value="${html(nextDeliveryTaxInvoiceNo(todayIso))}"></label>
          <label class="thai-date-field">วันที่ส่ง
            <input name="sold_at" data-thai-date-display inputmode="numeric" placeholder="05/05/2569" value="${html(thaiDateInputValue(todayIso))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่ส่ง">▾</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label>เครดิต (วัน)<input name="credit_days" type="number" min="0" step="1" value="30"></label>
          <label>เวลาส่ง<input name="delivery_time" type="time" value="09:30"></label>
          <label>ประเภท VAT<select name="vat_type" data-sales-vat-type>
            <option value="exclusive" selected>VAT นอก</option>
            <option value="inclusive">VAT ใน</option>
          </select></label>
          <label>ภาษีมูลค่าเพิ่ม (VAT %)<input name="vat_rate" data-sales-vat-rate type="number" min="0" step="0.01" value="7"></label>
          <label class="span-2">ที่อยู่จัดส่ง<textarea name="delivery_address" placeholder="ใส่ที่อยู่ส่งสินค้า หรือเลือกจากข้อมูลลูกค้า"></textarea></label>
          <label class="span-2">หมายเหตุ<input name="note" placeholder="เช่น เครดิต 30 วัน / ส่งตามรอบ / ผู้รับสินค้า"></label>
          <div class="span-2 receipt-items sales-bill-items">
            <div class="receipt-items-head">
              <strong>รายการสินค้า</strong>
              <button type="button" data-add-sales-item>+ เพิ่มรายการ</button>
            </div>
            <div class="receipt-items-grid-head sales-items-grid-head">
              <span>สินค้า</span>
              <span>ราคา</span>
              <span>จำนวน</span>
              <span>รวมเงิน</span>
              <span></span>
            </div>
            <div data-sales-items>
              ${salesItemRow(0)}
            </div>
            <div class="receipt-summary sales-summary">
              <div class="receipt-summary-row"><span>ยอดก่อน VAT</span><strong data-sales-subtotal>฿0.00</strong></div>
              <div class="receipt-summary-row"><span>VAT</span><strong data-sales-vat-amount>฿0.00</strong></div>
              <div class="receipt-summary-row"><span>จำนวนรายการ</span><strong data-sales-count>0</strong></div>
              <div class="receipt-summary-row total"><span>รวมสุทธิ</span><strong data-sales-grand-total>฿0.00</strong></div>
            </div>
          </div>
        </div>
      `,
    },
    deliveryNote: {
      title: "เพิ่มใบส่งสินค้า",
      subtitle: "ขายสินค้าแบบเครดิต แนวคิดเดียวกับบิลเงินสด: เลือกลูกค้า เพิ่มสินค้าได้หลายรายการ ออกเลขเอกสารอัตโนมัติ และพิมพ์ได้",
      submit: "บันทึกใบส่งสินค้า",
      body: `
        <div class="modal-grid">
          ${customerSearchField()}
          <label>เลขที่เอกสาร<input name="document_no" data-sales-document-no data-sales-document-prefix="SND" readonly value="${html(nextDeliveryNoteNo(todayIso))}"></label>
          <label class="thai-date-field">วันที่ส่ง
            <input name="sold_at" data-thai-date-display inputmode="numeric" placeholder="05/05/2569" value="${html(thaiDateInputValue(todayIso))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่ส่ง">▾</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label>เครดิต (วัน)<input name="credit_days" type="number" min="0" step="1" value="30"></label>
          <label>เวลาส่ง<input name="delivery_time" type="time" value="09:30"></label>
          <label class="span-2">ที่อยู่จัดส่ง<textarea name="delivery_address" placeholder="ใส่ที่อยู่ส่งสินค้า หรือเลือกจากข้อมูลลูกค้า"></textarea></label>
          <label class="span-2">หมายเหตุ<input name="note" placeholder="เช่น เครดิต 30 วัน / ส่งตามรอบ / ผู้รับสินค้า"></label>
          <div class="span-2 receipt-items sales-bill-items">
            <div class="receipt-items-head">
              <strong>รายการสินค้า</strong>
              <button type="button" data-add-sales-item>+ เพิ่มรายการ</button>
            </div>
            <div class="receipt-items-grid-head sales-items-grid-head">
              <span>สินค้า</span>
              <span>ราคา</span>
              <span>จำนวน</span>
              <span>รวมเงิน</span>
              <span></span>
            </div>
            <div data-sales-items>
              ${salesItemRow(0)}
            </div>
            <div class="receipt-summary sales-summary">
              <div class="receipt-summary-row"><span>ยอดเครดิต</span><strong data-sales-subtotal>฿0.00</strong></div>
              <div class="receipt-summary-row"><span>จำนวนรายการ</span><strong data-sales-count>0</strong></div>
              <div class="receipt-summary-row total"><span>รวมสุทธิ</span><strong data-sales-grand-total>฿0.00</strong></div>
            </div>
          </div>
        </div>
      `,
    },
    bill: {
      title: "เปิดบิล / ขายแก๊ส",
      subtitle: "สร้างออเดอร์ขายพร้อมคิวจัดส่งและรายการสินค้า",
      submit: "บันทึกบิลขาย",
      body: `
        <div class="modal-grid">
          ${customerSearchField()}
          <label>เวลาจัดส่ง<input name="delivery_time" type="time" value="09:30"></label>
          <label>สินค้า<select name="product_id">${productOptions(record.product_id)}</select></label>
          <label>จำนวน<input name="quantity" type="number" min="1" value="1"></label>
          <label>ราคาต่อหน่วย<input name="unit_price" type="number" min="0" value="${products[0]?.price || 380}"></label>
          <label>สถานะชำระเงิน<select name="payment_status"><option>รอชำระ</option><option>ชำระแล้ว</option><option>เก็บเงินปลายทาง</option></select></label>
          <label class="span-2">ที่อยู่จัดส่ง<textarea name="delivery_address">${customers[0]?.[2] || ""}</textarea></label>
        </div>
      `,
    },
    payment: {
      title: "รับเงิน",
      subtitle: "รับชำระหนี้หรือรับเงินจากบิลขาย",
      submit: "บันทึกรับเงิน",
      body: `
        <div class="modal-grid">
          ${customerSearchField()}
          <label>ช่องทาง<select name="method"><option>เงินสด</option><option>โอน/QR</option><option>บัตรเครดิต</option></select></label>
          <label>ยอดรับชำระ<input name="amount" type="number" min="0" value="380" required></label>
          <label>เลขอ้างอิง / หมายเหตุ<input name="note" placeholder="เลขสลิป หรือหมายเหตุ"></label>
        </div>
      `,
    },
    generalReceipt: {
      title: record.id ? "แก้ไขใบรับเงินทั่วไป" : "ใบรับเงินทั่วไป",
      subtitle: "ใช้รับเงินที่ไม่ได้อ้างอิงใบส่งสินค้า เช่น รายได้อื่น เงินมัดจำ หรือรับคืนค่าใช้จ่าย",
      submit: record.id ? "บันทึกการแก้ไข" : "บันทึกใบรับเงิน",
      body: `
        <div class="modal-grid">
          <input type="hidden" name="id" value="${html(record.id || "")}">
          <label>เลขที่เอกสาร<input name="payment_no" readonly value="${html(record.payment_no || nextGeneralReceiptNo(todayIso))}"></label>
          <label class="thai-date-field">วันที่รับ
            <input name="paid_at" data-thai-date-display inputmode="numeric" placeholder="05/05/2569" value="${html(thaiDateInputValue(record.paid_at || todayIso))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่รับ">▾</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label class="span-2">รับจาก<input name="party_name" required placeholder="เช่น ลูกค้าหน้าร้าน / บริษัท / รายได้อื่น" value="${html(record.party_name || record.customer_name || "")}"></label>
          <label class="span-2">รายการรับ<input name="description" required placeholder="เช่น ค่าเช่าถัง, เงินมัดจำ, รายได้อื่น, รับคืนค่าใช้จ่าย" value="${html(record.description || "")}"></label>
          <label>วิธีรับเงิน<select name="payment_method" data-general-finance-method>
            <option value="cash" ${!isTransferMethod(record.method) ? "selected" : ""}>เงินสด</option>
            <option value="transfer" ${isTransferMethod(record.method) ? "selected" : ""}>เงินโอน</option>
          </select></label>
          <label>ยอดรับ<input name="amount" type="number" min="0" step="0.01" required placeholder="0.00" value="${html(record.amount || "")}"></label>
          <label class="span-2 payable-bank-field" data-general-finance-bank-wrap style="display:none">บัญชีธนาคารของร้าน<select name="bank_account_id">${bankAccountOptions(record.bank_account_id)}</select><small data-general-finance-bank-detail></small></label>
          <label>เลขอ้างอิง / เลขสลิป<input name="reference_no" placeholder="ถ้าไม่กรอก ระบบจะใช้เลขที่เอกสาร" value="${html(record.reference_no || "")}"></label>
          <label>หมายเหตุ<input name="note" placeholder="เช่น รับเงินมัดจำ / รายได้อื่น" value="${html(record.note || "")}"></label>
        </div>
      `,
    },
    generalPayment: {
      title: record.id ? "แก้ไขใบสำคัญจ่ายทั่วไป" : "ใบสำคัญจ่ายทั่วไป",
      subtitle: "ใช้บันทึกจ่ายเงินทั่วไปที่ไม่ได้อ้างอิงใบรับสินค้า เช่น ค่าใช้จ่ายประจำวัน ค่าบริการ หรือเงินทดรอง",
      submit: record.id ? "บันทึกการแก้ไข" : "บันทึกใบสำคัญจ่าย",
      body: `
        <div class="modal-grid">
          <input type="hidden" name="id" value="${html(record.id || "")}">
          <label>เลขที่เอกสาร<input name="expense_no" readonly value="${html(record.expense_no || nextGeneralPaymentNo(todayIso))}"></label>
          <label class="thai-date-field">วันที่จ่าย
            <input name="paid_at" data-thai-date-display inputmode="numeric" placeholder="05/05/2569" value="${html(thaiDateInputValue(record.expense_at || record.paid_at || todayIso))}">
            <button type="button" data-thai-date-toggle aria-label="เลือกวันที่จ่าย">▾</button>
            <div class="thai-calendar" data-thai-calendar></div>
          </label>
          <label class="span-2">จ่ายให้<input name="payee_name" required placeholder="เช่น พนักงาน / ร้านค้า / ผู้ให้บริการ" value="${html(record.payee_name || "")}"></label>
          <label>หมวดหมู่<input name="category" placeholder="เช่น ค่าน้ำมัน, ค่าแรง, ค่าเช่า, อื่นๆ" value="${html(record.category || "ทั่วไป")}"></label>
          <label>วิธีจ่ายเงิน<select name="payment_method" data-general-finance-method>
            <option value="cash" ${!isTransferMethod(record.payment_method || record.paid_by) ? "selected" : ""}>เงินสด</option>
            <option value="transfer" ${isTransferMethod(record.payment_method || record.paid_by) ? "selected" : ""}>เงินโอน</option>
          </select></label>
          <label class="span-2 payable-bank-field" data-general-finance-bank-wrap style="display:none">บัญชีธนาคารของร้าน<select name="bank_account_id">${bankAccountOptions(record.bank_account_id)}</select><small data-general-finance-bank-detail></small></label>
          <label>ยอดจ่าย<input name="amount" type="number" min="0" step="0.01" required placeholder="0.00" value="${html(record.amount || "")}"></label>
          <label>เลขอ้างอิง / เลขสลิป<input name="reference_no" placeholder="เช่น SLIP-0001" value="${html(record.reference_no || "")}"></label>
          <label class="span-2">รายละเอียด<input name="description" required placeholder="เช่น จ่ายค่าน้ำมันรถส่งของ" value="${html(record.description || "")}"></label>
          <label class="span-2">หมายเหตุ<input name="note" placeholder="รายละเอียดเพิ่มเติม" value="${html(record.note || "")}"></label>
        </div>
      `,
    },
    product: {
      title: record.id ? "แก้ไขสินค้า / ถัง" : "เพิ่มสินค้า / ถัง",
      subtitle: record.id ? "ปรับชื่อ หมวดหมู่ ราคา และจำนวนคงเหลือของสินค้า" : "เพิ่มสินค้าใหม่ เช่น ถังแก๊ส อุปกรณ์ หรือค่าบริการ",
      submit: record.id ? "บันทึกการแก้ไข" : "บันทึกสินค้า",
      body: `
        <div class="modal-grid">
          <input type="hidden" name="id" value="${html(record.id || "")}">
          <label>รหัสสินค้า<input name="sku" data-auto-sku placeholder="GAS-0001" value="${html(record.sku || "")}"></label>
          <label>ชื่อสินค้า<input name="name" required placeholder="แก๊ส 15 กก." value="${html(record.name || "")}"></label>
          <label>หมวดหมู่<select name="category" data-category-select>${categoryOptions(record.category)}<option value="__new">+ เพิ่มหมวดหมู่ใหม่</option></select></label>
          <label data-new-category-wrap style="display:none">ชื่อหมวดหมู่ใหม่<input name="category_new" placeholder="เช่น อะไหล่, ค่าบริการ, โปรโมชั่น"></label>
          <label>หน่วยนับ<select name="unit" data-unit-select>${unitOptions(record.unit)}<option value="__new">+ เพิ่มหน่วยนับใหม่</option></select></label>
          <label data-new-unit-wrap style="display:none">ชื่อหน่วยนับใหม่<input name="unit_new" placeholder="เช่น แพ็ค, กล่อง, เมตร"></label>
          <label>ราคาขาย<input name="unit_price" type="number" min="0" value="${html(record.price ?? record.unit_price ?? 0)}"></label>
          <label>${record.id ? "ถังเต็ม / คงเหลือปัจจุบัน" : "ยอดตั้งต้นถังเต็ม"}<input name="stock_full" type="number" value="${html(record.stock_full ?? record.stock ?? 0)}"></label>
          <label>${record.id ? "ถังเปล่าปัจจุบัน" : "ยอดตั้งต้นถังเปล่า"}<input name="stock_empty" type="number" value="${html(record.stock_empty ?? 0)}"></label>
          <label>จุดเตือนสต็อก<input name="reorder_level" type="number" value="${html(record.reorder_level ?? 0)}"></label>
          <div class="span-2 modal-hint">${record.id ? "ถ้าแก้จำนวนคงเหลือ ระบบจะบันทึกส่วนต่างลง Stock card เพื่อเก็บประวัติ" : "ใช้กรอกจำนวนสินค้าเริ่มต้นตอนลงระบบใหม่ ระบบจะบันทึกเป็นยอดตั้งต้นใน Stock card"}</div>
        </div>
      `,
    },
    stock: {
      title: "ปรับสต็อก",
      subtitle: "บันทึกรับเข้า ขายออก รับถังเปล่า หรือปรับยอดตรวจนับ",
      submit: "บันทึกสต็อก",
      body: `
        <div class="modal-grid">
          <label>สินค้า<select name="product_id">${productOptions(record.product_id)}</select></label>
          <label>ประเภท<select name="movement_type"><option value="opening">ตั้งยอดเริ่มต้น</option><option value="receive">รับเข้า</option><option value="sale">ขายออก</option><option value="return_empty">รับถังเปล่ากลับ</option><option value="adjust">ปรับยอดตรวจนับ</option></select></label>
          <label>เปลี่ยนถังเต็ม<input name="full_delta" type="number" value="0"></label>
          <label>เปลี่ยนถังเปล่า<input name="empty_delta" type="number" value="0"></label>
          <label class="span-2">หมายเหตุ<input name="note" placeholder="เช่น รับของจาก supplier / ตรวจนับสิ้นวัน"></label>
        </div>
      `,
    },
    expense: {
      title: "บันทึกจ่ายเงิน",
      subtitle: "บันทึกค่าใช้จ่ายประจำวันของร้าน",
      submit: "บันทึกจ่าย",
      body: `
        <div class="modal-grid">
          <label>หมวดค่าใช้จ่าย<select name="category"><option>ค่าน้ำมัน</option><option>ค่าซ่อมรถ</option><option>ค่าแรง</option><option>ซื้ออุปกรณ์</option><option>อื่น ๆ</option></select></label>
          <label>จ่ายโดย<select name="paid_by"><option>เงินสด</option><option>โอน/QR</option><option>บัญชีร้าน</option></select></label>
          <label class="span-2">รายละเอียด<input name="description" required placeholder="เช่น ค่าน้ำมันรถส่งแก๊ส"></label>
          <label>จำนวนเงิน<input name="amount" type="number" min="0" value="0" required></label>
        </div>
      `,
    },
  };

  const spec = templates[type] || templates.bill;
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <section class="modal wide modal-${type}">
      <button class="modal-close" aria-label="close">×</button>
      <h2>${spec.title}</h2>
      <p>${spec.subtitle}</p>
      <form data-business-form="${type}">
        ${spec.body}
        <div class="modal-actions">
          ${type === "goodsReceipt" ? `
            <div class="modal-action-summary">
              <span>ก่อน VAT <strong data-receipt-subtotal-footer>฿0.00</strong></span>
              <span><em data-receipt-vat-label>VAT</em> <strong data-receipt-vat-amount-footer>฿0</strong></span>
              <span>รวมสุทธิ <strong data-receipt-grand-total-footer>฿0</strong></span>
            </div>
          ` : (type === "cashBill" || type === "deliveryNote" || type === "cashTaxInvoice" || type === "deliveryTaxInvoice") ? `
            <div class="modal-action-summary">
              <span>${type === "deliveryNote" ? "ยอดเครดิต" : (type === "cashTaxInvoice" || type === "deliveryTaxInvoice") ? "ก่อน VAT" : "ยอดขาย"} <strong data-sales-subtotal-footer>฿0.00</strong></span>
              ${(type === "cashTaxInvoice" || type === "deliveryTaxInvoice") ? `<span>VAT <strong data-sales-vat-amount-footer>฿0.00</strong></span>` : ""}
              <span>รายการ <strong data-sales-count-footer>0</strong></span>
              <span>รวมสุทธิ <strong data-sales-grand-total-footer>฿0.00</strong></span>
            </div>
          ` : ""}
          <button class="secondary" type="button">ยกเลิก</button>
          <button class="confirm" type="submit">${spec.submit}</button>
        </div>
      </form>
    </section>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelector(".secondary").addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  wireCustomerSearch(modal);
  wireSupplierSearch(modal);
  wireCategoryInput(modal);
  wireUnitInput(modal);
  wireBankInput(modal);
  wireThaiDatePicker(modal);
  wireReceiptPayment(modal);
  wireReceiptItems(modal);
  wireSalesPayment(modal);
  wireSalesItems(modal);
  wireSalesDocumentNo(modal);
  wirePayableVoucher(modal);
  wireCustomerReceiptVoucher(modal);
  wireGeneralFinancePayment(modal);
  wireAutoProductSku(modal, type, record);
  modal.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await withLoading(record?.id ? "กำลังบันทึกการแก้ไข" : "กำลังบันทึกข้อมูลใหม่", async () => {
        await submitBusinessForm(type, new FormData(event.currentTarget));
        await loadDashboard();
      });
      close();
      toast(`${spec.submit}เรียบร้อย`);
    } catch (error) {
      toast(error.message);
    }
  });
}

function wireCategoryInput(modal) {
  const select = modal.querySelector("[data-category-select]");
  const wrapper = modal.querySelector("[data-new-category-wrap]");
  if (!select || !wrapper) return;
  const sync = () => {
    wrapper.style.display = select.value === "__new" ? "" : "none";
    const input = wrapper.querySelector("input");
    if (select.value === "__new") input?.focus();
  };
  select.addEventListener("change", sync);
  sync();
}

function wireUnitInput(modal) {
  const select = modal.querySelector("[data-unit-select]");
  const wrapper = modal.querySelector("[data-new-unit-wrap]");
  if (!select || !wrapper) return;
  const sync = () => {
    wrapper.style.display = select.value === "__new" ? "" : "none";
    const input = wrapper.querySelector("input");
    if (select.value === "__new") input?.focus();
  };
  select.addEventListener("change", sync);
  sync();
}

function wireBankInput(modal) {
  const select = modal.querySelector("[data-bank-select]");
  const wrapper = modal.querySelector("[data-new-bank-wrap]");
  if (!select || !wrapper) return;
  const sync = () => {
    wrapper.style.display = select.value === "__new" ? "" : "none";
    const input = wrapper.querySelector("input");
    if (select.value === "__new") input?.focus();
  };
  select.addEventListener("change", sync);
  sync();
}

function wireThaiDatePicker(root) {
  if (!root) return;
  root.querySelectorAll(".thai-date-field").forEach((field) => {
    if (field.dataset.thaiDateWired) return;
    const display = field.querySelector("[data-thai-date-display]");
    const toggle = field.querySelector("[data-thai-date-toggle]");
    const calendar = field.querySelector("[data-thai-calendar]");
    if (!display || !toggle || !calendar) return;
    field.dataset.thaiDateWired = "true";

    let viewDate = new Date(isoDateInputValue(display.value));
    const selectedIso = () => isoDateInputValue(display.value);
    const render = () => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const leading = firstDay.getDay();
      const selected = selectedIso();
      const dayButtons = [];
      for (let i = 0; i < leading; i += 1) dayButtons.push(`<span></span>`);
      for (let day = 1; day <= daysInMonth; day += 1) {
        const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        dayButtons.push(`<button type="button" class="${iso === selected ? "active" : ""}" data-pick-thai-date="${iso}">${day}</button>`);
      }
      calendar.innerHTML = `
        <div class="thai-calendar-head">
          <button type="button" data-thai-month="-1">‹</button>
          <div class="thai-calendar-selects">
            <select data-thai-month-select aria-label="เลือกเดือน">${thaiMonthOptions(month)}</select>
            <select data-thai-year-select aria-label="เลือกปี พ.ศ.">${thaiYearOptions(year)}</select>
          </div>
          <button type="button" data-thai-month="1">›</button>
        </div>
        <div class="thai-calendar-week">${["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => `<span>${day}</span>`).join("")}</div>
        <div class="thai-calendar-days">${dayButtons.join("")}</div>
      `;
    };

    display.addEventListener("focus", openPicker);
    display.addEventListener("click", openPicker);
    toggle.addEventListener("click", openPicker);
    calendar.addEventListener("click", (event) => {
      const monthButton = event.target.closest("[data-thai-month]");
      const dayButton = event.target.closest("[data-pick-thai-date]");
      if (monthButton) {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + Number(monthButton.dataset.thaiMonth), 1);
        render();
        return;
      }
      if (dayButton) {
        display.value = thaiDateInputValue(dayButton.dataset.pickThaiDate);
        display.dispatchEvent(new Event("input", { bubbles: true }));
        calendar.classList.remove("open");
      }
    });
    calendar.addEventListener("change", (event) => {
      const monthSelect = event.target.closest("[data-thai-month-select]");
      const yearSelect = event.target.closest("[data-thai-year-select]");
      if (monthSelect) {
        viewDate = new Date(viewDate.getFullYear(), Number(monthSelect.value), 1);
        render();
      }
      if (yearSelect) {
        viewDate = new Date(Number(yearSelect.value), viewDate.getMonth(), 1);
        render();
      }
    });

    function openPicker() {
      viewDate = new Date(isoDateInputValue(display.value));
      render();
      calendar.classList.add("open");
      display.focus();
    }
  });

  if (!root.dataset.thaiDateRootWired) {
    root.dataset.thaiDateRootWired = "true";
    root.addEventListener("click", (event) => {
      if (!event.target.closest(".thai-date-field")) {
        root.querySelectorAll(".thai-calendar.open").forEach((calendar) => calendar.classList.remove("open"));
      }
    });
  }
}

function wireReceiptItems(modal) {
  const list = modal.querySelector("[data-receipt-items]");
  const addButton = modal.querySelector("[data-add-receipt-item]");
  if (!list || !addButton) return;
  const updateTotals = () => {
    let subtotal = 0;
    [...list.querySelectorAll("[data-receipt-item-row]")].forEach((row) => {
      const cost = Number(row.querySelector('[name*="[unit_cost]"]')?.value || 0);
      const quantityFull = Number(row.querySelector('[name*="[quantity_full]"]')?.value || 0);
      const lineTotal = cost * quantityFull;
      subtotal += lineTotal;
      const totalInput = row.querySelector("[data-receipt-line-total]");
      if (totalInput) totalInput.textContent = money(lineTotal);
    });
    const vatRate = Math.max(0, Number(modal.querySelector("[data-receipt-vat-rate]")?.value || 0));
    const vatType = modal.querySelector("[data-receipt-vat-type]")?.value || "exclusive";
    const vatAmount = vatType === "inclusive" ? subtotal * vatRate / (100 + vatRate || 1) : subtotal * vatRate / 100;
    const beforeVat = vatType === "inclusive" ? subtotal - vatAmount : subtotal;
    const grandTotal = vatType === "inclusive" ? subtotal : subtotal + vatAmount;
    const subtotalNode = modal.querySelector("[data-receipt-subtotal]");
    if (subtotalNode) subtotalNode.textContent = money(beforeVat, { decimals: 2 });
    modal.querySelectorAll("[data-receipt-subtotal-footer]").forEach((node) => {
      node.textContent = money(beforeVat, { decimals: 2 });
    });
    modal.querySelectorAll("[data-receipt-vat-label]").forEach((node) => {
      node.textContent = vatType === "inclusive" ? "VAT ใน" : "VAT";
    });
    modal.querySelectorAll("[data-receipt-vat-amount], [data-receipt-vat-amount-footer]").forEach((node) => {
      node.textContent = money(vatAmount, { decimals: 2 });
    });
    modal.querySelectorAll("[data-receipt-grand-total], [data-receipt-grand-total-footer]").forEach((node) => {
      node.textContent = money(grandTotal, { decimals: 2 });
    });
  };
  const renumberRows = () => {
    [...list.querySelectorAll("[data-receipt-item-row]")].forEach((row, index) => {
      row.querySelector("[data-receipt-product]").name = `items[${index}][product_id]`;
      row.querySelector('[name*="[unit_cost]"]').name = `items[${index}][unit_cost]`;
      row.querySelector('[name*="[quantity_full]"]').name = `items[${index}][quantity_full]`;
      row.querySelector('[name*="[quantity_empty]"]').name = `items[${index}][quantity_empty]`;
      row.querySelector("[data-remove-receipt-item]").style.visibility = index === 0 && list.children.length === 1 ? "hidden" : "";
    });
    updateTotals();
  };
  modal.querySelectorAll("[data-add-receipt-item]").forEach((button) => button.addEventListener("click", () => {
    list.insertAdjacentHTML("beforeend", receiptItemRow(list.children.length));
    renumberRows();
  }));
  list.addEventListener("click", (event) => {
    const productButton = event.target.closest("[data-pick-receipt-product]");
    if (productButton) {
      const row = productButton.closest("[data-receipt-item-row]");
      const product = products.find((item) => String(item.id) === String(productButton.dataset.pickReceiptProduct)) || {};
      row.querySelector("[data-receipt-product]").value = product.id || "";
      row.querySelector("[data-receipt-product-search]").value = product.name ? `${product.name} - ${money(product.price)}` : "";
      const costInput = row.querySelector("[data-receipt-cost]");
      if (costInput) costInput.value = product.price || 0;
      row.querySelector(".receipt-product-results")?.classList.remove("open");
      updateTotals();
      return;
    }
    const removeButton = event.target.closest("[data-remove-receipt-item]");
    if (!removeButton || list.children.length <= 1) return;
    removeButton.closest("[data-receipt-item-row]")?.remove();
    renumberRows();
  });
  list.addEventListener("input", (event) => {
    const searchInput = event.target.closest("[data-receipt-product-search]");
    if (searchInput) {
      const row = searchInput.closest("[data-receipt-item-row]");
      const query = searchInput.value.trim().toLowerCase();
      const matches = products.filter((product) =>
        [product.name, product.sku, product.category, product.unit, product.price]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
      row.querySelector("[data-receipt-product]").value = "";
      const results = row.querySelector(".receipt-product-results");
      results.innerHTML = receiptProductResults(matches);
      results.classList.add("open");
      return;
    }
    if (event.target.matches('input[name*="[unit_cost]"], input[name*="[quantity_full]"]')) updateTotals();
  });
  list.addEventListener("focusin", (event) => {
    const searchInput = event.target.closest("[data-receipt-product-search]");
    if (searchInput) searchInput.closest("[data-receipt-item-row]")?.querySelector(".receipt-product-results")?.classList.add("open");
  });
  modal.addEventListener("click", (event) => {
    if (event.target.closest(".receipt-product-search")) return;
    modal.querySelectorAll(".receipt-product-results.open").forEach((node) => node.classList.remove("open"));
  });
  modal.querySelector("[data-receipt-vat-rate]")?.addEventListener("input", updateTotals);
  modal.querySelector("[data-receipt-vat-type]")?.addEventListener("change", updateTotals);
  renumberRows();
}

function wireReceiptPayment(modal) {
    const method = modal.querySelector("[data-receipt-payment-method]");
    const bankWrap = modal.querySelector("[data-receipt-bank-wrap]");
  const creditWrap = modal.querySelector("[data-receipt-credit-wrap]");
  const bankSelect = bankWrap?.querySelector('[name="bank_account_id"]');
  const detail = modal.querySelector("[data-receipt-bank-detail]");
  if (!method || !bankWrap) return;
  const update = () => {
    bankWrap.style.display = method.value === "transfer" ? "" : "none";
    if (creditWrap) creditWrap.style.display = method.value === "credit" ? "" : "none";
    if (!detail || !bankSelect) return;
    const option = bankSelect.selectedOptions[0];
    const accountNo = option?.dataset.accountNumber || "-";
    const accountName = option?.dataset.accountName || "-";
    const bankName = option?.dataset.bankName || "-";
    const balance = Number(option?.dataset.balance || 0);
    detail.innerHTML = `
      <span>ชื่อบัญชี ${html(accountName)}</span>
      <span>เลขบัญชี ${html(accountNo)}</span>
      <span>ยอดคงเหลือ ${html(money(balance))}</span>
    `;
  };
  method.addEventListener("change", update);
  bankSelect?.addEventListener("change", update);
  update();
}

function wireGeneralFinancePayment(modal) {
  const method = modal.querySelector("[data-general-finance-method]");
  const bankWrap = modal.querySelector("[data-general-finance-bank-wrap]");
  const bankSelect = bankWrap?.querySelector('[name="bank_account_id"]');
  const detail = modal.querySelector("[data-general-finance-bank-detail]");
  if (!method || !bankWrap) return;
  const update = () => {
    bankWrap.style.display = method.value === "transfer" ? "" : "none";
    if (!detail || !bankSelect) return;
    const option = bankSelect.selectedOptions[0];
    detail.innerHTML = [
      `ธนาคาร ${html(option?.dataset.bankName || "-")}`,
      `ชื่อบัญชี ${html(option?.dataset.accountName || "-")}`,
      `เลขบัญชี ${html(option?.dataset.accountNumber || "-")}`,
    ].map((line) => `<span>${line}</span>`).join("");
  };
  method.addEventListener("change", update);
  bankSelect?.addEventListener("change", update);
  update();
}

function wireSalesPayment(modal) {
  const method = modal.querySelector("[data-sales-payment-method]");
  const bankWrap = modal.querySelector("[data-sales-bank-wrap]");
  const bankSelect = bankWrap?.querySelector('[name="bank_account_id"]');
  const detail = modal.querySelector("[data-sales-bank-detail]");
  if (!method || !bankWrap) return;
  const update = () => {
    bankWrap.style.display = method.value === "transfer" ? "" : "none";
    if (!detail || !bankSelect) return;
    const option = bankSelect.selectedOptions[0];
    detail.innerHTML = `
      <span>ชื่อบัญชี ${html(option?.dataset.accountName || "-")}</span>
      <span>เลขบัญชี ${html(option?.dataset.accountNumber || "-")}</span>
      <span>ยอดคงเหลือ ${html(money(option?.dataset.balance || 0))}</span>
    `;
  };
  method.addEventListener("change", update);
  bankSelect?.addEventListener("change", update);
  update();
}

function wireSalesDocumentNo(modal) {
  const input = modal.querySelector("[data-sales-document-no]");
  const dateInput = modal.querySelector('[name="sold_at"]');
  if (!input || !dateInput) return;
  const update = () => {
    input.value = nextSalesDocumentNo(input.dataset.salesDocumentPrefix || "CSH", dateInput.value || todayIso);
  };
  dateInput.addEventListener("input", update);
  dateInput.addEventListener("change", update);
  update();
}

function wireSalesItems(modal) {
  const list = modal.querySelector("[data-sales-items]");
  const addButton = modal.querySelector("[data-add-sales-item]");
  if (!list || !addButton) return;
  const syncRowStockLimit = (row) => {
    const productId = row.querySelector("[data-sales-product]")?.value;
    const product = products.find((item) => String(item.id) === String(productId));
    const quantityInput = row.querySelector('input[name*="[quantity]"]');
    const limitNode = row.querySelector("[data-sales-stock-limit]");
    if (!product || !quantityInput) {
      quantityInput?.setCustomValidity("");
      if (limitNode) limitNode.textContent = "";
      row.classList.remove("stock-warning");
      return;
    }
    const limit = saleStockLimit(product, modal.querySelector('[name="sold_at"]')?.value || todayIso);
    const quantity = Number(quantityInput.value || 0);
    quantityInput.max = String(limit);
    if (limitNode) limitNode.textContent = `Stock card ${limit.toLocaleString("th-TH")} ${product.unit || ""}`.trim();
    const invalid = quantity > limit;
    row.classList.toggle("stock-warning", invalid);
    quantityInput.setCustomValidity(invalid ? `${product.sku ? `${product.sku} - ` : ""}${product.name} คงเหลือตาม Stock card ${limit.toLocaleString("th-TH")} แต่ต้องการขาย ${quantity.toLocaleString("th-TH")}` : "");
  };
  const updateTotals = () => {
    let subtotal = 0;
    let count = 0;
    [...list.querySelectorAll("[data-sales-item-row]")].forEach((row) => {
      syncRowStockLimit(row);
      const price = Number(row.querySelector('[name*="[unit_price]"]')?.value || 0);
      const quantity = Number(row.querySelector('[name*="[quantity]"]')?.value || 0);
      const lineTotal = price * quantity;
      subtotal += lineTotal;
      count += quantity;
      const totalNode = row.querySelector("[data-sales-line-total]");
      if (totalNode) totalNode.textContent = money(lineTotal, { decimals: 2 });
    });
    const vatRate = Math.max(0, Number(modal.querySelector("[data-sales-vat-rate]")?.value || 0));
    const vatType = modal.querySelector("[data-sales-vat-type]")?.value || "exclusive";
    const vatAmount = vatRate ? (vatType === "inclusive" ? subtotal * vatRate / (100 + vatRate || 1) : subtotal * vatRate / 100) : 0;
    const beforeVat = vatType === "inclusive" ? subtotal - vatAmount : subtotal;
    const grandTotal = vatType === "inclusive" ? subtotal : subtotal + vatAmount;
    modal.querySelectorAll("[data-sales-subtotal], [data-sales-subtotal-footer]").forEach((node) => {
      node.textContent = money(beforeVat, { decimals: 2 });
    });
    modal.querySelectorAll("[data-sales-vat-amount], [data-sales-vat-amount-footer]").forEach((node) => {
      node.textContent = money(vatAmount, { decimals: 2 });
    });
    modal.querySelectorAll("[data-sales-grand-total], [data-sales-grand-total-footer]").forEach((node) => {
      node.textContent = money(grandTotal, { decimals: 2 });
    });
    modal.querySelectorAll("[data-sales-count], [data-sales-count-footer]").forEach((node) => {
      node.textContent = String(count);
    });
  };
  const renumberRows = () => {
    [...list.querySelectorAll("[data-sales-item-row]")].forEach((row, index) => {
      row.querySelector("[data-sales-product]").name = `items[${index}][product_id]`;
      row.querySelector('[name*="[unit_price]"]').name = `items[${index}][unit_price]`;
      row.querySelector('[name*="[quantity]"]').name = `items[${index}][quantity]`;
      row.querySelector("[data-remove-sales-item]").style.visibility = index === 0 && list.children.length === 1 ? "hidden" : "";
    });
    updateTotals();
  };
  addButton.addEventListener("click", () => {
    list.insertAdjacentHTML("beforeend", salesItemRow(list.children.length));
    renumberRows();
  });
  list.addEventListener("click", (event) => {
    const productButton = event.target.closest("[data-pick-sales-product]");
    if (productButton) {
      const row = productButton.closest("[data-sales-item-row]");
      const product = products.find((item) => String(item.id) === String(productButton.dataset.pickSalesProduct)) || {};
      row.querySelector("[data-sales-product]").value = product.id || "";
      row.querySelector("[data-sales-product-search]").value = product.name ? `${product.sku ? `${product.sku} - ` : ""}${product.name} - ${money(product.price)}` : "";
      const priceInput = row.querySelector("[data-sales-price]");
      if (priceInput) priceInput.value = product.price || 0;
      row.querySelector(".receipt-product-results")?.classList.remove("open");
      updateTotals();
      return;
    }
    const removeButton = event.target.closest("[data-remove-sales-item]");
    if (!removeButton || list.children.length <= 1) return;
    removeButton.closest("[data-sales-item-row]")?.remove();
    renumberRows();
  });
  list.addEventListener("input", (event) => {
    const searchInput = event.target.closest("[data-sales-product-search]");
    if (searchInput) {
      const row = searchInput.closest("[data-sales-item-row]");
      const query = searchInput.value.trim().toLowerCase();
      const matches = products.filter((product) =>
        [product.name, product.sku, product.category, product.unit, product.price]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
      row.querySelector("[data-sales-product]").value = "";
      const results = row.querySelector(".receipt-product-results");
      results.innerHTML = salesProductResults(matches);
      results.classList.add("open");
      return;
    }
    if (event.target.matches('input[name*="[unit_price]"], input[name*="[quantity]"]')) updateTotals();
  });
  modal.querySelector("[data-sales-vat-rate]")?.addEventListener("input", updateTotals);
  modal.querySelector("[data-sales-vat-type]")?.addEventListener("change", updateTotals);
  modal.querySelector('[name="sold_at"]')?.addEventListener("input", updateTotals);
  modal.querySelector('[name="sold_at"]')?.addEventListener("change", updateTotals);
  list.addEventListener("focusin", (event) => {
    const searchInput = event.target.closest("[data-sales-product-search]");
    if (searchInput) searchInput.closest("[data-sales-item-row]")?.querySelector(".receipt-product-results")?.classList.add("open");
  });
  modal.addEventListener("click", (event) => {
    if (event.target.closest(".receipt-product-search")) return;
    modal.querySelectorAll(".receipt-product-results.open").forEach((node) => node.classList.remove("open"));
  });
  renumberRows();
}

function wirePayableVoucher(modal) {
  const receiptSelect = modal.querySelector("[data-payable-receipt]");
  const amountInput = modal.querySelector("[data-payable-amount]");
  const preview = modal.querySelector("[data-payable-preview]");
  const method = modal.querySelector("[data-payable-method]");
  const bankWrap = modal.querySelector("[data-payable-bank-wrap]");
  const bankSelect = bankWrap?.querySelector('[name="bank_account_id"]');
  const detail = modal.querySelector("[data-payable-bank-detail]");
  if (!receiptSelect || !amountInput || !method) return;
  const syncReceipt = () => {
    const option = receiptSelect.selectedOptions[0];
    const receipt = goodsReceipts.find((item) => String(item.id) === String(receiptSelect.value));
    const total = Number(option?.dataset.total || receipt?.total_amount || 0);
    amountInput.value = total;
    if (preview) {
      preview.innerHTML = receipt ? `
        <strong>${html(receipt.supplier_name || "-")}</strong>
        <span>ใบรับ/อ้างอิง ${html(receipt.invoice_no || receipt.receipt_no || "-")}</span>
        <span>ยอดค้าง ${html(money(total, { decimals: 2 }))}</span>
      ` : `<span>ยังไม่มีใบรับเครดิตที่ค้างจ่าย</span>`;
    }
  };
  const syncPayment = () => {
    if (bankWrap) bankWrap.style.display = method.value === "transfer" ? "" : "none";
    if (!detail || !bankSelect) return;
    const option = bankSelect.selectedOptions[0];
    detail.innerHTML = `
      <span><em>ชื่อบัญชี</em><b>${html(option?.dataset.accountName || "-")}</b></span>
      <span><em>เลขบัญชี</em><b>${html(option?.dataset.accountNumber || "-")}</b></span>
      <span><em>ยอดคงเหลือ</em><b>${html(money(option?.dataset.balance || 0))}</b></span>
    `;
  };
  receiptSelect.addEventListener("change", syncReceipt);
  method.addEventListener("change", syncPayment);
  bankSelect?.addEventListener("change", syncPayment);
  syncReceipt();
  syncPayment();
}

function wireCustomerReceiptVoucher(modal) {
  const searchInput = modal.querySelector("[data-receivable-search]");
  const hiddenOrder = modal.querySelector('[name="order_id"]');
  const results = modal.querySelector(".receivable-results");
  const selectedDetail = modal.querySelector("[data-selected-receivable]");
  const amountInput = modal.querySelector("[data-customer-receipt-amount]");
  const reductionInput = modal.querySelector("[data-customer-receipt-reduction]");
  const settlementInput = modal.querySelector("[data-customer-receipt-settlement]");
  const preview = modal.querySelector("[data-customer-receipt-preview]");
  const method = modal.querySelector("[data-customer-receipt-method]");
  const bankWrap = modal.querySelector("[data-customer-receipt-bank-wrap]");
  const bankSelect = bankWrap?.querySelector('[name="bank_account_id"]');
  const bankDetail = modal.querySelector("[data-customer-receipt-bank-detail]");
  const referenceInput = modal.querySelector("[data-customer-receipt-no]");
  const dateInput = modal.querySelector('[name="paid_at"]');
  if (!searchInput || !hiddenOrder || !results || !amountInput || !method) return;

  const ordersForPicker = () => customerReceivableOrders(hiddenOrder.value);
  const findSelectedOrder = () => ordersForPicker().find((order) => String(order.id) === String(hiddenOrder.value));
  const bankLine = (option) => `
    <span><em>ธนาคาร</em><b>${html(option?.dataset.bankName || "-")}</b></span>
    <span><em>ชื่อบัญชี</em><b>${html(option?.dataset.accountName || "-")}</b></span>
    <span><em>เลขบัญชี</em><b>${html(option?.dataset.accountNumber || "-")}</b></span>
  `;
  const syncReference = () => {
    if (!referenceInput) return;
    referenceInput.value = nextCustomerReceiptNo(thaiDateToIso(dateInput?.value || todayIso));
  };
  const syncBank = () => {
    if (bankWrap) bankWrap.style.display = method.value === "transfer" ? "" : "none";
    if (bankDetail && bankSelect) bankDetail.innerHTML = bankLine(bankSelect.selectedOptions[0]);
  };
  const formatAmount = (fixed = false) => {
    amountInput.value = fixed ? formatMoneyInputFixed(amountInput.value) : formatMoneyInput(amountInput.value);
    amountInput.setSelectionRange?.(amountInput.value.length, amountInput.value.length);
  };
  const formatReduction = (fixed = false) => {
    if (!reductionInput) return;
    reductionInput.value = fixed ? formatMoneyInputFixed(reductionInput.value) : formatMoneyInput(reductionInput.value);
    reductionInput.setSelectionRange?.(reductionInput.value.length, reductionInput.value.length);
  };
  const syncSettlement = (order = findSelectedOrder()) => {
    const outstanding = order ? receivableOutstanding(order) : 0;
    const amount = plainMoney(amountInput.value);
    const reduction = plainMoney(reductionInput?.value || 0);
    const settlement = amount + reduction;
    const remaining = Math.max(0, outstanding - settlement);
    if (settlementInput) settlementInput.value = formatMoneyInputFixed(settlement);
    if (preview && order) {
      preview.innerHTML = `
        <strong>${html(order.customer_name || "-")}</strong>
        <span>เอกสารอ้างอิง ${html(order.order_no || "-")}</span>
        <span>ยอดสุทธิ ${html(money(order.total_amount, { decimals: 2 }))} • ค้างรับ ${html(money(outstanding, { decimals: 2 }))}</span>
        <span>รับจริง ${html(money(amount, { decimals: 2 }))} • ลดหนี้ ${html(money(reduction, { decimals: 2 }))} • คงเหลือหลังรับ ${html(money(remaining, { decimals: 2 }))}</span>
      `;
    }
  };
  const syncOrder = (order) => {
    if (!order) {
      hiddenOrder.value = "";
      amountInput.value = formatMoneyInputFixed(0);
      if (reductionInput) reductionInput.value = formatMoneyInputFixed(0);
      if (settlementInput) settlementInput.value = formatMoneyInputFixed(0);
      searchInput.value = "";
      if (selectedDetail) selectedDetail.textContent = "เลือกใบส่งสินค้าหรือใบส่งของ/ใบกำกับภาษีที่ค้างรับ";
      if (preview) preview.innerHTML = "<span>ยังไม่มีเอกสารค้างรับให้รับเงิน</span>";
      return;
    }
    const outstanding = receivableOutstanding(order);
    hiddenOrder.value = order.id;
    searchInput.value = receivableDocumentLabel(order);
    amountInput.value = formatMoneyInputFixed(outstanding);
    if (reductionInput) reductionInput.value = formatMoneyInputFixed(0);
    if (selectedDetail) {
      selectedDetail.textContent = `${order.customer_name || "-"} • ${order.order_no || "-"} • ค้างรับ ${money(outstanding, { decimals: 2 })}`;
    }
    syncSettlement(order);
  };
  const renderResults = () => {
    const query = searchInput.value.trim().toLowerCase();
    const matches = ordersForPicker().filter((order) =>
      [order.order_no, order.customer_name, order.status, saleItemsText(order.items)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
    results.innerHTML = receivableResultItems(matches);
    results.classList.add("open");
  };

  const initial = findSelectedOrder() || ordersForPicker()[0];
  syncOrder(initial);
  syncReference();
  syncBank();

  searchInput.addEventListener("focus", renderResults);
  searchInput.addEventListener("input", () => {
    hiddenOrder.value = "";
    renderResults();
  });
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-receivable]");
    if (!button) return;
    const order = customerReceivableOrders(button.dataset.pickReceivable)
      .find((item) => String(item.id) === String(button.dataset.pickReceivable));
    syncOrder(order);
    results.classList.remove("open");
  });
  method.addEventListener("change", syncBank);
  bankSelect?.addEventListener("change", syncBank);
  amountInput.addEventListener("input", () => {
    formatAmount(false);
    syncSettlement();
  });
  amountInput.addEventListener("blur", () => {
    formatAmount(true);
    syncSettlement();
  });
  amountInput.addEventListener("focus", () => amountInput.select());
  reductionInput?.addEventListener("input", () => {
    formatReduction(false);
    syncSettlement();
  });
  reductionInput?.addEventListener("blur", () => {
    formatReduction(true);
    syncSettlement();
  });
  reductionInput?.addEventListener("focus", () => reductionInput.select());
  dateInput?.addEventListener("input", syncReference);
  dateInput?.addEventListener("change", syncReference);
  modal.addEventListener("click", (event) => {
    if (!event.target.closest(".receivable-doc-search")) results.classList.remove("open");
  });
}

function productModalCategory(modal) {
  const select = modal.querySelector("[data-category-select]");
  const newCategory = modal.querySelector('[name="category_new"]');
  if (!select) return "accessory";
  if (select.value === "__new") return newCategory?.value.trim() || "accessory";
  return select.value || "accessory";
}

function wireAutoProductSku(modal, type, record = {}) {
  if (type !== "product" || record.id) return;
  const skuInput = modal.querySelector("[data-auto-sku]");
  const categorySelect = modal.querySelector("[data-category-select]");
  const newCategory = modal.querySelector('[name="category_new"]');
  if (!skuInput || !categorySelect) return;

  let manualSku = Boolean(skuInput.value.trim());
  let requestNo = 0;
  const refreshSku = async () => {
    if (manualSku) return;
    const category = productModalCategory(modal);
    const currentRequest = ++requestNo;
    skuInput.value = nextSkuFromProducts(category);
    try {
      const payload = await api(`/api/products/next-sku?category=${encodeURIComponent(category)}`);
      if (!manualSku && currentRequest === requestNo && payload?.sku) skuInput.value = payload.sku;
    } catch {
      // The backend also generates SKU on save; the local preview is enough if the preview endpoint is temporarily unavailable.
    }
  };

  skuInput.addEventListener("input", () => {
    manualSku = Boolean(skuInput.value.trim());
    if (!manualSku) refreshSku();
  });
  categorySelect.addEventListener("change", refreshSku);
  newCategory?.addEventListener("input", refreshSku);
  refreshSku();
}

function customerSearchPayload(customer) {
  return {
    id: customer?.[6] || "",
    name: customer?.[0] || "",
    phone: customer?.[1] === "-" ? "" : customer?.[1] || "",
    address: customer?.[2] === "-" ? "" : customer?.[2] || "",
  };
}

function pickCustomer(modal, customer) {
  const payload = customerSearchPayload(customer);
  const wrapper = modal.querySelector(".customer-search");
  if (!wrapper || !payload.id) return;
  wrapper.querySelector('[name="customer_id"]').value = payload.id;
  wrapper.querySelector('[name="customer_search"]').value = payload.name;
  wrapper.querySelector("[data-selected-customer]").textContent = `${payload.phone || "-"} • ${payload.address || "-"}`;
  wrapper.querySelector(".customer-results").classList.remove("open");
  const addressField = modal.querySelector('[name="delivery_address"]');
  if (addressField && payload.address) addressField.value = payload.address;
}

function wireCustomerSearch(modal) {
  const input = modal.querySelector("[data-customer-search]");
  if (!input) return;
  const results = modal.querySelector(".customer-results");
  input.addEventListener("focus", () => results.classList.add("open"));
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    const matches = customers.filter((customer) => [customer[0], customer[1], customer[2], customer[12]].join(" ").toLowerCase().includes(query));
    results.innerHTML = customerResultItems(matches);
    results.classList.add("open");
    modal.querySelector('[name="customer_id"]').value = "";
  });
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-customer]");
    if (!button) return;
    const customer = customers.find((item) => String(item[6]) === String(button.dataset.pickCustomer));
    pickCustomer(modal, customer);
  });
  modal.addEventListener("click", (event) => {
    if (!event.target.closest(".customer-search")) results.classList.remove("open");
  });
}

function pickSupplier(modal, supplier) {
  if (!supplier?.id) return;
  const wrapper = modal.querySelector(".customer-search");
  if (!wrapper) return;
  wrapper.querySelector('[name="supplier_id"]').value = supplier.id;
  wrapper.querySelector('[name="supplier_search"]').value = supplier.name || "";
  wrapper.querySelector("[data-selected-supplier]").textContent = `${supplier.contact_name || "-"} • ${supplier.phone || "-"}`;
  wrapper.querySelector(".supplier-results").classList.remove("open");
}

function wireSupplierSearch(modal) {
  const input = modal.querySelector("[data-supplier-picker]");
  if (!input) return;
  const results = modal.querySelector(".supplier-results");
  input.addEventListener("focus", () => results.classList.add("open"));
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    const matches = suppliers.filter((supplier) =>
      [supplier.name, supplier.contact_name, supplier.phone, supplier.address, supplier.tax_id]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
    results.innerHTML = supplierResultItems(matches);
    results.classList.add("open");
    modal.querySelector('[name="supplier_id"]').value = "";
  });
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-supplier]");
    if (!button) return;
    const supplier = suppliers.find((item) => String(item.id) === String(button.dataset.pickSupplier));
    pickSupplier(modal, supplier);
  });
  modal.addEventListener("click", (event) => {
    if (!event.target.closest(".customer-search")) results.classList.remove("open");
  });
}

async function submitBusinessForm(type, form) {
  const value = (name) => String(form.get(name) || "").trim();
  const number = (name) => plainMoney(value(name));

  if (type === "customer") {
    const id = number("id");
    const duplicate = duplicateCustomerPhone(value("phone"), id);
    if (duplicate) throw new Error(`เบอร์โทรนี้ซ้ำกับลูกค้า ${duplicate[0] || ""}`);
    return api(id ? `/api/customers/${id}` : "/api/customers", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        name: value("name"),
        phone: value("phone"),
        line_id: value("line_id"),
        address: value("address"),
        customer_type: value("customer_type"),
        credit_limit: number("credit_limit"),
        balance_due: number("balance_due"),
        cylinders_on_hand: value("cylinders_on_hand"),
        latitude: value("latitude"),
        longitude: value("longitude"),
      }),
    });
  }

  if (type === "supplier") {
    const id = number("id");
    return api(id ? `/api/suppliers/${id}` : "/api/suppliers", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        name: value("name"),
        contact_name: value("contact_name"),
        phone: value("phone"),
        address: value("address"),
        tax_id: value("tax_id"),
        payment_terms: value("payment_terms"),
        note: value("note"),
      }),
    });
  }

  if (type === "bankAccount") {
    const id = number("id");
    const bankName = value("bank_name") === "__new" ? value("bank_name_new") : value("bank_name");
    if (!bankName) throw new Error("กรุณาเลือกหรือกรอกชื่อธนาคาร");
    return api(id ? `/api/bank-accounts/${id}` : "/api/bank-accounts", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        bank_name: bankName,
        account_name: value("account_name"),
        account_number: value("account_number"),
        branch_name: value("branch_name"),
        account_type: value("account_type"),
        opening_balance: number("opening_balance"),
        current_balance: number("current_balance"),
        note: value("note"),
      }),
    });
  }

  if (type === "goodsReceipt") {
    const id = number("id");
    const items = [];
    for (const [key, raw] of form.entries()) {
      const match = key.match(/^items\[(\d+)\]\[(product_id|quantity_full|quantity_empty|unit_cost)\]$/);
      if (!match) continue;
      const index = Number(match[1]);
      items[index] ||= {};
      items[index][match[2]] = String(raw || "").trim();
    }
    const normalizedItems = items.filter(Boolean).map((item) => ({
      product_id: Number(item.product_id || 0),
      quantity_full: Math.max(0, Number(item.quantity_full || 0)),
      quantity_empty: Math.max(0, Number(item.quantity_empty || 0)),
      unit_cost: Math.max(0, Number(item.unit_cost || 0)),
    })).filter((item) => item.product_id && (item.quantity_full || item.quantity_empty));
    if (!number("supplier_id")) throw new Error("กรุณาเลือกตัวแทนจำหน่ายจากผลการค้นหา");
    if (!normalizedItems.length) throw new Error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
    validateReceiptEmptyExchange(normalizedItems, id);
    if (value("payment_method") === "transfer" && !number("bank_account_id")) throw new Error("กรุณาเลือกบัญชีธนาคารที่ใช้โอน");
    return api(id ? `/api/goods-receipts/${id}` : "/api/goods-receipts", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        supplier_id: number("supplier_id") || null,
        invoice_no: value("invoice_no"),
        received_at: thaiDateToIso(value("received_at")),
        payment_method: value("payment_method") || "credit",
        credit_days: number("credit_days"),
        bank_account_id: number("bank_account_id") || null,
        vat_type: value("vat_type") || "exclusive",
        vat_rate: number("vat_rate"),
        note: value("note"),
        items: normalizedItems,
      }),
    });
  }

  if (type === "supplierPaymentVoucher") {
    if (!number("goods_receipt_id")) throw new Error("กรุณาเลือกใบรับสินค้าที่ค้างจ่าย");
    if (value("payment_method") === "transfer" && !number("bank_account_id")) throw new Error("กรุณาเลือกบัญชีธนาคารที่ใช้โอน");
    return api("/api/supplier-payment-vouchers", {
      method: "POST",
      body: JSON.stringify({
        goods_receipt_id: number("goods_receipt_id"),
        paid_at: thaiDateToIso(value("paid_at")),
        payment_method: value("payment_method") || "cash",
        bank_account_id: number("bank_account_id") || null,
        amount: number("amount"),
        reference_no: value("reference_no"),
        note: value("note"),
      }),
    });
  }

  if (type === "customerReceiptVoucher") {
    if (!number("order_id")) throw new Error("กรุณาเลือกเอกสารค้างรับจากผลการค้นหา");
    const receiptAmount = number("amount");
    const debtReductionAmount = number("debt_reduction_amount");
    const settlementAmount = receiptAmount + debtReductionAmount;
    if (receiptAmount < 0 || debtReductionAmount < 0) throw new Error("ยอดรับเงินและยอดลดหนี้ต้องไม่ติดลบ");
    if (value("payment_method") === "transfer" && receiptAmount > 0 && !number("bank_account_id")) throw new Error("กรุณาเลือกบัญชีธนาคารของร้านที่รับโอน");
    if (settlementAmount <= 0) throw new Error("กรุณากรอกยอดรับเงินหรือยอดลดหนี้มากกว่า 0");
    const selectedOrder = salesOrders.find((order) => String(order.id) === String(number("order_id")));
    if (selectedOrder && settlementAmount > receivableOutstanding(selectedOrder) + 0.01) throw new Error("ยอดรับรวมลดหนี้มากกว่ายอดค้างรับ");
    return api("/api/customer-receipt-vouchers", {
      method: "POST",
      body: JSON.stringify({
        order_id: number("order_id"),
        paid_at: thaiDateToIso(value("paid_at")),
        payment_method: value("payment_method") || "cash",
        bank_account_id: number("bank_account_id") || null,
        amount: receiptAmount,
        debt_reduction_amount: debtReductionAmount,
        reference_no: value("reference_no"),
        note: value("note"),
      }),
    });
  }

  if (type === "cashBill" || type === "deliveryNote" || type === "cashTaxInvoice" || type === "deliveryTaxInvoice") {
    if (!number("customer_id")) throw new Error("กรุณาเลือกลูกค้าจากผลการค้นหา");
    const isDeliveryNote = type === "deliveryNote";
    const isCashTaxInvoice = type === "cashTaxInvoice";
    const isDeliveryTaxInvoice = type === "deliveryTaxInvoice";
    const isCreditSale = isDeliveryNote || isDeliveryTaxInvoice;
    const isVatDocument = isCashTaxInvoice || isDeliveryTaxInvoice;
    const items = [];
    for (const [key, raw] of form.entries()) {
      const match = key.match(/^items\[(\d+)\]\[(product_id|quantity|unit_price)\]$/);
      if (!match) continue;
      const index = Number(match[1]);
      items[index] ||= {};
      items[index][match[2]] = String(raw || "").trim();
    }
    const normalizedItems = items.filter(Boolean).map((item) => ({
      product_id: Number(item.product_id || 0),
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
    })).filter((item) => item.product_id && item.quantity > 0);
    if (!normalizedItems.length) throw new Error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
    validateSaleStock(normalizedItems, thaiDateToIso(value("sold_at")));
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const vatRate = isVatDocument ? Math.max(0, number("vat_rate")) : 0;
    const vatType = value("vat_type") === "inclusive" ? "inclusive" : "exclusive";
    const vatAmount = vatRate ? (vatType === "inclusive" ? subtotal * vatRate / (100 + vatRate || 1) : subtotal * vatRate / 100) : 0;
    const total = isVatDocument && vatType !== "inclusive" ? subtotal + vatAmount : subtotal;
    const creditDays = Math.max(0, number("credit_days"));
    const order = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_id: number("customer_id"),
        order_prefix: isDeliveryTaxInvoice ? "VDN" : isDeliveryNote ? "SND" : isCashTaxInvoice ? "VCS" : "CSH",
        order_date: thaiDateToIso(value("sold_at")),
        status: isDeliveryTaxInvoice ? "ใบส่งของ/ใบกำกับภาษี" : isDeliveryNote ? "ใบส่งสินค้า" : isCashTaxInvoice ? "บิลเงินสด/ใบกำกับภาษี" : "ขายหน้าร้าน",
        delivery_address: isCreditSale ? value("delivery_address") : "",
        delivery_time: isCreditSale ? value("delivery_time") : "",
        payment_status: isCreditSale ? (creditDays ? `เครดิต ${creditDays} วัน` : "รอชำระ") : "ชำระแล้ว",
        vat_type: vatType,
        vat_rate: vatRate,
        note: value("note"),
        items: normalizedItems,
      }),
    });
    if (!isCreditSale) {
      await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          customer_id: number("customer_id"),
          order_id: order.id,
          method: "เงินสด",
          bank_account_id: null,
          amount: total,
          note: `${order.order_no || "บิลเงินสด"}${value("note") ? ` - ${value("note")}` : ""}`,
        }),
      });
    }
    return order;
  }

  if (type === "bill") {
    if (!number("customer_id")) throw new Error("กรุณาเลือกลูกค้าจากผลการค้นหา");
    const productId = number("product_id");
    return api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_id: number("customer_id"),
        delivery_address: value("delivery_address"),
        delivery_time: value("delivery_time"),
        payment_status: value("payment_status"),
        items: [{ product_id: productId, quantity: number("quantity"), unit_price: number("unit_price") }],
      }),
    });
  }

  if (type === "payment") {
    if (!number("customer_id")) throw new Error("กรุณาเลือกลูกค้าจากผลการค้นหา");
    return api("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        customer_id: number("customer_id"),
        method: value("method"),
        amount: number("amount"),
        note: value("note"),
      }),
    });
  }

  if (type === "generalReceipt") {
    const id = number("id");
    if (value("payment_method") === "transfer" && !number("bank_account_id")) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
    return api(id ? `/api/payments/${id}` : "/api/payments", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        source_type: "general_receipt",
        party_name: value("party_name"),
        description: value("description"),
        paid_at: thaiDateToIso(value("paid_at")),
        payment_method: value("payment_method") || "cash",
        bank_account_id: number("bank_account_id") || null,
        amount: number("amount"),
        reference_no: value("reference_no"),
        note: value("note"),
      }),
    });
  }

  if (type === "product") {
    const id = number("id");
    const category = value("category") === "__new" ? value("category_new") : value("category");
    const unit = value("unit") === "__new" ? value("unit_new") : value("unit");
    if (!category) throw new Error("กรุณาเลือกหรือกรอกหมวดหมู่สินค้า");
    if (!unit) throw new Error("กรุณาเลือกหรือกรอกหน่วยนับ");
    return api(id ? `/api/products/${id}` : "/api/products", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        sku: value("sku"),
        name: value("name"),
        category,
        unit,
        unit_price: number("unit_price"),
        stock_full: number("stock_full"),
        stock_empty: number("stock_empty"),
        reorder_level: number("reorder_level"),
      }),
    });
  }

  if (type === "stock") {
    return api(`/api/products/${number("product_id")}/stock`, {
      method: "PATCH",
      body: JSON.stringify({
        movement_type: value("movement_type"),
        full_delta: number("full_delta"),
        empty_delta: number("empty_delta"),
        note: value("note"),
      }),
    });
  }

  if (type === "expense") {
    return api("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        category: value("category"),
        description: value("description"),
        amount: number("amount"),
        paid_by: value("paid_by"),
      }),
    });
  }

  if (type === "generalPayment") {
    const id = number("id");
    if (value("payment_method") === "transfer" && !number("bank_account_id")) throw new Error("กรุณาเลือกบัญชีธนาคารของร้าน");
    return api(id ? `/api/expenses/${id}` : "/api/expenses", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        source_type: "general_payment",
        paid_at: thaiDateToIso(value("paid_at")),
        payee_name: value("payee_name"),
        category: value("category"),
        description: value("description"),
        payment_method: value("payment_method") || "cash",
        bank_account_id: number("bank_account_id") || null,
        amount: number("amount"),
        reference_no: value("reference_no"),
        note: value("note"),
      }),
    });
  }
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.authToken && !headers.Authorization) headers.Authorization = `Bearer ${state.authToken}`;
  const response = await fetch(path, {
    ...options,
    headers,
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text };
  }
  const publicAuthPaths = ["/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password"];
  if (response.status === 401 && !publicAuthPaths.includes(path)) {
    clearAuthSession();
    rerender();
    throw new Error(payload.error || "กรุณาเข้าสู่ระบบใหม่");
  }
  if (!response.ok) throw new Error(payload.error || "API error");
  return payload;
}

function filenameFromDisposition(disposition = "") {
  const match = String(disposition || "").match(/filename="?([^"]+)"?/i);
  return match ? match[1] : "";
}

async function downloadBackup() {
  const headers = {};
  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;
  const response = await fetch("/api/backup", { headers });
  if (response.status === 401) {
    clearAuthSession();
    rerender();
    throw new Error("กรุณาเข้าสู่ระบบใหม่");
  }
  if (!response.ok) {
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { error: text };
    }
    throw new Error(payload.error || "สำรองข้อมูลไม่สำเร็จ");
  }
  const blob = await response.blob();
  const filename = filenameFromDisposition(response.headers.get("Content-Disposition")) || `gasflow-backup-${todayIso}.json`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function loadImageElement(src = "") {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("อ่านรูป QR ไม่สำเร็จ"));
    image.src = src;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

async function normalizeQrImageFile(file) {
  if (!file) return "";
  if (!String(file.type || "").startsWith("image/")) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
  const source = await fileToDataUrl(file);
  const image = await loadImageElement(source);
  const maxSide = 420;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser ไม่รองรับการปรับรูป QR");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/png");
  if (dataUrl.length > 850_000) throw new Error("รูป QR ใหญ่เกินไป กรุณาใช้รูปที่เล็กลง");
  return dataUrl;
}

function setBranchQrImageValue(control, dataUrl = "") {
  const form = control.closest("[data-branch-form]");
  const hidden = form?.querySelector("[data-branch-qr-value]");
  const preview = form?.querySelector("[data-branch-qr-preview]");
  const fileInput = form?.querySelector("[data-branch-qr-upload]");
  if (hidden) hidden.value = dataUrl;
  if (preview) {
    preview.innerHTML = dataUrl
      ? `<img src="${html(dataUrl)}" alt="QR Code รับเงิน">`
      : "<span>ยังไม่มี QR</span>";
  }
  if (!dataUrl && fileInput) fileInput.value = "";
}

function clearAuthSession() {
  state.authToken = "";
  state.authUser = null;
  state.authStatus = "guest";
  persistAuthToken("");
}

async function bootApp() {
  if (!state.authToken) {
    state.authStatus = "guest";
    rerender();
    return;
  }
  try {
    const auth = await api("/api/auth/me");
    state.authUser = auth.user;
    state.authStatus = "authenticated";
    state.loginError = "";
    ensureAllowedPage();
    rerender();
    await loadDashboard();
    if (isAdminUser()) await loadUsers();
  } catch {
    clearAuthSession();
    state.loginError = "กรุณาเข้าสู่ระบบใหม่";
    rerender();
  }
}

async function loginWithCredentials(form) {
  const data = new FormData(form);
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");
  if (!username || !password) {
    state.loginError = "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน";
    rerender();
    return;
  }
  state.loginError = "";
  state.authNotice = "";
  rerender();
  try {
    await withLoading("กำลังเข้าสู่ระบบ", async () => {
      const auth = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      state.authToken = auth.token;
      state.authUser = auth.user;
      state.authStatus = "authenticated";
      state.authMode = "login";
      state.passwordResetToken = "";
      state.authDebugResetLink = "";
      persistAuthToken(auth.token);
      ensureAllowedPage();
      await loadDashboard();
      if (isAdminUser()) await loadUsers();
    });
    if (window.location.search.includes("resetToken")) window.history.replaceState({}, "", window.location.pathname);
    toast("เข้าสู่ระบบเรียบร้อย");
  } catch (error) {
    clearAuthSession();
    state.loginError = error.message || "เข้าสู่ระบบไม่สำเร็จ";
    rerender();
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Logout should still clear local state if the session expired already.
  }
  clearAuthSession();
  state.loginError = "";
  rerender();
  toast("ออกจากระบบแล้ว");
}

function isAdminUser() {
  return state.authUser?.role === "admin";
}

function normalizeUserPermissions(user = {}) {
  if (user.role === "admin") return APP_PERMISSIONS.map((permission) => permission.key);
  if (Array.isArray(user.permissions)) {
    const known = new Set(APP_PERMISSIONS.map((permission) => permission.key));
    return [...new Set(user.permissions.filter((permission) => known.has(permission)))];
  }
  return APP_PERMISSIONS.filter((permission) => permission.key !== "finance").map((permission) => permission.key);
}

function hasPermission(permission) {
  if (!permission) return true;
  if (isAdminUser()) return true;
  return normalizeUserPermissions(state.authUser).includes(permission);
}

function canAccessPage(page = "") {
  return page === "ตั้งค่า" || hasPermission(PAGE_PERMISSIONS[page]);
}

function firstAllowedPage() {
  const flatPages = navItems.flatMap((item) => Array.isArray(item) ? [item[1]] : item.children);
  return flatPages.find((page) => canAccessPage(page)) || "ตั้งค่า";
}

function ensureAllowedPage() {
  if (!canAccessPage(state.page)) state.page = firstAllowedPage();
}

function permissionLabel(key = "") {
  return APP_PERMISSIONS.find((permission) => permission.key === key)?.label || key;
}

function permissionSummary(permissions = [], role = "staff") {
  if (role === "admin") return "ทุกฟังก์ชัน";
  const labels = normalizeUserPermissions({ permissions, role }).map(permissionLabel);
  return labels.length ? labels.join(", ") : "ยังไม่ได้กำหนด";
}

function visibleNavItems() {
  return navItems.map((item) => {
    if (Array.isArray(item)) return canAccessPage(item[1]) ? item : null;
    const children = item.children.filter((page) => canAccessPage(page));
    return children.length ? { ...item, children } : null;
  }).filter(Boolean);
}

async function loadUsers() {
  if (!isAdminUser()) {
    appUsers = [];
    return;
  }
  const users = await api("/api/users");
  appUsers = (users || []).map((user) => ({
    id: user.id,
    username: user.username || "",
    email: user.email || "",
    display_name: user.display_name || user.username || "",
    role: user.role || "staff",
    permissions: normalizeUserPermissions(user),
    is_active: user.is_active !== false && user.is_active !== 0,
    created_at: user.created_at || "",
  }));
  rerender();
}

function money(value, options = {}) {
  const decimals = options.decimals ?? 0;
  return `฿${Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function itemText(items = []) {
  return items.map((item) => `${item.product_name || "สินค้า"} x ${item.quantity}`).join(", ");
}

function applyDashboard(data) {
  products = data.products.map((p) => ({
    id: p.id,
    sku: p.sku,
    category: p.category,
    unit: p.unit || "ชิ้น",
    name: p.name,
    price: Number(p.unit_price),
    stock: Number(p.stock_full),
    stock_empty: Number(p.stock_empty || 0),
    reorder_level: Number(p.reorder_level || 0),
    color: p.sku === "GAS-48" ? "blue" : p.category === "gas" ? "green" : "mint",
  }));
  salesOrders = (data.orders || []).map((o) => ({
    id: o.id,
    order_no: o.order_no || "",
    customer_id: o.customer_id,
    customer_name: o.customer_name || "",
    customer_type: o.customer_type || "",
    status: o.status || "",
    payment_status: o.payment_status || "",
    delivery_address: o.delivery_address || "",
    delivery_time: o.delivery_time || "",
    total_amount: Number(o.total_amount || 0),
    created_at: o.created_at || "",
    items: o.items || [],
    customer_latitude: o.customer_latitude,
    customer_longitude: o.customer_longitude,
  }));
  orders = deliveryQueueRows();
  customers = data.customers.map((c) => [
    c.name,
    c.phone || "-",
    c.address || "-",
    c.customer_type || "ทั่วไป",
    money(c.balance_due),
    c.cylinders_on_hand || "-",
    c.id,
    Number(c.balance_due || 0),
    Number(c.credit_limit || 0),
    c.latitude,
    c.longitude,
    booleanFlag(c.is_priority),
    c.line_id || "",
  ]);
  suppliers = (data.suppliers || []).map((s) => ({
    id: s.id,
    name: s.name || "",
    contact_name: s.contact_name || "",
    phone: s.phone || "",
    address: s.address || "",
    tax_id: s.tax_id || "",
    payment_terms: s.payment_terms || "",
    note: s.note || "",
  }));
  bankAccounts = (data.bankAccounts || []).map((a) => ({
    id: a.id,
    bank_name: a.bank_name || "",
    account_name: a.account_name || "",
    account_number: a.account_number || "",
    branch_name: a.branch_name || "",
    account_type: a.account_type || "",
    opening_balance: Number(a.opening_balance || 0),
    current_balance: Number(a.current_balance || 0),
    note: a.note || "",
  }));
  branches = (data.branches || []).map((branch) => ({
    id: branch.id,
    name: branch.name || "",
    tax_id: branch.tax_id || "",
    phone: branch.phone || "",
    address: branch.address || "",
    payment_qr_image: branch.payment_qr_image || "",
    is_active: branch.is_active !== false && branch.is_active !== 0,
  }));
  const activeBranchIds = activeBranches().map((branch) => String(branch.id));
  if (!activeBranchIds.includes(String(state.selectedBranchId))) {
    state.selectedBranchId = activeBranchIds[0] || "";
    persistSelectedBranchId(state.selectedBranchId);
  }
  goodsReceipts = (data.goodsReceipts || []).map((r) => ({
    id: r.id,
    receipt_no: r.receipt_no || "",
    supplier_id: r.supplier_id,
    supplier_name: r.supplier_name || "",
    invoice_no: r.invoice_no || "",
    received_at: r.received_at || "",
    payment_status: r.payment_status || "",
    payment_method: r.payment_method || "",
    credit_days: Number(r.credit_days || 0),
    bank_account_id: r.bank_account_id,
    subtotal_amount: Number(r.subtotal_amount || r.total_amount || 0),
    vat_type: r.vat_type || "exclusive",
    vat_rate: Number(r.vat_rate || 0),
    vat_amount: Number(r.vat_amount || 0),
    total_amount: Number(r.total_amount || 0),
    note: r.note || "",
    created_at: r.created_at || "",
    items: r.items || [],
  }));
  supplierPaymentVouchers = (data.supplierPaymentVouchers || []).map((v) => ({
    id: v.id,
    voucher_no: v.voucher_no || "",
    goods_receipt_id: v.goods_receipt_id,
    supplier_id: v.supplier_id,
    supplier_name: v.supplier_name || "",
    receipt_no: v.receipt_no || "",
    invoice_no: v.invoice_no || "",
    paid_at: v.paid_at || "",
    payment_method: v.payment_method || "",
    bank_account_id: v.bank_account_id,
    amount: Number(v.amount || 0),
    reference_no: v.reference_no || "",
    note: v.note || "",
    created_at: v.created_at || "",
  }));
  openingBalances = (data.openingBalances || []).map((item) => ({
    id: item.id,
    stock_month: item.stock_month || "",
    product_id: item.product_id,
    sku: item.sku || "",
    product_name: item.product_name || item.name || "",
    category: item.category || "",
    unit: item.unit || "",
    quantity: Number(item.quantity || 0),
    empty_quantity: Number(item.empty_quantity || 0),
    unit_price: Number(item.unit_price || 0),
    total_amount: Number(item.total_amount || 0),
    created_at: item.created_at || "",
  }));
  cashOpenings = (data.cashOpenings || []).map((item) => ({
    id: item.id,
    cash_month: item.cash_month || "",
    opening_cash: Number(item.opening_cash || 0),
    created_at: item.created_at || "",
    updated_at: item.updated_at || "",
  }));
  bankOpenings = (data.bankOpenings || []).map((item) => ({
    id: item.id,
    bank_month: item.bank_month || "",
    bank_account_id: item.bank_account_id,
    bank_name: item.bank_name || "",
    account_name: item.account_name || item.bank_account_name || "",
    account_number: item.account_number || item.bank_account_number || "",
    opening_balance: Number(item.opening_balance || 0),
    created_at: item.created_at || "",
    updated_at: item.updated_at || "",
  }));
  monthlyStockCounts = (data.monthlyStockCounts || []).map((item) => ({
    id: item.id,
    stock_month: item.stock_month || "",
    product_id: item.product_id,
    counted_full: Number(item.counted_full || 0),
    counted_empty: Number(item.counted_empty || 0),
    system_full: Number(item.system_full || 0),
    system_empty: Number(item.system_empty || 0),
    note: item.note || "",
    counted_at: item.counted_at || "",
  }));
  stockMovements = (data.stockMovements || []).map((movement) => ({
    id: movement.id,
    product_id: movement.product_id,
    sku: movement.sku || "",
    product_name: movement.product_name || "",
    category: movement.category || "",
    unit: movement.unit || "",
    movement_type: movement.movement_type || "",
    full_delta: Number(movement.full_delta || 0),
    empty_delta: Number(movement.empty_delta || 0),
    note: movement.note || "",
    created_at: movement.created_at || "",
  }));
  payments = (data.payments || []).map((payment) => ({
    id: payment.id,
    payment_no: payment.payment_no || "",
    source_type: payment.source_type || "",
    party_name: payment.party_name || "",
    description: payment.description || "",
    customer_id: payment.customer_id,
    order_id: payment.order_id,
    method: payment.method || "",
    bank_account_id: payment.bank_account_id,
    reference_no: payment.reference_no || "",
    customer_name: payment.customer_name || "",
    order_no: payment.order_no || "",
    order_status: payment.order_status || "",
    bank_name: payment.bank_name || "",
    bank_account_name: payment.bank_account_name || "",
    bank_account_number: payment.bank_account_number || "",
    is_active: payment.is_active !== false && payment.is_active !== 0,
    status: payment.is_active === false || payment.is_active === 0 ? "ยกเลิก" : (payment.status || "รับเงินแล้ว"),
    amount: Number(payment.amount || 0),
    debt_reduction_amount: Number(payment.debt_reduction_amount || 0),
    note: payment.note || "",
    paid_at: payment.paid_at || payment.created_at || "",
    created_at: payment.created_at || "",
    canceled_at: payment.canceled_at || "",
  }));
  generalReceiptVouchers = (data.generalReceiptVouchers || payments.filter(isGeneralReceipt)).map((payment) => ({
    id: payment.id,
    payment_no: payment.payment_no || "",
    source_type: payment.source_type || "general_receipt",
    party_name: payment.party_name || payment.customer_name || "",
    description: payment.description || "",
    customer_name: payment.customer_name || "",
    method: payment.method || payment.payment_method || "",
    bank_account_id: payment.bank_account_id,
    bank_name: payment.bank_name || "",
    bank_account_name: payment.bank_account_name || "",
    bank_account_number: payment.bank_account_number || "",
    reference_no: payment.reference_no || payment.payment_no || "",
    is_active: payment.is_active !== false && payment.is_active !== 0,
    status: payment.is_active === false || payment.is_active === 0 ? "ยกเลิก" : (payment.status || "รับเงินแล้ว"),
    amount: Number(payment.amount || 0),
    debt_reduction_amount: Number(payment.debt_reduction_amount || 0),
    note: payment.note || "",
    paid_at: payment.paid_at || payment.created_at || "",
    created_at: payment.created_at || "",
    canceled_at: payment.canceled_at || "",
  }));
  expenses = (data.expenses || []).map((expense) => ({
    id: expense.id,
    expense_no: expense.expense_no || "",
    source_type: expense.source_type || "",
    category: expense.category || "",
    description: expense.description || "",
    payee_name: expense.payee_name || "",
    payment_method: expense.payment_method || expense.paid_by || "",
    paid_by: expense.paid_by || "",
    bank_account_id: expense.bank_account_id,
    bank_name: expense.bank_name || "",
    bank_account_name: expense.bank_account_name || "",
    bank_account_number: expense.bank_account_number || "",
    reference_no: expense.reference_no || "",
    is_active: expense.is_active !== false && expense.is_active !== 0,
    status: expense.is_active === false || expense.is_active === 0 ? "ยกเลิก" : (expense.status || "บันทึกแล้ว"),
    amount: Number(expense.amount || 0),
    note: expense.note || "",
    expense_at: expense.expense_at || expense.created_at || "",
    created_at: expense.created_at || "",
    canceled_at: expense.canceled_at || "",
  }));
  customerReceiptVouchers = (data.customerReceiptVouchers || payments.filter((payment) => /^(SND|VDN)/.test(String(payment.order_no || "")))).map((payment) => ({
    id: payment.id,
    payment_no: payment.payment_no || "",
    customer_id: payment.customer_id,
    customer_name: payment.customer_name || customerNameById(payment.customer_id),
    order_id: payment.order_id,
    order_no: payment.order_no || "",
    order_status: payment.order_status || "",
    method: payment.method || "",
    bank_account_id: payment.bank_account_id,
    bank_name: payment.bank_name || "",
    bank_account_name: payment.bank_account_name || "",
    bank_account_number: payment.bank_account_number || "",
    reference_no: payment.reference_no || payment.payment_no || "",
    is_active: payment.is_active !== false && payment.is_active !== 0,
    status: payment.is_active === false || payment.is_active === 0 ? "ยกเลิก" : (payment.status || "รับเงินแล้ว"),
    amount: Number(payment.amount || 0),
    debt_reduction_amount: Number(payment.debt_reduction_amount || 0),
    note: payment.note || "",
    paid_at: payment.paid_at || payment.created_at || "",
    created_at: payment.created_at || "",
    canceled_at: payment.canceled_at || "",
  }));
  debtors = data.customers
    .filter((c) => Number(c.balance_due) > 0)
    .slice(0, 5)
    .map((c, index) => [c.name, `${3 + index * 3} วัน`, money(c.balance_due)]);
  recentSales = payments.filter((payment) => !isGeneralReceipt(payment)).slice(0, 5).map((p) => [
    String(p.paid_at || "").slice(11, 16) || "-",
    p.payment_no,
    customerNameById(p.customer_id),
    p.method,
    Number(p.amount || 0).toLocaleString(),
    "ชำระแล้ว",
  ]);
  kpis = [
    { icon: "↗", label: "ยอดขายวันนี้", value: money(data.metrics.todaySales), sub: "ข้อมูลจาก API", tone: "green" },
    { icon: "▤", label: "ออเดอร์วันนี้", value: String(data.metrics.orderCount), sub: "โหลดจาก backend", tone: "blue" },
    { icon: "▣", label: "รับชำระวันนี้", value: money(data.metrics.paidToday), sub: "รวมรายการรับเงิน", tone: "mint" },
    { icon: "▥", label: "ถังเต็ม", value: String(data.metrics.fullCylinders), sub: "รวมถังแก๊ส", tone: "violet" },
    { icon: "▥", label: "ถังเปล่า", value: String(data.metrics.emptyCylinders), sub: "รวมถังเปล่า", tone: "orange" },
    { icon: "□", label: "ลูกหนี้ค้างชำระ", value: money(data.metrics.debtTotal), sub: `${debtors.length} ราย`, tone: "red" },
  ];
}

async function loadDashboard() {
  try {
    const data = await api("/api/dashboard");
    applyDashboard(data);
    const health = await api("/api/health");
    state.apiStatus = health.engine === "mysql" ? "เชื่อมต่อ MySQL แล้ว" : "บันทึกลงไฟล์ local";
    rerender();
  } catch (error) {
    state.apiStatus = "API ยังไม่พร้อม";
    toast(error.message);
    rerender();
  }
}

async function submitModal(type, modal) {
  const inputs = [...modal.querySelectorAll("input")].map((input) => input.value);
  const select = modal.querySelector("select")?.value || "เงินสด";
  if (type === "customer") {
    await api("/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: inputs[0], phone: "", address: inputs[1], customer_type: "ทั่วไป" }),
    });
  } else if (type === "payment") {
    await api("/api/payments", {
      method: "POST",
      body: JSON.stringify({ customer_id: customers[0]?.[6] || 1, method: select, amount: Number(String(inputs[1]).replace(/,/g, "")) || 0, note: inputs[0] }),
    });
  } else if (type === "expense") {
    toast("รายการจ่ายจะบันทึกในตาราง expenses รอบถัดไป");
  } else {
    await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_id: customers[0]?.[6] || 1,
        delivery_address: customers[0]?.[2] || "",
        delivery_time: "ทันที",
        payment_status: select === "เครดิตลูกค้า" ? "รอชำระ" : "ชำระแล้ว",
        items: [{ product_id: products[0]?.id || 1, quantity: 2, unit_price: products[0]?.price || 380 }],
      }),
    });
  }
  await loadDashboard();
}

document.addEventListener("click", (event) => {
  const authModeButton = event.target.closest("[data-auth-mode]");
  const openResetLinkButton = event.target.closest("[data-open-reset-link]");
  const backupDownloadButton = event.target.closest("[data-backup-download]");
  const logoutButton = event.target.closest("[data-logout]");
  const pageButton = event.target.closest("[data-page]");
  const financeTabButton = event.target.closest("[data-finance-tab]");
  const settingsTabButton = event.target.closest("[data-settings-tab]");
  const navGroupButton = event.target.closest("[data-nav-group]");
  const branchToggleButton = event.target.closest("[data-branch-toggle]");
  const branchSelectButton = event.target.closest("[data-branch-select]");
  const filterButton = event.target.closest("[data-filter]");
  const modalButton = event.target.closest("[data-modal]");
  const reportButton = event.target.closest("[data-report-view]");
  const reportExportButton = event.target.closest("[data-report-export]");
  const reportClearButton = event.target.closest("[data-report-clear]");
  const reportPageButton = event.target.closest("[data-report-page]");
  const reportProductToggleButton = event.target.closest("[data-report-product-toggle]");
  const reportProductPickButton = event.target.closest("[data-report-product-pick]");
  const openingProductToggleButton = event.target.closest("[data-opening-product-toggle]");
  const openingProductPickButton = event.target.closest("[data-opening-product-pick]");
  const openingBalanceDeleteButton = event.target.closest("[data-opening-balance-delete]");
  const cashOpeningEditButton = event.target.closest("[data-cash-opening-edit]");
  const cashOpeningDeleteButton = event.target.closest("[data-cash-opening-delete]");
  const bankOpeningEditButton = event.target.closest("[data-bank-opening-edit]");
  const bankOpeningDeleteButton = event.target.closest("[data-bank-opening-delete]");
  const stockProductClearButton = event.target.closest("[data-stock-count-product-clear]");
  const stockProductToggleButton = event.target.closest("[data-stock-count-product-toggle]");
  const stockProductPickButton = event.target.closest("[data-stock-count-product-pick]");
  const toastButton = event.target.closest("[data-toast]");
  const allCustomerHistoryButton = event.target.closest("[data-customer-history-all]");
  const historyCustomerButton = event.target.closest("[data-customer-history]");
  const editCustomerButton = event.target.closest("[data-customer-edit]");
  const deleteCustomerButton = event.target.closest("[data-customer-delete]");
  const mapButton = event.target.closest("[data-map-lat]");
  const editUserButton = event.target.closest("[data-user-edit]");
  const cancelUserFormButton = event.target.closest("[data-user-form-cancel]");
  const resetUserButton = event.target.closest("[data-user-reset]");
  const deleteUserButton = event.target.closest("[data-user-delete]");
  const editBranchButton = event.target.closest("[data-branch-edit]");
  const cancelBranchFormButton = event.target.closest("[data-branch-form-cancel]");
  const deleteBranchButton = event.target.closest("[data-branch-delete]");
  const clearBranchQrButton = event.target.closest("[data-branch-qr-clear]");

  if (authModeButton) {
    state.authMode = authModeButton.dataset.authMode || "login";
    state.loginError = "";
    state.authNotice = "";
    state.authDebugResetLink = "";
    if (state.authMode === "login") {
      state.passwordResetToken = "";
      if (window.location.search.includes("resetToken")) window.history.replaceState({}, "", window.location.pathname);
    }
    rerender();
    return;
  }

  if (openResetLinkButton) {
    try {
      const resetUrl = new URL(openResetLinkButton.dataset.openResetLink, window.location.origin);
      state.passwordResetToken = resetUrl.searchParams.get("resetToken") || "";
      state.authMode = "reset";
      state.loginError = "";
      state.authNotice = "";
      state.authDebugResetLink = "";
      window.history.replaceState({}, "", `/?resetToken=${encodeURIComponent(state.passwordResetToken)}`);
      rerender();
    } catch {
      toast("ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง");
    }
    return;
  }

  if (backupDownloadButton) {
    withLoading("กำลังสำรองข้อมูล", downloadBackup)
      .then(() => toast("ดาวน์โหลดไฟล์สำรองข้อมูลแล้ว"))
      .catch((error) => toast(error.message));
    return;
  }

  if (logoutButton) {
    logout();
    return;
  }
  if (branchToggleButton) {
    const slot = branchToggleButton.dataset.branchToggle || "top";
    state.branchSelectorOpen = state.branchSelectorOpen === slot ? "" : slot;
    rerender();
    return;
  }
  if (branchSelectButton) {
    const branch = activeBranches().find((item) => String(item.id) === String(branchSelectButton.dataset.branchSelect));
    if (!branch) return;
    state.selectedBranchId = String(branch.id);
    state.branchSelectorOpen = "";
    persistSelectedBranchId(state.selectedBranchId);
    rerender();
    toast(`เลือกสาขา ${branch.name} แล้ว`);
    return;
  }
  if (editUserButton) {
    state.userEditId = editUserButton.dataset.userEdit || "";
    rerender();
    setTimeout(() => document.querySelector("[data-user-form] input[name='username']")?.focus(), 0);
    return;
  }
  if (cancelUserFormButton) {
    state.userEditId = "";
    rerender();
    return;
  }
  if (resetUserButton) {
    const user = appUsers.find((item) => String(item.id) === String(resetUserButton.dataset.userReset));
    if (!user) return;
    const newPassword = window.prompt(`ตั้งรหัสผ่านใหม่ให้ ${user.username}\nอย่างน้อย 8 ตัว และต้องมีตัวอักษรกับตัวเลข`);
    if (!newPassword) return;
    withLoading("กำลังรีเซ็ตรหัสผ่าน", async () => {
      await api(`/api/users/${user.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword }),
      });
      if (Number(user.id) === Number(state.authUser?.id)) {
        clearAuthSession();
      } else {
        await loadUsers();
      }
    }).then(() => {
      if (Number(user.id) === Number(state.authUser?.id)) {
        toast("รีเซ็ตรหัสของตัวเองแล้ว กรุณาเข้าสู่ระบบใหม่");
        rerender();
      } else {
        toast(`รีเซ็ตรหัสผ่าน ${user.username} แล้ว`);
      }
    }).catch((error) => toast(error.message));
    return;
  }
  if (deleteUserButton?.dataset.userDelete) {
    const user = appUsers.find((item) => String(item.id) === String(deleteUserButton.dataset.userDelete));
    if (!user) return;
    const ok = window.confirm(`ปิดใช้งานผู้ใช้ ${user.username}?\n\nผู้ใช้นี้จะเข้าใช้งานระบบไม่ได้ แต่ประวัติจะยังอยู่`);
    if (!ok) return;
    withLoading("กำลังปิดใช้งานผู้ใช้", async () => {
      await api(`/api/users/${user.id}`, { method: "DELETE" });
      await loadUsers();
    }).then(() => toast(`ปิดใช้งาน ${user.username} แล้ว`)).catch((error) => toast(error.message));
    return;
  }
  if (editBranchButton) {
    state.branchEditId = editBranchButton.dataset.branchEdit || "";
    rerender();
    setTimeout(() => document.querySelector("[data-branch-form] input[name='name']")?.focus(), 0);
    return;
  }
  if (cancelBranchFormButton) {
    state.branchEditId = "";
    rerender();
    return;
  }
  if (clearBranchQrButton) {
    setBranchQrImageValue(clearBranchQrButton, "");
    toast("ลบ QR จากฟอร์มแล้ว กดบันทึกสาขาเพื่อยืนยัน");
    return;
  }
  if (deleteBranchButton?.dataset.branchDelete) {
    const branch = branches.find((item) => String(item.id) === String(deleteBranchButton.dataset.branchDelete));
    if (!branch) return;
    const ok = window.confirm(`ลบสาขา ${branch.name}?\n\nข้อมูลจะถูกปิดใช้งานและไม่แสดงในรายการสาขา`);
    if (!ok) return;
    withLoading("กำลังลบสาขา", async () => {
      await api(`/api/branches/${branch.id}`, { method: "DELETE" });
      if (String(state.branchEditId) === String(branch.id)) state.branchEditId = "";
      await loadDashboard();
    }).then(() => toast(`ลบสาขา ${branch.name} แล้ว`)).catch((error) => toast(error.message));
    return;
  }
  const locationButton = event.target.closest("[data-use-current-location]");
  const stockButton = event.target.closest("[data-open-stock]");
  const editProductButton = event.target.closest("[data-product-edit]");
  const deleteProductButton = event.target.closest("[data-product-delete]");
  const editSupplierButton = event.target.closest("[data-supplier-edit]");
  const deleteSupplierButton = event.target.closest("[data-supplier-delete]");
  const editBankButton = event.target.closest("[data-bank-edit]");
  const deleteBankButton = event.target.closest("[data-bank-delete]");
  const editReceiptButton = event.target.closest("[data-receipt-edit]");
  const deleteReceiptButton = event.target.closest("[data-receipt-delete]");
  const payReceiptButton = event.target.closest("[data-payable-pay]");
  const deletePayableButton = event.target.closest("[data-payable-delete]");
  const payCustomerReceiptButton = event.target.closest("[data-customer-receive-pay]");
  const deleteCustomerReceiptButton = event.target.closest("[data-customer-receipt-delete]");
  const editGeneralReceiptButton = event.target.closest("[data-general-receipt-edit]");
  const deleteGeneralReceiptButton = event.target.closest("[data-general-receipt-delete]");
  const editGeneralPaymentButton = event.target.closest("[data-general-payment-edit]");
  const printGeneralPaymentButton = event.target.closest("[data-general-payment-print]");
  const deleteGeneralPaymentButton = event.target.closest("[data-general-payment-delete]");
  const viewCashBillButton = event.target.closest("[data-cash-bill-view]");
  const printCashBillButton = event.target.closest("[data-cash-bill-print]");
  const cancelCashBillButton = event.target.closest("[data-cash-bill-cancel]");
  const viewDeliveryNoteButton = event.target.closest("[data-delivery-note-view]");
  const printDeliveryNoteButton = event.target.closest("[data-delivery-note-print]");
  const viewCashTaxInvoiceButton = event.target.closest("[data-cash-tax-invoice-view]");
  const printCashTaxInvoiceButton = event.target.closest("[data-cash-tax-invoice-print]");
  const cancelCashTaxInvoiceButton = event.target.closest("[data-cash-tax-invoice-cancel]");
  const viewDeliveryTaxInvoiceButton = event.target.closest("[data-delivery-tax-invoice-view]");
  const printDeliveryTaxInvoiceButton = event.target.closest("[data-delivery-tax-invoice-print]");
  const cancelDeliveryTaxInvoiceButton = event.target.closest("[data-delivery-tax-invoice-cancel]");
  const editMonthlyStockButton = event.target.closest("[data-monthly-stock-edit]");
  const deleteMonthlyStockButton = event.target.closest("[data-monthly-stock-delete]");
  const bulkDeleteMonthlyStockButton = event.target.closest("[data-monthly-stock-bulk-delete]");
  if (financeTabButton) {
    state.financeTab = financeTabButton.dataset.financeTab || "overview";
    rerender();
    return;
  }
  if (settingsTabButton) {
    state.settingsTab = settingsTabButton.dataset.settingsTab || "account";
    state.userEditId = "";
    state.branchEditId = "";
    rerender();
    return;
  }
  if (navGroupButton) {
    const group = navGroupButton.dataset.navGroup;
    state.navGroupsOpen[group] = !state.navGroupsOpen[group];
    rerender();
    return;
  }
  if (viewCashBillButton) {
    const order = salesOrders.find((item) => String(item.id) === String(viewCashBillButton.dataset.cashBillView));
    if (!order) return;
    openCashBillDetailModal(order);
    return;
  }
  if (printCashBillButton) {
    const order = salesOrders.find((item) => String(item.id) === String(printCashBillButton.dataset.cashBillPrint));
    if (!order) return;
    printCashBill(order);
    return;
  }
  if (viewDeliveryNoteButton) {
    const order = salesOrders.find((item) => String(item.id) === String(viewDeliveryNoteButton.dataset.deliveryNoteView));
    if (!order) return;
    openCashBillDetailModal(order, "deliveryNote");
    return;
  }
  if (printDeliveryNoteButton) {
    const order = salesOrders.find((item) => String(item.id) === String(printDeliveryNoteButton.dataset.deliveryNotePrint));
    if (!order) return;
    printDeliveryNote(order);
    return;
  }
  if (viewCashTaxInvoiceButton) {
    const order = salesOrders.find((item) => String(item.id) === String(viewCashTaxInvoiceButton.dataset.cashTaxInvoiceView));
    if (!order) return;
    openCashBillDetailModal(order, "cashTaxInvoice");
    return;
  }
  if (printCashTaxInvoiceButton) {
    const order = salesOrders.find((item) => String(item.id) === String(printCashTaxInvoiceButton.dataset.cashTaxInvoicePrint));
    if (!order) return;
    printCashTaxInvoice(order);
    return;
  }
  if (cancelCashTaxInvoiceButton) {
    const order = salesOrders.find((item) => String(item.id) === String(cancelCashTaxInvoiceButton.dataset.cashTaxInvoiceCancel));
    if (!order || order.status === "ยกเลิก") return;
    const ok = window.confirm(`ยกเลิกบิลเงินสด/ใบกำกับภาษี ${order.order_no}?\n\nระบบจะปรับสถานะเป็นยกเลิก คืนถังเต็ม และตัดถังเปล่าที่เคยรับกลับในเอกสารนี้`);
    if (!ok) return;
    withLoading("กำลังยกเลิกบิลเงินสด/ใบกำกับภาษี", async () => {
      await api(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ยกเลิก" }),
      });
      await loadDashboard();
    }).then(() => toast(`ยกเลิกเอกสาร ${order.order_no} แล้ว`)).catch((error) => toast(error.message));
    return;
  }
  if (viewDeliveryTaxInvoiceButton) {
    const order = salesOrders.find((item) => String(item.id) === String(viewDeliveryTaxInvoiceButton.dataset.deliveryTaxInvoiceView));
    if (!order) return;
    openCashBillDetailModal(order, "deliveryTaxInvoice");
    return;
  }
  if (printDeliveryTaxInvoiceButton) {
    const order = salesOrders.find((item) => String(item.id) === String(printDeliveryTaxInvoiceButton.dataset.deliveryTaxInvoicePrint));
    if (!order) return;
    printDeliveryTaxInvoice(order);
    return;
  }
  if (cancelDeliveryTaxInvoiceButton) {
    const order = salesOrders.find((item) => String(item.id) === String(cancelDeliveryTaxInvoiceButton.dataset.deliveryTaxInvoiceCancel));
    if (!order || order.status === "ยกเลิก") return;
    const ok = window.confirm(`ยกเลิกใบส่งของ/ใบกำกับภาษี ${order.order_no}?\n\nระบบจะปรับสถานะเป็นยกเลิก คืนถังเต็ม และตัดถังเปล่าที่เคยรับกลับในเอกสารนี้`);
    if (!ok) return;
    withLoading("กำลังยกเลิกใบส่งของ/ใบกำกับภาษี", async () => {
      await api(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ยกเลิก" }),
      });
      await loadDashboard();
    }).then(() => toast(`ยกเลิกเอกสาร ${order.order_no} แล้ว`)).catch((error) => toast(error.message));
    return;
  }
  if (cancelCashBillButton) {
    const order = salesOrders.find((item) => String(item.id) === String(cancelCashBillButton.dataset.cashBillCancel));
    if (!order || order.status === "ยกเลิก") return;
    const ok = window.confirm(`ยกเลิกบิลเงินสด ${order.order_no}?\n\nระบบจะปรับสถานะเป็นยกเลิก คืนถังเต็ม และตัดถังเปล่าที่เคยรับกลับในบิลนี้`);
    if (!ok) return;
    withLoading("กำลังยกเลิกบิลเงินสด", async () => {
      await api(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ยกเลิก" }),
      });
      await loadDashboard();
    }).then(() => toast(`ยกเลิกบิล ${order.order_no} แล้ว`)).catch((error) => toast(error.message));
    return;
  }
  if (reportButton) {
    state.reportView = reportButton.dataset.reportView;
    state.reportPage = 1;
    state.reportProductOpen = false;
    rerender();
    return;
  }
  if (reportProductPickButton) {
    state.reportProductId = reportProductPickButton.dataset.reportProductPick || "";
    state.reportProductSearch = "";
    state.reportProductOpen = false;
    state.reportPage = 1;
    rerender();
    return;
  }
  if (reportProductToggleButton) {
    state.reportProductOpen = !state.reportProductOpen;
    rerender();
    const input = document.querySelector("[data-report-product-search]");
    input?.focus();
    return;
  }
  if (event.target.matches("[data-report-product-search]")) {
    state.reportProductOpen = true;
    rerender();
    const input = document.querySelector("[data-report-product-search]");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
    return;
  }
  if (reportPageButton) {
    state.reportPage = Number(reportPageButton.dataset.reportPage || 1);
    rerender();
    return;
  }
  if (reportExportButton) {
    const type = reportExportButton.dataset.reportType || state.reportView;
    if (reportExportButton.dataset.reportExport === "excel") exportReportExcel(type);
    if (reportExportButton.dataset.reportExport === "pdf") printReportPdf(type);
    return;
  }
  if (reportClearButton) {
    state.reportDateFrom = todayIso;
    state.reportDateTo = todayIso;
    state.reportMonth = todayIso.slice(0, 7);
    state.reportSupplierId = "";
    state.reportProductId = "";
    state.reportProductSearch = "";
    state.reportProductOpen = false;
    state.reportBankAccountId = "";
    state.reportBestSellerPeriod = "month";
    state.reportPage = 1;
    rerender();
    return;
  }
  if (openingProductPickButton) {
    const product = products.find((item) => String(item.id) === String(openingProductPickButton.dataset.openingProductPick));
    state.openingProductId = openingProductPickButton.dataset.openingProductPick || "";
    state.openingProductSearch = "";
    state.openingProductOpen = false;
    rerender();
    const priceInput = document.querySelector("[data-opening-unit-price]");
    if (priceInput && product) priceInput.value = String(product.price || 0);
    syncOpeningBalanceTotal();
    return;
  }
  if (openingProductToggleButton) {
    state.openingProductOpen = !state.openingProductOpen;
    rerender();
    const input = document.querySelector("[data-opening-product-search]");
    input?.focus();
    return;
  }
  if (event.target.matches("[data-opening-product-search]")) {
    state.openingProductOpen = true;
    rerender();
    const input = document.querySelector("[data-opening-product-search]");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
    return;
  }
  if (openingBalanceDeleteButton) {
    const id = openingBalanceDeleteButton.dataset.openingBalanceDelete;
    if (!id) return;
    const ok = window.confirm("ลบยอดยกมารายการนี้? ระบบจะปรับสต๊อคและบันทึก Stock card ย้อนกลับให้");
    if (!ok) return;
    withLoading("กำลังลบยอดยกมา", async () => {
      await api(`/api/opening-balances/${id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast("ลบยอดยกมาแล้ว"))
      .catch((error) => toast(error.message));
    return;
  }
  if (cashOpeningEditButton) {
    const item = cashOpenings.find((row) => String(row.id) === String(cashOpeningEditButton.dataset.cashOpeningEdit));
    if (!item?.cash_month) return;
    state.cashOpeningMonth = item.cash_month;
    rerender();
    setTimeout(() => {
      const form = document.querySelector("[data-cash-opening-form]");
      const input = document.querySelector("[data-cash-opening-amount]");
      form?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
      input?.select();
    }, 0);
    return;
  }
  if (cashOpeningDeleteButton) {
    const id = cashOpeningDeleteButton.dataset.cashOpeningDelete;
    if (!id) return;
    const ok = window.confirm("ลบยอดเงินสดต้นเดือนนี้?");
    if (!ok) return;
    withLoading("กำลังลบยอดเงินสดต้นเดือน", async () => {
      await api(`/api/cash-openings/${id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast("ลบยอดเงินสดต้นเดือนแล้ว"))
      .catch((error) => toast(error.message));
    return;
  }
  if (bankOpeningEditButton) {
    const item = bankOpenings.find((row) => String(row.id) === String(bankOpeningEditButton.dataset.bankOpeningEdit));
    if (!item?.bank_month) return;
    state.bankOpeningMonth = item.bank_month;
    state.bankOpeningAccountId = String(item.bank_account_id || "");
    rerender();
    setTimeout(() => {
      const form = document.querySelector("[data-bank-opening-form]");
      const input = document.querySelector("[data-bank-opening-amount]");
      form?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
      input?.select();
    }, 0);
    return;
  }
  if (bankOpeningDeleteButton) {
    const id = bankOpeningDeleteButton.dataset.bankOpeningDelete;
    if (!id) return;
    const ok = window.confirm("ลบยอดเงินฝากธนาคารต้นเดือนนี้?");
    if (!ok) return;
    withLoading("กำลังลบยอดเงินฝากต้นเดือน", async () => {
      await api(`/api/bank-openings/${id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast("ลบยอดเงินฝากต้นเดือนแล้ว"))
      .catch((error) => toast(error.message));
    return;
  }
  if (stockProductPickButton) {
    state.stockCountProductId = stockProductPickButton.dataset.stockCountProductPick || "";
    state.stockCountProductSearch = "";
    state.stockCountProductOpen = false;
    state.monthlyStockSelectedIds = [];
    rerender();
    return;
  }
  if (stockProductToggleButton) {
    state.stockCountProductOpen = !state.stockCountProductOpen;
    rerender();
    const input = document.querySelector("[data-stock-count-product-search]");
    input?.focus();
    return;
  }
  if (event.target.matches("[data-stock-count-product-search]")) {
    state.stockCountProductOpen = true;
    rerender();
    const input = document.querySelector("[data-stock-count-product-search]");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
    return;
  }
  if (stockProductClearButton) {
    state.stockCountProductId = "";
    state.stockCountProductSearch = "";
    state.stockCountProductOpen = false;
    state.monthlyStockSelectedIds = [];
    rerender();
    return;
  }
  if (editMonthlyStockButton) {
    withLoading("กำลังบันทึกการแก้ไข", () => saveMonthlyStockRow(editMonthlyStockButton.dataset.monthlyStockEdit))
      .then(({ product, countedFull, countedEmpty }) => {
        toast(`บันทึก ${product.sku || product.name} แล้ว: ถังเต็ม ${countedFull}, ถังเปล่า ${countedEmpty} เก็บไว้ในยอดตรวจนับประจำเดือน`);
      })
      .catch((error) => toast(error.message));
    return;
  }
  if (deleteMonthlyStockButton) {
    const id = deleteMonthlyStockButton.dataset.monthlyStockDelete;
    if (!id) return;
    const ok = window.confirm("ลบยอดตรวจนับสินค้านี้ของเดือนที่เลือก?");
    if (!ok) return;
    withLoading("กำลังลบข้อมูล", async () => {
      await api(`/api/monthly-stock-counts/${id}`, { method: "DELETE" });
      state.monthlyStockSelectedIds = state.monthlyStockSelectedIds.filter((selectedId) => String(selectedId) !== String(id));
      await loadDashboard();
    })
      .then(() => toast("ลบยอดตรวจนับแล้ว"))
      .catch((error) => toast(error.message));
    return;
  }
  if (bulkDeleteMonthlyStockButton) {
    const ids = [...new Set(state.monthlyStockSelectedIds.filter(Boolean))];
    if (!ids.length) return;
    const ok = window.confirm(`ลบยอดตรวจนับที่เลือก ${ids.length} รายการ?`);
    if (!ok) return;
    withLoading("กำลังลบข้อมูลที่เลือก", async () => {
      await Promise.all(ids.map((id) => api(`/api/monthly-stock-counts/${id}`, { method: "DELETE" })));
      state.monthlyStockSelectedIds = [];
      await loadDashboard();
    })
      .then(() => toast(`ลบยอดตรวจนับ ${ids.length} รายการแล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (payReceiptButton) {
    const receipt = goodsReceipts.find((item) => String(item.id) === String(payReceiptButton.dataset.payablePay));
    if (receipt) openBusinessModal("supplierPaymentVoucher", receipt);
    return;
  }
  if (deletePayableButton) {
    const voucher = supplierPaymentVouchers.find((item) => String(item.id) === String(deletePayableButton.dataset.payableDelete));
    if (!voucher) return;
    const ok = window.confirm(`ยกเลิกใบสำคัญจ่าย ${voucher.voucher_no}?\n\nระบบจะคืนสถานะใบรับเป็นเครดิต และคืนยอดบัญชีถ้าเป็นเงินโอน`);
    if (!ok) return;
    withLoading("กำลังลบข้อมูล", async () => {
      await api(`/api/supplier-payment-vouchers/${voucher.id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ยกเลิกใบสำคัญจ่าย ${voucher.voucher_no} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (payCustomerReceiptButton) {
    const order = salesOrders.find((item) => String(item.id) === String(payCustomerReceiptButton.dataset.customerReceivePay));
    if (order) openBusinessModal("customerReceiptVoucher", order);
    return;
  }
  if (deleteCustomerReceiptButton) {
    const voucher = customerReceiptVouchers.find((item) => String(item.id) === String(deleteCustomerReceiptButton.dataset.customerReceiptDelete));
    if (!voucher) return;
    if (!isActivePayment(voucher)) {
      toast("ใบสำคัญรับเงินนี้ยกเลิกแล้ว");
      return;
    }
    const ok = window.confirm(`ยกเลิกใบสำคัญรับเงิน ${voucher.payment_no}?\n\nระบบจะคืนยอดค้างรับให้เอกสารอ้างอิง และหักยอดบัญชีธนาคารคืนถ้าเป็นเงินโอน`);
    if (!ok) return;
    withLoading("กำลังยกเลิกใบสำคัญรับเงิน", async () => {
      await api(`/api/customer-receipt-vouchers/${voucher.id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ยกเลิกใบสำคัญรับเงิน ${voucher.payment_no} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (editGeneralReceiptButton) {
    const voucher = generalReceiptVouchers.find((item) => String(item.id) === String(editGeneralReceiptButton.dataset.generalReceiptEdit));
    if (voucher && !isCanceledRecord(voucher)) openBusinessModal("generalReceipt", voucher);
    return;
  }
  if (deleteGeneralReceiptButton) {
    const voucher = generalReceiptVouchers.find((item) => String(item.id) === String(deleteGeneralReceiptButton.dataset.generalReceiptDelete));
    if (!voucher || isCanceledRecord(voucher)) return;
    const ok = window.confirm(`ยกเลิกใบรับเงินทั่วไป ${voucher.payment_no}?\n\nระบบจะเปลี่ยนสถานะเป็นยกเลิก และหักยอดบัญชีธนาคารคืนถ้าเป็นเงินโอน`);
    if (!ok) return;
    withLoading("กำลังยกเลิกใบรับเงินทั่วไป", async () => {
      await api(`/api/payments/${voucher.id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ยกเลิกใบรับเงิน ${voucher.payment_no} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (editGeneralPaymentButton) {
    const expense = expenses.find((item) => String(item.id) === String(editGeneralPaymentButton.dataset.generalPaymentEdit));
    if (expense && !isCanceledRecord(expense)) openBusinessModal("generalPayment", expense);
    return;
  }
  if (printGeneralPaymentButton) {
    const expense = expenses.find((item) => String(item.id) === String(printGeneralPaymentButton.dataset.generalPaymentPrint));
    if (expense) printGeneralPaymentVoucher(expense);
    return;
  }
  if (deleteGeneralPaymentButton) {
    const expense = expenses.find((item) => String(item.id) === String(deleteGeneralPaymentButton.dataset.generalPaymentDelete));
    if (!expense || isCanceledRecord(expense)) return;
    const ok = window.confirm(`ยกเลิกใบสำคัญจ่ายทั่วไป ${expense.expense_no}?\n\nระบบจะเปลี่ยนสถานะเป็นยกเลิก และคืนยอดบัญชีธนาคารถ้าเป็นเงินโอน`);
    if (!ok) return;
    withLoading("กำลังยกเลิกใบสำคัญจ่ายทั่วไป", async () => {
      await api(`/api/expenses/${expense.id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ยกเลิกใบสำคัญจ่าย ${expense.expense_no} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (editReceiptButton) {
    const receipt = goodsReceipts.find((item) => String(item.id) === String(editReceiptButton.dataset.receiptEdit));
    if (receipt) openBusinessModal("goodsReceipt", receipt);
    return;
  }
  if (deleteReceiptButton) {
    const receipt = goodsReceipts.find((item) => String(item.id) === String(deleteReceiptButton.dataset.receiptDelete));
    if (!receipt) return;
    const ok = window.confirm(`ยกเลิกใบรับสินค้า ${receipt.receipt_no}?\n\nระบบจะตัดถังเต็มที่รับเข้าออก และคืนถังเปล่าที่เคยนำไปแลกกลับเข้า Stock card`);
    if (!ok) return;
    withLoading("กำลังลบข้อมูล", async () => {
      await api(`/api/goods-receipts/${receipt.id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ยกเลิกใบรับ ${receipt.receipt_no} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (editBankButton) {
    const account = bankAccounts.find((item) => String(item.id) === String(editBankButton.dataset.bankEdit));
    if (account) openBusinessModal("bankAccount", account);
    return;
  }
  if (deleteBankButton) {
    const account = bankAccounts.find((item) => String(item.id) === String(deleteBankButton.dataset.bankDelete));
    if (!account) return;
    const ok = window.confirm(`ลบ/ปิดใช้งานบัญชี "${account.bank_name} ${account.account_number}"?`);
    if (!ok) return;
    withLoading("กำลังลบข้อมูล", async () => {
      await api(`/api/bank-accounts/${account.id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ลบบัญชี ${account.bank_name} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (editSupplierButton) {
    const supplier = suppliers.find((item) => String(item.id) === String(editSupplierButton.dataset.supplierEdit));
    if (supplier) openBusinessModal("supplier", supplier);
    return;
  }
  if (deleteSupplierButton) {
    const supplier = suppliers.find((item) => String(item.id) === String(deleteSupplierButton.dataset.supplierDelete));
    if (!supplier) return;
    const ok = window.confirm(`ลบ/ปิดใช้งานตัวแทนจำหน่าย "${supplier.name}"?`);
    if (!ok) return;
    withLoading("กำลังลบข้อมูล", async () => {
      await api(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ลบตัวแทนจำหน่าย ${supplier.name} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (editProductButton) {
    const product = products.find((item) => String(item.id) === String(editProductButton.dataset.productEdit));
    if (product) openBusinessModal("product", product);
    return;
  }
  if (deleteProductButton) {
    const product = products.find((item) => String(item.id) === String(deleteProductButton.dataset.productDelete));
    if (!product) return;
    const ok = window.confirm(`ลบ/ปิดใช้งานสินค้า "${product.name}"?\n\nประวัติออเดอร์และ stock card เก่าจะยังถูกเก็บไว้ แต่สินค้าจะถูกซ่อนจากรายการใช้งาน`);
    if (!ok) return;
    withLoading("กำลังลบข้อมูล", async () => {
      await api(`/api/products/${product.id}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ลบสินค้า ${product.name} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (stockButton) {
    openBusinessModal("stock", { product_id: stockButton.dataset.openStock });
    return;
  }
  if (locationButton) {
    if (!navigator.geolocation) {
      toast("Browser นี้ไม่รองรับการอ่านพิกัด");
      return;
    }
    toast("กำลังอ่านพิกัดปัจจุบัน...");
    navigator.geolocation.getCurrentPosition((position) => {
      const modal = locationButton.closest(".modal");
      modal.querySelector('[name="latitude"]').value = position.coords.latitude.toFixed(7);
      modal.querySelector('[name="longitude"]').value = position.coords.longitude.toFixed(7);
      toast("ใส่พิกัดปัจจุบันลงฟอร์มแล้ว");
    }, () => toast("อ่านพิกัดไม่ได้ กรุณาอนุญาต location หรือกรอกเอง"));
    return;
  }
  if (mapButton) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapButton.dataset.mapLat},${mapButton.dataset.mapLng}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  if (allCustomerHistoryButton) {
    openAllCustomerHistoryModal();
    return;
  }
  if (historyCustomerButton) {
    const customer = customers.find((c) => String(c[6]) === String(historyCustomerButton.dataset.customerHistory));
    if (customer) openCustomerHistoryModal(customer);
    return;
  }
  if (editCustomerButton) {
    const customer = customers.find((c) => String(c[6]) === String(editCustomerButton.dataset.customerEdit));
    if (customer) {
      openBusinessModal("customer", {
        id: customer[6],
        name: customer[0],
        phone: customer[1] === "-" ? "" : customer[1],
        line_id: customer[12] || "",
        address: customer[2] === "-" ? "" : customer[2],
        customer_type: customer[3],
        balance_due: customer[7] ?? plainMoney(customer[4]),
        credit_limit: customer[8] || 0,
        latitude: customer[9] || "",
        longitude: customer[10] || "",
        cylinders_on_hand: customer[5] === "-" ? "" : customer[5],
      });
    }
    return;
  }
  if (deleteCustomerButton) {
    const customer = customers.find((c) => String(c[6]) === String(deleteCustomerButton.dataset.customerDelete));
    if (!customer) return;
    const ok = window.confirm(`ลบ/ปิดใช้งานลูกค้า "${customer[0]}"?\n\nประวัติออเดอร์เก่าจะยังถูกเก็บไว้ แต่ลูกค้าจะถูกซ่อนจากรายการใช้งาน`);
    if (!ok) return;
    withLoading("กำลังลบข้อมูล", async () => {
      await api(`/api/customers/${customer[6]}`, { method: "DELETE" });
      await loadDashboard();
    })
      .then(() => toast(`ลบลูกค้า ${customer[0]} แล้ว`))
      .catch((error) => toast(error.message));
    return;
  }
  if (pageButton) {
    const nextPage = pageButton.dataset.page;
    if (!canAccessPage(nextPage)) {
      toast("บัญชีนี้ไม่มีสิทธิ์ใช้งานฟังก์ชันนี้");
      return;
    }
    state.page = nextPage;
    if (pageButton.dataset.nextFinanceTab) state.financeTab = pageButton.dataset.nextFinanceTab;
    if (pageButton.dataset.nextReportView) {
      state.reportView = pageButton.dataset.nextReportView;
      state.reportPage = 1;
    }
    const parentGroup = navItems.find((item) => !Array.isArray(item) && item.children.includes(state.page));
    if (parentGroup) state.navGroupsOpen[parentGroup.label] = true;
    state.search = "";
    if (state.page !== "ลูกค้า") state.customerSearch = "";
    if (state.page !== "ตัวแทนจำหน่าย") state.supplierSearch = "";
    if (state.page !== "ใบรับสินค้า") state.receiptSearch = "";
    if (state.page !== "บิลเงินสด") state.salesSearch = "";
    if (state.page !== "การเงิน") {
      state.payableSearch = "";
      state.bankSearch = "";
      state.generalReceiptSearch = "";
      state.generalPaymentSearch = "";
    }
    if (state.page !== "ใบสำคัญรับเงิน") state.customerReceiptSearch = "";
    rerender();
    if (state.page === "ตั้งค่า" && isAdminUser()) {
      loadUsers().catch((error) => toast(error.message));
    }
    return;
  }
  if (filterButton) {
    state.orderFilter = filterButton.dataset.filter;
    rerender();
    return;
  }
  if (modalButton) {
    openBusinessModal(modalButton.dataset.modal === "bill" ? "cashBill" : modalButton.dataset.modal);
    return;
  }
  if (toastButton) {
    toast(toastButton.dataset.toast);
  }
  const nextStatusButton = event.target.closest("[data-next-status]");
  if (nextStatusButton) {
    const current = nextStatusButton.dataset.currentStatus;
    const next = current === "รอดำเนินการ" ? "กำลังจัดส่ง" : current === "กำลังจัดส่ง" ? "จัดส่งแล้ว" : "รอดำเนินการ";
    withLoading("กำลังอัปเดตข้อมูล", async () => {
      await api(`/api/orders/${nextStatusButton.dataset.nextStatus}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await loadDashboard();
    }).then(() => toast(`อัปเดตสถานะเป็น ${next}`)).catch((error) => toast(error.message));
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-search]")) {
    state.search = event.target.value;
    if (state.page !== "แดชบอร์ด") state.page = "แดชบอร์ด";
    rerender();
    const input = document.querySelector("[data-search]");
    input?.focus();
    input?.setSelectionRange(state.search.length, state.search.length);
  }
  if (event.target.matches("[data-supplier-search]")) {
    state.supplierSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-supplier-search]");
    input?.focus();
    input?.setSelectionRange(state.supplierSearch.length, state.supplierSearch.length);
  }
  if (event.target.matches("[data-customer-list-search]")) {
    state.customerSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-customer-list-search]");
    input?.focus();
    input?.setSelectionRange(state.customerSearch.length, state.customerSearch.length);
  }
  if (event.target.matches("[data-bank-search]")) {
    state.bankSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-bank-search]");
    input?.focus();
    input?.setSelectionRange(state.bankSearch.length, state.bankSearch.length);
  }
  if (event.target.matches("[data-user-search]")) {
    state.userSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-user-search]");
    input?.focus();
    input?.setSelectionRange(state.userSearch.length, state.userSearch.length);
  }
  if (event.target.matches("[data-branch-search]")) {
    state.branchSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-branch-search]");
    input?.focus();
    input?.setSelectionRange(state.branchSearch.length, state.branchSearch.length);
  }
  if (event.target.matches("[data-receipt-search]")) {
    state.receiptSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-receipt-search]");
    input?.focus();
    input?.setSelectionRange(state.receiptSearch.length, state.receiptSearch.length);
  }
  if (event.target.matches("[data-sales-search]")) {
    state.salesSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-sales-search]");
    input?.focus();
    input?.setSelectionRange(state.salesSearch.length, state.salesSearch.length);
  }
  if (event.target.matches("[data-payable-search]")) {
    state.payableSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-payable-search]");
    input?.focus();
    input?.setSelectionRange(state.payableSearch.length, state.payableSearch.length);
  }
  if (event.target.matches("[data-customer-receipt-search]")) {
    state.customerReceiptSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-customer-receipt-search]");
    input?.focus();
    input?.setSelectionRange(state.customerReceiptSearch.length, state.customerReceiptSearch.length);
  }
  if (event.target.matches("[data-general-receipt-search]")) {
    state.generalReceiptSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-general-receipt-search]");
    input?.focus();
    input?.setSelectionRange(state.generalReceiptSearch.length, state.generalReceiptSearch.length);
  }
  if (event.target.matches("[data-general-payment-search]")) {
    state.generalPaymentSearch = event.target.value;
    rerender();
    const input = document.querySelector("[data-general-payment-search]");
    input?.focus();
    input?.setSelectionRange(state.generalPaymentSearch.length, state.generalPaymentSearch.length);
  }
  if (event.target.matches("[data-stock-count-product-search]")) {
    state.stockCountProductId = "";
    state.stockCountProductSearch = event.target.value;
    state.stockCountProductOpen = true;
    rerender();
    const input = document.querySelector("[data-stock-count-product-search]");
    input?.focus();
    input?.setSelectionRange(state.stockCountProductSearch.length, state.stockCountProductSearch.length);
  }
  if (event.target.matches("[data-opening-product-search]")) {
    state.openingProductId = "";
    state.openingProductSearch = event.target.value;
    state.openingProductOpen = true;
    rerender();
    const input = document.querySelector("[data-opening-product-search]");
    input?.focus();
    input?.setSelectionRange(state.openingProductSearch.length, state.openingProductSearch.length);
  }
  if (event.target.matches("[data-opening-quantity], [data-opening-unit-price]")) {
    syncOpeningBalanceTotal();
  }
  if (event.target.matches("[data-cash-opening-amount]")) {
    event.target.value = formatMoneyInput(event.target.value);
    event.target.setSelectionRange?.(event.target.value.length, event.target.value.length);
  }
  if (event.target.matches("[data-bank-opening-amount]")) {
    event.target.value = formatMoneyInput(event.target.value);
    event.target.setSelectionRange?.(event.target.value.length, event.target.value.length);
  }
  if (event.target.matches("[data-report-product-search]")) {
    state.reportProductId = "";
    state.reportProductSearch = event.target.value;
    state.reportProductOpen = true;
    state.reportPage = 1;
    rerender();
    const input = document.querySelector("[data-report-product-search]");
    input?.focus();
    input?.setSelectionRange(state.reportProductSearch.length, state.reportProductSearch.length);
  }
  if (event.target.matches("[data-report-date-display='dateFrom']")) {
    const iso = thaiDateToIso(event.target.value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      state.reportDateFrom = iso;
      state.reportPage = 1;
      rerender();
    }
  }
  if (event.target.matches("[data-report-date-display='dateTo']")) {
    const iso = thaiDateToIso(event.target.value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      state.reportDateTo = iso;
      state.reportPage = 1;
      rerender();
    }
  }
  if (event.target.matches("[data-report-filter='dateFrom']")) {
    state.reportDateFrom = event.target.value;
    state.reportPage = 1;
    rerender();
  }
  if (event.target.matches("[data-report-filter='dateTo']")) {
    state.reportDateTo = event.target.value;
    state.reportPage = 1;
    rerender();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-branch-qr-upload]")) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    normalizeQrImageFile(file)
      .then((dataUrl) => {
        setBranchQrImageValue(input, dataUrl);
        toast("เลือกรูป QR แล้ว กดบันทึกสาขาเพื่อใช้งาน");
      })
      .catch((error) => {
        input.value = "";
        toast(error.message);
      });
    return;
  }
  if (event.target.matches("[data-monthly-stock-select]")) {
    const id = event.target.dataset.monthlyStockSelect;
    if (!id) return;
    const selected = new Set(state.monthlyStockSelectedIds.map(String));
    if (event.target.checked) selected.add(String(id));
    else selected.delete(String(id));
    state.monthlyStockSelectedIds = [...selected];
    rerender();
  }
  if (event.target.matches("[data-monthly-stock-select-all]")) {
    const ids = [...document.querySelectorAll("[data-monthly-stock-select]")]
      .map((input) => input.dataset.monthlyStockSelect)
      .filter(Boolean);
    const selected = new Set(state.monthlyStockSelectedIds.map(String));
    ids.forEach((id) => event.target.checked ? selected.add(String(id)) : selected.delete(String(id)));
    state.monthlyStockSelectedIds = [...selected];
    rerender();
  }
  if (event.target.matches("[data-stock-count-month]")) {
    const year = state.stockCountMonth.slice(0, 4) || todayIso.slice(0, 4);
    state.stockCountMonth = `${year}-${event.target.value}`;
    state.monthlyStockSelectedIds = [];
    rerender();
  }
  if (event.target.matches("[data-stock-count-year]")) {
    const month = state.stockCountMonth.slice(5, 7) || todayIso.slice(5, 7);
    state.stockCountMonth = `${event.target.value}-${month}`;
    state.monthlyStockSelectedIds = [];
    rerender();
  }
  if (event.target.matches("[data-opening-month]")) {
    const year = state.openingBalanceMonth.slice(0, 4) || todayIso.slice(0, 4);
    state.openingBalanceMonth = `${year}-${event.target.value}`;
    state.openingProductOpen = false;
    rerender();
  }
  if (event.target.matches("[data-opening-year]")) {
    const month = state.openingBalanceMonth.slice(5, 7) || todayIso.slice(5, 7);
    state.openingBalanceMonth = `${event.target.value}-${month}`;
    state.openingProductOpen = false;
    rerender();
  }
  if (event.target.matches("[data-cash-opening-month]")) {
    const year = state.cashOpeningMonth.slice(0, 4) || todayIso.slice(0, 4);
    state.cashOpeningMonth = `${year}-${event.target.value}`;
    rerender();
  }
  if (event.target.matches("[data-cash-opening-year]")) {
    const month = state.cashOpeningMonth.slice(5, 7) || todayIso.slice(5, 7);
    state.cashOpeningMonth = `${event.target.value}-${month}`;
    rerender();
  }
  if (event.target.matches("[data-bank-opening-month]")) {
    const year = state.bankOpeningMonth.slice(0, 4) || todayIso.slice(0, 4);
    state.bankOpeningMonth = `${year}-${event.target.value}`;
    rerender();
  }
  if (event.target.matches("[data-bank-opening-year]")) {
    const month = state.bankOpeningMonth.slice(5, 7) || todayIso.slice(5, 7);
    state.bankOpeningMonth = `${event.target.value}-${month}`;
    rerender();
  }
  if (event.target.matches("[data-bank-opening-account]")) {
    state.bankOpeningAccountId = event.target.value;
    rerender();
  }
  if (event.target.matches("[data-stock-count-product]")) {
    state.stockCountProductId = event.target.value;
    state.monthlyStockSelectedIds = [];
    rerender();
  }
  if (event.target.matches("[data-report-filter='month']")) {
    const year = state.reportMonth.slice(0, 4) || todayIso.slice(0, 4);
    state.reportMonth = `${year}-${event.target.value}`;
    state.reportPage = 1;
    state.reportProductOpen = false;
    rerender();
  }
  if (event.target.matches("[data-report-filter='year']")) {
    const month = state.reportMonth.slice(5, 7) || todayIso.slice(5, 7);
    state.reportMonth = `${event.target.value}-${month}`;
    state.reportPage = 1;
    state.reportProductOpen = false;
    rerender();
  }
  if (event.target.matches("[data-report-filter='supplierId']")) {
    state.reportSupplierId = event.target.value;
    state.reportPage = 1;
    rerender();
  }
  if (event.target.matches("[data-report-filter='bankAccountId']")) {
    state.reportBankAccountId = event.target.value;
    state.reportPage = 1;
    rerender();
  }
  if (event.target.matches("[data-report-filter='bestSellerPeriod']")) {
    state.reportBestSellerPeriod = event.target.value === "year" ? "year" : "month";
    state.reportPage = 1;
    rerender();
  }
});

document.addEventListener("submit", async (event) => {
  const loginForm = event.target.closest("[data-login-form]");
  if (loginForm) {
    event.preventDefault();
    await loginWithCredentials(loginForm);
    return;
  }

  const forgotForm = event.target.closest("[data-forgot-password-form]");
  if (forgotForm) {
    event.preventDefault();
    const data = new FormData(forgotForm);
    const identifier = String(data.get("identifier") || "").trim();
    if (!identifier) {
      state.loginError = "กรุณากรอกชื่อผู้ใช้หรืออีเมล";
      rerender();
      return;
    }
    state.loginError = "";
    state.authNotice = "";
    state.authDebugResetLink = "";
    try {
      const result = await withLoading("กำลังส่งลิงก์ตั้งรหัสผ่าน", () =>
        api("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ identifier }),
        })
      );
      if (result.mailSent) {
        state.authNotice = `ส่งลิงก์ตั้งรหัสผ่านไปที่ ${result.maskedEmail || "อีเมลของบัญชี"} แล้ว`;
      } else if (!result.mailConfigured && result.devResetLink) {
        state.authNotice = "ยังไม่ได้ตั้งค่า SMTP สำหรับส่งอีเมลจริง ใช้ลิงก์ทดสอบด้านล่างได้ในเครื่องนี้";
        state.authDebugResetLink = result.devResetLink;
      } else if (!result.mailConfigured) {
        state.authNotice = "ยังไม่ได้ตั้งค่า SMTP สำหรับส่งอีเมลจริง";
      } else {
        state.authNotice = "ถ้าพบบัญชีนี้ ระบบจะส่งลิงก์ตั้งรหัสผ่านไปที่อีเมลที่บันทึกไว้";
      }
    } catch (error) {
      state.loginError = error.message;
    }
    rerender();
    return;
  }

  const resetPasswordForm = event.target.closest("[data-reset-password-form]");
  if (resetPasswordForm) {
    event.preventDefault();
    const data = new FormData(resetPasswordForm);
    const newPassword = String(data.get("new_password") || "");
    const confirmPassword = String(data.get("confirm_password") || "");
    if (!state.passwordResetToken) {
      state.loginError = "ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง";
      rerender();
      return;
    }
    if (newPassword !== confirmPassword) {
      state.loginError = "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน";
      rerender();
      return;
    }
    state.loginError = "";
    state.authNotice = "";
    try {
      await withLoading("กำลังบันทึกรหัสผ่านใหม่", () =>
        api("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token: state.passwordResetToken, new_password: newPassword }),
        })
      );
      state.authMode = "login";
      state.passwordResetToken = "";
      state.authDebugResetLink = "";
      state.authNotice = "ตั้งรหัสผ่านใหม่เรียบร้อย กรุณาเข้าสู่ระบบ";
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      state.loginError = error.message;
    }
    rerender();
    return;
  }

  const passwordForm = event.target.closest("[data-change-password-form]");
  if (passwordForm) {
    event.preventDefault();
    const data = new FormData(passwordForm);
    const currentPassword = String(data.get("current_password") || "");
    const newPassword = String(data.get("new_password") || "");
    const confirmPassword = String(data.get("confirm_password") || "");
    if (newPassword !== confirmPassword) {
      toast("รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    try {
      await withLoading("กำลังเปลี่ยนรหัสผ่าน", async () => {
        await api("/api/auth/password", {
          method: "PATCH",
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });
      });
      clearAuthSession();
      rerender();
      toast("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่");
    } catch (error) {
      toast(error.message);
    }
    return;
  }

  const userForm = event.target.closest("[data-user-form]");
  if (userForm) {
    event.preventDefault();
    const data = new FormData(userForm);
    const id = String(data.get("id") || "");
    const payload = {
      username: String(data.get("username") || "").trim(),
      email: String(data.get("email") || "").trim(),
      display_name: String(data.get("display_name") || "").trim(),
      role: String(data.get("role") || "staff"),
      permissions: data.getAll("permissions").map((value) => String(value || "")),
      is_active: String(data.get("is_active") || "1") === "1",
    };
    if (!id) payload.password = String(data.get("password") || "");
    try {
      await withLoading(id ? "กำลังแก้ไขผู้ใช้งาน" : "กำลังเพิ่มผู้ใช้งาน", async () => {
        const savedUser = await api(id ? `/api/users/${id}` : "/api/users", {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        });
        if (id && Number(id) === Number(state.authUser?.id)) {
          state.authUser = savedUser;
          ensureAllowedPage();
        }
        state.userEditId = "";
        await loadUsers();
      });
      toast(id ? "แก้ไขผู้ใช้งานแล้ว" : "เพิ่มผู้ใช้งานแล้ว");
    } catch (error) {
      toast(error.message);
    }
    return;
  }

  const branchForm = event.target.closest("[data-branch-form]");
  if (branchForm) {
    event.preventDefault();
    const data = new FormData(branchForm);
    const id = String(data.get("id") || "");
    const payload = {
      name: String(data.get("name") || "").trim(),
      tax_id: String(data.get("tax_id") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      address: String(data.get("address") || "").trim(),
      payment_qr_image: String(data.get("payment_qr_image") || "").trim(),
    };
    if (!payload.name) {
      toast("กรุณากรอกชื่อสาขา");
      return;
    }
    try {
      await withLoading(id ? "กำลังแก้ไขสาขา" : "กำลังเพิ่มสาขา", async () => {
        await api(id ? `/api/branches/${id}` : "/api/branches", {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        });
        state.branchEditId = "";
        await loadDashboard();
      });
      toast(id ? "แก้ไขสาขาแล้ว" : "เพิ่มสาขาแล้ว");
    } catch (error) {
      toast(error.message);
    }
    return;
  }

  const cashOpeningForm = event.target.closest("[data-cash-opening-form]");
  if (cashOpeningForm) {
    event.preventDefault();
    const data = new FormData(cashOpeningForm);
    const openingCash = plainMoney(data.get("opening_cash"));
    if (openingCash < 0) {
      toast("ยอดเงินสดต้องไม่ติดลบ");
      return;
    }
    try {
      await withLoading("กำลังบันทึกยอดเงินสดต้นเดือน", async () => {
        await api("/api/cash-openings", {
          method: "POST",
          body: JSON.stringify({
            cash_month: state.cashOpeningMonth,
            opening_cash: openingCash,
          }),
        });
        await loadDashboard();
      });
      toast("บันทึกยอดเงินสดต้นเดือนแล้ว");
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const bankOpeningForm = event.target.closest("[data-bank-opening-form]");
  if (bankOpeningForm) {
    event.preventDefault();
    const data = new FormData(bankOpeningForm);
    const bankAccountId = Number(data.get("bank_account_id") || state.bankOpeningAccountId || 0);
    const openingBalance = plainMoney(data.get("opening_balance"));
    if (!bankAccountId) {
      toast("กรุณาเลือกบัญชีธนาคาร");
      return;
    }
    if (openingBalance < 0) {
      toast("ยอดเงินฝากต้องไม่ติดลบ");
      return;
    }
    try {
      await withLoading("กำลังบันทึกยอดเงินฝากต้นเดือน", async () => {
        await api("/api/bank-openings", {
          method: "POST",
          body: JSON.stringify({
            bank_month: state.bankOpeningMonth,
            bank_account_id: bankAccountId,
            opening_balance: openingBalance,
          }),
        });
        state.bankOpeningAccountId = String(bankAccountId);
        await loadDashboard();
      });
      toast("บันทึกยอดเงินฝากต้นเดือนแล้ว");
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const openingForm = event.target.closest("[data-opening-balance-form]");
  if (openingForm) {
    event.preventDefault();
    const data = new FormData(openingForm);
    const productId = Number(data.get("product_id") || state.openingProductId || 0);
    const quantity = Number(data.get("quantity") || 0);
    const emptyQuantity = Number(data.get("empty_quantity") || 0);
    const unitPrice = Number(data.get("unit_price") || 0);
    if (!productId) {
      toast("กรุณาเลือกสินค้า");
      return;
    }
    if (quantity < 0 || emptyQuantity < 0) {
      toast("จำนวนต้องไม่ติดลบ");
      return;
    }
    if (quantity <= 0 && emptyQuantity <= 0) {
      toast("กรุณากรอกถังเต็มหรือถังเปล่ามากกว่า 0");
      return;
    }
    try {
      await withLoading("กำลังบันทึกยอดยกมา", async () => {
        await api("/api/opening-balances", {
          method: "POST",
          body: JSON.stringify({
            stock_month: state.openingBalanceMonth,
            product_id: productId,
            quantity,
            empty_quantity: emptyQuantity,
            unit_price: unitPrice,
          }),
        });
        state.openingProductId = "";
        state.openingProductSearch = "";
        state.openingProductOpen = false;
        await loadDashboard();
      });
      toast("บันทึกยอดยกมาและอัปเดตสต๊อคแล้ว");
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const form = event.target.closest("[data-monthly-stock-form]");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  const productSearch = (state.stockCountProductSearch || "").trim().toLowerCase();
  const matchesProductSearch = (product) =>
    [product.sku, product.name, product.category, categoryLabel(product.category), product.unit]
      .join(" ")
      .toLowerCase()
      .includes(productSearch);
  const selectedProducts = state.stockCountProductId
    ? products.filter((product) => String(product.id) === String(state.stockCountProductId))
    : productSearch
      ? products.filter(matchesProductSearch)
    : products;
  const items = selectedProducts.map((product) => ({
    product_id: product.id,
    counted_full: Number(data.get(`full_${product.id}`) || 0),
    counted_empty: Number(data.get(`empty_${product.id}`) || 0),
  }));
  try {
    await withLoading("กำลังบันทึกข้อมูล", async () => {
      await api("/api/monthly-stock-counts", {
        method: "POST",
        body: JSON.stringify({
          stock_month: state.stockCountMonth,
          note: data.get("note") || "",
          items,
        }),
      });
      state.monthlyStockSelectedIds = [];
      await loadDashboard();
    });
    toast("บันทึกจำนวนสต๊อคประจำเดือนเรียบร้อย");
  } catch (error) {
    toast(error.message);
  }
});

async function saveMonthlyStockRow(productId) {
  const product = products.find((item) => String(item.id) === String(productId));
  if (!product) throw new Error("ไม่พบสินค้า");
  const form = document.querySelector("[data-monthly-stock-form]");
  const data = new FormData(form);
  const countedFull = Number(data.get(`full_${product.id}`) || 0);
  const countedEmpty = Number(data.get(`empty_${product.id}`) || 0);
  await api("/api/monthly-stock-counts", {
    method: "POST",
    body: JSON.stringify({
      stock_month: state.stockCountMonth,
      note: data.get("note") || "",
      items: [{
        product_id: product.id,
        counted_full: countedFull,
        counted_empty: countedEmpty,
      }],
    }),
  });
  await loadDashboard();
  return { product, countedFull, countedEmpty };
}

function syncOpeningBalanceTotal() {
  const quantity = Number(document.querySelector("[data-opening-quantity]")?.value || 0);
  const unitPrice = Number(document.querySelector("[data-opening-unit-price]")?.value || 0);
  const totalInput = document.querySelector("[data-opening-line-total]");
  if (totalInput) totalInput.value = money(quantity * unitPrice, { decimals: 2 });
}

rerender();
bootApp();

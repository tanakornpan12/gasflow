const path = require("node:path");
const fs = require("node:fs");

const playwrightRoot = "C:\\Users\\Smart\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright";
const { chromium } = require(playwrightRoot);

(async () => {
  const outDir = path.join(__dirname, "..", "artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 1 });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "gasflow-dashboard.png"), fullPage: true });
  const pages = ["ขายหน้าร้าน", "จัดส่ง", "ลูกค้า", "สินค้าและถัง", "การเงิน", "รายงาน", "ตั้งค่า"];
  const checks = [];
  for (const label of pages) {
    await page.getByRole("button", { name: label }).click();
    await page.screenshot({ path: path.join(outDir, `gasflow-${label}.png`), fullPage: true });
    checks.push({ page: label, visible: await page.getByRole("heading", { name: label, exact: true }).isVisible() });
  }
  const title = await page.title();
  const bodyText = await page.locator("body").innerText();
  await browser.close();
  console.log(JSON.stringify({ title, screenshot: path.join(outDir, "gasflow-dashboard.png"), hasDashboard: bodyText.includes("แดชบอร์ด"), checks }));
})();

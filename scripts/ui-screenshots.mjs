/**
 * Capture UI screenshots of key dashboard routes
 * Usage: node scripts/ui-screenshots.mjs [--url http://localhost:3002]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "screenshots");

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const BASE_URL = getArg("--url") || process.env.FRONTEND_URL || "http://localhost:3002";
const API_URL =
  getArg("--api-url") ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://new-saf-foundation-backend.onrender.com/api";
const TEST_MOBILE = getArg("--mobile") || process.env.API_TEST_MOBILE || "9999999999";
const TEST_PASSWORD = getArg("--password") || process.env.API_TEST_PASSWORD || "password123";

async function loginForScreenshots() {
  const fd = new FormData();
  fd.append("mobile", TEST_MOBILE);
  fd.append("password", TEST_PASSWORD);
  try {
    const res = await fetch(`${API_URL}?apicall=login`, { method: "POST", body: fd });
    const data = await res.json();
    const user = data?.user;
    if (!user?.token) return null;
    return { token: user.token, user };
  } catch {
    return null;
  }
}

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findBrowser() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const ROUTES = [
  { path: "/", name: "01-login" },
  { path: "/dashboard", name: "02-dashboard" },
  { path: "/dashboard/general-applications", name: "03-general-applications-list" },
  { path: "/dashboard/general-applications/add", name: "04-general-applications-add" },
  { path: "/dashboard/general-applications-insurance", name: "05-insurance-list" },
  { path: "/dashboard/general-applications-insurance/add", name: "06-insurance-add" },
  { path: "/dashboard/agent-registration", name: "07-agent-list" },
  { path: "/dashboard/agent-registration/add", name: "08-agent-add" },
  { path: "/dashboard/loan-application", name: "09-loan-list" },
  { path: "/dashboard/loan-application/add", name: "10-loan-add" },
  { path: "/dashboard/financal-help", name: "11-financial-help-list" },
  { path: "/dashboard/financal-help/add", name: "12-financial-help-add" },
  { path: "/dashboard/disability-cycle", name: "13-disability-list" },
  { path: "/dashboard/marriage-congratulations", name: "14-marriage-congrats-list" },
  { path: "/dashboard/mayra-registration", name: "15-mayra-registration-list" },
  { path: "/dashboard/mayra-registration/add", name: "16-mayra-registration-add" },
  { path: "/dashboard/mayra-congratulations", name: "17-mayra-congrats-list" },
  { path: "/dashboard/pension-yojana", name: "18-pension-list" },
  { path: "/dashboard/sewing-machine", name: "19-sewing-machine-list" },
  { path: "/dashboard/suraksha-bima-yojana", name: "20-suraksha-bima-list" },
  { path: "/dashboard/bulk-marriage-emi", name: "21-bulk-marriage-emi" },
  { path: "/dashboard/bulk-mayra-emi", name: "22-bulk-mayra-emi" },
  { path: "/dashboard/bulk-suraksha-bima-emi", name: "23-bulk-suraksha-emi" },
  { path: "/dashboard/payment-management/cash-flow", name: "24-cash-flow" },
  { path: "/dashboard/payment-management/general-application-payment", name: "25-general-app-payment" },
  { path: "/dashboard/payment-management/finance-help-payment", name: "26-finance-help-payment" },
  { path: "/dashboard/payment-management/loan-payment", name: "27-loan-payment" },
  { path: "/dashboard/agent-permission", name: "28-agent-permission" },
  { path: "/dashboard/agent-commission", name: "29-agent-commission" },
];

async function main() {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.error("Chrome/Edge not found. Install Chrome or set CHROME_PATH env var.");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  const auth = await loginForScreenshots();
  await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate((session) => {
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userRole", "admin");
    if (session) {
      localStorage.setItem("token", session.token);
      localStorage.setItem("user", JSON.stringify(session.user));
    } else {
      localStorage.setItem("user", JSON.stringify({ id: 1, name: "Test Admin", mobile: "0000000000" }));
      localStorage.setItem("token", "screenshot-test-token");
    }
  }, auth);

  const captured = [];
  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    try {
      console.log(`Capturing ${route.name}...`);
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 1500));
      const filePath = path.join(OUT_DIR, `${route.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      captured.push({ route: route.path, file: filePath, status: "ok" });
    } catch (err) {
      console.error(`Failed ${route.path}:`, err.message);
      captured.push({ route: route.path, status: "error", error: err.message });
    }
  }

  await browser.close();

  const manifest = path.join(OUT_DIR, "manifest.json");
  fs.writeFileSync(manifest, JSON.stringify({ baseUrl: BASE_URL, capturedAt: new Date().toISOString(), captured }, null, 2));
  console.log(`\nCaptured ${captured.filter((c) => c.status === "ok").length}/${ROUTES.length} screenshots in ${OUT_DIR}`);
}

main().catch(console.error);

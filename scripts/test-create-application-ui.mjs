/**
 * UI smoke test: login + create general application
 * Usage: node scripts/test-create-application-ui.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const MOBILE = process.env.API_TEST_MOBILE || "9999999999";
const PASSWORD = process.env.API_TEST_PASSWORD || "password123";

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

const suffix = String(Date.now()).slice(-4);

async function main() {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.error("FAIL: Chrome/Edge not found");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("Form data")) {
      console.log("   [browser]", msg.text());
    }
  });
  page.on("response", async (response) => {
    if (response.url().includes("createApplication")) {
      try {
        console.log("   [api]", response.status(), (await response.text()).slice(0, 300));
      } catch {
        // ignore
      }
    }
  });

  try {
    console.log("1. Opening login page...");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });

    await page.waitForSelector('input[type="text"]');
    await page.click('input[type="text"]', { clickCount: 3 });
    await page.type('input[type="text"]', MOBILE);
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', PASSWORD);

    console.log("2. Logging in...");
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => window.location.pathname.includes("/dashboard"),
      { timeout: 30000 }
    );

    console.log("3. Opening add application form...");
    await page.goto(`${BASE_URL}/dashboard/general-applications/add`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#applicantName", { visible: true, timeout: 30000 });
    console.log("   Form loaded");

    const fill = async (id, value) => {
      await page.waitForSelector(`#${id}`, { visible: true });
      await page.$eval(
        `#${id}`,
        (el, val) => {
          const input = el;
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          if (setter) setter.call(input, val);
          else input.value = val;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        },
        value
      );
    };

    await fill("applicationDate", "21-06-2026");
    await fill("applicantName", `UI Test ${suffix}`);
    await fill("fatherName", "Test Father");
    await fill("motherName", "Test Mother");
    await fill("dateOfBirth", "15-03-2000");
    await fill("aadharNumber", `9876${suffix}1234`.slice(0, 12));
    await fill("gotra", "Prajapat");
    await fill("mobile", `98${suffix}${suffix}`.slice(0, 10));
    await fill("address", "Test Village");
    await fill("pinCode", "344001");
    await fill("tehsil", "Balotra");
    await fill("district", "Barmer");
    await fill("state", "Rajasthan");
    await fill("nomineeName", "Test Nominee");
    await fill("nomineeRelation", "Brother");

    console.log("   Filled base fields");
    await page.select("#gender", "Male");
    console.log("   Selected gender");

    await page.waitForFunction(() => {
      const fee = document.querySelector("#fee");
      return fee && fee.value;
    }, { timeout: 15000 });
    console.log("   Fee calculated");

    await page.waitForFunction(() => {
      const select = document.querySelector("#selectedAgentId");
      return select && select.options.length > 1;
    }, { timeout: 15000 });
    console.log("   Agents loaded");
    await page.evaluate(() => {
      const select = document.querySelector("#selectedAgentId");
      if (select && select.options.length > 1) {
        select.value = select.options[1].value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    await page.select("#paymentMode", "cash");
    await fill("paymentAmount", "1000");
    await fill("paymentDate", "21-06-2026");

    console.log("4. Submitting form...");
    const [nav] = await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);

    await new Promise((r) => setTimeout(r, 3000));
    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText);

    if (url.includes("/dashboard/general-applications") && !url.includes("/add")) {
      console.log(`PASS: Application created, redirected to ${url}`);
    } else if (/added successfully|Application added/i.test(bodyText)) {
      console.log("PASS: Application created (success toast visible)");
    } else {
      const errors = bodyText.match(/.{0,80}(error|failed|invalid|required).{0,80}/gi) || [];
      throw new Error(`Still on ${url}. Hints: ${errors.slice(0, 3).join(" | ") || bodyText.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("FAIL:", err.message);
    const shot = path.join(__dirname, "..", "docs", "screenshots", "create-app-fail.png");
    fs.mkdirSync(path.dirname(shot), { recursive: true });
    await page.screenshot({ path: shot, fullPage: true });
    console.error("Screenshot:", shot);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();

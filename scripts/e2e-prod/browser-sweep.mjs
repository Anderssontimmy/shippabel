// Anonymous browser sweep of PRODUCTION (desktop and mobile): public pages load with a heading and no JS errors or
// horizontal overflow, the pricing button sends a logged-out visitor to login, footer links resolve, and a public
// GitHub repository can be scanned through the real UI. Read-only apart from the scan it starts.
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const BASE = process.env.SWEEP_BASE_URL ?? "https://shippabel.com";
const SCAN_REPO = process.env.SWEEP_SCAN_REPO ?? "https://github.com/Anderssontimmy/shippabel";
const SHOTS = process.env.SHOTS_DIR ?? "test-results/e2e-prod";
mkdirSync(SHOTS, { recursive: true });

let fails = 0;
const log = (ok, name, extra = "") => { if (ok === false) fails++; console.log(`${ok === true ? "PASS" : ok === false ? "FAIL" : "INFO"}  ${name}${extra ? "  -> " + extra : ""}`); };

// Real pages (the app answers 200 even for unknown routes, so also require a heading that is not the 404 page).
const PAGES = ["/", "/pricing", "/about", "/scan", "/login", "/privacy", "/blog", "/scan/demo", "/dashboard"];

const browser = await chromium.launch();
for (const [label, options] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["mobile", { ...devices["Pixel 7"] }]]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [], failed = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
  page.on("requestfailed", (r) => failed.push(`${r.url().slice(0, 90)} ${r.failure()?.errorText}`));
  page.on("response", (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url().slice(0, 90)}`); });

  for (const path of PAGES) {
    errors.length = 0;
    const response = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 }).catch(() => null);
    await page.waitForTimeout(500);
    const heading = (await page.locator("h1").first().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 70);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    log(response?.status() === 200 && heading !== "" && !/not found/i.test(heading) && !overflow && errors.length === 0,
      `[${label}] ${path}`, `${response?.status()} "${heading}"${overflow ? " HORIZONTAL OVERFLOW" : ""}${errors.length ? " ERRORS: " + errors.join(" | ") : ""}`);
  }

  await page.goto(BASE + "/pricing", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Get Ship/i }).click();
  await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
  log(/\/login\?next=%2Fpricing/.test(page.url()), `[${label}] 'Get Ship' while logged out leads to login and back`, page.url());

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const links = await page.locator("footer a[href]").evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")));
  for (const href of links.filter((h) => h.startsWith("/"))) { const r = await page.request.get(BASE + href); log(r.status() === 200, `[${label}] footer link ${href}`, String(r.status())); }

  if (label === "desktop") {
    await page.goto(BASE + "/scan", { waitUntil: "networkidle" });
    await page.locator('input[type="text"], input[type="url"], input:not([type])').first().fill(SCAN_REPO);
    await page.getByRole("button", { name: /scan|check|analy/i }).first().click();
    const reached = await page.waitForURL(/\/scan\/[0-9a-f-]{36}/, { timeout: 90000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/scan-results.png`, fullPage: true });
    log(reached, "[desktop] a public GitHub repository can be scanned and gets a results page", page.url());
  }
  log(failed.length === 0, `[${label}] no failed requests or 5xx`, failed.slice(0, 3).join(" | "));
  await context.close();
}
await browser.close();
console.log(`\n${fails} failures`);
process.exitCode = fails ? 1 : 0;

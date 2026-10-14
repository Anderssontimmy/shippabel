// Re-take the product pictures on the landing page from the real demo pages.
// Run after the report, listing or screenshot screens change:
//   npm run build && npm run capture:landing
// It serves dist/ itself, so nothing else needs to be running.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const PORT = 4179;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = fileURLToPath(new URL("../public/landing/", import.meta.url));
mkdirSync(OUT, { recursive: true });

// Each picture: the demo route, and how far below the page header (64px) and the step bar (about 53px) to start, and how tall.
const shots = [
  { file: "report.jpg", route: "/scan/demo", top: 0, height: 900 },
  {
    file: "listing.jpg",
    route: "/app/demo/listing",
    top: 70,
    height: 700,
    // The demo only shows the written store page after "Write my store page" is pressed.
    before: async (page) => {
      await page.getByLabel("Describe your app").fill("A fitness app with quick home workouts, a progress tracker and daily reminders.");
      await page.getByRole("button", { name: "Write my store page" }).click();
      await page.getByText("We wrote 3 versions").waitFor({ timeout: 15000 });
    },
  },
];
const WIDTH = 1040;

const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { stdio: "ignore" });
try {
  for (let i = 0; i < 40; i++) {
    if (await fetch(BASE).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: WIDTH, height: 900 }, reducedMotion: "reduce", deviceScaleFactor: 1.5 });
  for (const { file, route, top, height, before } of shots) {
    const page = await context.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await before?.(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, file), type: "jpeg", quality: 82, fullPage: true, clip: { x: 0, y: 64 + top, width: WIDTH, height } });
    console.log("wrote", file);
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}

import { test, expect } from "@playwright/test";

async function prepareScreenshot(page: import("@playwright/test").Page) {
  await page.route(/https:\/\/(fonts\.(googleapis|gstatic)\.com|plausible\.io|static\.cloudflareinsights\.com)\//, route => route.abort());
  await page.goto("/app/demo/screenshots", { waitUntil: "domcontentloaded" });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add my first screenshot" }).click();
  await (await chooser).setFiles({ name: "fixture.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=", "base64") });
}

test("screenshot editor exports a real PNG with modern page colors", async ({ page }) => {
  await prepareScreenshot(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("screenshot_1.png");
  const chunks: Buffer[] = [];
  for await (const chunk of (await file.createReadStream())!) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(320);
  expect(png.readUInt32BE(20)).toBeLessThanOrEqual(3840);
  await expect(page.getByText("Screenshots exported!", { exact: true })).toBeVisible();
});

test("failed screenshot encoding shows an error without reporting export success", async ({ page }) => {
  await prepareScreenshot(page);
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = callback => callback(null); });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(page.getByText("Export failed. Please try again.", { exact: true })).toBeVisible();
  await expect(page.getByText("Screenshots exported!", { exact: true })).toHaveCount(0);
});

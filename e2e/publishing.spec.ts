import { test, expect, type Page } from "@playwright/test";

const projectId = "00000000-0000-4000-8000-000000000456";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=", "base64");
const variant = { app_name: "Fixture", short_description: "A test app", full_description: "An app used for testing the publishing journey.", subtitle: "Test", keywords: "test" };
type Listing = Record<string, unknown> | null;

async function setup(page: Page, initial: Listing = null, failSecondUpload = false) {
  let listing = initial;
  let uploads = 0;
  let writes = 0;
  await page.route(/https:\/\/(fonts\.(googleapis|gstatic)\.com|plausible\.io|static\.cloudflareinsights\.com)\//, route => route.abort());
  await page.route("**/auth/v1/**", route => route.fulfill({ json: { id: "qa", app_metadata: { plan: "ship" } } }));
  await page.route("**/rest/v1/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/store_listings")) {
      if (route.request().method() === "POST") {
        if (listing && url.searchParams.get("on_conflict") !== "project_id,platform") {
          await route.fulfill({ status: 409, json: { message: "Duplicate listing" } }); return;
        }
        writes++;
        listing = { id: "listing", ...listing, ...route.request().postDataJSON() };
      }
      const single = route.request().headers().accept?.includes("vnd.pgrst.object");
      await route.fulfill({ json: single ? listing : listing ? [listing] : [] }); return;
    }
    if (url.pathname.endsWith("/projects")) {
      await route.fulfill({ json: { id: projectId, name: "Fixture", repo_url: "https://github.com/qa/app", scan_result: { score: 100, issues: [], summary: { critical: 0 }, needs_conversion: false } } }); return;
    }
    await route.fulfill({ json: [] });
  });
  await page.route("**/functions/v1/generate-copy", async route => {
    listing = { id: "listing", ...variant, project_id: projectId, platform: "android", privacy_policy_url: "https://example.test/privacy", screenshots: ["https://example.test/one.png"] };
    await route.fulfill({ json: { variants: [variant] } });
  });
  await page.route("**/storage/v1/**", async route => {
    if (route.request().method() === "POST") {
      uploads++;
      if (failSecondUpload && uploads === 2) { await route.fulfill({ status: 500, json: { message: "Upload failed" } }); return; }
      await route.fulfill({ json: { Key: "fixture" } }); return;
    }
    if (route.request().method() === "DELETE") { await route.fulfill({ json: [] }); return; }
    await route.fulfill({ contentType: "image/png", body: png });
  });
  await page.route("https://example.test/*.png", route => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const configPath = "/src/lib/" + "config.ts";
    const { config } = await import(/* @vite-ignore */ configPath);
    const key = `sb-${new URL(config.supabaseUrl).hostname.split(".")[0]}-auth-token`;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const access_token = `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ sub: "qa", exp }))}.fixture`;
    localStorage.setItem(key, JSON.stringify({ access_token, refresh_token: "fixture", expires_at: exp, token_type: "bearer", user: { id: "qa", app_metadata: { plan: "ship" } } }));
  });
  return { getListing: () => listing, getWrites: () => writes };
}

async function uploadTwo(page: Page) {
  let chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add my first screenshot" }).click();
  await (await chooser).setFiles({ name: "one.png", mimeType: "image/png", buffer: png });
  chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add device", exact: true }).first().click();
  await (await chooser).setFiles({ name: "two.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("2/2 screenshots", { exact: true })).toBeVisible();
}

test("first generated listing saves edits without duplicating or erasing existing assets", async ({ page }) => {
  const state = await setup(page);
  await page.goto(`/app/${projectId}/listing`);
  await page.getByRole("button", { name: "Write my store page", exact: true }).click();
  await page.getByRole("textbox", { name: "App Name", exact: true }).fill("");
  await expect(page.getByRole("textbox", { name: "App Name", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Save & continue/ })).toBeDisabled();
  await page.getByRole("textbox", { name: "App Name", exact: true }).fill("Edited name");
  await page.getByRole("button", { name: /Save & continue/ }).click();
  await expect(page).toHaveURL(`/app/${projectId}/screenshots`);
  expect(state.getListing()).toMatchObject({ app_name: "Edited name", privacy_policy_url: "https://example.test/privacy", screenshots: ["https://example.test/one.png"] });
});

test("Continue saves both pages and restores them after returning", async ({ page }) => {
  const state = await setup(page, { ...variant });
  await page.goto(`/app/${projectId}/screenshots`);
  await uploadTwo(page);
  // Editor controls fit the viewport even after the empty state is dismissed.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page).toHaveURL(`/app/${projectId}/submit`);
  expect(state.getListing()?.screenshots).toHaveLength(2);
  await page.goto(`/app/${projectId}/screenshots`);
  await expect(page.getByAltText("Saved screenshot 1", { exact: true })).toBeVisible();
  await expect(page.getByText("2/2 screenshots", { exact: true })).toBeVisible();
});

test("a failed second upload keeps the previous listing and does not continue", async ({ page }) => {
  const state = await setup(page, { ...variant }, true);
  await page.goto(`/app/${projectId}/screenshots`);
  await uploadTwo(page);
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByText(/Couldn't save all screenshots/)).toBeVisible();
  await expect(page).toHaveURL(`/app/${projectId}/screenshots`);
  expect(state.getWrites()).toBe(0);
  expect(state.getListing()).toEqual(variant);
});

test("one screenshot does not complete the publishing checklist", async ({ page }) => {
  await setup(page, { ...variant, screenshots: ["https://example.test/one.png"] });
  await page.goto(`/app/${projectId}/submit`);
  await expect(page.getByRole("link", { name: "Upload screenshots" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
});

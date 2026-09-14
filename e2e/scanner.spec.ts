import { test, expect } from "@playwright/test";

// External analytics/fonts are not part of the app contract under test.
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/(fonts\.(googleapis|gstatic)\.com|plausible\.io|static\.cloudflareinsights\.com)\//, (route) => route.abort());
});

const projectId = "00000000-0000-4000-8000-000000000123";
const scan = { score: 80, project_type: "expo", needs_conversion: false, issues: [], summary: { critical: 0, warning: 0, info: 0, total: 0 } };

test("landing and demo render without browser exceptions", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toBeVisible();
  await page.goto("/scan/demo", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("73", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("lookalike GitHub host rejected without creating a project", async ({ page }) => {
  let apiRequests = 0;
  await page.route("**/rest/v1/projects**", (route) => { apiRequests++; return route.abort(); });
  await page.goto("/scan", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Paste your GitHub link here").fill("https://evil.test/github.com/owner/repository");
  await page.getByRole("button", { name: /check my app/i }).click();
  await expect(page.getByText(/doesn't look like a GitHub link/)).toBeVisible();
  expect(apiRequests).toBe(0);
});

test("scan passes guest proof, omits GitHub credentials and opens saved report", async ({ page }) => {
  await page.route("**/rest/v1/projects**", async (route) => {
    expect(route.request().headers()["x-guest-token"]).toMatch(/^[a-f0-9]{64}$/);
    await route.fulfill({ json: { id: projectId, name: "test app", user_id: null, scan_result: scan } });
  });
  await page.route("**/functions/v1/scan-project", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.github_token).toBeUndefined();
    expect(body.project_id).toBe(projectId);
    expect(route.request().headers()["x-guest-token"]).toMatch(/^[a-f0-9]{64}$/);
    await route.fulfill({ json: { success: true, scan_result: scan } });
  });
  await page.goto("/scan", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Paste your GitHub link here").fill("https://github.com/owner/repository");
  await page.getByRole("button", { name: /check my app/i }).click();
  await expect(page).toHaveURL(`/scan/${projectId}`);
  await expect(page.getByText("80", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("80", { exact: true })).toBeVisible();
});

test("backend failure stays on scanner and shows the server error", async ({ page }) => {
  await page.route("**/rest/v1/projects**", (route) => route.fulfill({ json: { id: projectId } }));
  await page.route("**/functions/v1/scan-project", (route) => route.fulfill({ status: 422, json: { error: "Your GitHub connection has expired. Reconnect it in Settings." } }));
  await page.goto("/scan", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Paste your GitHub link here").fill("https://github.com/owner/repository");
  await page.getByRole("button", { name: /check my app/i }).click();
  await expect(page.getByText(/Your GitHub connection has expired/)).toBeVisible();
  await expect(page).toHaveURL("/scan");
});

test("unsupported archive never uploads", async ({ page }) => {
  let requests = 0;
  await page.route("**/rest/v1/projects**", (route) => { requests++; return route.abort(); });
  await page.goto("/scan", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "I have a file" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "project.tar.gz", mimeType: "application/gzip", buffer: Buffer.from("invalid") });
  await page.getByRole("button", { name: /check my app/i }).click();
  await expect(page.getByText("Please upload a .zip file.")).toBeVisible();
  expect(requests).toBe(0);
});

test("ZIP upload uses the private archive bucket", async ({ page }) => {
  await page.route("**/rest/v1/projects**", (route) => route.fulfill({ json: { id: projectId, name: "test app", scan_result: scan } }));
  let uploaded = false;
  await page.route("**/storage/v1/object/project-archives/**", async (route) => {
    uploaded = true;
    expect(route.request().url()).toContain(`/scans/${projectId}/source.zip`);
    await route.fulfill({ json: { Key: `project-archives/scans/${projectId}/source.zip` } });
  });
  await page.route("**/functions/v1/scan-project", (route) => route.fulfill({ json: { success: true } }));
  await page.goto("/scan", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "I have a file" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "project.zip", mimeType: "application/zip", buffer: Buffer.from("fixture") });
  await page.getByRole("button", { name: /check my app/i }).click();
  await expect(page).toHaveURL(`/scan/${projectId}`);
  expect(uploaded).toBe(true);
});

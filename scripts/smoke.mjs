// Read-only deployment check. A 200 frontend alone is not a healthy product.
const base = process.env.SMOKE_BASE_URL ?? "https://shippabel.com";
const api = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!api || !key) throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for smoke tests.");
const checks = [
  ...["/", "/scan", "/scan/demo", "/login", "/pricing"].map((path) => ({ name: `frontend ${path}`, url: base + path, expected: 200 })),
  { name: "Supabase auth", url: api + "/auth/v1/settings", expected: 200, api: true },
  { name: "Database", url: api + "/rest/v1/projects?select=id&limit=0", expected: 200, api: true },
  { name: "Scanner validation", url: api + "/functions/v1/scan-project", expected: 400, api: true, body: {} },
  { name: "Checkout auth guard", url: api + "/functions/v1/create-checkout", expected: 401, api: true, body: { plan: "ship" } },
];
let failed = false;
for (const check of checks) {
  try {
    const response = await fetch(check.url, {
      method: check.body ? "POST" : "GET", signal: AbortSignal.timeout(20000),
      headers: check.api ? { apikey: key, "Content-Type": "application/json" } : {},
      body: check.body ? JSON.stringify(check.body) : undefined,
    });
    if (response.status !== check.expected) throw new Error(`HTTP ${response.status}, expected ${check.expected}`);
    if (!check.api && !(await response.text()).includes('id="root"')) throw new Error("Missing application HTML");
    console.log(`PASS ${check.name}`);
  } catch (error) { failed = true; console.error(`FAIL ${check.name}: ${error.message}`); }
}
process.exitCode = failed ? 1 : 0;

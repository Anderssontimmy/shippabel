import { pathToFileURL } from "node:url";

// Read-only deployment check. Verify the deployed revision and executable
// frontend as well as auth, database and function guards.
export async function runSmoke(env = process.env, request = fetch, log = console) {
  const base = env.SMOKE_BASE_URL ?? "https://shippabel.com";
  const api = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!api || !key) throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for smoke tests.");
  const checks = [
    { name: "Deployed revision", url: base + "/version.json", expected: 200, version: true },
    ...["/", "/scan", "/scan/demo", "/login", "/pricing"].map((path) => ({ name: `frontend ${path}`, url: base + path, expected: 200, page: true })),
    { name: "Supabase auth", url: api + "/auth/v1/settings", expected: 200, api: true },
    { name: "Database", url: api + "/rest/v1/projects?select=id&limit=0", expected: 200, api: true },
    { name: "Scanner validation", url: api + "/functions/v1/scan-project", expected: 400, api: true, body: {} },
    { name: "Checkout auth guard", url: api + "/functions/v1/create-checkout", expected: 401, api: true, body: { plan: "ship" } },
  ];
  let failed = false;
  const assets = new Set();
  for (const check of checks) {
    try {
      const response = await request(check.url, {
        method: check.body ? "POST" : "GET", signal: AbortSignal.timeout(20000),
        headers: check.api ? { apikey: key, "Content-Type": "application/json" } : {},
        body: check.body ? JSON.stringify(check.body) : undefined,
      });
      if (response.status !== check.expected) throw new Error(`HTTP ${response.status}, expected ${check.expected}`);
      if (check.version) {
        if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Missing version JSON (possibly an old deployment or SPA fallback)");
        const version = await response.json();
        if (!/^[a-f0-9]{40}$/.test(version.commit ?? "")) throw new Error("Missing source commit");
        if (env.SMOKE_EXPECTED_COMMIT && version.commit !== env.SMOKE_EXPECTED_COMMIT) throw new Error(`Deployed ${version.commit}, expected ${env.SMOKE_EXPECTED_COMMIT}`);
      }
      if (check.page) {
        const html = await response.text();
        if (!html.includes('id="root"')) throw new Error("Missing application HTML");
        const script = html.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/i)?.[1];
        if (!script) throw new Error("Missing application script");
        const asset = new URL(script, base);
        if (asset.origin !== new URL(base).origin) throw new Error("Unexpected application script origin");
        if (!assets.has(asset.href)) {
          assets.add(asset.href);
          checks.push({ name: `JavaScript ${asset.pathname}`, url: asset.href, expected: 200, script: true });
        }
      }
      if (check.script && (!/javascript/.test(response.headers.get("content-type") ?? "") || !(await response.text()).trim())) throw new Error("Missing executable JavaScript");
      log.log(`PASS ${check.name}`);
    } catch (error) { failed = true; log.error(`FAIL ${check.name}: ${error.message}`); }
  }
  return !failed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await runSmoke() ? 0 : 1;

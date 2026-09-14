import assert from "node:assert/strict";
import test from "node:test";
import { runSmoke } from "./smoke.mjs";

const commit = "a".repeat(40);
const env = { SMOKE_BASE_URL: "https://site.test", VITE_SUPABASE_URL: "https://api.test", VITE_SUPABASE_ANON_KEY: "public-key", SMOKE_EXPECTED_COMMIT: commit };
const html = '<div id="root"></div><script type="module" crossorigin src="/assets/app.js"></script>';
const quiet = { log() {}, error() {} };
function mock(overrides = {}) {
  return async (input, init) => {
    const url = new URL(input);
    if (url.origin === env.SMOKE_BASE_URL) assert.equal(init.headers.apikey, undefined);
    if (overrides[url.pathname]) return overrides[url.pathname]();
    if (url.pathname === "/version.json") return Response.json({ commit });
    if (url.pathname === "/assets/app.js") return new Response("export {};", { headers: { "content-type": "text/javascript" } });
    if (url.pathname.endsWith("/scan-project")) return Response.json({ error: "Invalid request" }, { status: 400 });
    if (url.pathname.endsWith("/create-checkout")) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return new Response(html);
  };
}

test("accepts matching deployment, JavaScript and backend guards", async () => {
  assert.equal(await runSmoke(env, mock(), quiet), true);
});
test("rejects an HTML fallback for version.json and a stale commit", async () => {
  for (const response of [() => new Response(html), () => Response.json({ commit: "b".repeat(40) })]) {
    assert.equal(await runSmoke(env, mock({ "/version.json": response }), quiet), false);
  }
});
test("rejects a missing JavaScript bundle even when all pages return 200", async () => {
  assert.equal(await runSmoke(env, mock({ "/assets/app.js": () => new Response(html, { headers: { "content-type": "text/html" } }) }), quiet), false);
});
test("rejects an unprotected checkout endpoint", async () => {
  assert.equal(await runSmoke(env, mock({ "/functions/v1/create-checkout": () => Response.json({ success: true }) }), quiet), false);
});

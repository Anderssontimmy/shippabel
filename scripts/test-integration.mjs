import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

// Use only the running local stack, never credentials from a deployed project.
const require = createRequire(import.meta.url);
const cwd = fileURLToPath(new URL("../", import.meta.url));
const status = JSON.parse(execFileSync(process.execPath, [require.resolve("supabase/dist/supabase.js"), "status", "-o", "json"], { cwd, encoding: "utf8" }));
assert.match(status.API_URL ?? "", /^http:\/\/127\.0\.0\.1:/, "Start local Supabase before running integration tests");
const env = {
  ...process.env,
  SUPABASE_URL: status.API_URL,
  SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  CREDENTIALS_ENC_KEY: randomBytes(32).toString("base64"),
  BUILD_CALLBACK_SECRET: randomBytes(32).toString("hex"),
  STRIPE_WEBHOOK_SECRET: "whsec_" + randomBytes(24).toString("hex"),
  ANTHROPIC_API_KEY: "", STRIPE_SECRET_KEY: "sk_test_integration_fixture", EAS_ACCESS_TOKEN: "", SENTRY_DSN: "",
  TEST_FUNCTIONS_URL: "http://127.0.0.1:55325/functions/v1",
};
const health = "http://127.0.0.1:55325/health";
const alreadyRunning = await fetch(health, { signal: AbortSignal.timeout(1000) }).then(() => true, () => false);
assert.equal(alreadyRunning, false, "Port 55325 is in use; stop the previous integration handler first");
const deno = join(dirname(require.resolve("deno/package.json")), process.platform === "win32" ? "deno.exe" : "deno");
const server = spawn(deno, ["run", "--allow-net", "--allow-env", "--allow-read", "--config", "supabase/deno.json", "scripts/serve-test-functions.ts"], { cwd, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let logs = "";
let startupError;
server.on("error", (error) => { startupError = error; });
for (const stream of [server.stdout, server.stderr]) stream.on("data", (data) => { logs = (logs + data).slice(-10000); });
try {
  let ready = false;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline && server.exitCode === null && !startupError) {
    ready = await fetch(health, { signal: AbortSignal.timeout(1000) }).then((response) => response.ok, () => false);
    if (ready) break;
    await setTimeout(250);
  }
  if (!ready) throw startupError ?? new Error("Integration handler failed to start\n" + logs);
  const code = await new Promise((resolve, reject) => {
    const runner = spawn(process.execPath, ["scripts/integration.mjs"], { cwd, env, stdio: "inherit", windowsHide: true });
    runner.on("error", reject);
    runner.on("exit", (exitCode) => resolve(exitCode ?? 1));
  });
  if (code !== 0) console.error(logs);
  process.exitCode = code;
} finally {
  server.kill();
}

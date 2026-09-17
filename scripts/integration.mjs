import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { zipSync, strToU8 } from "fflate";

// Run against local Supabase with scripts/serve-test-functions.ts. All test
// accounts, reports and credentials are removed in finally, including failures.
const url = process.env.SUPABASE_URL;
assert.match(url ?? "", /^http:\/\/127\.0\.0\.1:/, "Integration tests require local Supabase");
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const functions = process.env.TEST_FUNCTIONS_URL ?? "http://127.0.0.1:55325/functions/v1";
const admin = createClient(url, service, { auth: { persistSession: false } });
const createGuest = (token) => createClient(url, anon, { global: { headers: { "x-guest-token": token } }, auth: { persistSession: false } });
const guestToken = randomBytes(32).toString("hex");
const guest = createGuest(guestToken);
const foreign = createGuest(randomBytes(32).toString("hex"));
const projectIds = [];
const userIds = [];
let passed = 0;
const pass = (name) => { passed++; console.log(`PASS ${name}`); };
async function edge(name, body, token = anon, guestProof = guestToken, extra = {}) {
  const response = await fetch(`${functions}/${name}`, {
    method: "POST", headers: { apikey: anon, Authorization: `Bearer ${token}`, "x-guest-token": guestProof, "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90000),
  });
  return { status: response.status, body: await response.json() };
}
async function project(client, fields = {}) {
  const { data, error } = await client.from("projects").insert({ name: "integration fixture", ...fields }).select().single();
  assert.ifError(error); projectIds.push(data.id); return data;
}
async function user() {
  const email = `integration-${randomUUID()}@example.test`;
  const password = randomBytes(24).toString("hex");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error); userIds.push(data.user.id);
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  return { client, id: data.user.id, token: login.data.session.access_token, email };
}

try {
  const publicProject = await project(guest);
  const guestPath = `scans/${publicProject.id}/source.zip`;
  assert.ifError((await guest.storage.from("project-archives").upload(guestPath, zipSync({ "package.json": strToU8('{"dependencies":{"react":"19"}}') }), { contentType: "application/zip" })).error);
  const guestRequest = { project_id: publicProject.id, file_path: guestPath };
  const publicScan = await edge("scan-project", guestRequest);
  assert.equal(publicScan.status, 200, JSON.stringify(publicScan.body));
  assert.equal(publicScan.body.scan_result.project_type, "react-web");
  const report = await guest.from("projects").select("scan_result").eq("id", publicProject.id).single();
  assert.ifError(report.error); assert.equal(report.data.scan_result.score, publicScan.body.scan_result.score);
  const issueRows = await guest.from("issues").select("id").eq("project_id", publicProject.id);
  assert.deepEqual(new Set(issueRows.data.map((row) => row.id)), new Set(publicScan.body.scan_result.issues.map((issue) => issue.id)));
  pass("Guest ZIP scan persists a real report with matching issue IDs");

  const foreignRead = await foreign.from("projects").select("id").eq("id", publicProject.id);
  assert.ifError(foreignRead.error); assert.equal(foreignRead.data.length, 0);
  assert.equal((await edge("scan-project", guestRequest, anon, "b".repeat(64))).status, 404);
  assert.equal((await edge("scan-project", guestRequest, "forged-token")).status, 401);
  pass("Foreign guest and forged login cannot read or rewrite the report");

  const owner = await user();
  const other = await user();
  const own = await project(owner.client, { user_id: owner.id, repo_url: "https://github.com/Anderssontimmy/shippabel" });
  for (const name of ["fix-issues", "generate-copy", "generate-privacy", "convert-project", "trigger-build", "submit-store"]) {
    assert.equal((await edge(name, { project_id: own.id, platform: "android", submission_id: randomUUID() }, owner.token)).status, 403, name);
  }
  pass("All six paid handlers reject a real free account");
  const spoof = await owner.client.auth.updateUser({ data: { plan: "unlimited" } });
  assert.ifError(spoof.error);
  assert.equal((await edge("trigger-build", { project_id: own.id, platform: "android" }, owner.token)).status, 403);
  pass("User-writable metadata cannot self-grant paid access");

  const claimed = await admin.from("projects").select("id").eq("id", publicProject.id);
  assert.equal(claimed.data.length, 1);
  const noProof = await other.client.from("projects").update({ user_id: other.id }).eq("id", publicProject.id).select("id");
  assert.ifError(noProof.error); assert.equal(noProof.data.length, 0);
  pass("Authenticated account cannot claim an unrelated guest report");

  const zipProject = await project(guest);
  const zip = zipSync({ "fixture/package.json": strToU8('{"dependencies":{"expo":"1"}}'), "fixture/src/test.ts": strToU8('// Test-only marker\nconst key="sk_live_' + 'TESTONLYNOTAREALKEY123456789' + '";') });
  const path = `scans/${zipProject.id}/source.zip`;
  const upload = await guest.storage.from("project-archives").upload(path, zip, { contentType: "application/zip" });
  assert.ifError(upload.error);
  const zipScan = await edge("scan-project", { project_id: zipProject.id, file_path: path });
  assert.equal(zipScan.status, 200, JSON.stringify(zipScan.body));
  assert.ok(zipScan.body.scan_result.issues.some((issue) => issue.title.includes("Hardcoded Stripe")));
  assert.ok((await foreign.storage.from("project-archives").download(path)).error);
  pass("Deflated ZIP is scanned and source archives cannot be downloaded by another guest");

  const badProject = await project(guest);
  const badPath = `scans/${badProject.id}/source.zip`;
  assert.ifError((await guest.storage.from("project-archives").upload(badPath, strToU8("not a zip"), { contentType: "application/zip" })).error);
  assert.equal((await edge("scan-project", { project_id: badProject.id, file_path: badPath })).status, 422);
  pass("Damaged ZIP returns a real failure");

  if (process.env.TEST_PRIVATE_REPO) {
    const gh = process.platform === "win32" ? "C:/Program Files/GitHub CLI/gh.exe" : "gh";
    const token = process.env.TEST_GITHUB_TOKEN ?? execFileSync(gh, ["auth", "token"], { encoding: "utf8" }).trim();
    assert.equal((await edge("save-credential", { provider: "github", credentials: { access_token: token } }, owner.token)).status, 200);
    const stored = await admin.from("user_credentials").select("credentials").eq("user_id", owner.id).single();
    assert.equal(typeof stored.data.credentials.enc, "string");
    assert.equal(stored.data.credentials.access_token, undefined);
    assert.ok((await owner.client.from("user_credentials").select("credentials")).error);
    const publicResult = await edge("scan-project", { project_id: own.id, repo_url: own.repo_url }, owner.token);
    assert.equal(publicResult.status, 200, JSON.stringify(publicResult.body));
    assert.equal(publicResult.body.scan_result.project_type, "react-web");
    pass("Public GitHub scan succeeds with the connected account");
    const privateProject = await project(owner.client, { user_id: owner.id, repo_url: `https://github.com/${process.env.TEST_PRIVATE_REPO}` });
    const result = await edge("scan-project", { project_id: privateProject.id, repo_url: privateProject.repo_url }, owner.token);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.ok(result.body.scan_result.issues.some((issue) => issue.title.includes("Hardcoded Stripe")));
    pass("Private GitHub scan reads encrypted server credential and detects fixture key");
  }

  const event = { id: `evt_local_${randomUUID()}`, type: "checkout.session.completed", livemode: false, data: { object: { mode: "payment", payment_status: "paid", customer: "cus_local_test", metadata: { plan: "ship", supabase_user_id: owner.id } } } };
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${JSON.stringify(event)}`).digest("hex");
  const headers = { "stripe-signature": `t=${timestamp},v1=${signature}` };
  assert.equal((await edge("stripe-webhook", event, anon, guestToken, headers)).status, 200);
  assert.equal((await edge("stripe-webhook", event, anon, guestToken, headers)).body.duplicate, true);
  assert.equal((await admin.auth.admin.getUserById(owner.id)).data.user.app_metadata.plan, "ship");
  assert.equal((await edge("stripe-webhook", event)).status, 400);
  pass("Signed synthetic webhook grants once and rejects missing signatures (not a Stripe purchase)");
  for (const name of ["generate-copy", "generate-privacy"]) {
    assert.equal((await edge(name, { project_id: publicProject.id, platform: "android", app_name: "Foreign report" }, owner.token)).status, 404, name);
  }
  pass("Paid account cannot generate or overwrite documents for an unrelated guest report");
  await admin.from("stripe_events").delete().eq("id", event.id);

  const build = await admin.rpc("start_build", { p_project_id: own.id, p_platform: "android" });
  assert.ifError(build.error);
  const callback = { project_id: own.id, submission_id: build.data, status: "success", run_id: "123456" };
  const secret = createHmac("sha256", process.env.BUILD_CALLBACK_SECRET).update(own.id).digest("hex");
  assert.equal((await edge("build-complete", callback)).status, 401);
  assert.equal((await edge("build-complete", callback, anon, guestToken, { "x-callback-secret": secret })).status, 200);
  assert.equal((await edge("build-complete", callback, anon, guestToken, { "x-callback-secret": secret })).body.duplicate, true);
  assert.equal((await admin.from("projects").select("status").eq("id", own.id).single()).data.status, "ready");
  pass("Real callback handler authenticates, updates exact build and ignores retries");
  console.log(`${passed} integration checks passed.`);
} finally {
  for (const id of projectIds) {
    await admin.storage.from("project-archives").remove([`scans/${id}/source.zip`]);
    await admin.from("scan_events").delete().eq("project_id", id);
    const removed = await admin.from("projects").delete().eq("id", id);
    if (removed.error) console.error("Test project cleanup failed", id);
  }
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}

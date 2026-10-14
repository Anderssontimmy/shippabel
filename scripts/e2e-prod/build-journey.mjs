// A paying customer's build journey against PRODUCTION on a throwaway private GitHub repository:
//   connect GitHub -> scan -> convert (web app -> Capacitor) -> build -> a SECOND build (an update).
// Checks that the first build starts without a retry, both builds produce a signed AAB, the version code goes up,
// and (when the JDK's keytool is on PATH) that both builds are signed by the same certificate.
// The temporary user is deleted at the end; the fixture repository is left for you to archive. Read README.md first.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { unzipSync } from "fflate";

const { VITE_SUPABASE_URL: URL_, VITE_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SRK, GH_TOKEN, FIXTURE_REPO: REPO } = process.env;
if (!URL_ || !ANON || !SRK || !GH_TOKEN || !REPO) throw new Error("Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GH_TOKEN and FIXTURE_REPO=owner/name (see README.md).");

const results = [];
const log = (ok, name, extra = "") => { results.push(ok); console.log(`${ok === true ? "PASS" : ok === false ? "FAIL" : "INFO"}  ${name}${extra ? "  -> " + extra : ""}`); };
const parse = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const short = (v, n = 260) => (typeof v === "string" ? v : JSON.stringify(v)).slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const admin = (path, init = {}) => fetch(`${URL_}${path}`, { ...init, headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, "content-type": "application/json", ...(init.headers ?? {}) } });
const edge = async (name, body, token) => { const r = await fetch(`${URL_}/functions/v1/${name}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token}`, "content-type": "application/json", Origin: "https://shippabel.com" }, body: JSON.stringify(body), signal: AbortSignal.timeout(150000) }); return { status: r.status, body: await parse(r) }; };
const gh = (path) => fetch(`https://api.github.com${path}`, { headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json" } });
const ghJson = async (path) => { const r = await gh(path); return { status: r.status, body: await parse(r) }; };

async function waitForRun(since, exceptId) {
  let run = null;
  for (let i = 0; i < 20 && !run; i++) {
    const runs = (await ghJson(`/repos/${REPO}/actions/runs?event=workflow_dispatch&per_page=5`)).body.workflow_runs ?? [];
    run = runs.find((x) => x.id !== exceptId && new Date(x.created_at).getTime() >= since - 60000) ?? null;
    if (!run) await sleep(6000);
  }
  if (!run) throw new Error("no workflow run appeared");
  for (let i = 0; i < 100 && run.status !== "completed"; i++) { await sleep(15000); run = (await ghJson(`/repos/${REPO}/actions/runs/${run.id}`)).body; }
  return run;
}

// The workflow logs `grep -n versionCode android/app/build.gradle`; read the number from that line.
async function versionCodeOf(runId) {
  const response = await gh(`/repos/${REPO}/actions/runs/${runId}/logs`);
  if (!response.ok) return null;
  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  for (const content of Object.values(files)) {
    const found = new TextDecoder().decode(content).match(/^(?:\S+Z )?\s*\d+:\s+versionCode (\d+)\s*$/m); // log lines start with a timestamp
    if (found) return Number(found[1]);
  }
  return null;
}

// SHA-256 fingerprint of the certificate that signed the AAB artifact of a run (needs the JDK's keytool).
async function signerOf(runId) {
  const artifacts = (await ghJson(`/repos/${REPO}/actions/runs/${runId}/artifacts`)).body.artifacts ?? [];
  const aab = artifacts.find((a) => a.name === "app-release-aab");
  if (!aab) return null;
  const zip = await gh(`/repos/${REPO}/actions/artifacts/${aab.id}/zip`);
  const inner = Object.entries(unzipSync(new Uint8Array(await zip.arrayBuffer()))).find(([name]) => name.endsWith(".aab"));
  if (!inner) return null;
  const file = join(mkdtempSync(join(tmpdir(), "aab-")), "app.aab");
  writeFileSync(file, inner[1]);
  try { return execFileSync("keytool", ["-printcert", "-jarfile", file], { encoding: "utf8" }).match(/SHA256:\s*([0-9A-F:]+)/)?.[1] ?? null; } catch { return undefined; }
}

let userId = null, projectId = null;
try {
  const email = `build-journey-${Date.now()}@shippabel.com`, password = randomBytes(18).toString("hex");
  const created = await parse(await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { plan: "ship" } }) }));
  userId = created.id; if (!userId) throw new Error("create user failed " + short(created));
  const session = await parse(await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
  const token = session.access_token; if (!token) throw new Error("login failed");
  log(true, "Temporary paid user (plan set by admin; the webhook path is covered by payment-journey.mjs --paid)");

  let r = await edge("save-credential", { provider: "github", credentials: { access_token: GH_TOKEN }, label: "journey test" }, token);
  log(r.status === 200, "Connect GitHub (stored encrypted)", `HTTP ${r.status}`);
  const project = await parse(await fetch(`${URL_}/rest/v1/projects`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token}`, "content-type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ name: "Build Journey Fixture", user_id: userId, repo_url: `https://github.com/${REPO}` }) }));
  projectId = project[0]?.id; if (!projectId) throw new Error("project insert failed " + short(project));

  r = await edge("scan-project", { project_id: projectId, repo_url: `https://github.com/${REPO}` }, token);
  log(r.status === 200, "scan-project on the private fixture repository", r.status === 200 ? `type=${r.body.scan_result?.project_type} score=${r.body.scan_result?.score}` : short(r.body));
  r = await edge("convert-project", { project_id: projectId }, token);
  log(r.status === 200, "convert-project (web app -> Capacitor wrapper)", r.status === 200 ? short(r.body.message, 120) : `HTTP ${r.status} ${short(r.body)}`);

  const builds = [];
  for (const n of [1, 2]) {
    const t0 = Date.now();
    let started = null, attempts = 0;
    for (; attempts < 4; attempts++) {
      started = await edge("trigger-build", { project_id: projectId, platform: "android" }, token);
      if (started.status === 200) break;
      if (!/Retry|not indexed|just added/i.test(started.body?.error ?? "")) break;
      await sleep(25000);
    }
    log(started?.status === 200, `Build ${n} starts`, started?.status === 200 ? `${attempts + 1} attempt(s)` : `HTTP ${started?.status} ${short(started?.body)}`);
    if (started?.status !== 200) throw new Error(`build ${n} was never started`);
    if (n === 1) log(attempts === 0, "The first build needs no manual retry");
    const run = await waitForRun(t0, builds.at(-1)?.id);
    log(run.conclusion === "success", `Build ${n} finished: ${run.conclusion}`, run.html_url);
    if (run.conclusion !== "success") throw new Error(`build ${n} failed`);
    await sleep(5000);
    const sub = await parse(await admin(`/rest/v1/submissions?project_id=eq.${projectId}&select=build_status&order=created_at.desc&limit=1`));
    log(sub[0]?.build_status === "completed", `Build ${n}: Shippabel recorded it as completed (callback)`, short(sub));
    const artifacts = (await ghJson(`/repos/${REPO}/actions/runs/${run.id}/artifacts`)).body.artifacts ?? [];
    log(artifacts.some((a) => a.name === "app-release-aab"), `Build ${n}: a signed AAB was produced`);
    builds.push({ id: run.id, versionCode: await versionCodeOf(run.id), signer: await signerOf(run.id) });
  }
  log(builds[0].versionCode != null && builds[1].versionCode > builds[0].versionCode, "The update has a higher version code (Google Play refuses a repeat)", `${builds[0].versionCode} -> ${builds[1].versionCode}`);
  if (builds[0].signer === undefined || builds[1].signer === undefined || builds[0].signer === null) log(null, "Signer check skipped (keytool not available on PATH)");
  else log(builds[0].signer === builds[1].signer, "Both builds are signed by the same upload certificate", builds[0].signer);
} catch (e) {
  log(false, "Script aborted", e.message);
} finally {
  if (userId) {
    const d = await admin(`/auth/v1/admin/users/${userId}`, { method: "DELETE" }); // cascades to the project, builds and the upload key
    const left = await parse(await admin(`/rest/v1/projects?user_id=eq.${userId}&select=id`));
    log(d.status === 200 && Array.isArray(left) && left.length === 0, "Cleanup: temporary user deleted together with its project", `HTTP ${d.status}, projects left ${Array.isArray(left) ? left.length : short(left)}`);
  }
  console.log(`\n${results.filter((x) => x === true).length} passed, ${results.filter((x) => x === false).length} failed`);
  process.exitCode = results.includes(false) ? 1 : 0;
}

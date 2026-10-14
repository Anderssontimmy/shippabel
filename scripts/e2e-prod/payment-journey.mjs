// Payment journey against PRODUCTION, as a temporary signed-in user:
//   checkout guards and creation -> Stripe's hosted page -> paid-function gates for a free user
//   with --paid: a real live $0 checkout (100%-off coupon) -> webhook -> plan activated -> dashboard banner -> paid features.
// Everything it creates (user, project, Stripe customer and coupon) is removed at the end. Read README.md first.
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const { VITE_SUPABASE_URL: URL_, VITE_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SRK, STRIPE_SECRET_KEY: SK } = process.env;
if (!URL_ || !ANON || !SRK || !SK) throw new Error("Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and STRIPE_SECRET_KEY (see README.md).");
const SHOTS = process.env.SHOTS_DIR ?? "test-results/e2e-prod";
const REF = new URL(URL_).hostname.split(".")[0];
const PAID = process.argv.includes("--paid");
mkdirSync(SHOTS, { recursive: true });

const results = [];
const log = (ok, name, extra = "") => { results.push(ok); console.log(`${ok === true ? "PASS" : ok === false ? "FAIL" : "INFO"}  ${name}${extra ? "  -> " + extra : ""}`); };
const parse = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const short = (v, n = 220) => (typeof v === "string" ? v : JSON.stringify(v)).slice(0, n);

async function stripe(method, path, params) {
  const r = await fetch("https://api.stripe.com/v1" + path, { method, headers: { Authorization: `Bearer ${SK}`, "content-type": "application/x-www-form-urlencoded" }, body: params ? new URLSearchParams(params) : undefined });
  return { status: r.status, body: await parse(r) };
}
async function edge(name, body, token) {
  const r = await fetch(`${URL_}/functions/v1/${name}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, "content-type": "application/json", Origin: "https://shippabel.com" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  return { status: r.status, body: await parse(r) };
}
const admin = (path, init = {}) => fetch(`${URL_}${path}`, { ...init, headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, "content-type": "application/json", ...(init.headers ?? {}) } });

const created = { userId: null, customerId: null, couponId: null, projectIds: [], sessions: [] };
let browser;
try {
  const email = `journey-${Date.now()}@shippabel.com`, password = randomBytes(18).toString("hex");
  const cu = await parse(await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) }));
  if (!cu.id) throw new Error("create user failed: " + short(cu));
  created.userId = cu.id;
  const session = await parse(await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
  let token = session.access_token;
  if (!token) throw new Error("login failed");
  log(true, "Temporary user created and signed in");

  // ---- checkout guards and creation ------------------------------------------------------
  const body = { plan: "ship", success_url: "https://shippabel.com/dashboard?checkout=success", cancel_url: "https://shippabel.com/pricing?checkout=cancelled" };
  let r = await edge("create-checkout", body);
  log(r.status === 401, "create-checkout without login is refused", `HTTP ${r.status}`);
  r = await edge("create-checkout", { ...body, plan: "bogus" }, token);
  log(r.status >= 400, "create-checkout rejects an unknown plan", `HTTP ${r.status} ${short(r.body)}`);
  r = await edge("create-checkout", { ...body, success_url: "https://evil.example/x", cancel_url: "https://evil.example/y" }, token);
  if (r.status === 200) {
    created.sessions.push(r.body.session_id);
    const s = await stripe("GET", `/checkout/sessions/${r.body.session_id}`);
    log(s.body.success_url?.startsWith("https://shippabel.com"), "Redirects to other sites are replaced with shippabel.com", s.body.success_url);
  } else log(false, "create-checkout (redirect test)", `HTTP ${r.status} ${short(r.body)}`);

  let shipPriceId = null;
  for (const [plan, amount] of [["ship", 9900], ["unlimited", 17900]]) {
    r = await edge("create-checkout", { ...body, plan }, token);
    if (r.status !== 200 || !r.body.url) { log(false, `create-checkout plan=${plan}`, `HTTP ${r.status} ${short(r.body)}`); continue; }
    created.sessions.push(r.body.session_id);
    const s = await stripe("GET", `/checkout/sessions/${r.body.session_id}?expand[]=line_items`);
    if (plan === "ship") shipPriceId = s.body.line_items?.data?.[0]?.price?.id;
    log(s.body.amount_total === amount && s.body.currency === "usd" && s.body.livemode === true && s.body.metadata?.plan === plan && s.body.metadata?.supabase_user_id === created.userId,
      `create-checkout plan=${plan}: live Stripe session for $${amount / 100} with matching metadata`, s.body.line_items?.data?.[0]?.description);
    created.customerId ??= s.body.customer;
  }

  // ---- Stripe's hosted page renders -------------------------------------------------------
  browser = await chromium.launch();
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US" });
    const page = await ctx.newPage();
    const s = await stripe("GET", `/checkout/sessions/${created.sessions.at(-1)}`);
    await page.goto(s.body.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(4000);
    const text = await page.locator("body").innerText();
    await page.screenshot({ path: `${SHOTS}/stripe-hosted.png` });
    log(/179(\.00)?/.test(text) && /Shippabel/i.test(text), "Hosted Stripe page shows the product and price", text.replace(/\s+/g, " ").slice(0, 120));
    await ctx.close();
  }

  // ---- a free user is blocked from every paid function -------------------------------------
  for (const fn of ["generate-copy", "generate-privacy", "fix-issues", "convert-project", "trigger-build", "submit-store"]) {
    const x = await edge(fn, { project_id: randomUUID(), platform: "android", app_name: "x", submission_id: randomUUID() }, token);
    log(x.status === 403, `Free user is blocked on ${fn}`, `HTTP ${x.status}`);
  }
  // check-review has no plan gate by design (it only answers for the caller's own submissions).
  const review = await edge("check-review", { submission_id: randomUUID() }, token);
  log(review.status !== 200, "check-review gives a stranger nothing", `HTTP ${review.status}`);

  if (!PAID) throw new Error("__done__");

  // ---- the real paid path: $0 live checkout -> webhook -> plan -> dashboard -> paid features -------
  const coupon = await stripe("POST", "/coupons", { percent_off: "100", duration: "once", max_redemptions: "1", name: "journey-test", "metadata[purpose]": "journey-test-delete-me" });
  created.couponId = coupon.body.id;
  const paid = await stripe("POST", "/checkout/sessions", {
    customer: created.customerId, "line_items[0][price]": shipPriceId, "line_items[0][quantity]": "1", mode: "payment",
    "discounts[0][coupon]": created.couponId, success_url: body.success_url, cancel_url: body.cancel_url,
    "metadata[plan]": "ship", "metadata[supabase_user_id]": created.userId,
  });
  if (paid.status !== 200) throw new Error("paid session failed: " + short(paid.body));
  created.sessions.push(paid.body.id);
  log(null, "Created a $0 live session with a 100% coupon", `total=${paid.body.amount_total}`);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US" });
  await ctx.addInitScript(([key, val]) => { if (location.hostname.endsWith("shippabel.com")) localStorage.setItem(key, val); }, [`sb-${REF}-auth-token`, JSON.stringify(session)]);
  const page = await ctx.newPage();
  await page.goto(paid.body.url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5000);
  await page.getByRole("button", { name: /pay|complete|subscribe|submit/i }).first().click({ timeout: 20000 });
  await page.waitForURL(/shippabel\.com\/dashboard/, { timeout: 90000 });
  log(true, "Stripe redirected back to the dashboard after payment");
  const banner = await page.getByText(/Payment confirmed/i).first().waitFor({ timeout: 40000 }).then(() => true).catch(() => false);
  await page.screenshot({ path: `${SHOTS}/dashboard-after-pay.png` });
  log(banner, "Dashboard shows the 'Payment confirmed' banner");
  await ctx.close();

  const u = await parse(await admin(`/auth/v1/admin/users/${created.userId}`));
  log(u.app_metadata?.plan === "ship" && u.app_metadata?.payment_mode === "live", "The webhook activated the Ship plan", JSON.stringify({ plan: u.app_metadata?.plan, mode: u.app_metadata?.payment_mode }));

  const refreshed = await parse(await fetch(`${URL_}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ refresh_token: session.refresh_token }) }));
  token = refreshed.access_token ?? token;
  const project = (await parse(await fetch(`${URL_}/rest/v1/projects`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token}`, "content-type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ name: "journey fixture", user_id: created.userId, repo_url: "https://github.com/Anderssontimmy/shippabel" }) })))[0];
  if (!project?.id) throw new Error("project insert failed");
  created.projectIds.push(project.id);
  r = await edge("scan-project", { project_id: project.id, repo_url: project.repo_url }, token);
  log(r.status === 200, "scan-project as a paid user", `HTTP ${r.status}`);
  r = await edge("generate-copy", { project_id: project.id, platform: "android" }, token);
  log(r.status === 200 && r.body.variants?.length > 0, "generate-copy (real AI call)", r.status === 200 ? `${r.body.variants.length} variants` : `HTTP ${r.status} ${short(r.body)}`);
  r = await edge("generate-privacy", { project_id: project.id, app_name: "Journey App", developer_name: "Journey", developer_email: "journey@example.com" }, token);
  log(r.status === 200, "generate-privacy", `HTTP ${r.status}`);
} catch (e) {
  if (e.message !== "__done__") log(false, "Script aborted", e.stack?.split("\n").slice(0, 3).join(" | "));
} finally {
  try { await browser?.close(); } catch { /* already closed */ }
  for (const id of created.sessions) { await stripe("POST", `/checkout/sessions/${id}/expire`).catch(() => {}); }
  for (const id of created.projectIds) {
    await admin(`/storage/v1/object/privacy-policies/${id}.html`, { method: "DELETE" }).catch(() => {});
    await admin(`/rest/v1/projects?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
  }
  if (created.userId) { const d = await admin(`/auth/v1/admin/users/${created.userId}`, { method: "DELETE" }); log(null, "Cleanup: temporary user deleted", `HTTP ${d.status}`); }
  if (created.customerId) { const d = await stripe("DELETE", `/customers/${created.customerId}`); log(null, "Cleanup: Stripe customer deleted", `HTTP ${d.status}`); }
  if (created.couponId) { const d = await stripe("DELETE", `/coupons/${created.couponId}`); log(null, "Cleanup: Stripe coupon deleted", `HTTP ${d.status}`); }
  console.log(`\n${results.filter((x) => x === true).length} passed, ${results.filter((x) => x === false).length} failed`);
  process.exitCode = results.includes(false) ? 1 : 0;
}

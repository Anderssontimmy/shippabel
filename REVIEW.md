# Shippabel — Genomgranskning (full code review)

Living document. Reviewed phase-by-phase, security-first. Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low.
Started 2026-06-16.

---

## Phase 0 — Baseline ✅
- `tsc --noEmit`: clean (0 errors)
- `eslint .`: 0 errors, 3 warnings (1 useCallback dep in ScreenshotEditor, 2 fast-refresh export warnings in Toast/useAuth)
- `vitest`: 3 files / 16 tests pass
- `npm audit`: **9 vulnerabilities (1 low, 3 moderate, 5 high)** — react-router-dom (DoS/CSRF), ws (memory disclosure/DoS). `npm audit fix` available.
- Outdated majors: @stripe/stripe-js 5→9, several others.

---

## Phase 1 — Security & money

> **PHASE 1 COMPLETE — all Critical + High fixed & deployed (2026-06-17).**
>
> Wave 1 (C1, C2, C3, H1):
> - Entitlement moved to `app_metadata` (service-role only); existing paid user backfilled; client (`usePlan`, `Dashboard`) reads it.
> - Payment guards (403 if not ship/unlimited) + `user_id` ownership filters across fix-issues, generate-copy, generate-privacy, convert-project, trigger-build, submit-store; scan-project ownership guard (anon scans preserved).
> - create-checkout uses a server-side plan→price allowlist (client `price_id` ignored).
>
> Wave 2 (H2, H3, H4):
> - **H4**: `npm audit fix` → 0 vulnerabilities (react-router-dom 7.18, etc.).
> - **H3**: `usage_events` table + 60/hour per-user rate limit on fix-issues, generate-copy, generate-privacy, convert-project.
> - **H2**: credentials encrypted at rest with AES-256-GCM (`_shared/crypto.ts`, key in `CREDENTIALS_ENC_KEY` secret). Writes go through new `save-credential` edge function; 5 reader functions decrypt (back-compat with legacy plaintext rows, which re-encrypt on next save/login); GitHub token now resolved server-side in scan-project; client never receives plaintext; RLS locked to read/delete-own only (no client insert/update).
>
> All functions deployed from disk; frontend rebuilt+redeployed; smoke-tested (unauth rejected, anon scan works, site 200). Crypto round-trip unit-verified.
> **Needs a real-account test (only you can do):** free user blocked from auto-fix; connect GitHub → scan → build → submit round-trip with encrypted creds.

### 🔴 Critical

**C1 — No server-side payment enforcement (revenue leak).**
Paid worker functions don't check the user's plan. `isPaid` is enforced only in the client UI (`usePlan` → ScanResults/Screenshots/Submit/Listing). Any authenticated *free* user can call the edge functions directly with their JWT and receive paid features (auto-fix, copy generation, privacy generation, build, submit) for free.
→ Fix: entitlement check in every paid function, against a server-trusted source (see C2).

**C2 — Entitlements stored in user-writable `user_metadata.plan`.**
`stripe-webhook` writes `plan` into `user_metadata` (functions/stripe-webhook/index.ts:123). `user_metadata` is writable by the user: `supabase.auth.updateUser({ data: { plan: 'unlimited' } })` self-grants paid access. Entitlements must live in a server-only table (RLS read-own, writes only via service role/webhook), never user_metadata.
→ Fix: `profiles`/`entitlements` table, written only by webhook, gated server-side.

**C3 — IDOR / broken access control in worker functions.**
fix-issues, generate-copy, generate-privacy, scan-project query `projects` by id using the **service-role key (bypasses RLS)** and never filter by `user_id`. Comment in fix-issues:38 says "verify ownership" but it doesn't. Any user can run operations on, or read, *other users'* projects by passing a project_id. Ownership-check audit:
- fix-issues 0 · generate-copy 0 · generate-privacy 0 · scan-project 0 → **vulnerable**
- convert-project 1 · check-review 2 · submit-store 3 · trigger-build 4 → verify, mostly OK
→ Fix: filter every project/issue/listing access by authenticated `user_id`.

### 🟠 High

**H1 — `create-checkout` trusts client `price_id`** (functions/create-checkout/index.ts:79). No allowlist; client can pass any price. → Map plan→price server-side; ignore client value.

**H2 — Credentials stored in plaintext.** `user_credentials.credentials` JSONB holds Apple private keys, Google service-account JSON, GitHub/EAS tokens in plaintext. Migration comment falsely says "encrypted at rest." Disk encryption ≠ app encryption. → Encrypt via Supabase Vault/pgsodium or envelope encryption; fix the comment.

**H3 — No rate limiting on AI functions.** Only scan-project throttles. fix-issues/generate-copy/generate-privacy/convert-project call paid AI uncapped → with C1, a free user can run up the AI bill arbitrarily. → Per-user rate limits + usage caps.

**H4 — 9 dependency vulns (5 high).** react-router-dom, ws. → `npm audit fix` + dep bumps + retest.

### 🟡 Medium

**M1 — Webhook not idempotent.** No event-id dedup; Stripe re-delivers. Low impact today, risky as logic grows. → `processed_events` guard.
**M2 — `findUserByCustomerId` lists ≤1000 users + linear scan.** Breaks past 1000 users, slow. → Query stripe_customer_id directly.
**M3 — Anonymous projects world-readable.** RLS `user_id IS NULL` lets anyone read all free-scan rows (repo_url, scan_result). → Scope anon reads to a session/token.
**M4 — Two sources of plan truth.** `projects.user_plan` column + `user_metadata.plan` diverge. → Consolidate to entitlements table.

### 🟢 Low

**L1 — Hand-rolled webhook signature verify**, non-constant-time compare (timing). → Stripe SDK / constant-time.
**L2 — `handleSubscriptionUpdated` defaults plan to "pro"** (stripe-webhook:149) — no such plan exists. → Remove/correct.
**L3 — 3 lint warnings; 8 `console.*` calls** → structured logging (Phase 3).

---

## Phases 2–7 — pending
- P2 Correctness & reliability (build/submit pipeline, AI funcs, hooks/state)
- P3 Code quality (large files, dead code, config validation)
- P4 Performance (bundle weight, three.js)
- P5 Testing (payment/access/webhook tests, coverage floor)
- P6 UX / SEO / a11y / content
- P7 DevEx / infra (env validation, CI/CD, monitoring, deps)

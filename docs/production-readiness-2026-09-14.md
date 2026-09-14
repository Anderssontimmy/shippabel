# Production readiness — 14 September 2026

The scanner, access controls and deployment checks have been hardened. This is not yet evidence of a complete paid build-to-Google-Play journey.

## Verified before deployment

- TypeScript, ESLint and production build pass; npm audit reports zero vulnerabilities.
- 26 Vitest tests, 16 Deno tests, 34 pgTAP database assertions, 12 Playwright desktop/mobile tests and 3 production CI gate tests pass.
- 11 integration checks pass against local Supabase with actual account authentication, storage, database policies and function handlers. Public GitHub and an isolated private fixture on `trunk` were read through real GitHub API requests. A synthetic marker was detected in the private source file.
- Integration webhook and callback cases use signed synthetic events. They are not Stripe purchases or EAS builds.
- Supabase project `fpqjxkilatlcihunfxpb` is ACTIVE_HEALTHY. Vercel access has been renewed. The production frontend project is `shipmyapp`, linked to `Anderssontimmy/shippabel`, production branch `master`.

## Changes

- Scan the actual default branch and exact commit using authenticated GitHub contents requests. Invalid archives, inaccessible repositories, truncated trees and timeouts return errors.
- Accept ZIP only, up to 20 MB; decompress real ZIP entries with expansion and path limits. New source archives use a private bucket.
- Anonymous reports require browser-held random proof. Foreign users cannot claim reports by ID. Existing ownerless reports without proof need a new scan.
- GitHub tokens are encrypted and retrieved server-side. Database clients can read credential status, not the encrypted or legacy plaintext payload.
- Quotas and report persistence are atomic; issue IDs match the stored report so individual fixes work.
- Stripe signatures support rotation, timestamp checks and atomic event deduplication. Checkout is unavailable while the webhook secret is missing.
- Reserve builds before dispatch, associate callbacks and artifacts with the exact submission/run, and ignore repeated terminal callbacks. A successful build leaves the project ready for submission.
- Structured function logs include request IDs, status and duration without request bodies. Optional Sentry integration requires DSNs.
- CI covers frontend, Edge functions, database policies and browser flows. The Vercel production build checks the latest push CI run for its exact commit and fails closed if CI cannot be verified. `/version.json` records the source commit.
- A scheduled and post-deployment smoke workflow checks frontend, auth, database and function guards.

## Limits and remaining external verification

- Security checks sample up to 10 JavaScript/TypeScript files and known patterns; a passing score is not a complete security audit.
- Stripe CLI test access must be renewed to verify a real hosted checkout and webhook delivery. Production payment activation requires a matching real webhook secret.
- A selected test app, EAS credentials and Google Play internal-track access are needed for a real signed build and submission. Conversion of arbitrary web apps has not been validated end to end.
- Frontend/Edge Sentry delivery and alerts need a project DSN. Structured runtime logs operate independently.
- Test accounts created through the admin API validate sessions and access controls, not email delivery or interactive GitHub OAuth.

## Reproduce

`npm ci`, `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, `npm run check:edge`, `npm run test:edge`, `node --test scripts/deploy-gate.test.mjs`, `npx playwright test`, `npx supabase start`, `npm run test:db`.

For integration tests, start local Supabase and run `npm run test:integration`. The runner obtains local keys, creates synthetic encryption/callback/Stripe secrets, starts the real function handlers and stops them after testing. This also runs in the CI database job. Optional `TEST_PRIVATE_REPO` and `TEST_GITHUB_TOKEN` enable actual GitHub checks; use an isolated fixture. The runner rejects non-local Supabase URLs and removes its accounts/reports in `finally`.

Run `npm run smoke` with public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The workflow requires GitHub repository variables with these names. It checks `/version.json` and the application JavaScript in addition to page/backend responses; `SMOKE_EXPECTED_COMMIT` verifies an exact deployment. Preview deployments do not trigger production checks. Secrets and temporary deployment/test outputs belong in ignored files and must not be committed.

Reference behavior: [GitHub workflow run API](https://docs.github.com/en/rest/actions/workflow-runs), [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables), [Stripe webhooks](https://docs.stripe.com/webhooks).

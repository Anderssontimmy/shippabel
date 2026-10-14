# Production journey tests

Scripts that walk the paying customer's path against **production** (https://shippabel.com and its
Supabase project), the way a real customer would. Running this path against production on 2026-10-14
exposed defects the unit and integration tests had not: builds that could never be signed, a fixed
version code that Google Play would refuse on every update, a package-name regex that never matched the
file Shippabel itself writes, a checkout confirmation that never appeared, and accounts that could not be deleted.

Run them by hand before and after a change to payments, sign-in, builds or submission. They are not in CI:
they use live credentials and create real (temporary) things.

| Script | What it does | Side effects |
| --- | --- | --- |
| `browser-sweep.mjs` | Public pages, pricing → login redirect, footer links, a real scan through the UI, desktop and mobile. | Starts one public scan. Nothing else. |
| `payment-journey.mjs` | Checkout guards and creation, Stripe's hosted page, paid-function gates for a free user. | A temporary user, three Stripe checkout sessions (expired afterwards) and a Stripe customer (deleted). |
| `payment-journey.mjs --paid` | Adds a **live $0 checkout** (100% coupon) → webhook → plan activated → dashboard banner → scan, AI store text and privacy policy as a paid user. | Also a Stripe coupon (deleted) and one completed $0 session that stays in Stripe's history. Stripe sends the event to **every** webhook endpoint on the account. |
| `build-journey.mjs` | Connect GitHub → scan → convert → build → a second build (an update). Checks that the first build needs no retry, both builds produce an AAB, the version code rises, and both are signed by the same certificate (needs `keytool` on PATH, otherwise that check is skipped). | A temporary user, commits and secrets in the fixture repository, and two GitHub Actions runs (about 5 minutes each). |

Everything a script creates is deleted at the end, except the fixture repository's history and the
completed $0 Stripe session.

## Setup

Node 24 (what CI uses), `npm ci`, and `npx playwright install chromium` once. Variables (put them in `.env`; the scripts are
run with `--env-file-if-exists=.env`):

| Variable | Used by | Where to get it |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | payment, build | Already in `.env`. |
| `SUPABASE_SERVICE_ROLE_KEY` | payment, build | `supabase projects api-keys --project-ref fpqjxkilatlcihunfxpb -o json`, the `service_role` entry. Never commit it. |
| `STRIPE_SECRET_KEY` | payment | The **live** key (`sk_live_…`). The product is only on the live account. |
| `GH_TOKEN`, `FIXTURE_REPO` | build | `GH_TOKEN=$(gh auth token)` (scopes `repo` and `workflow`); `FIXTURE_REPO=owner/name` of a private repository made from `fixture/`. |

If HTTPS requests fail with certificate errors (seen on Windows), set `NODE_OPTIONS=--use-system-ca`.

Create a fixture repository (a fresh one gives the first-build path; reuse one to test the repeat-build path):

```bash
cp -r scripts/e2e-prod/fixture "$TMPDIR/fixture" && cd "$TMPDIR/fixture"   # copy it out: never git init inside this repo
git init -q -b main && git add -A && git commit -q -m "Fixture: minimal Vite app"
gh repo create <you>/shippabel-build-fixture-<date> --private --source . --push
```

## Run

```bash
node --env-file-if-exists=.env scripts/e2e-prod/browser-sweep.mjs
node --env-file-if-exists=.env scripts/e2e-prod/payment-journey.mjs
node --env-file-if-exists=.env scripts/e2e-prod/payment-journey.mjs --paid
FIXTURE_REPO=<you>/<fixture> node --env-file-if-exists=.env scripts/e2e-prod/build-journey.mjs
```

Each line is `PASS`, `FAIL` or `INFO`; the exit code is non-zero if anything failed. Screenshots go to
`test-results/e2e-prod/` (ignored by git).

## Notes

- Sign-in by email is limited by Supabase's built-in sender to a couple of emails per hour, so none of these
  scripts send email; they create users through the admin API.
- `gh` cannot delete repositories without the `delete_repo` scope; archive old fixture repositories instead
  (`gh repo archive <repo> --yes`). Archived repositories cannot be built.
- Deleting a user cascades to its projects, builds and upload key. Files in Storage (zip uploads, screenshots,
  privacy-policy HTML) are not removed by that; the payment script deletes the policy file it creates.

## Google Play (manual)

Submitting to Google Play needs a Play Console, so it is not automated. The check that was run on 2026-10-14:

1. In Play Console create an app **with the package name** from the fixture's `capacitor.config.json`
   (`com.<owner>.<repo>` with non-letters removed, each part prefixed with `app`).
2. In Settings on shippabel.com connect GitHub and a Google service account (Play Console → Users and
   permissions, with release rights for that app).
3. Convert and build the project, then submit the build; it should report `internal_testing`.
4. Build and submit again: the second upload must be accepted (same upload key, higher version code).
5. Delete the test project from the account afterwards and archive the fixture repository.

Not covered by any script: Google's review and the production track, the store listing and screenshot upload,
and a customer going through GitHub sign-in and Settings by hand.

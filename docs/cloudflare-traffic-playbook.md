# Cloudflare Traffic Playbook

Use this when reviewing shippabel.com in Cloudflare. The goal is to separate real buyer traffic from crawler noise, keep edge behavior canonical, and find funnel leaks.

## Current Status

Applied on Cloudflare:

- `shippabel_redirect_www_to_apex`: redirects `www.shippabel.com` to `shippabel.com`.
- `shippabel_cache_static_assets`: caches immutable public assets.
- `shippabel_cache_crawler_files`: caches crawler discovery files.

Pending:

- WAF/rate-limit protection for expensive product paths. The current token can manage redirect and cache rules, but does not have WAF edit access.

## Edge Rules To Set

### Redirect www to apex

Create a Redirect Rule:

- If incoming request hostname equals `www.shippabel.com`
- Then static redirect to `https://shippabel.com/${uri.path}`
- Status code: `301`
- Preserve query string: yes

This keeps analytics and SEO consolidated on the canonical apex domain.

### Cache public assets

Create a Cache Rule:

- If path starts with `/assets/`, `/mockups/`, or path is one of `/favicon.svg`, `/og-image.svg`, `/iphone-frame.png`
- Cache eligibility: eligible for cache
- Edge TTL: one year
- Browser TTL: respect origin, or one year if available on the plan

These files are content-hashed or static. They should not hit Vercel on repeat visits.

### Cache crawler files briefly

Create a Cache Rule:

- If path is `/robots.txt`, `/sitemap.xml`, or `/llms.txt`
- Cache eligibility: eligible for cache
- Edge TTL: one day
- Browser TTL: one hour

These are requested often by crawlers and rarely change.

### Bot/rate-limit protection

Create a WAF custom rule or rate limit:

- Target paths: `/scan`, `/api/*`, `/app/*`, `/settings`, `/dashboard`
- Challenge or rate-limit high-volume automated traffic, especially when bot score is low
- Do not challenge verified bots for public SEO pages (`/`, `/blog/*`, `/scan/demo`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`)

## Dashboard Checks

Review these weekly:

1. Traffic by path
   - Watch `/`, `/scan`, `/scan/demo`, `/pricing`, and `/blog/*`.
   - Blog traffic without `/scan` clicks means internal CTAs need to be stronger.

2. Referrers
   - Split Google, AI/search tools, social, direct, and spam.
   - Prioritize content updates for sources that send engaged users.

3. Countries
   - Compare real markets against noisy regions.
   - Filter obvious bot-heavy countries before making product decisions.

4. 404s and redirects
   - Watch old App Store slugs, `/og-image.png`, missing assets, and malformed app URLs.
   - Add redirects only when a path has meaningful volume.

5. Cache ratio
   - `/assets/*`, `/mockups/*`, `/og-image.svg`, `/favicon.svg`: should be mostly cached.
   - HTML can stay dynamic because Vercel already caches prerendered pages.

6. Bot traffic
   - If bots dominate `/scan`, add stricter rate limits or Turnstile around expensive actions.

## Funnel Events

Plausible currently tracks:

- `CTA Clicked`
- `Scan Started`
- `Scan Completed`
- `Checkout Started`
- `Fix Applied`
- `Listing Generated`
- `Build Triggered`
- `Signup`

Recommended funnel view:

1. Landing or blog page view
2. `CTA Clicked` with `action=scan_with_url`, `upload_zip`, `free_scan`, or `try_demo`
3. `Scan Started`
4. `Scan Completed`
5. Pricing page view
6. `CTA Clicked` with `action=checkout`
7. `Checkout Started`

Cloudflare tells you who arrived and which URLs got hit. Plausible events tell you whether those people moved through the product.

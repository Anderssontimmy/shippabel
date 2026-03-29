# ShipMyApp — MVP Roadmap

## Phase 1: App Readiness Scanner (Week 1-2)

The free scanner is both the product MVP and the marketing lead magnet.

### Week 1: Core scanning engine

**Goal:** User can paste a GitHub URL → get a readiness report

Tasks:
- Set up Vite + React + TypeScript + Tailwind project
- Set up Supabase project (auth, database, edge functions)
- Build landing page with clear value prop and "Scan your app" CTA
- Build the scan input page (GitHub URL input + zip upload)
- Create Supabase Edge Function: `scan-project`
  - Clone/download the repo
  - Parse app.json / app.config.js
  - Run config validation checks
  - Run asset validation (icon, splash)
  - Run basic security scan (grep for API keys, .env files)
  - Return structured scan result as JSON
- Store scan results in `projects` and `issues` tables
- Build the scan results page
  - Readiness score visualization (circular progress)
  - Issue list grouped by severity
  - Each issue expandable with explanation + fix suggestion
- Deploy to Vercel

### Week 2: Polish + auto-fix

**Goal:** Scan is fast, beautiful, and shareable. Some issues can be auto-fixed.

Tasks:
- Add loading state with progress steps during scan
- Add shareable report URLs (public scan results page)
- Implement auto-fix for common issues via Claude API:
  - Fix app.json missing fields
  - Add missing bundle identifier
  - Generate missing privacy policy URL placeholder
  - Flag and suggest .gitignore additions for .env files
- Add "before/after" view for auto-fixed files
- Add auth (Supabase magic link) — required to save scans
- Social sharing: "My app scored 73/100 on ShipMyApp" with OG image
- Set up basic analytics (Plausible or PostHog)

### Deliverable: Free public tool that generates buzz and collects users

---

## Phase 2: Store Asset Generator (Week 3-4)

### Week 3: Store copy + privacy policy

**Goal:** Generate App Store/Play Store listing copy using AI

Tasks:
- Create Supabase Edge Function: `generate-copy`
  - Takes project scan result + app code context
  - Uses Claude API to generate: app name, subtitle, descriptions, keywords
  - Returns 3 variants for user to choose from
- Build store listing editor page
  - Preview how listing looks on App Store / Google Play
  - Edit generated copy inline
  - Character count indicators (30 char title, 80 char short desc, etc.)
  - Keyword density visualization (iOS)
- Create Supabase Edge Function: `generate-privacy`
  - Detect permissions and third-party services from code
  - Generate privacy policy document
  - Host on shipmyapp.com/privacy/[app-id]
- Integrate Stripe for paid features

### Week 4: Screenshot generator

**Goal:** Generate device-framed screenshots for all required sizes

Tasks:
- Build screenshot capture system:
  - Option A: User uploads their own screenshots → we frame them in device mockups
  - Option B (stretch): Run app in cloud simulator, auto-capture screens
- Start with Option A (much simpler):
  - User uploads 3-6 raw screenshots
  - Select device frame (iPhone 16 Pro, Pixel 9, iPad, etc.)
  - Add optional caption text above each screenshot
  - Generate all required size variants
  - Download as zip or push directly to store listing
- Build device mockup renderer (Canvas API or SVG-based)
- Store generated assets in Supabase Storage

### Deliverable: Paying users generating store listings and screenshots

---

## Phase 3: Build & Submit (Week 5-7)

### Week 5-6: Build pipeline

**Goal:** One-click production build via EAS

Tasks:
- Integrate EAS Build API
  - Trigger iOS and Android builds
  - Handle EAS credentials setup (guide user through Apple Developer account connection)
  - Monitor build status with polling
  - Store build artifacts
- Build the submission wizard UI
  - Step 1: Review store listing (copy, screenshots, icon)
  - Step 2: Configure build settings (version, SDK target)
  - Step 3: Trigger build
  - Step 4: Review build result
  - Step 5: Submit to store
- Handle common build failures with helpful error messages

### Week 7: Store submission

**Goal:** Submit built app to App Store / Google Play

Tasks:
- Integrate App Store Connect API
  - Create new app if needed
  - Upload binary
  - Set metadata (description, screenshots, etc.)
  - Submit for review
- Integrate Google Play Developer API
  - Create listing
  - Upload AAB
  - Set store listing metadata
  - Submit for review
- Build review status monitoring
  - Poll for status updates
  - Email/push notifications on status change
  - If rejected: parse reason, suggest fixes via Claude API

### Deliverable: Full end-to-end flow from scan to App Store

---

## Phase 4: Growth & Polish (Week 8+)

- Dashboard with app overview and status tracking
- Update flow (new version → rebuild → re-submit)
- Multi-language store listings
- A/B testing for store copy
- Community gallery of shipped apps
- Referral program ("Published with ShipMyApp" badge)
- Support for raw React Native (non-Expo) projects
- Support for Flutter projects (future)

---

## Launch Strategy

1. **Week 1-2:** Launch scanner as free tool on Twitter/X, Reddit r/reactnative, r/ExpoGo, r/vibecoding, Indie Hackers
2. **Week 3-4:** Launch paid features. Post case study: "I published my first app in 20 minutes"
3. **Week 5-7:** Full pipeline. Partner with AI coding YouTubers/creators for demos
4. **Ongoing:** SEO content: "How to publish Expo app to App Store", "App Store submission checklist 2026"

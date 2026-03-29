# ShipMyApp — Product Specification

## Vision

ShipMyApp is the bridge between "my app works" and "my app is live on the App Store." We turn the 40-step publishing nightmare into a guided, automated, one-click experience for non-technical app builders.

## Target Users

### Primary: "Vibe Coders"
- Non-developers who built mobile apps using AI tools (Claude Code, Cursor, Bolt, v0)
- They can describe what they want and iterate with AI, but don't understand DevOps, certificates, or store submission processes
- Typical backgrounds: marketers, designers, founders, domain experts (lawyers, doctors, teachers)
- Pain: "My app works on my phone but I have no idea how to get it on the App Store"

### Secondary: Indie Developers
- Solo developers who CAN publish but find the process tedious and time-consuming
- They want to automate the boring parts (screenshots, descriptions, privacy policies)
- Pain: "I've done this 10 times and I still hate every minute of it"

## Core Features

### Feature 1: App Readiness Scanner (MVP — FREE)

**Input:** GitHub repo URL or zip upload of an Expo project

**Analysis checks:**

Config validation:
- app.json / app.config.js completeness
- Bundle identifier format (com.company.appname)
- Version and build number set correctly
- SDK version compatibility
- Required permissions declared properly

Asset validation:
- App icon exists and is correct size (1024x1024, no alpha for iOS)
- Splash screen configured
- Adaptive icon for Android
- No missing image assets referenced in code

Security scan:
- No hardcoded API keys in source code
- No exposed secrets in environment files
- Auth implementation check (if Supabase/Firebase detected)
- HTTPS-only API calls

Code quality (light):
- Error boundaries present
- Navigation structure is valid
- No obvious crash-inducing patterns (undefined access on common paths)

Store readiness:
- Privacy policy URL set
- App category set
- Rating/content declaration ready

**Output:** Visual report with:
- Overall readiness score (0-100)
- Issues grouped by severity (critical / warning / info)
- Each issue has: title, explanation in plain language, suggested fix
- Auto-fixable issues marked with a "Fix it" button
- Shareable report URL

### Feature 2: Store Asset Generator (PAID)

**Screenshots generator:**
- Run the app in a simulator/emulator
- Capture key screens automatically (onboarding, main screen, key features)
- Frame them in device mockups (iPhone 16, Pixel 9, iPad, etc.)
- Generate all required sizes for App Store (6.7", 6.5", 5.5") and Google Play
- Allow user to select/reorder/customize

**Store copy generator (using Claude API):**
- Analyze the app's code and UI to understand what it does
- Generate: app name suggestions, subtitle (iOS), short description (Android), full description, keywords (iOS)
- ASO-optimized: keyword density, formatting, call-to-actions
- Multiple variants to choose from
- Support for multiple languages (localization)

**Privacy policy generator:**
- Detect which permissions the app uses (camera, location, contacts, etc.)
- Detect which services are integrated (Supabase, Firebase, analytics, ads)
- Generate a legally-appropriate privacy policy
- Host it on a shipmyapp.com subdomain (e.g., privacy.shipmyapp.com/yourapp)

**Icon & splash polish:**
- Check icon against App Store guidelines
- Suggest improvements (contrast, readability at small sizes)
- Generate adaptive icon variants for Android

### Feature 3: Build & Submit (PAID — Premium)

**Build pipeline:**
- Trigger EAS Build for iOS and/or Android
- Handle certificate generation (iOS) automatically via EAS
- Generate signing key (Android) and store it securely
- Monitor build progress with real-time status updates

**Submission pipeline:**
- Submit to App Store Connect via API
- Submit to Google Play Console via API
- Fill in all required metadata from generated store listing
- Upload screenshots, icon, and binary

**Review monitoring:**
- Poll for review status updates
- Notify user when review is complete
- If rejected: parse rejection reason, suggest fixes, allow re-submission

### Feature 4: Dashboard (PAID)

- Overview of all user's apps with current status
- Submission history and timeline
- Quick actions: update listing, push new build, check review status
- Basic analytics: downloads tracking (via App Store Connect / Google Play API)

## Pages & Routes

```
/                     Landing page with value proposition
/scan                 Upload/connect project for free scan
/scan/:id             Scan results report
/dashboard            User's apps overview (requires auth)
/app/:id              Single app detail view
/app/:id/listing      Store listing editor (copy, screenshots, etc.)
/app/:id/submit       Build & submit wizard
/app/:id/status       Submission status & review tracking
/pricing              Pricing page
/login                Auth (Supabase magic link or Google OAuth)
/privacy              Our privacy policy
/docs                 Help documentation
```

## Pricing Model

| Feature | Free | Launch ($99 one-time) | Pro ($29/month) |
|---------|------|-----------------------|-----------------|
| App Scanner | ✅ Unlimited | ✅ | ✅ |
| Auto-fix issues | ❌ | ✅ | ✅ |
| Store copy generation | 1 try | ✅ Unlimited | ✅ Unlimited |
| Screenshot generation | ❌ | ✅ | ✅ |
| Privacy policy hosting | ❌ | ✅ 1 app | ✅ Unlimited |
| Build & submit | ❌ | ✅ 1 submission | ✅ Unlimited |
| Review monitoring | ❌ | ✅ 30 days | ✅ Always |
| Dashboard | ❌ | ❌ | ✅ |
| Custom domain privacy | ❌ | ❌ | ✅ |

## Competitive Landscape

| Competitor | What they do | Gap |
|---|---|---|
| Fastlane | CLI automation for iOS/Android builds | Requires terminal knowledge, Ruby, manual setup |
| EAS (Expo) | Build service | Only handles build, not store listing or submission guidance |
| AppFollow | ASO and review monitoring | No build/submit, focused on already-published apps |
| Appfigures | Analytics and ASO | Same — post-publish tool |
| Bolt/Lovable | Build AND deploy web apps | Web only, no mobile app store publishing |
| **ShipMyApp** | **Scan → Fix → Generate → Build → Submit** | **End-to-end, non-dev friendly, Expo-first** |

## Success Metrics

- **North star:** Number of apps successfully published through the platform
- **Activation:** % of users who complete a scan
- **Conversion:** % of free scan users who pay for generation/submission
- **Retention:** % of Pro users who submit more than one app
- **Revenue:** MRR from Pro subscriptions + Launch one-time purchases

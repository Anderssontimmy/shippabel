# ShipMyApp — Architecture Decisions

## ADR-001: Expo-first, expand later

**Decision:** Only support Expo projects in MVP.

**Rationale:** Expo projects have a standardized structure (app.json, predictable config), which makes scanning and building much simpler. Raw React Native projects have too many variations (CocoaPods, Gradle configs, native modules). Expo also has EAS Build API which abstracts away most build complexity. The vibe coding community heavily uses Expo because it's the easiest way to build mobile apps with AI tools.

**Consequences:** We miss users with raw React Native projects initially. We add support later in Phase 4.

---

## ADR-002: Claude API for all intelligence features

**Decision:** Use Anthropic Claude API (via Supabase Edge Functions) for code analysis, store copy generation, fix suggestions, and rejection parsing.

**Rationale:** Claude excels at code understanding and long-context analysis. Since we're scanning entire project codebases, Claude's large context window is critical. Using a single AI provider simplifies our stack.

**Consequences:** Dependency on Anthropic API. Cost per scan needs monitoring. We should cache scan results aggressively.

---

## ADR-003: Orchestrator, not host

**Decision:** We do NOT host user apps. We orchestrate existing services (EAS Build, Vercel, App Store Connect API, Google Play API).

**Rationale:** Hosting infrastructure is expensive, complex, and not our differentiator. Our value is in the intelligence layer (scanning, fixing, generating) and the UX (making the process simple). Let EAS handle builds, let Apple/Google handle distribution.

**Consequences:** We depend on third-party APIs and their rate limits. Users need their own Apple Developer / Google Play accounts.

---

## ADR-004: Freemium with scanner as lead magnet

**Decision:** The app readiness scanner is free and unlimited. Paid features start at store asset generation.

**Rationale:** The scanner provides immediate value and is shareable ("My app scored 73/100"). This drives organic growth. By the time a user has seen their issues and wants them fixed, they're ready to pay. The scanner also builds our brand as the authority on app store readiness.

**Consequences:** We need to handle free-tier abuse (rate limiting scans). Scanner infrastructure cost is a marketing expense.

---

## ADR-005: Supabase for everything backend

**Decision:** Use Supabase for auth, database, edge functions, file storage, and realtime subscriptions.

**Rationale:** Single platform reduces operational complexity for a solo developer. Edge Functions handle AI API calls securely. Realtime subscriptions enable live build status updates. Row Level Security handles multi-tenant data isolation. The founder has extensive Supabase experience.

**Consequences:** Locked into Supabase ecosystem. Edge Function cold starts might affect scan speed (mitigate with keep-alive).

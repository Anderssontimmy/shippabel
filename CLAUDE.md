# ShipMyApp — CLAUDE.md

## What is this project?

ShipMyApp is a web platform that helps non-technical "vibe coders" publish their mobile apps to the Apple App Store and Google Play Store. These are people who built apps using AI coding tools (Claude Code, Cursor, Bolt, etc.) but don't know how to get from "it works on my phone" to "it's live on the App Store."

Think of it as **"the last mile" for vibe-coded mobile apps**.

## The Problem We Solve

Vibe coders hit a wall after building their app. Publishing to app stores requires ~40 manual steps:
- Apple Developer account setup, certificates, provisioning profiles
- App Store Connect configuration
- Screenshots in 6+ device sizes
- App description, keywords, privacy policy
- Production builds (not dev builds)
- Handling rejections and re-submissions

No existing tool solves this end-to-end for non-developers.

## Core User Journey

1. **Connect** — User connects their GitHub repo or uploads their Expo project
2. **Scan** — We analyze the project for store-readiness (missing icons, bad config, security issues, etc.)
3. **Fix** — Auto-fix issues or guide the user through manual fixes
4. **Generate** — Create store assets: screenshots, descriptions, keywords, privacy policy
5. **Submit** — Build and submit to App Store / Google Play
6. **Monitor** — Track review status, handle rejections

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Supabase (auth, database, edge functions, storage)
- **AI:** Anthropic Claude API (for code scanning, store copy generation, fix suggestions)
- **Build pipeline:** EAS Build API (Expo Application Services)
- **Payments:** Stripe
- **Deployment:** Vercel

## Architecture Principles

- **Screens never import business logic directly** — use hooks/services layer
- **All AI calls go through Supabase Edge Functions** — never expose API keys to client
- **Progressive disclosure** — don't overwhelm users with all 40 steps at once
- **Mobile-first responsive design** — many vibe coders work on laptops/tablets
- **Optimistic UI** — show progress immediately, handle errors gracefully

## Project Structure

```
shipmyapp/
├── CLAUDE.md                  # This file — project context for Claude Code
├── docs/
│   ├── PROJECT_SPEC.md        # Full product specification
│   ├── MVP_ROADMAP.md         # Phased build plan
│   └── DECISIONS.md           # Architecture decision log
├── src/
│   ├── components/            # Shared UI components
│   │   ├── ui/                # Base design system (Button, Card, Input, etc.)
│   │   └── features/          # Feature-specific components
│   ├── pages/                 # Route-level page components
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Business logic & API calls
│   │   ├── scanner/           # App scanning & analysis engine
│   │   ├── generator/         # Store asset generation (screenshots, copy, etc.)
│   │   ├── builder/           # EAS Build integration
│   │   └── store-api/         # App Store Connect & Google Play API
│   ├── lib/                   # Utilities, constants, types
│   │   ├── supabase.ts        # Supabase client
│   │   └── types.ts           # Shared TypeScript types
│   └── App.tsx                # Root component with routing
├── supabase/
│   ├── migrations/            # Database migrations
│   └── functions/             # Edge Functions (AI calls, webhooks)
│       ├── scan-project/      # Analyze uploaded project
│       ├── generate-copy/     # AI-generated store descriptions
│       ├── generate-privacy/  # Privacy policy generator
│       └── fix-issues/        # Auto-fix common problems
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## Database Schema (Supabase)

```sql
-- Users (handled by Supabase Auth)

-- Projects: each uploaded app
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  repo_url TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'both')) DEFAULT 'both',
  framework TEXT DEFAULT 'expo', -- expo | react-native | flutter (future)
  status TEXT CHECK (status IN ('scanning', 'issues_found', 'ready', 'building', 'submitted', 'live', 'rejected')) DEFAULT 'scanning',
  scan_result JSONB, -- full scan report
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Store listings: generated store copy & assets
CREATE TABLE store_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
  app_name TEXT,
  subtitle TEXT, -- iOS only
  short_description TEXT, -- Android only, max 80 chars
  full_description TEXT,
  keywords TEXT, -- iOS only, comma-separated
  category TEXT,
  privacy_policy_url TEXT,
  screenshots JSONB, -- array of storage paths per device size
  icon_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Submissions: each build & submit attempt
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
  eas_build_id TEXT,
  build_status TEXT DEFAULT 'pending',
  store_submission_id TEXT,
  review_status TEXT DEFAULT 'not_submitted',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Issues: found during scanning
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  severity TEXT CHECK (severity IN ('critical', 'warning', 'info')) NOT NULL,
  category TEXT NOT NULL, -- 'config', 'security', 'assets', 'permissions', 'code'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  auto_fixable BOOLEAN DEFAULT false,
  fix_description TEXT,
  fixed BOOLEAN DEFAULT false,
  fixed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## MVP Scope (Phase 1)

The MVP is the **App Readiness Scanner** — a free tool that:
1. Accepts an Expo project (GitHub URL or zip upload)
2. Scans it for store-readiness
3. Returns a visual report with issues, fixes, and a "readiness score"

This is the lead magnet. No payment required. Gets users into the funnel.

See `docs/MVP_ROADMAP.md` for the full phased plan.

## Coding Standards

- Use TypeScript strict mode everywhere
- Prefer `const` arrow functions for components
- Use Tailwind CSS for all styling — no CSS modules or styled-components
- Keep components small and focused (max ~100 lines)
- Extract business logic into custom hooks
- Use Zod for runtime validation of external data (API responses, file parsing)
- Error boundaries around each major feature section
- All user-facing text in English (i18n later)
- Write descriptive commit messages

## Key Design Decisions

- **Expo-first:** We only support Expo projects initially. Raw React Native later.
- **No self-hosting builds:** We use EAS Build API — we orchestrate, not host.
- **Claude API for intelligence:** All "smart" features (code scanning, copy generation, fix suggestions) use Claude via Edge Functions.
- **Freemium model:** Scanner is free. Generation + submission is paid.

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=          # Only in Edge Functions, never client-side
STRIPE_SECRET_KEY=          # Only server-side
STRIPE_PUBLISHABLE_KEY=
EAS_ACCESS_TOKEN=           # For triggering builds
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npx supabase start   # Start local Supabase
npx supabase db push # Push migrations
```

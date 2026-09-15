# Product

## Register

product

## Users

Non-technical "vibe coders": people who built an app with AI tools (Lovable, Cursor, Bolt, v0, Claude Code) and now want it on Google Play. They do not know what a repository, a bundle identifier, or a keystore is, and they should never need to. They arrive hopeful but anxious: they've hit the wall where "it works on my screen" meets "app store bureaucracy". Many browse on a laptop at home in the evening; some on a phone. English-speaking, worldwide.

The job to be done: "get my app onto Google Play without me having to understand any of it."

## Product Purpose

Shippabel scans an AI-built app, fixes what blocks publication, writes the store listing, frames screenshots, builds the Android binary, and submits it to Google Play. Free scan is the lead magnet; $99 Ship (one app) / $179 Unlimited are the paid plans. Success = a visitor pastes a GitHub link, understands their situation within 30 seconds, and a paying customer reaches "live on Google Play" without ever feeling lost or blamed.

## Brand Personality

Calm, capable, plain-spoken. The feeling of handing a hard problem to a professional who says "we've got this" — a concierge, not a toolbox. Never condescending, never jargon-y, never hype. Emotional goals: relief on arrival, confidence during the flow, pride at the end.

## Anti-references

- Developer-tool aesthetics: terminal dark modes, monospace-everything, code snippets as decoration. Our users are not developers; dev-culture visuals read as "this is not for me".
- Generic AI-SaaS slop: purple-to-blue gradients, glassmorphism cards, hero metrics, sparkle emojis, "supercharge your workflow" copy.
- Dashboard maximalism: dense stat grids, many equal-weight panels. Users have exactly one app and one goal; the UI should always point at the single next step.
- Enterprise coldness: stock photos, feature matrices, "Book a demo".

## Design Principles

1. **One next step.** Every screen answers "where am I, and what do I do now?" with exactly one primary action. If two actions compete, we chose wrong.
2. **Speak human, translate the machine.** Every technical fact is rephrased as a plain-language consequence ("Google will reject this — we can fix it"), never exposed raw. Errors say what happened, whose fault it is (usually ours or Google's, never the user's), and what to do.
3. **Show progress, earn trust.** The user always sees how far along their app is. Waiting states explain what we're doing on their behalf. Nothing "just spins".
4. **Calm surface, warm moments.** Generous whitespace, restrained color, quiet chrome — and one deliberate moment of warmth per milestone (scan done, listing written, app live).
5. **Never dead-end.** Every error, empty state, and gate offers a way forward: retry, go back, or "email us and we'll fix it".

## Accessibility & Inclusion

WCAG 2.1 AA. Body text ≥ 4.5:1 contrast (the old text-surface-400-on-white habit fails this; use surface-500+ for meaningful text). All icon-only controls labeled. Full keyboard operability on the funnel (scan → pay → publish). Respect prefers-reduced-motion. Language: plain English at roughly B1 reading level; no idioms that confuse non-native speakers.

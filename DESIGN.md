# Design

## Theme

Light, warm-neutral, quiet. Scene: a non-technical founder on a laptop in their living room in the evening, nervous about a bureaucratic process. A bright, calm, uncluttered surface lowers the temperature. No dark mode (the audience associates dark UIs with "developer tools", our anti-reference).

## Color

Strategy: **Restrained.** Warm-tinted neutrals carry the surface; green is the single accent and always means "forward / done". Indigo appears only in small structural details (focus rings, links inside the app), never as a competing accent.

- Surface neutrals: slate ramp (`surface-50 … 950`), page background `#ffffff` / `surface-50` sections.
- Accent (action + success): green — primary buttons `green-600`, hover `green-500`, tints `green-50/100` for confirmation surfaces. Guarantee text `green-700`+ on white (AA).
- Support states: `warning #f59e0b` (amber, "needs your attention"), `danger #ef4444` (red, reserved for true failures; always paired with a recovery action).
- Never `#000`; darkest ink is `surface-900 #0f172a`.
- Text contrast floor: meaningful text ≥ `surface-500` on white; `surface-400` only for genuinely decorative micro-labels.

## Typography

- Body: Inter, 14–16px, line-height 1.6, max 65–75ch.
- Display: Plus Jakarta Sans (`.font-display`), for page titles and landing headlines only.
- Scale contrast ≥ 1.25 between steps; hierarchy via size + weight (600/700/800), not color alone.
- Numbers that matter (score, price) get to be big; everything else stays modest.

## Components

- **Button**: solid `surface-900` for in-app primaries, solid `green-600` for funnel/checkout primaries, `secondary` bordered white, `ghost` text-only. Radius `rounded-xl`. One primary per screen.
- **Card**: white, 1px `surface-200` border, `rounded-2xl`, used sparingly — steps and forms, not decoration. Never nested.
- **Step rail (ShipFlowBar)**: the persistent "where am I" spine of the app; green = done, dark = current, gray = later.
- **Toasts**: bottom-right, tinted surface + icon, auto-dismiss; errors persist longer.
- **Badges**: tinted pill (`green-50/green-700` etc.), never saturated fills.

## Motion

Purposeful and brief: 200–500ms, ease-out. Entrance fade-ups on landing, score-fill on scan results, nothing looping except genuine progress indicators. Respect `prefers-reduced-motion` (MotionConfig reducedMotion="user" is set globally).

## Layout

- Narrow, single-column task pages (`max-w-3xl/4xl`) — the flow is linear, the layout should be too.
- Landing uses wider `max-w-6xl` with alternating white / `surface-50`(warm) bands for rhythm.
- Spacing rhythm: generous section padding (py-16/24 marketing, py-8/16 app), tight inside components.
- Mobile-first: every funnel step must work one-handed on a phone.

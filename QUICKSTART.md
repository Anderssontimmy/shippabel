# ShipMyApp — Quick Start

## How to get started with Claude Code

### 1. Download this folder

Download the `shipmyapp` folder to your local machine.

### 2. Open in VS Code

```bash
cd shipmyapp
code .
```

### 3. Start Claude Code

Open the terminal in VS Code and run:

```bash
claude
```

### 4. First prompt to Claude Code

Claude Code will automatically read the CLAUDE.md file and understand the project. Start with:

```
Read through CLAUDE.md and the docs/ folder to understand the project.
Then set up the project: initialize Vite with React + TypeScript,
configure Tailwind CSS 4, set up the router, and create the basic
project structure as defined in CLAUDE.md. Install all dependencies
from package.json. Create a beautiful landing page for ShipMyApp
with the headline "From vibe code to App Store in one click" and
a scan CTA button.
```

### 5. Follow the MVP Roadmap

After the initial setup, follow `docs/MVP_ROADMAP.md` phase by phase.

Good follow-up prompts:

```
Now build the scan input page. Users should be able to paste a GitHub
URL or drag-and-drop a zip file. Use the design system we set up.
Route: /scan
```

```
Create the Supabase Edge Function for scan-project. It should:
1. Download/clone the repo from the GitHub URL
2. Parse app.json and app.config.js
3. Run all the validation checks from PROJECT_SPEC.md
4. Return a structured JSON result with issues
See the issues table schema in CLAUDE.md for the data structure.
```

```
Build the scan results page at /scan/:id. Show the readiness score
as an animated circular progress bar, issues grouped by severity
with expandable cards, and a CTA to sign up for auto-fixing.
Make it look polished and professional - this is our main
conversion page.
```

## Supabase Setup

Before building backend features, set up Supabase:

```bash
npx supabase init
npx supabase start
```

Then apply the schema from CLAUDE.md:

```
Set up the Supabase database tables as defined in CLAUDE.md.
Create the migration file and apply it.
```

## Key Files to Reference

- `CLAUDE.md` — Project overview, architecture, schema (Claude Code reads this automatically)
- `docs/PROJECT_SPEC.md` — Detailed feature specifications
- `docs/MVP_ROADMAP.md` — Week-by-week build plan
- `docs/DECISIONS.md` — Why we made certain architecture choices

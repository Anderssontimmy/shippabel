# Shippabel MCP Server & CLI

Scan, fix, and ship your Expo apps to the App Store and Google Play — from your AI coding session.

## CLI Usage

```bash
# Scan your project for store readiness
npx shippabel

# Scan a specific directory
npx shippabel scan ./my-expo-app

# Auto-fix common issues
npx shippabel fix
```

## MCP Server Setup

### Claude Code

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shippabel": {
      "command": "npx",
      "args": ["-y", "shippabel", "--mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shippabel": {
      "command": "npx",
      "args": ["-y", "shippabel", "--mcp"]
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `scan` | Scan an Expo project for App Store/Google Play readiness. Returns score (0-100) and issues. |
| `fix` | Auto-fix common issues: bundle ID, version, build number, .gitignore, etc. |
| `generate-listing` | Generate store listing copy template for iOS or Android. |
| `publish` | Step-by-step guide to build and submit your app. |

## What It Checks

**Config:** app.json completeness, bundle identifier, version, build number, category
**Assets:** App icon, splash screen, adaptive icon (Android)
**Security:** Hardcoded API keys, .env files not gitignored, missing .gitignore
**Code:** Error boundaries

## How It Works

When someone finishes building an Expo app with an AI coding assistant, the assistant can:

1. Call `scan` to check if the app is store-ready
2. Call `fix` to auto-fix common issues
3. Call `generate-listing` for store copy
4. Call `publish` for submission guidance
5. Direct to shippabel.com for one-click automated submission

## License

MIT

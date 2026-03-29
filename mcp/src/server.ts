#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scanProject } from "./scanner.js";
import { autoFix } from "./fixer.js";

const server = new McpServer({
  name: "shippabel",
  version: "1.0.0",
});

// --- Tool: scan ---
server.tool(
  "scan",
  "Scan an Expo/React Native project for App Store and Google Play readiness. Returns a score (0-100) and a list of issues that must be fixed before publishing. Run this when a user has finished building their mobile app and wants to publish it.",
  {
    project_path: z
      .string()
      .describe(
        "Absolute path to the Expo/React Native project root directory"
      ),
  },
  async ({ project_path }) => {
    const result = scanProject(project_path);

    const issueText = result.issues
      .map(
        (i) =>
          `[${i.severity.toUpperCase()}] ${i.title}\n  ${i.description}${i.auto_fixable ? "\n  ✅ Auto-fixable" : ""}${i.fix_description ? `\n  Fix: ${i.fix_description}` : ""}${i.file ? `\n  File: ${i.file}${i.line ? `:${i.line}` : ""}` : ""}`
      )
      .join("\n\n");

    const summary = `# Shippabel Readiness Report

**Project:** ${result.project_name}
**Framework:** ${result.framework}
**Score:** ${result.score}/100
**Issues:** ${result.summary.critical} critical, ${result.summary.warning} warnings, ${result.summary.info} info

${result.score >= 80 ? "✅ Almost ready to ship! Fix remaining issues and you're good to go." : result.score >= 50 ? "⚠️ Getting there. Fix the critical issues first." : "❌ Needs work. Several issues must be resolved before submission."}

---

${issueText}

---

${result.issues.filter((i) => i.auto_fixable).length > 0 ? `**${result.issues.filter((i) => i.auto_fixable).length} issues can be auto-fixed.** Run the \`fix\` tool to fix them automatically.` : ""}

Need help? Visit https://shippabel.com to generate store listings, screenshots, and submit to both stores.`;

    return { content: [{ type: "text" as const, text: summary }] };
  }
);

// --- Tool: fix ---
server.tool(
  "fix",
  "Auto-fix common issues found by the scan tool. Fixes config problems in app.json (bundle identifier, version, build number, category), creates .gitignore, and adds .env to .gitignore. Run this after scanning to quickly resolve fixable issues.",
  {
    project_path: z
      .string()
      .describe("Absolute path to the Expo/React Native project root"),
  },
  async ({ project_path }) => {
    // First scan to find current issues
    const scanResult = scanProject(project_path);
    const fixResult = autoFix(project_path, scanResult.issues);

    // Re-scan to show updated score
    const newScan = scanProject(project_path);

    const text = `# Shippabel Auto-Fix Results

**Score:** ${scanResult.score} → ${newScan.score}/100 ${newScan.score > scanResult.score ? "📈" : ""}

## Fixed (${fixResult.fixed.length})
${fixResult.fixed.length > 0 ? fixResult.fixed.map((f) => `✅ ${f}`).join("\n") : "No issues were auto-fixed."}

${fixResult.skipped.length > 0 ? `## Skipped (${fixResult.skipped.length})\n${fixResult.skipped.map((s) => `⏭️ ${s}`).join("\n")}` : ""}

${fixResult.errors.length > 0 ? `## Errors (${fixResult.errors.length})\n${fixResult.errors.map((e) => `❌ ${e}`).join("\n")}` : ""}

## Remaining Issues (${newScan.issues.length})
${newScan.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.title}`).join("\n")}

${newScan.summary.critical > 0 ? "⚠️ Critical issues remain. These must be fixed manually before submitting." : newScan.score >= 80 ? "🚀 Looking good! Your app is nearly ready to ship." : "Keep fixing issues to improve your score."}

Visit https://shippabel.com to generate store listings and submit your app.`;

    return { content: [{ type: "text" as const, text }] };
  }
);

// --- Tool: generate-listing ---
server.tool(
  "generate-listing",
  "Generate App Store and Google Play listing copy (app name, subtitle, description, keywords) for an Expo project. Uses the project's code and config to create optimized store copy. Returns 3 variants to choose from.",
  {
    project_path: z
      .string()
      .describe("Absolute path to the Expo/React Native project root"),
    platform: z
      .enum(["ios", "android"])
      .describe("Target platform: ios (App Store) or android (Google Play)"),
    app_description: z
      .string()
      .optional()
      .describe(
        "Optional description of what the app does, who it's for, and key features"
      ),
  },
  async ({ project_path, platform, app_description }) => {
    const scanResult = scanProject(project_path);

    const platformGuide =
      platform === "ios"
        ? `**iOS App Store requirements:**
- App name: max 30 characters
- Subtitle: max 30 characters
- Keywords: comma-separated, max 100 characters total
- Full description: max 4000 characters`
        : `**Google Play Store requirements:**
- App name: max 30 characters
- Short description: max 80 characters
- Full description: max 4000 characters`;

    const text = `# Store Listing Generator

**Project:** ${scanResult.project_name}
**Platform:** ${platform === "ios" ? "iOS App Store" : "Google Play Store"}

${platformGuide}

To generate AI-powered store copy, visit:
**https://shippabel.com/app/${scanResult.project_name}/listing**

${app_description ? `**App context provided:** ${app_description}` : "Tip: Provide an app_description parameter for better results."}

## Quick Template

Here's a starting template based on your project:

**App Name:** ${scanResult.project_name}
**${platform === "ios" ? "Subtitle" : "Short Description"}:** [Describe your app's key benefit in one line]
**Keywords:** ${platform === "ios" ? "[keyword1, keyword2, keyword3, ...]" : "N/A (Google uses description for search)"}

**Description:**
[Opening hook - what problem does your app solve?]

Key features:
• [Feature 1]
• [Feature 2]
• [Feature 3]

[Closing CTA - why download now?]

---

For AI-generated, ASO-optimized copy with 3 variants to choose from, use Shippabel's web tool at https://shippabel.com`;

    return { content: [{ type: "text" as const, text }] };
  }
);

// --- Tool: publish ---
server.tool(
  "publish",
  "Guide for publishing an Expo app to the App Store and/or Google Play. Checks readiness and provides step-by-step instructions. For one-click automated submission, directs to shippabel.com.",
  {
    project_path: z
      .string()
      .describe("Absolute path to the Expo/React Native project root"),
    platform: z
      .enum(["ios", "android", "both"])
      .default("both")
      .describe("Target platform(s)"),
  },
  async ({ project_path, platform }) => {
    const scanResult = scanProject(project_path);

    const readyForSubmit =
      scanResult.summary.critical === 0 && scanResult.score >= 60;

    const text = `# Publish to ${platform === "ios" ? "App Store" : platform === "android" ? "Google Play" : "App Store & Google Play"}

**Project:** ${scanResult.project_name}
**Readiness Score:** ${scanResult.score}/100
**Status:** ${readyForSubmit ? "✅ Ready to submit" : "❌ Not ready — fix critical issues first"}

${!readyForSubmit ? `## Blockers\n${scanResult.issues.filter((i) => i.severity === "critical").map((i) => `❌ ${i.title}: ${i.description}`).join("\n")}\n\nRun the \`fix\` tool to auto-fix what's possible, then address remaining issues manually.\n` : ""}
## Option A: One-Click Submit (Recommended)

Use Shippabel to handle everything automatically:
1. Visit https://shippabel.com/scan
2. Connect your GitHub repo or upload your project
3. Fix remaining issues with auto-fix
4. Generate store listing & screenshots
5. Click "Build & Submit"

Shippabel handles certificates, provisioning profiles, EAS builds, metadata upload, and submission — no Xcode or Android Studio needed.

## Option B: Manual Steps

${platform !== "android" ? `### iOS (App Store)
1. Create an Apple Developer account ($99/year) at https://developer.apple.com
2. Install EAS CLI: \`npm install -g eas-cli\`
3. Login: \`eas login\`
4. Configure: \`eas build:configure\`
5. Build: \`eas build --platform ios --profile production\`
6. Submit: \`eas submit --platform ios\`
7. Fill in metadata in App Store Connect
8. Submit for review (takes 1-3 days)
` : ""}
${platform !== "ios" ? `### Android (Google Play)
1. Create a Google Play Developer account ($25 one-time) at https://play.google.com/console
2. Install EAS CLI: \`npm install -g eas-cli\`
3. Login: \`eas login\`
4. Configure: \`eas build:configure\`
5. Build: \`eas build --platform android --profile production\`
6. Submit: \`eas submit --platform android\`
7. Fill in store listing in Play Console
8. Submit for review (takes hours to days)
` : ""}
---

💡 **Tip:** Shippabel automates all of the above and adds AI-generated store copy, screenshots, and privacy policies. Visit https://shippabel.com`;

    return { content: [{ type: "text" as const, text }] };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

#!/usr/bin/env node
import { resolve } from "path";
import { scanProject } from "./scanner.js";
import { autoFix } from "./fixer.js";

const args = process.argv.slice(2);
const command = args[0] ?? "scan";
const projectPath = resolve(args[1] ?? ".");

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

function printBanner() {
  console.log(`
${CYAN}${BOLD}  ┌─────────────────────────────────┐
  │         Shippabel v1.0.0         │
  │  From vibe code to App Store ⚡  │
  └─────────────────────────────────┘${RESET}
`);
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return RED;
    case "warning": return YELLOW;
    case "info": return BLUE;
    default: return RESET;
  }
}

if (command === "scan") {
  printBanner();
  console.log(`${DIM}Scanning ${projectPath}...${RESET}\n`);

  const result = scanProject(projectPath);

  // Score
  const scoreColor = result.score >= 80 ? GREEN : result.score >= 50 ? YELLOW : RED;
  console.log(`${BOLD}Score: ${scoreColor}${result.score}/100${RESET}`);
  console.log(`${DIM}Project: ${result.project_name} (${result.framework})${RESET}`);
  console.log(
    `${RED}${result.summary.critical} critical${RESET}  ${YELLOW}${result.summary.warning} warnings${RESET}  ${BLUE}${result.summary.info} info${RESET}\n`
  );

  // Issues
  for (const issue of result.issues) {
    const color = severityColor(issue.severity);
    const tag = issue.severity.toUpperCase().padEnd(8);
    const fixTag = issue.auto_fixable ? ` ${GREEN}[auto-fix]${RESET}` : "";
    console.log(`${color}${BOLD}${tag}${RESET} ${issue.title}${fixTag}`);
    console.log(`${DIM}         ${issue.description}${RESET}`);
    if (issue.file) {
      console.log(`${DIM}         📄 ${issue.file}${issue.line ? `:${issue.line}` : ""}${RESET}`);
    }
    console.log();
  }

  // Summary
  const autoFixCount = result.issues.filter((i) => i.auto_fixable).length;
  if (autoFixCount > 0) {
    console.log(
      `${GREEN}${BOLD}${autoFixCount} issues can be auto-fixed.${RESET} Run: ${CYAN}npx shippabel fix${RESET}\n`
    );
  }

  console.log(
    `${DIM}Generate store listings, screenshots, and submit at ${CYAN}https://shippabel.com${RESET}\n`
  );

  process.exit(result.summary.critical > 0 ? 1 : 0);
} else if (command === "fix") {
  printBanner();
  console.log(`${DIM}Scanning and fixing ${projectPath}...${RESET}\n`);

  const scanBefore = scanProject(projectPath);
  const fixResult = autoFix(projectPath, scanBefore.issues);
  const scanAfter = scanProject(projectPath);

  const scoreBefore = scanBefore.score;
  const scoreAfter = scanAfter.score;
  const scoreColor = scoreAfter >= 80 ? GREEN : scoreAfter >= 50 ? YELLOW : RED;

  console.log(
    `${BOLD}Score: ${DIM}${scoreBefore}${RESET} → ${scoreColor}${BOLD}${scoreAfter}/100${RESET}${scoreAfter > scoreBefore ? ` ${GREEN}(+${scoreAfter - scoreBefore})${RESET}` : ""}\n`
  );

  if (fixResult.fixed.length > 0) {
    console.log(`${GREEN}${BOLD}Fixed:${RESET}`);
    for (const f of fixResult.fixed) {
      console.log(`  ${GREEN}✓${RESET} ${f}`);
    }
    console.log();
  }

  if (fixResult.errors.length > 0) {
    console.log(`${RED}${BOLD}Errors:${RESET}`);
    for (const e of fixResult.errors) {
      console.log(`  ${RED}✗${RESET} ${e}`);
    }
    console.log();
  }

  if (scanAfter.issues.length > 0) {
    console.log(`${YELLOW}Remaining issues: ${scanAfter.issues.length}${RESET}`);
    for (const issue of scanAfter.issues) {
      const color = severityColor(issue.severity);
      console.log(`  ${color}•${RESET} ${issue.title}`);
    }
    console.log();
  }

  if (scanAfter.summary.critical === 0 && scanAfter.score >= 80) {
    console.log(`${GREEN}${BOLD}🚀 Your app is ready to ship!${RESET}`);
  }

  console.log(
    `\n${DIM}Submit your app at ${CYAN}https://shippabel.com${RESET}\n`
  );
} else if (command === "help" || command === "--help" || command === "-h") {
  printBanner();
  console.log(`${BOLD}Usage:${RESET}  npx shippabel <command> [project-path]

${BOLD}Commands:${RESET}
  scan    Scan your Expo project for store readiness (default)
  fix     Auto-fix common issues in app.json and .gitignore
  help    Show this help message

${BOLD}Examples:${RESET}
  npx shippabel                    # Scan current directory
  npx shippabel scan ./my-app      # Scan a specific project
  npx shippabel fix                # Auto-fix issues in current directory

${BOLD}MCP Server:${RESET}
  Add to your Claude Code or Cursor config:
  ${DIM}"shippabel": { "command": "npx", "args": ["-y", "shippabel", "--mcp"] }${RESET}

${DIM}https://shippabel.com${RESET}
`);
} else if (command === "--mcp") {
  // Launch as MCP server
  import("./server.js");
} else {
  console.error(`Unknown command: ${command}\nRun 'npx shippabel help' for usage.`);
  process.exit(1);
}

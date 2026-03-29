import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { ScanIssue } from "./scanner.js";

export interface FixResult {
  fixed: string[];
  skipped: string[];
  errors: string[];
}

export function autoFix(projectPath: string, issues: ScanIssue[]): FixResult {
  const fixed: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const fixableIssues = issues.filter((i) => i.auto_fixable);

  for (const issue of fixableIssues) {
    try {
      const result = applyFix(projectPath, issue);
      if (result) {
        fixed.push(`${issue.title}: ${result}`);
      } else {
        skipped.push(issue.title);
      }
    } catch (err) {
      errors.push(
        `${issue.title}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return { fixed, skipped, errors };
}

function applyFix(projectPath: string, issue: ScanIssue): string | null {
  const appJsonPath = join(projectPath, "app.json");

  switch (issue.title) {
    case "Missing bundle identifier":
    case "Default bundle identifier": {
      const config = readAppJson(appJsonPath);
      if (!config) return null;
      const expo = ensureExpo(config);
      const name = ((expo.slug ?? expo.name ?? "myapp") as string)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      if (!expo.ios) expo.ios = {};
      if (!expo.android) expo.android = {};
      (expo.ios as Record<string, unknown>).bundleIdentifier =
        `com.yourname.${name}`;
      (expo.android as Record<string, unknown>).package =
        `com.yourname.${name}`;

      writeAppJson(appJsonPath, config);
      return `Set bundle identifier to com.yourname.${name} (update "yourname" to your domain)`;
    }

    case "Version not set": {
      const config = readAppJson(appJsonPath);
      if (!config) return null;
      const expo = ensureExpo(config);
      expo.version = "1.0.0";
      writeAppJson(appJsonPath, config);
      return "Set version to 1.0.0";
    }

    case "Build number not set": {
      const config = readAppJson(appJsonPath);
      if (!config) return null;
      const expo = ensureExpo(config);
      if (!expo.ios) expo.ios = {};
      if (!expo.android) expo.android = {};
      (expo.ios as Record<string, unknown>).buildNumber = "1";
      (expo.android as Record<string, unknown>).versionCode = 1;
      writeAppJson(appJsonPath, config);
      return "Set iOS buildNumber to '1' and Android versionCode to 1";
    }

    case "No app category set": {
      const config = readAppJson(appJsonPath);
      if (!config) return null;
      const expo = ensureExpo(config);
      if (!expo.ios) expo.ios = {};
      (expo.ios as Record<string, unknown>).appStoreCategory = "UTILITIES";
      writeAppJson(appJsonPath, config);
      return "Set app category to UTILITIES (change to match your app)";
    }

    case 'Missing "name" in app config': {
      const config = readAppJson(appJsonPath);
      if (!config) return null;
      const expo = ensureExpo(config);
      const pkgPath = join(projectPath, "package.json");
      let name = "My App";
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
          name = pkg.name ?? name;
        } catch {
          // ignore
        }
      }
      expo.name = name;
      writeAppJson(appJsonPath, config);
      return `Set app name to "${name}"`;
    }

    case 'Missing "slug" in app config': {
      const config = readAppJson(appJsonPath);
      if (!config) return null;
      const expo = ensureExpo(config);
      const name = ((expo.name ?? "my-app") as string)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
      expo.slug = name;
      writeAppJson(appJsonPath, config);
      return `Set slug to "${name}"`;
    }

    case "Environment files not in .gitignore": {
      const gitignorePath = join(projectPath, ".gitignore");
      let content = existsSync(gitignorePath)
        ? readFileSync(gitignorePath, "utf-8")
        : "";
      if (!content.includes(".env")) {
        content += "\n# Environment variables\n.env*\n";
        writeFileSync(gitignorePath, content, "utf-8");
        return "Added .env* to .gitignore";
      }
      return null;
    }

    case "No .gitignore file": {
      const gitignorePath = join(projectPath, ".gitignore");
      const template = `# Dependencies
node_modules/

# Expo
.expo/
dist/
web-build/

# Environment variables
.env*

# Native builds
ios/
android/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`;
      writeFileSync(gitignorePath, template, "utf-8");
      return "Created .gitignore with standard Expo exclusions";
    }

    default:
      return null;
  }
}

function readAppJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function writeAppJson(path: string, config: Record<string, unknown>) {
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function ensureExpo(
  config: Record<string, unknown>
): Record<string, unknown> {
  if (config.expo) return config.expo as Record<string, unknown>;
  return config;
}

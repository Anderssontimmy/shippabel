import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

export interface ScanIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  auto_fixable: boolean;
  fix_description: string | null;
  file?: string;
  line?: number;
}

export interface ScanResult {
  score: number;
  project_name: string;
  framework: string;
  issues: ScanIssue[];
  summary: { critical: number; warning: number; info: number; total: number };
}

export function scanProject(projectPath: string): ScanResult {
  const issues: ScanIssue[] = [];

  // Detect framework
  const framework = detectFramework(projectPath);
  if (framework === "unknown") {
    return {
      score: 0,
      project_name: "unknown",
      framework: "unknown",
      issues: [
        {
          severity: "critical",
          category: "config",
          title: "Not an Expo or React Native project",
          description:
            "Could not find app.json, app.config.js, or package.json with expo/react-native dependencies. Shippabel currently supports Expo projects.",
          auto_fixable: false,
          fix_description: null,
        },
      ],
      summary: { critical: 1, warning: 0, info: 0, total: 1 },
    };
  }

  // Parse app config
  const appConfig = readAppConfig(projectPath);
  const expo = appConfig
    ? ((appConfig.expo ?? appConfig) as Record<string, unknown>)
    : null;
  const projectName = expo
    ? ((expo.name ?? expo.slug ?? "my-app") as string)
    : "my-app";

  // --- Config validation ---
  if (!appConfig) {
    issues.push({
      severity: "critical",
      category: "config",
      title: "Missing app.json / app.config.js",
      description:
        "No Expo configuration file found. This file is required to build and publish your app.",
      auto_fixable: true,
      fix_description: "Create an app.json with basic Expo configuration.",
    });
  } else if (expo) {
    // Name
    if (!expo.name) {
      issues.push({
        severity: "warning",
        category: "config",
        title: 'Missing "name" in app config',
        description: "Your app has no display name configured.",
        auto_fixable: true,
        fix_description: "Add a name field to your app.json.",
      });
    }

    // Slug
    if (!expo.slug) {
      issues.push({
        severity: "warning",
        category: "config",
        title: 'Missing "slug" in app config',
        description:
          "The slug is used as the URL-friendly identifier for your app on Expo.",
        auto_fixable: true,
        fix_description: "Add a slug field to app.json.",
      });
    }

    // Bundle identifier
    const iosBundleId = (expo.ios as Record<string, unknown> | undefined)
      ?.bundleIdentifier as string | undefined;
    const androidPackage = (expo.android as Record<string, unknown> | undefined)
      ?.package as string | undefined;

    if (!iosBundleId && !androidPackage) {
      issues.push({
        severity: "critical",
        category: "config",
        title: "Missing bundle identifier",
        description:
          "No iOS bundle identifier or Android package name is set. Both stores require a unique reverse-domain identifier (e.g., com.yourname.yourapp).",
        auto_fixable: true,
        fix_description:
          "Add ios.bundleIdentifier and android.package to app.json.",
      });
    } else if (
      iosBundleId?.includes("example") ||
      androidPackage?.includes("example")
    ) {
      issues.push({
        severity: "warning",
        category: "config",
        title: "Default bundle identifier",
        description:
          "Your bundle identifier contains 'example'. This won't pass store review.",
        auto_fixable: true,
        fix_description:
          "Change the bundle identifier to use your own domain.",
      });
    }

    // Version
    if (!expo.version) {
      issues.push({
        severity: "warning",
        category: "config",
        title: "Version not set",
        description:
          "No version string is configured. Stores require a version number.",
        auto_fixable: true,
        fix_description: "Add version: '1.0.0' to app.json.",
      });
    }

    // Build number
    const iosBuild = (expo.ios as Record<string, unknown> | undefined)
      ?.buildNumber;
    const androidCode = (expo.android as Record<string, unknown> | undefined)
      ?.versionCode;
    if (!iosBuild && !androidCode) {
      issues.push({
        severity: "warning",
        category: "config",
        title: "Build number not set",
        description:
          "No build number configured. Each store submission needs an incremented build number.",
        auto_fixable: true,
        fix_description:
          "Set ios.buildNumber to '1' and android.versionCode to 1.",
      });
    }

    // App icon
    if (!expo.icon) {
      issues.push({
        severity: "critical",
        category: "assets",
        title: "Missing app icon",
        description:
          "No app icon configured. App Store requires a 1024x1024 PNG without transparency.",
        auto_fixable: false,
        fix_description:
          "Create a 1024x1024 PNG icon and set expo.icon in app.json.",
      });
    } else {
      const iconPath = join(projectPath, expo.icon as string);
      if (!existsSync(iconPath)) {
        issues.push({
          severity: "critical",
          category: "assets",
          title: "App icon file not found",
          description: `Icon path "${expo.icon}" is configured but the file doesn't exist.`,
          auto_fixable: false,
          fix_description: "Create the icon file or update the path in app.json.",
          file: expo.icon as string,
        });
      }
    }

    // Splash screen
    const splash = expo.splash as Record<string, unknown> | undefined;
    if (!splash?.image) {
      issues.push({
        severity: "warning",
        category: "assets",
        title: "No custom splash screen",
        description:
          "Using the default Expo splash screen. A custom splash looks more professional.",
        auto_fixable: false,
        fix_description:
          "Add a splash screen image and configure expo.splash.",
      });
    }

    // Adaptive icon (Android)
    const adaptiveIcon = (
      expo.android as Record<string, unknown> | undefined
    )?.adaptiveIcon as Record<string, unknown> | undefined;
    if (!adaptiveIcon?.foregroundImage) {
      issues.push({
        severity: "warning",
        category: "assets",
        title: "No adaptive icon for Android",
        description:
          "Android adaptive icons aren't configured. Icons may look distorted on modern Android.",
        auto_fixable: false,
        fix_description:
          "Add android.adaptiveIcon with foregroundImage in app.json.",
      });
    }

    // Privacy policy
    if (
      !(expo.ios as Record<string, unknown> | undefined)?.privacyManifests &&
      !expo.privacyPolicy
    ) {
      issues.push({
        severity: "warning",
        category: "config",
        title: "Missing privacy policy",
        description:
          "No privacy policy URL configured. Both Apple and Google require one.",
        auto_fixable: true,
        fix_description:
          "Shippabel can generate and host a privacy policy for you at shippabel.com.",
      });
    }

    // Category
    if (!(expo.ios as Record<string, unknown> | undefined)?.appStoreCategory) {
      issues.push({
        severity: "info",
        category: "config",
        title: "No app category set",
        description:
          "Setting a category helps with store placement and discoverability.",
        auto_fixable: true,
        fix_description: "Add ios.appStoreCategory to app.json.",
      });
    }
  }

  // --- Security scan ---
  const sourceFiles = collectSourceFiles(projectPath);

  // Check for .env files
  const envFiles = [".env", ".env.local", ".env.production"].filter((f) =>
    existsSync(join(projectPath, f))
  );
  const gitignorePath = join(projectPath, ".gitignore");
  const gitignore = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf-8")
    : "";

  if (envFiles.length > 0 && !gitignore.includes(".env")) {
    issues.push({
      severity: "critical",
      category: "security",
      title: "Environment files not in .gitignore",
      description: `Found ${envFiles.join(", ")} but .gitignore doesn't exclude .env files. Secrets may be committed to git.`,
      auto_fixable: true,
      fix_description: "Add .env* to your .gitignore.",
    });
  }

  if (!existsSync(gitignorePath)) {
    issues.push({
      severity: "warning",
      category: "security",
      title: "No .gitignore file",
      description:
        "Your project has no .gitignore. Sensitive files may be committed.",
      auto_fixable: true,
      fix_description:
        "Create a .gitignore with standard Expo exclusions.",
    });
  }

  // Scan source files for hardcoded secrets
  const keyPatterns = [
    { pattern: /sk[-_]live[-_][a-zA-Z0-9]{20,}/, name: "Stripe secret key" },
    { pattern: /AIza[0-9A-Za-z_-]{35}/, name: "Google API key" },
    { pattern: /sk-[a-zA-Z0-9]{40,}/, name: "OpenAI/Anthropic API key" },
    { pattern: /AKIA[0-9A-Z]{16}/, name: "AWS access key" },
    {
      pattern: /ghp_[a-zA-Z0-9]{36}/,
      name: "GitHub personal access token",
    },
  ];

  for (const file of sourceFiles.slice(0, 50)) {
    try {
      const content = readFileSync(join(projectPath, file), "utf-8");
      for (const { pattern, name } of keyPatterns) {
        if (pattern.test(content)) {
          const lines = content.split("\n");
          const lineNum =
            lines.findIndex((l) => pattern.test(l)) + 1;
          issues.push({
            severity: "critical",
            category: "security",
            title: `Hardcoded ${name} found`,
            description: `A ${name} was detected in ${file}${lineNum ? ` (line ${lineNum})` : ""}. This will be visible in your published app.`,
            auto_fixable: true,
            fix_description:
              "Move the key to environment variables using expo-constants.",
            file,
            line: lineNum || undefined,
          });
          break;
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  // --- Code quality ---
  const hasErrorBoundary = sourceFiles.some(
    (f) =>
      f.toLowerCase().includes("errorboundary") ||
      f.toLowerCase().includes("error-boundary")
  );
  if (!hasErrorBoundary && sourceFiles.length > 5) {
    issues.push({
      severity: "info",
      category: "code",
      title: "No error boundary detected",
      description:
        "No React error boundaries found. They prevent full-app crashes from component errors.",
      auto_fixable: false,
      fix_description:
        "Wrap your main app component in an error boundary.",
    });
  }

  // Calculate score
  const critical = issues.filter((i) => i.severity === "critical").length;
  const warning = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;
  const score = Math.max(
    0,
    Math.min(100, 100 - critical * 20 - warning * 6 - info * 2)
  );

  return {
    score,
    project_name: projectName,
    framework,
    issues,
    summary: { critical, warning, info, total: issues.length },
  };
}

// --- Helpers ---

function detectFramework(projectPath: string): string {
  const pkgPath = join(projectPath, "package.json");
  if (!existsSync(pkgPath)) return "unknown";

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if ("expo" in deps) return "expo";
    if ("react-native" in deps) return "react-native";
  } catch {
    // ignore
  }

  if (
    existsSync(join(projectPath, "app.json")) ||
    existsSync(join(projectPath, "app.config.js"))
  ) {
    return "expo";
  }

  return "unknown";
}

function readAppConfig(
  projectPath: string
): Record<string, unknown> | null {
  const appJsonPath = join(projectPath, "app.json");
  if (existsSync(appJsonPath)) {
    try {
      return JSON.parse(readFileSync(appJsonPath, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

function collectSourceFiles(
  projectPath: string,
  dir = "",
  files: string[] = []
): string[] {
  const skipDirs = new Set([
    "node_modules",
    ".git",
    ".expo",
    "dist",
    "build",
    "android",
    "ios",
    ".next",
  ]);
  const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

  const fullDir = dir ? join(projectPath, dir) : projectPath;
  if (!existsSync(fullDir)) return files;

  try {
    for (const entry of readdirSync(fullDir)) {
      if (skipDirs.has(entry)) continue;
      const entryPath = join(fullDir, entry);
      const relPath = dir ? `${dir}/${entry}` : entry;

      try {
        const stat = statSync(entryPath);
        if (stat.isDirectory()) {
          collectSourceFiles(projectPath, relPath, files);
        } else if (extensions.has(entryPath.slice(entryPath.lastIndexOf(".")))) {
          files.push(relPath);
        }
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }

  return files;
}

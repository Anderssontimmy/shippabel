import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://shippabel.com", "https://www.shippabel.com", "http://localhost:5173"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
  "Access-Control-Allow-Origin": allowed,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface ScanRequest {
  project_id: string;
  repo_url?: string;
  file_path?: string;
  github_token?: string;
}

type ProjectType = "expo" | "react-native" | "react-web" | "nextjs" | "vue" | "static" | "unknown";

interface Issue {
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  friendly_title: string;
  friendly_description: string;
  auto_fixable: boolean;
  fix_description: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { project_id, repo_url, file_path, github_token } = (await req.json()) as ScanRequest;

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 10 scans per IP per hour for unauthenticated users
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("cf-connecting-ip")
      ?? "unknown";
    const authHeader = req.headers.get("Authorization");
    const isAuthenticated = !!authHeader && authHeader !== "Bearer placeholder-key";

    if (!isAuthenticated) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .is("user_id", null)
        .gte("created_at", oneHourAgo);

      if (count !== null && count >= 20) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please sign in for unlimited scans." }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch project files for analysis
    let appConfig: Record<string, unknown> | null = null;
    let fileList: string[] = [];
    let packageJson: Record<string, unknown> | null = null;
    let readmeContent: string | null = null;

    if (repo_url) {
      const repoPath = extractGitHubPath(repo_url);
      if (repoPath) {
        const result = await fetchGitHubProject(repoPath, github_token);
        appConfig = result.appConfig;
        fileList = result.fileList;
        packageJson = result.packageJson;
        readmeContent = result.readmeContent;
      }
    } else if (file_path) {
      const result = await analyzeZipFromStorage(supabase, file_path);
      appConfig = result.appConfig;
      fileList = result.fileList;
      packageJson = result.packageJson;
    }

    // Detect project type
    const projectType = detectProjectType(appConfig, packageJson, fileList);

    // Start AI potential analysis early (runs in parallel with scan checks)
    const analysisPromise = generatePotentialAnalysis(appConfig, packageJson, readmeContent, fileList);

    // Determine if conversion is needed
    const needsConversion = projectType !== "expo";
    const conversionMessages: Record<string, string> = {
      "react-web": "Your app is a web app built with React. We can wrap it as a mobile app and publish it to the App Store and Google Play.",
      "nextjs": "Your app is built with Next.js. We can convert it to a mobile app and publish it to both stores.",
      "vue": "Your app is built with Vue. We can convert it to a mobile app and publish it to the App Store and Google Play.",
      "react-native": "Your app uses React Native but isn't set up with Expo. We can add Expo to make it ready for the stores.",
      "static": "Your app is a static website. We can wrap it as a mobile app and publish it to both stores.",
      "unknown": "We detected a project but couldn't identify the framework. We can still try to convert it for the App Store.",
    };
    const conversionMessage = needsConversion ? (conversionMessages[projectType] ?? conversionMessages["unknown"]!) : null;

    // Run all scan checks
    const issues: Issue[] = [];

    // --- Config validation ---
    if (!appConfig) {
      issues.push({
        severity: needsConversion ? "warning" : "critical",
        category: "config",
        title: "Cannot read app.json or app.config.js",
        description:
          "No app.json or app.config.js file was found in the root of your project. Expo requires this file to configure your app for building and publishing.",
        auto_fixable: false,
        fix_description: "Create an app.json file in your project root with your app configuration.",
      });
    } else {
      const expo = (appConfig.expo ?? appConfig) as Record<string, unknown>;

      // Bundle identifier
      const iosBundleId = (expo.ios as Record<string, unknown>)?.bundleIdentifier as string | undefined;
      const androidPackage = (expo.android as Record<string, unknown>)?.package as string | undefined;

      if (!iosBundleId && !androidPackage) {
        issues.push({
          severity: "critical",
          category: "config",
          title: "Missing bundle identifier",
          description:
            "No iOS bundle identifier or Android package name is set. Both stores require a unique identifier in reverse-domain format (e.g., com.yourname.yourapp).",
          auto_fixable: true,
          fix_description: "Add ios.bundleIdentifier and android.package to your app.json.",
        });
      } else if (
        iosBundleId?.includes("example") ||
        androidPackage?.includes("example")
      ) {
        issues.push({
          severity: "warning",
          category: "config",
          title: "Default bundle identifier detected",
          description:
            "Your bundle identifier contains 'example'. This default value won't pass store review. Use a unique reverse-domain identifier like 'com.yourname.yourapp'.",
          auto_fixable: true,
          fix_description: "Update the bundle identifier in app.json to use your own domain.",
        });
      }

      // App icon
      const icon = expo.icon as string | undefined;
      if (!icon) {
        issues.push({
          severity: "critical",
          category: "assets",
          title: "Missing app icon",
          description:
            "No app icon is configured. The App Store requires a 1024x1024 PNG icon without transparency. Google Play also requires a 512x512 icon.",
          auto_fixable: false,
          fix_description: "Add a 1024x1024 PNG icon and set expo.icon in app.json.",
        });
      }

      // Splash screen
      const splash = expo.splash as Record<string, unknown> | undefined;
      if (!splash?.image) {
        issues.push({
          severity: "warning",
          category: "assets",
          title: "No custom splash screen",
          description:
            "Your splash screen uses the Expo default. A custom splash screen makes your app look polished during loading.",
          auto_fixable: false,
          fix_description: "Add a splash screen image and configure expo.splash in app.json.",
        });
      }

      // Version
      if (!expo.version) {
        issues.push({
          severity: "warning",
          category: "config",
          title: "Version not set",
          description: "No version string is set in your app configuration. Stores require a version number.",
          auto_fixable: true,
          fix_description: "Add version: '1.0.0' to your app.json.",
        });
      }

      // Build number
      const iosBuildNumber = (expo.ios as Record<string, unknown>)?.buildNumber as string | undefined;
      const androidVersionCode = (expo.android as Record<string, unknown>)?.versionCode as number | undefined;
      if (!iosBuildNumber && !androidVersionCode) {
        issues.push({
          severity: "warning",
          category: "config",
          title: "Build number not set",
          description:
            "No build number (iOS buildNumber or Android versionCode) is set. Each store submission requires an incremented build number.",
          auto_fixable: true,
          fix_description: "Set ios.buildNumber to '1' and android.versionCode to 1 in app.json.",
        });
      }

      // Privacy policy
      const privacyUrl = (expo.ios as Record<string, unknown>)?.privacyManifests ??
        (expo as Record<string, unknown>).privacyPolicy;
      if (!privacyUrl) {
        issues.push({
          severity: "warning",
          category: "config",
          title: "Missing privacy policy URL",
          description:
            "No privacy policy URL is configured. Both Apple and Google require a privacy policy for all published apps.",
          auto_fixable: true,
          fix_description: "We can generate and host a privacy policy for your app.",
        });
      }

      // Adaptive icon (Android)
      const adaptiveIcon = (expo.android as Record<string, unknown>)?.adaptiveIcon as Record<string, unknown> | undefined;
      if (!adaptiveIcon?.foregroundImage) {
        issues.push({
          severity: "warning",
          category: "assets",
          title: "No adaptive icon for Android",
          description:
            "Android adaptive icons aren't configured. Modern Android devices may show distorted icons without proper adaptive icon setup.",
          auto_fixable: false,
          fix_description: "Add android.adaptiveIcon with foregroundImage and backgroundColor in app.json.",
        });
      }

      // App category
      const category = (expo.ios as Record<string, unknown>)?.appStoreCategory;
      if (!category) {
        issues.push({
          severity: "info",
          category: "config",
          title: "No app category set",
          description:
            "No App Store category is specified. Setting a category helps with store placement and discoverability.",
          auto_fixable: true,
          fix_description: "Add ios.appStoreCategory to your app.json.",
        });
      }
    }

    // --- Security scan (check file contents for common patterns) ---
    if (repo_url) {
      const repoPath = extractGitHubPath(repo_url);
      if (repoPath) {
        const securityIssues = await scanForSecurityIssues(repoPath, fileList);
        issues.push(...securityIssues);
      }
    } else if (file_path) {
      // For zip uploads, check file list for .env files and missing .gitignore
      const envFiles = fileList.filter(f => f === ".env" || f === ".env.local" || f === ".env.production");
      if (envFiles.length > 0) {
        issues.push({
          severity: "critical",
          category: "security",
          title: "Environment files included in upload",
          description: `Found ${envFiles.join(", ")} in your project. These files often contain API keys and secrets.`,
          auto_fixable: true,
          fix_description: "Add .env* to your .gitignore and remove secrets from source.",
        });
      }
      if (!fileList.includes(".gitignore")) {
        issues.push({
          severity: "warning",
          category: "security",
          title: "No .gitignore file",
          description: "Your project has no .gitignore file. This may lead to accidentally committing sensitive files.",
          auto_fixable: true,
          fix_description: "Add a .gitignore with standard Expo/React Native exclusions.",
        });
      }
    }

    // --- Code quality checks ---
    const hasErrorBoundary = fileList.some(
      (f) => f.toLowerCase().includes("errorboundary") || f.toLowerCase().includes("error-boundary")
    );
    if (!hasErrorBoundary) {
      issues.push({
        severity: "info",
        category: "code",
        title: "No error boundary detected",
        description:
          "No React error boundaries were found. Error boundaries prevent the entire app from crashing when a component throws an error.",
        auto_fixable: false,
        fix_description: "Wrap your main app component in an error boundary.",
      });
    }

    // Add friendly descriptions to all issues
    const friendlyIssues = issues.map((issue) => ({
      ...issue,
      friendly_title: friendlyTitles[issue.title] ?? issue.title,
      friendly_description: friendlyDescriptions[issue.title] ?? issue.description,
    }));

    // Calculate score — be more generous for non-Expo projects (they'll be converted)
    const criticalCount = friendlyIssues.filter((i) => i.severity === "critical").length;
    const warningCount = friendlyIssues.filter((i) => i.severity === "warning").length;
    const infoCount = friendlyIssues.filter((i) => i.severity === "info").length;

    const baseScore = 100 - criticalCount * 20 - warningCount * 6 - infoCount * 2;
    const score = Math.max(0, Math.min(100, needsConversion ? Math.max(baseScore, 40) : baseScore));

    // Await the AI analysis (likely already done by now)
    const potentialAnalysis = await analysisPromise;

    const scanResult = {
      score,
      project_type: projectType,
      needs_conversion: needsConversion,
      conversion_message: conversionMessage,
      issues: friendlyIssues,
      summary: {
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
        total: friendlyIssues.length,
      },
      potential_analysis: potentialAnalysis,
    };

    // Update project with scan results
    const newStatus = criticalCount > 0 ? "issues_found" : score >= 80 ? "ready" : "issues_found";

    await supabase
      .from("projects")
      .update({
        scan_result: scanResult,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project_id);

    // Clear old issues from previous scans, then insert fresh ones
    await supabase.from("issues").delete().eq("project_id", project_id);

    if (issues.length > 0) {
      await supabase.from("issues").insert(
        issues.map((issue) => ({
          project_id,
          ...issue,
          fixed: false,
        }))
      );
    }

    return new Response(JSON.stringify({ success: true, scan_result: scanResult }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

// --- Helpers ---

async function analyzeZipFromStorage(
  supabase: ReturnType<typeof createClient>,
  storagePath: string
): Promise<{ appConfig: Record<string, unknown> | null; fileList: string[]; packageJson: Record<string, unknown> | null }> {
  let appConfig: Record<string, unknown> | null = null;
  let packageJson: Record<string, unknown> | null = null;
  const fileList: string[] = [];

  try {
    // Download zip from storage
    const { data: fileData, error } = await supabase.storage
      .from("projects")
      .download(storagePath);

    if (error || !fileData) {
      return { appConfig, fileList, packageJson };
    }

    // Use JSZip-like approach: read zip as array buffer and parse entries
    // Deno has built-in zip support via streams
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Parse zip central directory to get file listing
    // Find end of central directory record (last 22+ bytes)
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      return { appConfig, fileList };
    }

    // Read central directory offset and size
    const view = new DataView(arrayBuffer);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdSize = view.getUint32(eocdOffset + 12, true);
    const entryCount = view.getUint16(eocdOffset + 10, true);

    // Parse central directory entries
    let pos = cdOffset;
    const decoder = new TextDecoder();
    const fileContents: Map<string, string> = new Map();

    for (let i = 0; i < entryCount && pos < cdOffset + cdSize; i++) {
      // Central directory file header signature = 0x02014b50
      if (view.getUint32(pos, true) !== 0x02014b50) break;

      const compressedSize = view.getUint32(pos + 20, true);
      const uncompressedSize = view.getUint32(pos + 24, true);
      const nameLen = view.getUint16(pos + 28, true);
      const extraLen = view.getUint16(pos + 30, true);
      const commentLen = view.getUint16(pos + 32, true);
      const localHeaderOffset = view.getUint32(pos + 42, true);
      const compressionMethod = view.getUint16(pos + 10, true);

      const nameBytes = bytes.slice(pos + 46, pos + 46 + nameLen);
      let fileName = decoder.decode(nameBytes);

      // Strip top-level directory prefix (common in zip exports)
      const slashIdx = fileName.indexOf("/");
      if (slashIdx > 0 && !fileName.substring(0, slashIdx).includes(".")) {
        fileName = fileName.substring(slashIdx + 1);
      }

      if (fileName && !fileName.endsWith("/")) {
        fileList.push(fileName);

        // Extract content for key files (only uncompressed/stored files)
        const keyFiles = ["app.json", "app.config.js", "package.json", ".env", ".env.local", ".env.production", ".gitignore"];
        if (keyFiles.includes(fileName) && compressionMethod === 0 && uncompressedSize < 100000) {
          // Read from local file header
          const localNameLen = view.getUint16(localHeaderOffset + 26, true);
          const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
          const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;
          const fileBytes = bytes.slice(dataOffset, dataOffset + uncompressedSize);
          const content = decoder.decode(fileBytes);
          fileContents.set(fileName, content);
        }
      }

      pos += 46 + nameLen + extraLen + commentLen;
    }

    // Try to parse app.json and package.json
    const appJsonContent = fileContents.get("app.json");
    if (appJsonContent) {
      try { appConfig = JSON.parse(appJsonContent); } catch { /* invalid */ }
    }
    const pkgContent = fileContents.get("package.json");
    if (pkgContent) {
      try { packageJson = JSON.parse(pkgContent); } catch { /* invalid */ }
    }
  } catch {
    // Zip parsing failed — non-fatal
  }

  return { appConfig, fileList, packageJson };
}

function extractGitHubPath(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("github.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const repo = parts[1]!.replace(/\.git$/, "");
    return `${parts[0]}/${repo}`;
  } catch {
    return null;
  }
}

async function fetchGitHubProject(repoPath: string, token?: string) {
  let appConfig: Record<string, unknown> | null = null;
  let packageJson: Record<string, unknown> | null = null;
  let readmeContent: string | null = null;
  let fileList: string[] = [];

  const ghHeaders: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) ghHeaders.Authorization = `token ${token}`;

  try {
    // Get repo tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${repoPath}/git/trees/main?recursive=1`,
      { headers: ghHeaders }
    );

    if (!treeRes.ok) {
      const masterRes = await fetch(
        `https://api.github.com/repos/${repoPath}/git/trees/master?recursive=1`,
        { headers: ghHeaders }
      );
      if (masterRes.ok) {
        const data = await masterRes.json();
        fileList = (data.tree ?? [])
          .filter((t: { type: string }) => t.type === "blob")
          .map((t: { path: string }) => t.path);
      }
    } else {
      const data = await treeRes.json();
      fileList = (data.tree ?? [])
        .filter((t: { type: string }) => t.type === "blob")
        .map((t: { path: string }) => t.path);
    }

    // Fetch app.json, package.json, and README in parallel
    const fetchFile = async (name: string) => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `token ${token}`;
      const res = await fetch(`https://raw.githubusercontent.com/${repoPath}/main/${name}`, { headers });
      return res.ok ? await res.text() : null;
    };

    const [appJsonText, pkgText, readmeText] = await Promise.all([
      fileList.includes("app.json") ? fetchFile("app.json") : Promise.resolve(null),
      fileList.includes("package.json") ? fetchFile("package.json") : Promise.resolve(null),
      fileList.find((f) => f.toLowerCase() === "readme.md") ? fetchFile("README.md") : Promise.resolve(null),
    ]);

    if (appJsonText) {
      try { appConfig = JSON.parse(appJsonText); } catch { /* invalid JSON */ }
    }
    if (pkgText) {
      try { packageJson = JSON.parse(pkgText); } catch { /* invalid JSON */ }
    }
    if (readmeText) {
      readmeContent = readmeText.slice(0, 2000);
    }
  } catch {
    // GitHub API failure is non-fatal
  }

  return { appConfig, fileList, packageJson, readmeContent };
}

async function scanForSecurityIssues(repoPath: string, fileList: string[]): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Check for .env files committed
  const envFiles = fileList.filter(
    (f) => f === ".env" || f === ".env.local" || f === ".env.production"
  );
  if (envFiles.length > 0) {
    issues.push({
      severity: "critical",
      category: "security",
      title: "Environment file committed to repository",
      description: `Found ${envFiles.join(", ")} in the repository. Environment files often contain API keys and secrets that should not be in source control.`,
      auto_fixable: true,
      fix_description: "Add .env* to your .gitignore and remove the files from git history.",
    });
  }

  // Check for common secret patterns in source files
  const sourceFiles = fileList.filter(
    (f) =>
      (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".jsx")) &&
      !f.includes("node_modules") &&
      !f.includes(".d.ts")
  );

  // Sample a few files for hardcoded keys (rate-limit friendly)
  const filesToCheck = sourceFiles.slice(0, 10);
  for (const filePath of filesToCheck) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${repoPath}/main/${filePath}`
      );
      if (!res.ok) continue;
      const content = await res.text();

      // Check for common API key patterns
      const keyPatterns = [
        { pattern: /sk[-_]live[-_][a-zA-Z0-9]{20,}/g, name: "Stripe secret key" },
        { pattern: /AIza[0-9A-Za-z_-]{35}/g, name: "Google API key" },
        { pattern: /sk-[a-zA-Z0-9]{40,}/g, name: "OpenAI/Anthropic API key" },
        { pattern: /AKIA[0-9A-Z]{16}/g, name: "AWS access key" },
      ];

      for (const { pattern, name } of keyPatterns) {
        if (pattern.test(content)) {
          issues.push({
            severity: "critical",
            category: "security",
            title: `Hardcoded ${name} found in ${filePath}`,
            description: `A ${name} was detected in ${filePath}. This key will be visible in your published app bundle. Attackers can decompile your app and extract it.`,
            auto_fixable: true,
            fix_description: "Move the key to environment variables using expo-constants.",
          });
          break; // One issue per file is enough
        }
      }
    } catch {
      // Skip files we can't fetch
    }
  }

  // Check for .gitignore
  if (!fileList.includes(".gitignore")) {
    issues.push({
      severity: "warning",
      category: "security",
      title: "No .gitignore file",
      description: "Your project has no .gitignore file. This may lead to accidentally committing sensitive files, build artifacts, or node_modules.",
      auto_fixable: true,
      fix_description: "Add a .gitignore with standard Expo/React Native exclusions.",
    });
  }

  return issues;
}

async function generatePotentialAnalysis(
  appConfig: Record<string, unknown> | null,
  packageJson: Record<string, unknown> | null,
  readmeContent: string | null,
  fileList: string[]
): Promise<Record<string, unknown> | null> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return null;

  try {
    const expo = appConfig ? ((appConfig.expo ?? appConfig) as Record<string, unknown>) : null;
    const appName = (expo?.name ?? expo?.slug ?? packageJson?.name ?? "Unknown App") as string;
    const appDesc = (packageJson?.description ?? "") as string;

    const deps = packageJson
      ? Object.keys({ ...(packageJson.dependencies as Record<string, string> ?? {}), ...(packageJson.devDependencies as Record<string, string> ?? {}) }).slice(0, 30).join(", ")
      : "";

    // Summarize file structure
    const dirs = new Set(fileList.map((f) => f.split("/")[0]).filter(Boolean));
    const extensions = new Set(fileList.map((f) => f.slice(f.lastIndexOf("."))).filter((e) => e.length < 6));

    const prompt = `You are an expert mobile app market analyst. Based on the following app project data, generate an exciting and specific market potential analysis. Be enthusiastic but realistic. Respond with raw JSON only — no markdown, no code fences.

App name: ${appName}
App description: ${appDesc}
Key dependencies: ${deps}
File structure: directories=${[...dirs].slice(0, 15).join(", ")}; extensions=${[...extensions].join(", ")}
File count: ${fileList.length}
${readmeContent ? `README excerpt: ${readmeContent.slice(0, 800)}` : ""}

Respond in this exact JSON format:
{"app_description":"One sentence describing what this app does","market_potential":{"comparable_apps":["App1 - brief note","App2 - brief note","App3 - brief note"],"market_size":"One sentence about market size"},"revenue_potential":"2-3 sentences about what similar apps earn with specific numbers","strengths":["Strength 1","Strength 2","Strength 3"],"growth_suggestions":["Suggestion 1","Suggestion 2","Suggestion 3"],"excitement_hook":"One motivational sentence about this app's potential"}

Be specific based on detected frameworks and features. If you see navigation libraries, mention multi-screen experience. If you see payment/stripe, mention monetization readiness. If you see Firebase/Supabase, mention backend capabilities. Never be generic.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return null;

    const result = await response.json();
    const text = (result.content?.[0]?.text ?? "").trim();

    // Strip any accidental markdown fences
    const jsonStr = text.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// --- Project type detection ---

function detectProjectType(
  appConfig: Record<string, unknown> | null,
  packageJson: Record<string, unknown> | null,
  fileList: string[]
): ProjectType {
  if (appConfig && (appConfig.expo || appConfig.name)) {
    return "expo";
  }

  const deps = packageJson
    ? { ...(packageJson.dependencies as Record<string, string> ?? {}), ...(packageJson.devDependencies as Record<string, string> ?? {}) }
    : {};

  if ("expo" in deps) return "expo";
  if ("react-native" in deps && !("expo" in deps)) return "react-native";
  if ("next" in deps) return "nextjs";
  if ("vue" in deps || "nuxt" in deps) return "vue";
  if ("react" in deps || "react-dom" in deps) return "react-web";
  if (fileList.includes("index.html")) return "static";

  return "unknown";
}

// --- Friendly issue titles & descriptions (no tech jargon) ---

const friendlyTitles: Record<string, string> = {
  "Cannot read app.json or app.config.js": "Your app needs a settings file",
  "Missing bundle identifier": "Your app needs a unique name for the stores",
  "Default bundle identifier detected": "Your app is using a temporary name",
  "Missing app icon": "Your app needs an icon",
  "App icon file not found": "We can't find your app icon",
  "No custom splash screen": "Your app needs a loading screen",
  "Version not set": "Your app needs a version number",
  "Build number not set": "Your app needs a build number",
  "Missing privacy policy URL": "You need a privacy policy",
  "No adaptive icon for Android": "Your icon won't look right on Android",
  "No app category set": "Pick a category for your app",
  "Environment file committed to repository": "Your passwords are visible to everyone",
  "Environment files included in upload": "Your upload contains passwords",
  "No .gitignore file": "Private files aren't being protected",
  "No error boundary detected": "Your app might crash unexpectedly",
};

const friendlyDescriptions: Record<string, string> = {
  "Cannot read app.json or app.config.js": "Your app needs a special settings file to be published. Don't worry — we can create one for you automatically.",
  "Missing bundle identifier": "Every app in the store needs its own unique name (like a website address, but for apps). We'll create one for you.",
  "Default bundle identifier detected": "Your app is still using a placeholder name. We'll replace it with a proper one so the stores accept it.",
  "Missing app icon": "You need an app icon — it's what people see on their home screen. It should be a square image, at least 1024x1024 pixels.",
  "No custom splash screen": "When your app opens, it shows a default white screen. Adding your own loading screen makes it look more professional.",
  "Version not set": "The stores need to know which version of your app this is (like 1.0.0). We'll set it for you.",
  "Build number not set": "Every time you update your app, it needs a new build number. We'll set the first one for you.",
  "Missing privacy policy URL": "Apple and Google won't accept your app without a privacy policy. We can write one and host it for you — it takes one click.",
  "No adaptive icon for Android": "Android phones display app icons in different shapes (circles, squares, etc.). Without the right setup, your icon might look cut off.",
  "No app category set": "Picking a category (like 'Productivity' or 'Games') helps people find your app in the store.",
  "Environment file committed to repository": "We found files containing passwords or secret keys in your code. Anyone could see them. We'll help you hide them.",
  "Environment files included in upload": "Your upload contains files with passwords or secret keys. We'll make sure they're removed before publishing.",
  "No .gitignore file": "Your app doesn't have a file that tells it what to keep private. We'll add one so your secrets stay safe.",
  "No error boundary detected": "If something goes wrong in your app, the whole thing could crash. Adding a safety net means only the broken part fails, not everything.",
};

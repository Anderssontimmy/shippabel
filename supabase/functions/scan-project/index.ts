import { generateText } from "../_shared/anthropic.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decryptCreds } from "../_shared/crypto.ts";
import { analyzeZip, extractGitHubPath, fetchGitHubProject, findSecrets, ScanError, type ScanSource } from "../_shared/scanSource.ts";
import { canScanProject, validateScanRequest } from "../_shared/scanAccess.ts";
import { instrument } from "../_shared/monitoring.ts";
import { capacitorIssues } from "../_shared/capacitor.ts";

const ALLOWED_ORIGINS = ["https://shippabel.com", "https://www.shippabel.com", "http://localhost:5173"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
  "Access-Control-Allow-Origin": allowed,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-guest-token",
  };
}

type ProjectType = "expo" | "react-native" | "capacitor" | "react-web" | "nextjs" | "vue" | "static" | "unknown";

interface Issue {
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  friendly_title?: string;
  friendly_description?: string;
  auto_fixable: boolean;
  fix_description: string | null;
}

Deno.serve(instrument("scan-project", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (req.method !== "POST") throw new ScanError("Method not allowed", 405);
    const { project_id, repo_url, file_path } = validateScanRequest(await req.json().catch(() => null));
    const bearer = req.headers.get("Authorization")?.replace(/^Bearer /i, "") ?? "";
    let requesterId: string | null = null;
    if (bearer && bearer !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data: { user }, error } = await supabase.auth.getUser(bearer);
      if (error || !user) throw new ScanError("Please sign in again.", 401);
      requesterId = user.id;
    }
    const { data: project, error: projectError } = await supabase.from("projects")
      .select("user_id, guest_token_hash, repo_url").eq("id", project_id).maybeSingle();
    if (projectError) throw new ScanError("Could not load your project. Try again.", 503);
    if (!await canScanProject(project, requesterId, req.headers.get("x-guest-token") ?? "")) throw new ScanError("Project not found", 404);
    if (repo_url && repo_url !== project?.repo_url) throw new ScanError("The repository does not match this project.", 400);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { data: quota, error: quotaError } = await supabase.rpc("consume_scan_quota", { p_ip: clientIp, p_project_id: project_id, p_user_id: requesterId });
    if (quotaError) throw new ScanError("Scanning is temporarily unavailable. Try again shortly.", 503);
    if (!quota) throw new ScanError("Scan limit reached. Please try again in an hour.", 429);

    // Only the authenticated owner's encrypted server credential is trusted.
    let githubToken: string | undefined;
    if (requesterId && project?.user_id === requesterId) {
      const { data: credential, error } = await supabase.from("user_credentials").select("credentials")
        .eq("user_id", requesterId).eq("provider", "github").maybeSingle();
      if (error) throw new ScanError("Could not load your GitHub connection.", 503);
      if (credential?.credentials) githubToken = (await decryptCreds(credential.credentials, Deno.env.get("CREDENTIALS_ENC_KEY") ?? "")).access_token;
    }
    let source: ScanSource;
    if (repo_url) {
      source = await fetchGitHubProject(extractGitHubPath(repo_url), githubToken);
    } else {
      const { data, error } = await supabase.storage.from("project-archives").download(file_path!);
      if (error || !data) throw new ScanError("Your ZIP could not be downloaded. Upload it again.");
      source = analyzeZip(new Uint8Array(await data.arrayBuffer()));
    }
    const { appConfig, packageJson, readmeContent, fileList } = source;

    // Detect project type
    const projectType = detectProjectType(appConfig, packageJson, fileList);

    // Start AI potential analysis early (runs in parallel with scan checks)
    const analysisPromise = generatePotentialAnalysis(appConfig, packageJson, readmeContent, fileList);

    // Determine if conversion is needed (Capacitor and Expo apps are already mobile-ready)
    const needsConversion = projectType !== "expo" && projectType !== "capacitor";
    const conversionMessages: Record<string, string> = {
      "react-web": "Your app is a web app built with React. We can wrap it as a mobile app and publish it to Google Play.",
      "nextjs": "Your Next.js app needs a static export and mobile configuration. Server routes must stay on a hosted backend.",
      "vue": "Your app is built with Vue. We can convert it to a mobile app and publish it to Google Play.",
      "react-native": "Your React Native app needs an Expo setup that matches its native dependencies before building through Shippabel.",
      "static": "Your website needs a static build and mobile configuration before it can be published to Google Play.",
      "unknown": "We couldn't identify the framework. Automatic conversion supports Vite web apps; other projects need mobile configuration first.",
    };
    const conversionMessage = needsConversion ? (conversionMessages[projectType] ?? conversionMessages["unknown"]!) : null;

    // Run all scan checks
    const issues: Issue[] = [];

    // --- Config validation ---
    if (projectType === "capacitor") {
      issues.push(...capacitorIssues(source));
    } else if (!appConfig) {
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
            "No app icon is configured. Google Play requires a 512x512 PNG icon (a 1024x1024 version is also recommended).",
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
          auto_fixable: false,
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
            "No app category is set. Setting a category helps with store placement and discoverability.",
          auto_fixable: true,
          fix_description: "Add ios.appStoreCategory to your app.json.",
        });
      }
    }

    // Security checks use the same authenticated snapshot as the config scan.
    for (const { file, name } of findSecrets(source)) {
      issues.push({ severity: "critical", category: "security", title: `Hardcoded ${name} found in ${file}`,
        description: `A ${name} was found in ${file}. Credentials in an app bundle can be extracted.`,
        auto_fixable: false, fix_description: "Revoke the exposed key and move the privileged operation to a server. App environment variables do not protect secrets." });
    }
    const envFiles = fileList.filter((f) => /(^|\/)\.env(?:$|\.)/.test(f) && !/\.(example|sample|template)$/.test(f));
    if (envFiles.length) issues.push({ severity: "critical", category: "security",
      title: repo_url ? "Environment file committed to repository" : "Environment files included in upload",
      description: `Found ${envFiles.join(", ")}. These files may contain private credentials.`, auto_fixable: false,
      fix_description: "Remove private credentials from the app and rotate any exposed keys." });
    if (!fileList.includes(".gitignore")) issues.push({ severity: "warning", category: "security", title: "No .gitignore file",
      description: "A .gitignore helps keep private files out of source control.", auto_fixable: true,
      fix_description: "Add a .gitignore with standard exclusions." });

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
      id: crypto.randomUUID(),
      project_id,
      fixed: false,
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

    const { error: saveError } = await supabase.rpc("save_scan_result", {
      p_project_id: project_id, p_result: scanResult, p_status: newStatus,
    });
    if (saveError) throw new ScanError("Your report could not be saved. Please scan again.", 503);

    return new Response(JSON.stringify({ success: true, scan_result: scanResult }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: err instanceof ScanError ? err.status : 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
}));

// --- Helpers ---

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

    const text = await generateText({ apiKey: anthropicKey, prompt, maxTokens: 2048, timeoutMs: 25000 });

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
  const deps = packageJson
    ? { ...(packageJson.dependencies as Record<string, string> ?? {}), ...(packageJson.devDependencies as Record<string, string> ?? {}) }
    : {};

  // Capacitor first: a Capacitor app often has an app.json with a bare `name`,
  // which must not be mistaken for an Expo config.
  if (
    "@capacitor/core" in deps || "@capacitor/cli" in deps ||
    fileList.includes("capacitor.config.ts") || fileList.includes("capacitor.config.json")
  ) {
    return "capacitor";
  }

  // Only treat app.json as an Expo signal when it actually has an `expo` key
  // (or expo is a dependency).
  if (appConfig?.expo || "expo" in deps) {
    return "expo";
  }
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

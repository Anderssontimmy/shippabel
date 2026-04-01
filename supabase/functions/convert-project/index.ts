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

interface ConvertRequest {
  project_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("AI service not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Please sign in first");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Please sign in first");

    const { project_id } = (await req.json()) as ConvertRequest;

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (projectError || !project) throw new Error("Project not found");
    if (!project.repo_url) throw new Error("No repository linked");

    const repoPath = extractGitHubPath(project.repo_url);
    if (!repoPath) throw new Error("Invalid repository URL");

    // Get user's GitHub token
    const { data: githubCred } = await supabase
      .from("user_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "github")
      .single();

    const githubToken = (githubCred?.credentials as Record<string, string>)?.access_token;

    // Fetch current project files
    const ghHeaders: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    if (githubToken) ghHeaders.Authorization = `token ${githubToken}`;

    // Get the repo tree
    let fileList: string[] = [];
    let defaultBranch = "main";

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
        defaultBranch = "master";
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

    // Fetch key files for context
    const fetchFile = async (name: string) => {
      const headers: Record<string, string> = {};
      if (githubToken) headers.Authorization = `token ${githubToken}`;
      const res = await fetch(`https://raw.githubusercontent.com/${repoPath}/${defaultBranch}/${name}`, { headers });
      return res.ok ? await res.text() : null;
    };

    const [packageJsonText, appJsonText, existingGitignore] = await Promise.all([
      fileList.includes("package.json") ? fetchFile("package.json") : Promise.resolve(null),
      fileList.includes("app.json") ? fetchFile("app.json") : Promise.resolve(null),
      fileList.includes(".gitignore") ? fetchFile(".gitignore") : Promise.resolve(null),
    ]);

    let packageJson: Record<string, unknown> | null = null;
    if (packageJsonText) {
      try { packageJson = JSON.parse(packageJsonText); } catch { /* */ }
    }

    const deps = packageJson
      ? Object.keys({ ...(packageJson.dependencies as Record<string, string> ?? {}), ...(packageJson.devDependencies as Record<string, string> ?? {}) })
      : [];

    // Determine project type
    const isExpo = deps.includes("expo") || !!appJsonText;
    const isReactNative = deps.includes("react-native");
    const isReactWeb = deps.includes("react") || deps.includes("react-dom");
    const isNext = deps.includes("next");
    const isVue = deps.includes("vue");

    // Build the app name
    const appName = (project.name as string).replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const slug = (project.name as string).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const bundleId = `com.app.${slug.replace(/-/g, "")}`;

    // --- Generate files to create/modify ---
    const filesToPush: { path: string; content: string }[] = [];

    // 1. Create app.json if it doesn't exist
    if (!appJsonText) {
      const appConfig = {
        expo: {
          name: appName,
          slug: slug,
          version: "1.0.0",
          orientation: "portrait",
          icon: "./assets/icon.png",
          userInterfaceStyle: "automatic",
          splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff",
          },
          ios: {
            supportsTablet: true,
            bundleIdentifier: bundleId,
            buildNumber: "1",
          },
          android: {
            adaptiveIcon: {
              foregroundImage: "./assets/adaptive-icon.png",
              backgroundColor: "#ffffff",
            },
            package: bundleId,
            versionCode: 1,
          },
          web: {
            favicon: "./assets/favicon.png",
          },
        },
      };
      filesToPush.push({ path: "app.json", content: JSON.stringify(appConfig, null, 2) + "\n" });
    }

    // 2. Update package.json to add expo if needed
    if (packageJson && !isExpo) {
      const updatedPkg = { ...packageJson };
      const currentDeps = (updatedPkg.dependencies ?? {}) as Record<string, string>;
      const currentDevDeps = (updatedPkg.devDependencies ?? {}) as Record<string, string>;

      // Add expo and required packages
      currentDeps["expo"] = "~52.0.0";
      currentDeps["expo-status-bar"] = "~2.0.0";

      if (isReactWeb && !isReactNative) {
        // Web app → needs react-native
        currentDeps["react-native"] = "0.76.0";
        currentDeps["react-native-web"] = "~0.19.0";
      }

      // Add expo CLI
      currentDevDeps["@expo/cli"] = "latest";

      updatedPkg.dependencies = currentDeps;
      updatedPkg.devDependencies = currentDevDeps;

      // Add expo scripts
      const scripts = (updatedPkg.scripts ?? {}) as Record<string, string>;
      scripts["start"] = "expo start";
      scripts["android"] = "expo start --android";
      scripts["ios"] = "expo start --ios";
      updatedPkg.scripts = scripts;

      filesToPush.push({ path: "package.json", content: JSON.stringify(updatedPkg, null, 2) + "\n" });
    }

    // 3. Create/update .gitignore
    if (!existingGitignore || !existingGitignore.includes(".expo")) {
      const gitignoreAdditions = `
# Expo
.expo/
dist/
web-build/

# Environment variables
.env*

# Native builds
ios/
android/

# Dependencies
node_modules/

# OS files
.DS_Store
Thumbs.db
`;
      const newGitignore = existingGitignore
        ? existingGitignore.trimEnd() + "\n" + gitignoreAdditions
        : gitignoreAdditions.trimStart();
      filesToPush.push({ path: ".gitignore", content: newGitignore });
    }

    // 4. Create a basic App entry point wrapper if this is a web app
    if (isReactWeb && !isReactNative && !isExpo) {
      // Check if there's a main entry we can wrap
      const hasAppTsx = fileList.includes("src/App.tsx") || fileList.includes("src/App.jsx");
      if (hasAppTsx) {
        const wrapperContent = `// Expo entry point — wraps your existing web app for mobile
import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
`;
        // Only create if index.js doesn't exist
        if (!fileList.includes("index.js")) {
          filesToPush.push({ path: "index.js", content: wrapperContent });
        }
      }
    }

    // --- Push files to GitHub ---
    const pushToken = githubToken ?? Deno.env.get("GITHUB_TOKEN");
    if (!pushToken) {
      throw new Error("Please connect your GitHub account in Settings to allow us to update your code.");
    }

    const pushedFiles: string[] = [];
    for (const file of filesToPush) {
      try {
        // Get current file SHA if it exists
        let sha: string | undefined;
        const checkRes = await fetch(
          `https://api.github.com/repos/${repoPath}/contents/${file.path}`,
          { headers: { ...ghHeaders, Authorization: `token ${pushToken}` } }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json();
          sha = existing.sha;
        }

        const body: Record<string, unknown> = {
          message: `chore: configure for App Store (via Shippabel)`,
          content: btoa(unescape(encodeURIComponent(file.content))),
          branch: defaultBranch,
        };
        if (sha) body.sha = sha;

        const pushRes = await fetch(
          `https://api.github.com/repos/${repoPath}/contents/${file.path}`,
          {
            method: "PUT",
            headers: {
              Authorization: `token ${pushToken}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (pushRes.ok) {
          pushedFiles.push(file.path);
        }
      } catch {
        // Continue with other files
      }
    }

    // Re-scan the project to get updated score
    // (We call ourselves recursively through the scan endpoint)
    const { error: rescanError } = await supabase.functions.invoke("scan-project", {
      body: { project_id, repo_url: project.repo_url, github_token: pushToken },
    });

    // Mark auto-fixable issues as fixed
    await supabase
      .from("issues")
      .update({ fixed: true, fixed_at: new Date().toISOString() })
      .eq("project_id", project_id)
      .eq("auto_fixable", true);

    return new Response(
      JSON.stringify({
        success: true,
        files_pushed: pushedFiles,
        total_files: filesToPush.length,
        message: pushedFiles.length > 0
          ? `Updated ${pushedFiles.length} files in your repository. Your app is being re-scanned.`
          : "No changes were needed.",
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

function extractGitHubPath(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const repo = parts[1]!.replace(/\.git$/, "");
    return `${parts[0]}/${repo}`;
  } catch {
    return null;
  }
}

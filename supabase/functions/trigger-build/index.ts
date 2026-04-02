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

interface BuildRequest {
  project_id: string;
  platform: "ios" | "android";
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Please sign in to continue.");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Please sign in to continue.");

    // Get EAS token from user credentials, fall back to env
    let easToken = Deno.env.get("EAS_ACCESS_TOKEN") ?? "";
    const { data: easCred } = await supabase
      .from("user_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "eas")
      .single();
    if (easCred?.credentials) {
      easToken = (easCred.credentials as Record<string, string>).access_token ?? easToken;
    }
    if (!easToken) throw new Error("Please connect your Expo account in Settings first.");

    const { project_id, platform } = (await req.json()) as BuildRequest;

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) throw new Error("We couldn't find this app. Please go back and try again.");
    if (!project.repo_url) throw new Error("This app doesn't have a GitHub link. Please go back to the scan page and add one.");

    // Extract Expo project slug from app.json
    const repoPath = extractGitHubPath(project.repo_url);
    if (!repoPath) throw new Error("The GitHub link for this app doesn't look right. Please check it in the scan page.");

    // Get GitHub token for private repos
    const { data: ghCred } = await supabase
      .from("user_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "github")
      .single();
    const ghToken = (ghCred?.credentials as Record<string, string> | undefined)?.access_token;

    const appConfig = await fetchAppConfig(repoPath, ghToken);
    if (!appConfig) throw new Error("Your app needs to be converted to a mobile format first. Go back to your scan results and click 'Make it App Store ready'.");

    const expo = (appConfig.expo ?? appConfig) as Record<string, unknown>;
    const slug = (expo.slug ?? expo.name ?? project.name) as string;

    // Step 1: Get EAS account info
    const account = await getEasAccount(easToken);
    if (!account) throw new Error("We couldn't connect to your Expo account. Please check your EAS token in Settings.");

    // Step 2: Find or create the EAS project
    const easProjectId = await findOrCreateEasProject(easToken, account, slug);
    if (!easProjectId.id) throw new Error(easProjectId.error ?? "We couldn't set up your app on Expo. Please try again.");

    // Step 3: Ensure eas.json exists in the repo
    const hasEasJson = await checkFileExists(repoPath, "eas.json", ghToken);
    if (!hasEasJson) {
      // Auto-create eas.json in the repo
      const easJsonContent = JSON.stringify({
        cli: { version: ">= 3.0.0" },
        build: {
          production: {
            android: { buildType: "apk" },
            ios: { simulator: false },
          },
        },
        submit: {
          production: {},
        },
      }, null, 2);

      const pushOk = await pushFileToGitHub(repoPath, "eas.json", easJsonContent, "Add eas.json for EAS Build", ghToken);
      if (!pushOk) throw new Error("We need to add a build config file (eas.json) to your app but couldn't push to GitHub. Please check your GitHub connection in Settings.");
    }

    // Step 4: Create submission record
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .insert({
        project_id,
        platform,
        build_status: "queued",
        review_status: "not_submitted",
      })
      .select()
      .single();

    if (subError || !submission) throw new Error("Something went wrong saving your build. Please try again.");

    // Update project status
    await supabase
      .from("projects")
      .update({ status: "building", updated_at: new Date().toISOString() })
      .eq("id", project_id);

    // Step 4: Trigger EAS Build using the GraphQL API
    const buildResult = await triggerEasBuild(easToken, easProjectId.id!, platform);

    if (!buildResult.success) {
      await supabase.from("submissions").update({ build_status: "failed" }).eq("id", submission.id);
      await supabase.from("projects").update({ status: "issues_found", updated_at: new Date().toISOString() }).eq("id", project_id);
      throw new Error(buildResult.error ?? "The build failed to start. Please check your app settings and try again.");
    }

    // Update submission with build ID
    await supabase
      .from("submissions")
      .update({ eas_build_id: buildResult.buildId, build_status: "in_progress" })
      .eq("id", submission.id);

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submission.id,
        eas_build_id: buildResult.buildId,
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
    console.error("trigger-build error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// --- Helpers ---

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

async function fetchAppConfig(repoPath: string, token?: string): Promise<Record<string, unknown> | null> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `token ${token}`;

  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repoPath}/main/app.json`, { headers });
    if (res.ok) return await res.json();

    const masterRes = await fetch(`https://raw.githubusercontent.com/${repoPath}/master/app.json`, { headers });
    if (masterRes.ok) return await masterRes.json();
  } catch {
    // Non-fatal
  }
  return null;
}

async function getEasAccount(token: string): Promise<{ id: string; username: string } | null> {
  try {
    // Get user info AND their accounts (the account ID is what createApp needs)
    const res = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query { meActor { ... on User { id username accounts { id name } } ... on Robot { id firstName accounts { id name } } } }`,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const actor = data?.data?.meActor;
    if (!actor) return null;
    // Use the first account's ID (personal account), not the actor/user ID
    const accountId = actor.accounts?.[0]?.id ?? actor.id;
    const username = actor.username ?? actor.firstName;
    return { id: accountId, username };
  } catch {
    return null;
  }
}

async function findOrCreateEasProject(token: string, account: { id: string; username: string }, slug: string): Promise<{ id: string | null; error?: string }> {
  const accountName = account.username;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const debugInfo: string[] = [];

  try {
    // 1. Try to find existing project
    const findRes = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `query { app { byFullName(fullName: "@${accountName}/${slug}") { id } } }`,
      }),
    });

    const findText = await findRes.text();
    debugInfo.push(`Find: ${findText.slice(0, 300)}`);

    try {
      const findData = JSON.parse(findText);
      const existingId = findData?.data?.app?.byFullName?.id;
      if (existingId) return { id: existingId };
    } catch {}

    // 2. Create project
    const createRes = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `mutation { app { createApp(appInput: { accountId: "${account.id}", projectName: "${slug}" }) { id } } }`,
      }),
    });

    const createText = await createRes.text();
    debugInfo.push(`Create: ${createText.slice(0, 300)}`);

    try {
      const createData = JSON.parse(createText);
      const newId = createData?.data?.app?.createApp?.id;
      if (newId) return { id: newId };
    } catch {}

    return { id: null, error: `Expo API debug: ${debugInfo.join(" | ")}` };
  } catch (err) {
    return { id: null, error: `Exception: ${err}` };
  }
}

async function checkFileExists(repoPath: string, fileName: string, token?: string): Promise<boolean> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `token ${token}`;
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repoPath}/main/${fileName}`, { headers });
    if (res.ok) return true;
    const res2 = await fetch(`https://raw.githubusercontent.com/${repoPath}/master/${fileName}`, { headers });
    return res2.ok;
  } catch { return false; }
}

async function pushFileToGitHub(repoPath: string, filePath: string, content: string, message: string, token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`https://api.github.com/repos/${repoPath}/contents/${filePath}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: btoa(content),
        branch: "main",
      }),
    });
    if (res.ok) return true;
    // Try master branch
    const res2 = await fetch(`https://api.github.com/repos/${repoPath}/contents/${filePath}`, {
      method: "PUT",
      headers: { Authorization: `token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: btoa(content), branch: "master" }),
    });
    return res2.ok;
  } catch { return false; }
}

async function triggerEasBuild(
  token: string,
  projectId: string,
  platform: "ios" | "android"
): Promise<{ success: boolean; buildId?: string; error?: string }> {
  try {
    const res = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `mutation { build { ${platform === "android" ? "createAndroidBuild" : "createIosBuild"}(appId: "${projectId}") { build { id status platform } } } }`,
      }),
    });

    const text = await res.text();

    try {
      const data = JSON.parse(text);
      const buildKey = platform === "android" ? "createAndroidBuild" : "createIosBuild";
      const buildId = data?.data?.build?.[buildKey]?.build?.id;
      if (buildId) return { success: true, buildId };

      // Check for errors
      const errors = data?.errors;
      if (errors?.[0]?.message) {
        const msg = errors[0].message;
        // Map technical errors to friendly messages
        if (msg.includes("credentials") || msg.includes("signing"))
          return { success: false, error: platform === "ios"
            ? "iOS builds need Apple Developer credentials. Go to expo.dev, open your project, and add your Apple credentials under 'Credentials'."
            : "Android build credentials couldn't be set up automatically. Please try again." };
        if (msg.includes("not found") || msg.includes("does not exist"))
          return { success: false, error: "Your app project wasn't found on Expo. Please try scanning your app again." };
        return { success: false, error: `Build couldn't start: ${msg.slice(0, 150)}` };
      }
    } catch {}

    return { success: false, error: `Unexpected build response: ${text.slice(0, 150)}` };
  } catch (err) {
    return { success: false, error: "We couldn't connect to the build service. Please try again." };
  }
}

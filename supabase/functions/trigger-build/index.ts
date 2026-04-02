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
    const accountName = await getEasAccountName(easToken);
    if (!accountName) throw new Error("We couldn't connect to your Expo account. Please check your EAS token in Settings.");

    // Step 2: Find or create the EAS project
    const easProjectId = await findOrCreateEasProject(easToken, accountName, slug);
    if (!easProjectId) throw new Error("We couldn't set up your app on Expo. Please try again or check your Expo account at expo.dev.");

    // Step 3: Create submission record
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
    const buildResult = await triggerEasBuild(easToken, easProjectId, platform, project.repo_url);

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

async function getEasAccountName(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query { meActor { ... on User { username } ... on Robot { firstName } } }`,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.meActor?.username ?? data?.data?.meActor?.firstName ?? null;
  } catch {
    return null;
  }
}

async function findOrCreateEasProject(token: string, accountName: string, slug: string): Promise<string | null> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    // 1. Try to find existing project via GraphQL
    const findRes = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `query { app { byFullName(fullName: "@${accountName}/${slug}") { id } } }`,
      }),
    });

    if (findRes.ok) {
      const findData = await findRes.json();
      console.log("Find project response:", JSON.stringify(findData));
      const existingId = findData?.data?.app?.byFullName?.id;
      if (existingId) return existingId;
    }

    // 2. Not found — create via GraphQL mutation
    const createRes = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `mutation CreateApp($appInput: CreateAppInput!) {
          app { createApp(appInput: $appInput) { id } }
        }`,
        variables: {
          appInput: {
            accountName,
            projectName: slug,
          },
        },
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      console.log("Create project response:", JSON.stringify(createData));
      const newId = createData?.data?.app?.createApp?.id;
      if (newId) return newId;

      // If GraphQL errors, check if it's because project already exists
      const errors = createData?.errors;
      if (errors?.[0]?.message?.includes("already exists")) {
        // Retry finding it
        const retryRes = await fetch("https://api.expo.dev/graphql", {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `query { app { byFullName(fullName: "@${accountName}/${slug}") { id } } }`,
          }),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          return retryData?.data?.app?.byFullName?.id ?? null;
        }
      }
    }

    console.error("All EAS project creation attempts failed");
    return null;
  } catch (err) {
    console.error("findOrCreateEasProject error:", err);
    return null;
  }
}

async function triggerEasBuild(
  token: string,
  projectId: string,
  platform: "ios" | "android",
  gitUrl: string
): Promise<{ success: boolean; buildId?: string; error?: string }> {
  try {
    // Use REST API for builds
    const res = await fetch("https://api.expo.dev/v2/builds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        projectId,
        platform: platform === "ios" ? "IOS" : "ANDROID",
        profile: "production",
        gitUrl,
        channel: "production",
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("EAS Build API error:", errorText);

      // Parse common errors into friendly messages
      if (errorText.includes("not found")) {
        return { success: false, error: "Your Expo project couldn't be found. Please check your Expo account." };
      }
      if (errorText.includes("credentials")) {
        return { success: false, error: "Build credentials are missing. For iOS, you need an Apple Developer account configured in Expo." };
      }
      return { success: false, error: "The build couldn't start. Please check your app settings and try again." };
    }

    const data = await res.json();
    return { success: true, buildId: data.id ?? data.buildId ?? "" };
  } catch (err) {
    return { success: false, error: "We couldn't connect to the build service. Please try again." };
  }
}

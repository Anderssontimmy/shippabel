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
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

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
    if (!easToken) throw new Error("EAS token not configured. Go to Settings to connect your Expo account.");

    const { project_id, platform } = (await req.json()) as BuildRequest;

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) throw new Error("Project not found");
    if (!project.repo_url) throw new Error("No repository URL linked to this project");

    // Extract Expo project slug from app.json
    const repoPath = extractGitHubPath(project.repo_url);
    if (!repoPath) throw new Error("Invalid GitHub URL");

    const appConfig = await fetchAppConfig(repoPath);
    if (!appConfig) throw new Error("Could not read app.json from repository");

    const expo = (appConfig.expo ?? appConfig) as Record<string, unknown>;
    const slug = (expo.slug ?? expo.name ?? project.name) as string;
    const owner = (expo.owner ?? "") as string;

    // Create submission record
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

    if (subError || !submission) throw new Error("Failed to create submission record");

    // Update project status
    await supabase
      .from("projects")
      .update({ status: "building", updated_at: new Date().toISOString() })
      .eq("id", project_id);

    // Trigger EAS Build
    const buildResponse = await fetch("https://api.expo.dev/v2/builds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${easToken}`,
      },
      body: JSON.stringify({
        projectId: `@${owner}/${slug}`,
        platform: platform === "ios" ? "IOS" : "ANDROID",
        profile: "production",
        gitUrl: project.repo_url,
        channel: "production",
      }),
    });

    if (!buildResponse.ok) {
      const errorText = await buildResponse.text();

      // Update submission with failure
      await supabase
        .from("submissions")
        .update({ build_status: "failed" })
        .eq("id", submission.id);

      await supabase
        .from("projects")
        .update({ status: "issues_found", updated_at: new Date().toISOString() })
        .eq("id", project_id);

      throw new Error(`EAS Build failed: ${errorText}`);
    }

    const buildData = await buildResponse.json();
    const easBuildId = buildData.id ?? buildData.buildId ?? "";

    // Update submission with build ID
    await supabase
      .from("submissions")
      .update({
        eas_build_id: easBuildId,
        build_status: "in_progress",
      })
      .eq("id", submission.id);

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submission.id,
        eas_build_id: easBuildId,
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("trigger-build error:", message);
    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
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

async function fetchAppConfig(repoPath: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${repoPath}/main/app.json`
    );
    if (res.ok) return await res.json();

    const masterRes = await fetch(
      `https://raw.githubusercontent.com/${repoPath}/master/app.json`
    );
    if (masterRes.ok) return await masterRes.json();
  } catch {
    // Non-fatal
  }
  return null;
}

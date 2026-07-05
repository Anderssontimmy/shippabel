import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { projectCallbackToken, timingSafeEqual } from "../_shared/callback.ts";

Deno.serve(async (req) => {
  // Allow from anywhere (GitHub Actions callback)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { project_id, status } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), { status: 400, headers: corsHeaders });
    }

    // Authenticate the callback with the per-project token. Each repo only
    // knows its own project's token, so it can't spoof callbacks for others.
    // (The legacy global secret is also accepted during the transition, but
    // only counts for repos built before the per-project rollout.)
    const masterSecret = Deno.env.get("BUILD_CALLBACK_SECRET") ?? "";
    const providedSecret = req.headers.get("x-callback-secret") ?? "";
    const expectedToken = await projectCallbackToken(masterSecret, project_id);
    const validPerProject = masterSecret !== "" && timingSafeEqual(providedSecret, expectedToken);
    const validLegacy = masterSecret !== "" && timingSafeEqual(providedSecret, masterSecret);
    if (!validPerProject && !validLegacy) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const buildStatus = status === "success" ? "completed" : "failed";
    const projectStatus = status === "success" ? "submitted" : "issues_found";

    // Update only the most recent in-progress submission for this project
    const { data: latest } = await supabase
      .from("submissions")
      .select("id")
      .eq("project_id", project_id)
      .eq("build_status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      await supabase
        .from("submissions")
        .update({ build_status: buildStatus })
        .eq("id", latest.id);
    }

    // Update project status
    await supabase
      .from("projects")
      .update({ status: projectStatus, updated_at: new Date().toISOString() })
      .eq("id", project_id);

    return new Response(JSON.stringify({ success: true, build_status: buildStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

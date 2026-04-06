import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    const buildStatus = status === "success" ? "completed" : "failed";
    const projectStatus = status === "success" ? "submitted" : "issues_found";

    // Update latest submission for this project
    await supabase
      .from("submissions")
      .update({ build_status: buildStatus })
      .eq("project_id", project_id)
      .eq("build_status", "in_progress");

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

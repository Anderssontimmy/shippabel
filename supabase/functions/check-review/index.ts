import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckRequest {
  submission_id: string;
}

interface StatusResult {
  build_status: string;
  review_status: string;
  eas_build_url?: string;
  rejection_reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const { submission_id } = (await req.json()) as CheckRequest;

    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("*, projects(*)")
      .eq("id", submission_id)
      .single();

    if (subError || !submission) throw new Error("Submission not found");

    const project = submission.projects as Record<string, unknown>;
    if (project.user_id !== user.id) throw new Error("Unauthorized");

    const result: StatusResult = {
      build_status: submission.build_status,
      review_status: submission.review_status,
    };

    // Check EAS build status if build is in progress
    if (submission.build_status === "in_progress" && submission.eas_build_id) {
      const easStatus = await checkEasBuildStatus(submission.eas_build_id);

      if (easStatus !== submission.build_status) {
        result.build_status = easStatus;

        await supabase
          .from("submissions")
          .update({ build_status: easStatus })
          .eq("id", submission_id);

        // Update project status when build completes
        if (easStatus === "completed") {
          await supabase
            .from("projects")
            .update({ status: "ready", updated_at: new Date().toISOString() })
            .eq("id", submission.project_id);
        } else if (easStatus === "failed") {
          await supabase
            .from("projects")
            .update({ status: "issues_found", updated_at: new Date().toISOString() })
            .eq("id", submission.project_id);
        }
      }

      result.eas_build_url = `https://expo.dev/builds/${submission.eas_build_id}`;
    }

    // Check store review status if submitted
    if (submission.review_status === "waiting_for_review") {
      // In production, this would poll App Store Connect / Google Play APIs
      // For now, we return the current status from our DB
      // A cron job or webhook would update this in production
    }

    // If rejected, try to parse the reason with AI
    if (submission.review_status === "rejected" && submission.rejection_reason) {
      result.rejection_reason = submission.rejection_reason;
    }

    return new Response(
      JSON.stringify({ success: true, status: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkEasBuildStatus(buildId: string): Promise<string> {
  const easToken = Deno.env.get("EAS_ACCESS_TOKEN");
  if (!easToken) return "in_progress";

  try {
    const res = await fetch(`https://api.expo.dev/v2/builds/${buildId}`, {
      headers: { Authorization: `Bearer ${easToken}` },
    });

    if (!res.ok) return "in_progress";

    const data = await res.json();
    const status = data.status ?? data.buildStatus ?? "";

    switch (status) {
      case "finished":
      case "FINISHED":
        return "completed";
      case "errored":
      case "ERRORED":
      case "canceled":
      case "CANCELED":
        return "failed";
      default:
        return "in_progress";
    }
  } catch {
    return "in_progress";
  }
}

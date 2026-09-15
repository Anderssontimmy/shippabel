import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { projectCallbackToken, timingSafeEqual } from "../_shared/callback.ts";
import { instrument } from "../_shared/monitoring.ts";

Deno.serve(instrument("build-complete", async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const input = await req.json().catch(() => null);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!input || !uuid.test(input.project_id ?? "") || !uuid.test(input.submission_id ?? "") ||
      !["success", "failure", "cancelled"].includes(input.status) || !/^\d+$/.test(input.run_id ?? "")) {
    return Response.json({ error: "Invalid build callback" }, { status: 400 });
  }
  const secret = Deno.env.get("BUILD_CALLBACK_SECRET") ?? "";
  if (!secret) return Response.json({ error: "Callback not configured" }, { status: 503 });
  const expected = await projectCallbackToken(secret, input.project_id);
  if (!timingSafeEqual(req.headers.get("x-callback-secret") ?? "", expected)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data, error } = await supabase.rpc("complete_build", {
    p_project_id: input.project_id, p_submission_id: input.submission_id, p_status: input.status, p_run_id: String(input.run_id),
  });
  if (error) return Response.json({ error: "Could not save build status" }, { status: 500 });
  return Response.json({ success: true, duplicate: data === "duplicate" });
}));

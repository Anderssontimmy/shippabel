import { instrument } from "../_shared/monitoring.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isAdmin } from "../_shared/analytics.ts";

const ALLOWED_ORIGINS = ["https://shippabel.com", "https://www.shippabel.com", "http://localhost:5173"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// The numbers for the owner's /admin page. The database function returns everything in one call; this
// function's only job is to make sure the caller is the owner (a user whose app_metadata, which only the
// server can write, says is_admin). Anyone else gets the same answer as for a page that does not exist.
Deno.serve(instrument("admin-stats", async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Not found" }, 404);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !isAdmin(user)) return json({ error: "Not found" }, 404);

  const { days } = (await req.json().catch(() => ({}))) as { days?: unknown };
  const { data, error } = await supabase.rpc("admin_overview", { p_days: Number.isInteger(days) ? days : 30 });
  if (error) throw new Error("admin_overview failed");
  return json(data);
}));

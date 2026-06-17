import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encryptCreds } from "../_shared/crypto.ts";

const ALLOWED_ORIGINS = ["https://shippabel.com", "https://www.shippabel.com", "http://localhost:5173"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface SaveRequest {
  provider: string;
  credentials: Record<string, string>;
  label?: string;
}

const ALLOWED_PROVIDERS = ["apple", "google", "eas", "github"];

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
    if (!authHeader) throw new Error("Sign in to save credentials");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Sign in to save credentials");

    const { provider, credentials, label } = (await req.json()) as SaveRequest;
    if (!provider || !ALLOWED_PROVIDERS.includes(provider)) throw new Error("Unknown provider");
    if (!credentials || typeof credentials !== "object") throw new Error("Missing credentials");

    const encKey = Deno.env.get("CREDENTIALS_ENC_KEY");
    if (!encKey) throw new Error("Credential encryption is not configured");

    const encrypted = await encryptCreds(credentials, encKey);

    const { error: upsertError } = await supabase
      .from("user_credentials")
      .upsert(
        {
          user_id: user.id,
          provider,
          credentials: encrypted,
          label: label ?? provider,
          is_valid: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );
    if (upsertError) throw new Error(upsertError.message);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

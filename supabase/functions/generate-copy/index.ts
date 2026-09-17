import { loadProjectSource, appContext } from "../_shared/projectContext.ts";
import { generateText } from "../_shared/anthropic.ts";
import { instrument } from "../_shared/monitoring.ts";
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

interface GenerateCopyRequest {
  project_id: string;
  platform: "ios" | "android";
  app_context?: string;
}

interface StoreCopyVariant {
  app_name: string;
  subtitle: string;
  short_description: string;
  full_description: string;
  keywords: string;
}

Deno.serve(instrument("generate-copy", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth check — require signed-in user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sign in to use this feature");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Sign in to use this feature");

    const plan = (user.app_metadata as Record<string, unknown> | undefined)?.plan;
    if (plan !== "ship" && plan !== "unlimited") {
      return new Response(
        JSON.stringify({ error: "This feature requires the Ship plan." }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Per-user hourly rate limit (defense-in-depth against cost/abuse)
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((recentCount ?? 0) >= 60) {
      return new Response(
        JSON.stringify({ error: "You've hit the hourly limit. Please try again in a bit." }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    await supabase.from("usage_events").insert({ user_id: user.id, action: "generate-copy" });

    const { project_id, platform, app_context } = (await req.json()) as GenerateCopyRequest;

    // Fetch project + scan data — must belong to the requesting user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return Response.json({ error: "Project not found" }, { status: 404, headers: getCorsHeaders(req) });
    }

    const scanResult = project.scan_result;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("AI service not configured");
    const source = await loadProjectSource(supabase, user.id, project);
    const codeContext = appContext(source);

    const prompt = buildCopyPrompt(platform, project.name, codeContext, app_context ?? "", scanResult);

    const content = await generateText({ apiKey: anthropicKey, prompt, maxTokens: 6144 });

    // Parse the 3 variants from Claude's response
    const variants = parseCopyVariants(content);
    if (variants.length === 0) {
      throw new Error("Couldn't parse the AI response. Please try again.");
    }

    // Store the first variant as the default listing
    if (variants.length > 0) {
      const listing = variants[0]!;
      const { error: saveError } = await supabase.from("store_listings").upsert(
        {
          project_id,
          platform,
          app_name: listing.app_name,
          subtitle: listing.subtitle,
          short_description: listing.short_description,
          full_description: listing.full_description,
          keywords: listing.keywords,
        },
        { onConflict: "project_id,platform" }
      );
      if (saveError) throw new Error("Your store listing could not be saved. Please try again.");
    }

    return new Response(
      JSON.stringify({ success: true, variants }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
}));

function buildCopyPrompt(
  platform: string,
  appName: string,
  codeContext: string,
  userContext: string,
  scanResult: Record<string, unknown> | null
): string {
  const platformGuide =
    platform === "ios"
      ? `For iOS App Store:
- App name: max 30 characters
- Subtitle: max 30 characters
- Keywords: comma-separated, max 100 characters total
- Full description: max 4000 characters, use line breaks for readability`
      : `For Google Play Store:
- App name: max 30 characters
- Short description: max 80 characters
- Full description: max 4000 characters, support basic HTML formatting`;

  return `You are an expert App Store Optimization (ASO) copywriter. Generate store listing copy for a mobile app.

App name from config: ${appName}
Platform: ${platform}

${platformGuide}

${codeContext ? `App code context (package.json, README, etc.):\n${codeContext}\n` : ""}
${userContext ? `Additional context from the developer:\n${userContext}\n` : ""}
${scanResult ? `Scan result summary: Score ${(scanResult as { score?: number }).score}/100` : ""}

Generate exactly 3 variants of the store listing copy. Each variant should have a different tone:
1. Professional & trustworthy
2. Friendly & approachable
3. Bold & exciting

For each variant, output in this exact format:

---VARIANT---
APP_NAME: [name]
SUBTITLE: [subtitle for iOS]
SHORT_DESC: [short description for Android, max 80 chars]
FULL_DESC: [full description with line breaks]
KEYWORDS: [comma-separated keywords for iOS]
---END---

Make the copy compelling, keyword-rich, and focused on user benefits. Avoid generic phrases. Be specific about what the app does.`;
}

function parseCopyVariants(text: string): StoreCopyVariant[] {
  const variants: StoreCopyVariant[] = [];
  const blocks = text.split("---VARIANT---").slice(1);

  for (const block of blocks) {
    const content = block.split("---END---")[0] ?? "";

    const getName = (key: string) => {
      const match = content.match(new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`));
      return match?.[1]?.trim() ?? "";
    };

    const getFullDesc = () => {
      const match = content.match(/FULL_DESC:\s*([\s\S]*?)(?=\nKEYWORDS:|---END---|$)/);
      return match?.[1]?.trim() ?? "";
    };

    variants.push({
      app_name: getName("APP_NAME"),
      subtitle: getName("SUBTITLE"),
      short_description: getName("SHORT_DESC"),
      full_description: getFullDesc(),
      keywords: getName("KEYWORDS"),
    });
  }

  return variants;
}

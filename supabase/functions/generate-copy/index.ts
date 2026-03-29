import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { project_id, platform, app_context } = (await req.json()) as GenerateCopyRequest;

    // Fetch project + scan data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    const scanResult = project.scan_result;
    const repoUrl = project.repo_url;

    // Build context for Claude
    let codeContext = "";
    if (repoUrl) {
      codeContext = await fetchAppContext(repoUrl);
    }

    const prompt = buildCopyPrompt(platform, project.name, codeContext, app_context ?? "", scanResult);

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${errText}`);
    }

    const result = await response.json();
    const content = result.content?.[0]?.text ?? "";

    // Parse the 3 variants from Claude's response
    const variants = parseCopyVariants(content);

    // Store the first variant as the default listing
    if (variants.length > 0) {
      const listing = variants[0]!;
      await supabase.from("store_listings").upsert(
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
    }

    return new Response(
      JSON.stringify({ success: true, variants }),
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

async function fetchAppContext(repoUrl: string): Promise<string> {
  try {
    const urlObj = new URL(repoUrl);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return "";
    const repoPath = `${parts[0]}/${parts[1]}`;

    const contexts: string[] = [];

    // Fetch package.json for dependencies/description
    for (const file of ["package.json", "README.md", "app.json"]) {
      const res = await fetch(
        `https://raw.githubusercontent.com/${repoPath}/main/${file}`
      );
      if (res.ok) {
        const text = await res.text();
        contexts.push(`--- ${file} ---\n${text.slice(0, 2000)}`);
      }
    }

    return contexts.join("\n\n");
  } catch {
    return "";
  }
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

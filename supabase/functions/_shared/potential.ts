// What the scan tells a person about their own app. An earlier version asked the model for "market size" and
// "what similar apps earn with specific numbers", and it obliged ("$30B by 2028"). Nobody can check such a
// number, and a wrong one costs the trust the whole product depends on. This version asks for ideas and
// refuses to keep anything that looks like a figure.

export interface PotentialAnalysis {
  app_description: string;
  monetization_ideas: string[];
  strengths: string[];
  growth_suggestions: string[];
}

export interface PotentialContext {
  appName: string;
  appDescription: string;
  dependencies: string;
  directories: string;
  extensions: string;
  fileCount: number;
  readme: string | null;
}

export function buildPotentialPrompt(ctx: PotentialContext): string {
  return `You are a product advisor for people who built an app with AI tools. Based on the project data below, describe the app and give practical, honest suggestions. Respond with raw JSON only, no markdown, no code fences.

Rules:
- Never write numbers, prices, percentages, market sizes, download counts, revenue or earnings. Never name other companies or apps.
- Only say what the project data supports. If the data is thin, keep it short and general instead of inventing detail.
- Write plain English for someone who is not a developer.

App name: ${ctx.appName}
App description: ${ctx.appDescription}
Key dependencies: ${ctx.dependencies}
File structure: directories=${ctx.directories}; extensions=${ctx.extensions}
File count: ${ctx.fileCount}
${ctx.readme ? `README excerpt: ${ctx.readme.slice(0, 800)}` : ""}

Respond in this exact JSON format:
{"app_description":"One sentence on what the app does","monetization_ideas":["Up to 3 realistic ways this kind of app could earn money, each one short sentence saying how people would pay and why"],"strengths":["Up to 3 things the project already has going for it, based on the data"],"growth_suggestions":["Up to 3 concrete next steps that would make the app better for the people who use it"]}`;
}

const FIGURE = /[\d$€£%]/;
const MAX_ITEMS = 3;
const MAX_LENGTH = 160;

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const text = entry.replace(/\s+/g, " ").trim();
    if (!text || text.length > MAX_LENGTH || FIGURE.test(text)) continue;
    items.push(text);
    if (items.length === MAX_ITEMS) break;
  }
  return items;
}

export function parsePotentialAnalysis(raw: string): PotentialAnalysis | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```json?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const data = parsed as Record<string, unknown>;
  const description = typeof data.app_description === "string" ? data.app_description.replace(/\s+/g, " ").trim().slice(0, 300) : "";
  if (!description) return null;
  return {
    app_description: description,
    monetization_ideas: cleanList(data.monetization_ideas),
    strengths: cleanList(data.strengths),
    growth_suggestions: cleanList(data.growth_suggestions),
  };
}

// What the scan tells a person about their own app. An earlier version asked the model for "market size" and
// "what similar apps earn with specific numbers", and it obliged ("$30B by 2028"). Nobody can check such a
// number, and a wrong one costs the trust the whole product depends on. This version asks for ideas and
// refuses to keep anything that looks like a figure. Two things are allowed to carry a number, both small and
// bounded: the store page draft (a title and a short line that fit Google Play) and one price with how it is
// paid. How many people will pay is never asked for; the page multiplies the price by fixed example counts.

export interface StorePreview {
  title: string;
  short_description: string;
}

export interface EarningExample {
  billing: "monthly" | "once";
  price_usd: number;
}

export interface PotentialAnalysis {
  app_description: string;
  monetization_ideas: string[];
  strengths: string[];
  growth_suggestions: string[];
  store_preview?: StorePreview;
  earning_example?: EarningExample;
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
- Never write numbers, prices, percentages, market sizes, download counts, revenue or earnings in any text. The only number you may write is price_usd. Never name other companies or apps.
- Store text says what the app does in plain words. No "best", "top" or "number one", no claims about ratings, awards or users, no emoji, no price words.
- Only say what the project data supports. If the data is thin, keep it short and general instead of inventing detail.
- Write plain English for someone who is not a developer.

App name: ${ctx.appName}
App description: ${ctx.appDescription}
Key dependencies: ${ctx.dependencies}
File structure: directories=${ctx.directories}; extensions=${ctx.extensions}
File count: ${ctx.fileCount}
${ctx.readme ? `README excerpt: ${ctx.readme.slice(0, 800)}` : ""}

Respond in this exact JSON format:
{"app_description":"One sentence on what the app does","monetization_ideas":["Up to 3 realistic ways this kind of app could earn money, each one short sentence saying how people would pay and why"],"strengths":["Up to 3 things the project already has going for it, based on the data"],"growth_suggestions":["Up to 3 concrete next steps that would make the app better for the people who use it"],"store_preview":{"title":"The app's name as it would appear on Google Play, max 30 characters","short_description":"What the app does in one plain sentence, max 80 characters"},"earning_example":{"billing":"monthly or once, whichever way people would most likely pay for this kind of app","price_usd":"one number between 1 and 30, the price one person would reasonably pay"}}

For earning_example, do not estimate how many people will pay or how much the app will earn. If this kind of app is not something people pay for, write "earning_example":null.`;
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

// Store text must fit Google Play and make no claim the page cannot back up: figures, superlatives, awards, emoji.
const CLAIM = /[$€£%#]|\d{3,}|\b(best|top|number one|award|awarded|winning|million|billion|guaranteed)\b|\p{Extended_Pictographic}/iu;
const MAX_TITLE = 30;
const MAX_SHORT_DESCRIPTION = 80;
const MIN_PRICE = 1;
const MAX_PRICE = 30;

function cleanStoreText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text && text.length <= max && !CLAIM.test(text) ? text : null;
}

function cleanStorePreview(value: unknown): StorePreview | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  const title = cleanStoreText(data.title, MAX_TITLE);
  const shortDescription = cleanStoreText(data.short_description, MAX_SHORT_DESCRIPTION);
  return title && shortDescription ? { title, short_description: shortDescription } : undefined;
}

function cleanEarningExample(value: unknown): EarningExample | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  if (data.billing !== "monthly" && data.billing !== "once") return undefined;
  if (typeof data.price_usd !== "number" || !Number.isFinite(data.price_usd)) return undefined;
  const price = Math.round(data.price_usd * 100) / 100;
  return price >= MIN_PRICE && price <= MAX_PRICE ? { billing: data.billing, price_usd: price } : undefined;
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
  const storePreview = cleanStorePreview(data.store_preview);
  const earningExample = cleanEarningExample(data.earning_example);
  return {
    app_description: description,
    monetization_ideas: cleanList(data.monetization_ideas),
    strengths: cleanList(data.strengths),
    growth_suggestions: cleanList(data.growth_suggestions),
    ...(storePreview && { store_preview: storePreview }),
    ...(earningExample && { earning_example: earningExample }),
  };
}

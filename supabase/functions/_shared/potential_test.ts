import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { buildPotentialPrompt, parsePotentialAnalysis } from "./potential.ts";

const ctx = {
  appName: "Habit Hero",
  appDescription: "Track daily habits",
  dependencies: "react, supabase",
  directories: "src, public",
  extensions: ".ts, .tsx",
  fileCount: 42,
  readme: "A habit tracker with streaks.",
};

Deno.test("the prompt asks for ideas, forbids figures and company names, and carries the project data", () => {
  const prompt = buildPotentialPrompt(ctx);
  assertStringIncludes(prompt, "Never write numbers, prices, percentages, market sizes");
  assertStringIncludes(prompt, "Never name other companies or apps");
  assertStringIncludes(prompt, "monetization_ideas");
  assertStringIncludes(prompt, "Habit Hero");
  assertStringIncludes(prompt, "A habit tracker with streaks.");
  // the words that used to make the model invent numbers must not come back
  for (const old of ["market_size", "revenue_potential", "comparable_apps", "specific numbers", "excitement_hook"]) {
    assertEquals(prompt.includes(old), false, old);
  }
});

Deno.test("the prompt leaves out an empty README line", () => {
  assertEquals(buildPotentialPrompt({ ...ctx, readme: null }).includes("README excerpt"), false);
});

Deno.test("a good answer is kept as written", () => {
  const result = parsePotentialAnalysis(JSON.stringify({
    app_description: "A habit tracker with daily streaks.",
    monetization_ideas: ["A free core with a paid plan for extra statistics, for people who want to look back over time."],
    strengths: ["Simple onboarding"],
    growth_suggestions: ["Add reminders so people come back"],
  }));
  assertEquals(result, {
    app_description: "A habit tracker with daily streaks.",
    monetization_ideas: ["A free core with a paid plan for extra statistics, for people who want to look back over time."],
    strengths: ["Simple onboarding"],
    growth_suggestions: ["Add reminders so people come back"],
  });
});

Deno.test("anything that looks like a figure is thrown away, wherever the model put it", () => {
  const result = parsePotentialAnalysis(JSON.stringify({
    app_description: "A fitness app.",
    monetization_ideas: ["Charge $9.99 a month", "Sell premium plans", "Earn about 40% from ads", "Offer a one-time purchase"],
    strengths: ["Retention up by 40%", "Works offline"],
    growth_suggestions: ["Reach 1M downloads", "Add Apple Health sync", "Worth €5 billion"],
  }));
  assertEquals(result?.monetization_ideas, ["Sell premium plans", "Offer a one-time purchase"]);
  assertEquals(result?.strengths, ["Works offline"]);
  assertEquals(result?.growth_suggestions, ["Add Apple Health sync"]);
});

Deno.test("at most three of each, overlong and non-text items are dropped", () => {
  const result = parsePotentialAnalysis(JSON.stringify({
    app_description: "An app.",
    monetization_ideas: ["a", "b", "c", "d", "e"],
    strengths: [42, null, "ok", "x".repeat(161), { text: "no" }],
    growth_suggestions: "not a list",
  }));
  assertEquals(result?.monetization_ideas, ["a", "b", "c"]);
  assertEquals(result?.strengths, ["ok"]);
  assertEquals(result?.growth_suggestions, []);
});

Deno.test("markdown fences are stripped, garbage and an answer without a description give nothing", () => {
  assertEquals(parsePotentialAnalysis("```json\n{\"app_description\":\"An app.\"}\n```")?.app_description, "An app.");
  assertEquals(parsePotentialAnalysis("I cannot do that"), null);
  assertEquals(parsePotentialAnalysis("[]"), null);
  assertEquals(parsePotentialAnalysis("null"), null);
  assertEquals(parsePotentialAnalysis(JSON.stringify({ monetization_ideas: ["x"] })), null);
  assertEquals(parsePotentialAnalysis(JSON.stringify({ app_description: "   " })), null);
});

const base = { app_description: "A habit tracker." };

Deno.test("the prompt asks for a store page draft and a price, and says where a number is allowed", () => {
  const prompt = buildPotentialPrompt(ctx);
  assertStringIncludes(prompt, "store_preview");
  assertStringIncludes(prompt, "max 30 characters");
  assertStringIncludes(prompt, "max 80 characters");
  assertStringIncludes(prompt, "earning_example");
  assertStringIncludes(prompt, "price_usd");
  // the text lists still carry no figures; price_usd is the only number the model may write
  assertStringIncludes(prompt, "Never write numbers, prices, percentages, market sizes");
  assertStringIncludes(prompt, "The only number you may write is price_usd");
  // paying customers are never guessed by the model
  assertEquals(prompt.includes("buyers"), false);
  assertEquals(prompt.includes("customers"), false);
});

Deno.test("a store page draft is kept when it fits Google Play's limits", () => {
  const result = parsePotentialAnalysis(JSON.stringify({
    ...base,
    store_preview: { title: "  Habit   Hero ", short_description: "Build habits that stick with daily streaks." },
  }));
  assertEquals(result?.store_preview, { title: "Habit Hero", short_description: "Build habits that stick with daily streaks." });
});

Deno.test("a store page draft that breaks a limit or makes a claim is dropped whole", () => {
  const short = "Build habits that stick.";
  const bad: unknown[] = [
    { title: "x".repeat(31), short_description: short },
    { title: "Habit Hero", short_description: "x".repeat(81) },
    { title: "", short_description: short },
    { title: "Habit Hero", short_description: "   " },
    { title: "Habit Hero", short_description: 42 },
    { title: "The Best Habit App", short_description: short },
    { title: "Habit Hero", short_description: "Over 100000 people build habits here" },
    { title: "Habit Hero", short_description: "Save 50% on your habits" },
    { title: "Habit Hero", short_description: "The #1 habit tracker" },
    { title: "Habit Hero 🔥", short_description: short },
    "just text",
    null,
  ];
  for (const store_preview of bad) {
    assertEquals(parsePotentialAnalysis(JSON.stringify({ ...base, store_preview }))?.store_preview, undefined, JSON.stringify(store_preview));
  }
  // a small number in the copy is fine, a game called 2048 is not the worry
  assertEquals(parsePotentialAnalysis(JSON.stringify({ ...base, store_preview: { title: "Habit Hero", short_description: "Build a 7 day streak." } }))?.store_preview?.short_description, "Build a 7 day streak.");
});

Deno.test("a price is kept with its billing, rounded to cents", () => {
  assertEquals(parsePotentialAnalysis(JSON.stringify({ ...base, earning_example: { billing: "monthly", price_usd: 3.999 } }))?.earning_example, { billing: "monthly", price_usd: 4 });
  assertEquals(parsePotentialAnalysis(JSON.stringify({ ...base, earning_example: { billing: "once", price_usd: 2.99 } }))?.earning_example, { billing: "once", price_usd: 2.99 });
});

Deno.test("a price that is not believable, or has no valid billing, gives no example", () => {
  const bad: unknown[] = [
    { billing: "monthly", price_usd: 0 },
    { billing: "monthly", price_usd: 0.5 },
    { billing: "monthly", price_usd: 30.01 },
    { billing: "monthly", price_usd: 9999 },
    { billing: "monthly", price_usd: -5 },
    { billing: "monthly", price_usd: "4" },
    { billing: "monthly", price_usd: null },
    { billing: "weekly", price_usd: 4 },
    { price_usd: 4 },
    "4 dollars",
    null,
  ];
  for (const earning_example of bad) {
    assertEquals(parsePotentialAnalysis(JSON.stringify({ ...base, earning_example }))?.earning_example, undefined, JSON.stringify(earning_example));
  }
});

Deno.test("the model's own earnings or customer counts are never passed on", () => {
  const result = parsePotentialAnalysis(JSON.stringify({
    ...base,
    earning_example: { billing: "monthly", price_usd: 4, paying_customers: 500, monthly_revenue: 2000 },
  })) as unknown as { earning_example: Record<string, unknown> };
  assertEquals(Object.keys(result.earning_example).sort(), ["billing", "price_usd"]);
});

Deno.test("an answer without the new parts has no keys for them, so older readers see what they always saw", () => {
  const result = parsePotentialAnalysis(JSON.stringify(base)) as unknown as Record<string, unknown>;
  assertEquals("store_preview" in result, false);
  assertEquals("earning_example" in result, false);
});

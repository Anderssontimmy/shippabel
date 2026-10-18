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

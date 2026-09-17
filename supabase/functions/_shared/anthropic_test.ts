import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { generateText } from "./anthropic.ts";
const options = { apiKey: "synthetic-key", prompt: "Write a test listing", maxTokens: 1024, model: "test-model" };
Deno.test("AI reads text blocks after thinking and sends explicit bounded model options", async () => {
  const text = await generateText(options, (_url, init) => {
    const body = JSON.parse(init!.body as string);
    assertEquals(body.model, "test-model"); assertEquals(body.thinking, { type: "disabled" }); assertEquals(body.max_tokens, 1024);
    assertEquals(init!.signal instanceof AbortSignal, true);
    return Promise.resolve(Response.json({ content: [{ type: "thinking", thinking: "hidden" }, { type: "text", text: "First" }, { type: "text", text: "Second" }], stop_reason: "end_turn" }));
  });
  assertEquals(text, "First\nSecond");
});
Deno.test("AI refuses incomplete, refused and empty successful responses", async () => {
  for (const result of [{ stop_reason: "max_tokens", content: [{ type: "text", text: "Incomplete" }] }, { stop_reason: "refusal" }, { content: [{ type: "thinking" }] }]) {
    await assertRejects(() => generateText(options, () => Promise.resolve(Response.json(result))));
  }
});
Deno.test("Provider error does not expose its response or credentials", async () => {
  const error = await assertRejects(() => generateText(options, () => Promise.resolve(new Response("private-provider-details", { status: 404 }))), Error, "temporarily unavailable");
  assertEquals(error.message.includes("private-provider-details"), false);
});

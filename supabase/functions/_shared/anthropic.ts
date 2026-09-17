interface TextRequest {
  apiKey: string;
  prompt: string;
  maxTokens: number;
  timeoutMs?: number;
  model?: string;
}

// Keep the provider choice in one place; operations can override it without a
// code deployment when a model is retired. Never log source text or API keys.
export async function generateText(options: TextRequest, request: typeof fetch = fetch): Promise<string> {
  const model = options.model ?? Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
  const response = await request("https://api.anthropic.com/v1/messages", {
    method: "POST", signal: AbortSignal.timeout(options.timeoutMs ?? 55000),
    headers: { "Content-Type": "application/json", "x-api-key": options.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: options.maxTokens, thinking: { type: "disabled" }, messages: [{ role: "user", content: options.prompt }] }),
  });
  if (!response.ok) {
    console.error(JSON.stringify({ event: "ai_provider_failure", provider: "anthropic", model, status: response.status, request_id: response.headers.get("request-id") }));
    throw new Error("Our AI writer is temporarily unavailable. Please try again in a little while.");
  }
  const result = await response.json();
  if (result.stop_reason === "max_tokens") throw new Error("The AI response was incomplete. Please try again with a shorter app description.");
  if (result.stop_reason === "refusal") throw new Error("The AI could not complete this request. Please review your app description and try again.");
  const text = (Array.isArray(result.content) ? result.content : [])
    .filter((block: { type?: string; text?: unknown }) => block.type === "text" && typeof block.text === "string")
    .map((block: { text: string }) => block.text).join("\n").trim();
  if (!text) throw new Error("The AI returned an empty response. Please try again.");
  return text;
}

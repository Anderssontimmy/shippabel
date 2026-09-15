type Handler = (request: Request) => Response | Promise<Response>;

// Structured runtime logs work without a vendor account. Sentry is optional.
// Never record request bodies, credentials, source code or response error text.
export function instrument(name: string, handler: Handler): Handler {
  return async (request) => {
    const requestId = crypto.randomUUID();
    const started = performance.now();
    let response: Response;
    try { response = await handler(request); }
    catch { response = Response.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
    const durationMs = Math.round(performance.now() - started);
    console.log(JSON.stringify({ event: "edge_request", function: name, request_id: requestId, status: response.status, duration_ms: durationMs }));
    if (response.status >= 500) {
      const task = reportFailure(name, requestId, response.status, durationMs);
      const runtime = (globalThis as unknown as { EdgeRuntime?: { waitUntil(task: Promise<void>): void } }).EdgeRuntime;
      if (runtime) runtime.waitUntil(task);
      else await task;
    }
    response.headers.set("x-request-id", requestId);
    return response;
  };
}

async function reportFailure(name: string, requestId: string, status: number, durationMs: number) {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.split("/").pop();
    const eventId = requestId.replaceAll("-", "");
    const event = { event_id: eventId, timestamp: Date.now() / 1000, platform: "javascript", level: "error",
      message: `${name} returned HTTP ${status}`, environment: Deno.env.get("SENTRY_ENVIRONMENT") ?? "production",
      tags: { function: name, status: String(status) }, extra: { request_id: requestId, duration_ms: durationMs } };
    const envelope = [JSON.stringify({ event_id: eventId, dsn }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
    await fetch(`${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/?sentry_key=${parsed.username}&sentry_version=7`, {
      method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, body: envelope, signal: AbortSignal.timeout(3000),
    });
  } catch { /* Monitoring must not interrupt the product flow. */ }
}

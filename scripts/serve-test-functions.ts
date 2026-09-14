// Runs the real handlers with local Supabase for integration testing. This
// avoids Docker's CA store when a corporate proxy requires system certificates.
if (!Deno.env.get("SUPABASE_URL")?.startsWith("http://127.0.0.1:")) throw new Error("Test server requires local Supabase.");
type Handler = (request: Request) => Response | Promise<Response>;
const serve = Deno.serve;
const handlers = new Map<string, Handler>();
for (const name of ["scan-project","save-credential","create-checkout","stripe-webhook","fix-issues","generate-copy","generate-privacy","convert-project","trigger-build","build-complete","submit-store","check-review"]) {
  Object.defineProperty(Deno, "serve", { value: (handler: Handler) => handlers.set(name, handler), configurable: true });
  await import(`../supabase/functions/${name}/index.ts`);
}
Object.defineProperty(Deno, "serve", { value: serve, configurable: true });
serve({ hostname: "127.0.0.1", port: 55325 }, (request) => {
  const name = new URL(request.url).pathname.split("/").pop() ?? "";
  return handlers.get(name)?.(request) ?? Response.json({ error: "Not found" }, { status: 404 });
});

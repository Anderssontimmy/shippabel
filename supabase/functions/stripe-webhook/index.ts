import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyStripeSignature } from "../_shared/stripeSignature.ts";
import { instrument } from "../_shared/monitoring.ts";

Deno.serve(instrument("stripe-webhook", async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  if (!stripeKey || !secret) return Response.json({ error: "Stripe not configured" }, { status: 503 });
  const body = await req.text();
  if (!await verifyStripeSignature(body, req.headers.get("stripe-signature") ?? "", secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  let event;
  try { event = JSON.parse(body); } catch { return Response.json({ error: "Invalid event" }, { status: 400 }); }
  if (typeof event.id !== "string" || !event.id.startsWith("evt_") || typeof event.type !== "string" || !event.data?.object ||
      typeof event.livemode !== "boolean" || event.livemode !== stripeKey.startsWith("sk_live_")) {
    return Response.json({ error: "Invalid event or payment mode" }, { status: 400 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  // Deduplication and the entitlement update commit in the same transaction.
  const { data, error } = await supabase.rpc("apply_stripe_event", { p_event: event });
  if (error) return Response.json({ error: "Payment update could not be saved. Please retry." }, { status: 500 });
  return Response.json({ received: true, duplicate: data === "duplicate" });
}));

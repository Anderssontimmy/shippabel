import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://shippabel.com", "https://www.shippabel.com", "http://localhost:5173"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
  "Access-Control-Allow-Origin": allowed,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface CheckoutRequest {
  price_id: string;
  plan: string;
  success_url: string;
  cancel_url: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { price_id, plan, success_url, cancel_url } = (await req.json()) as CheckoutRequest;

    if (!price_id) throw new Error("price_id is required");

    // Check if user already has a Stripe customer ID (stored in user metadata)
    let customerId = user.user_metadata?.stripe_customer_id as string | undefined;

    // Create Stripe customer if needed
    if (!customerId) {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(stripeKey + ":")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email ?? "",
          "metadata[supabase_user_id]": user.id,
        }),
      });

      if (!customerRes.ok) throw new Error("Failed to create Stripe customer");
      const customer = await customerRes.json();
      customerId = customer.id;

      // Store customer ID in user metadata
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { stripe_customer_id: customerId },
      });
    }

    // All plans are one-time payments
    const params = new URLSearchParams({
      customer: customerId!,
      "line_items[0][price]": price_id,
      "line_items[0][quantity]": "1",
      mode: "payment",
      success_url,
      cancel_url,
      "metadata[plan]": plan,
      "metadata[supabase_user_id]": user.id,
    });

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(stripeKey + ":")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!sessionRes.ok) {
      const errBody = await sessionRes.text();
      throw new Error(`Stripe error: ${errBody}`);
    }

    const session = await sessionRes.json();

    return new Response(
      JSON.stringify({ session_id: session.id, url: session.url }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

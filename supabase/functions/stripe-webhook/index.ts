import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Verify webhook signature
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
  }

  const body = await req.text();

  // Parse Stripe signature header
  const elements = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = elements["t"];
  const sig = elements["v1"];
  if (!timestamp || !sig) {
    return new Response(JSON.stringify({ error: "Invalid signature format" }), { status: 400 });
  }

  // Verify signature using HMAC-SHA256
  const signedPayload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedSig !== sig) {
    return new Response(JSON.stringify({ error: "Signature verification failed" }), { status: 400 });
  }

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return new Response(JSON.stringify({ error: "Timestamp too old" }), { status: 400 });
  }

  const event = JSON.parse(body);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(supabase, event.data.object);
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(supabase, event.data.object);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;
      }
      case "invoice.payment_failed": {
        await handlePaymentFailed(supabase, event.data.object);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// --- Event handlers ---

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createClient>,
  session: Record<string, unknown>
) {
  const userId = session.metadata?.supabase_user_id as string | undefined;
  const plan = session.metadata?.plan as string | undefined;
  if (!userId || !plan) return;

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string | null;

  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      stripe_customer_id: customerId,
      plan,
      subscription_id: subscriptionId,
      plan_activated_at: new Date().toISOString(),
    },
  });
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createClient>,
  subscription: Record<string, unknown>
) {
  const customerId = subscription.customer as string;
  const status = subscription.status as string;

  const user = await findUserByCustomerId(supabase, customerId);
  if (!user) return;

  const isActive = status === "active" || status === "trialing";

  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      subscription_status: status,
      plan: isActive ? (user.user_metadata?.plan ?? "pro") : null,
    },
  });
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createClient>,
  subscription: Record<string, unknown>
) {
  const customerId = subscription.customer as string;
  const user = await findUserByCustomerId(supabase, customerId);
  if (!user) return;

  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      plan: null,
      subscription_id: null,
      subscription_status: "canceled",
    },
  });
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Record<string, unknown>
) {
  const customerId = invoice.customer as string;
  const user = await findUserByCustomerId(supabase, customerId);
  if (!user) return;

  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      subscription_status: "past_due",
    },
  });
}

// --- Helpers ---

async function findUserByCustomerId(
  supabase: ReturnType<typeof createClient>,
  customerId: string
) {
  // List users and find the one with matching stripe_customer_id
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  return data?.users?.find(
    (u) => u.user_metadata?.stripe_customer_id === customerId
  ) ?? null;
}

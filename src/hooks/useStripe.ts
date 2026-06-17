import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { trackEvent } from "@/lib/analytics";

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    if (!config.stripePublishableKey) {
      throw new Error("Payments aren't configured right now. Please contact support.");
    }
    stripePromise = loadStripe(config.stripePublishableKey);
  }
  return stripePromise;
};

export type PlanId = "ship" | "unlimited";
// The server (create-checkout) maps plan -> Stripe price via an allowlist; the client
// only sends `plan`, never a price ID.

export const useStripe = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (plan: PlanId) => {
    setLoading(true);
    setError(null);
    trackEvent("Checkout Started", { plan });

    try {
      // Call Supabase Edge Function to create checkout session
      const { data, error: fnError } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan,
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/pricing?checkout=cancelled`,
        },
      });

      if (fnError) throw new Error(fnError.message);

      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe not loaded");

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.session_id,
      });

      if (redirectError) throw new Error(redirectError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    }

    setLoading(false);
  };

  return { checkout, loading, error };
};

import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase } from "@/lib/supabase";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise && stripeKey) {
    stripePromise = loadStripe(stripeKey);
  }
  return stripePromise;
};

export type PlanId = "ship" | "unlimited";

const priceIds: Record<PlanId, string> = {
  ship: import.meta.env.VITE_STRIPE_SHIP_PRICE_ID ?? "price_1TNe1nKTudcNlvgZR93uiyDs",
  unlimited: import.meta.env.VITE_STRIPE_UNLIMITED_PRICE_ID ?? "",
};

export const useStripe = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (plan: PlanId) => {
    setLoading(true);
    setError(null);

    try {
      // Call Supabase Edge Function to create checkout session
      const { data, error: fnError } = await supabase.functions.invoke("create-checkout", {
        body: {
          price_id: priceIds[plan],
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

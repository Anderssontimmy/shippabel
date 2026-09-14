import { useState } from "react";
import { invokeEdge } from "@/lib/invokeEdge";
import { trackEvent } from "@/lib/analytics";

export type PlanId = "ship" | "unlimited";

export const useStripe = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkout = async (plan: PlanId) => {
    setLoading(true);
    setError(null);
    trackEvent("Checkout Started", { plan });
    try {
      const { data, error: failure } = await invokeEdge<{ url: string }>("create-checkout", {
        plan,
        success_url: `${window.location.origin}/dashboard?checkout=success`,
        cancel_url: `${window.location.origin}/pricing?checkout=cancelled`,
      });
      if (failure) throw new Error(failure);
      const target = new URL(data?.url ?? "");
      if (target.origin !== "https://checkout.stripe.com") throw new Error("Invalid checkout URL. Please try again.");
      window.location.assign(target.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally { setLoading(false); }
  };
  return { checkout, loading, error };
};

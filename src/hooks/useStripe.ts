import { useState } from "react";
import { invokeEdge } from "@/lib/invokeEdge";
import { trackEvent } from "@/lib/analytics";

export type PlanId = "ship" | "unlimited";

export const useStripe = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // returnPath is the page the buyer was on: Stripe sends them back there, paid or not, instead of to a
  // generic page. Without one they land where they always did (the dashboard after paying, pricing if they cancel).
  const checkout = async (plan: PlanId, returnPath?: string) => {
    const back = returnPath?.startsWith("/") && !returnPath.startsWith("//") ? returnPath : null;
    setLoading(true);
    setError(null);
    trackEvent("Checkout Started", { plan });
    try {
      const { data, error: failure } = await invokeEdge<{ url: string }>("create-checkout", {
        plan,
        success_url: `${window.location.origin}${back ?? "/dashboard"}?checkout=success`,
        cancel_url: `${window.location.origin}${back ?? "/pricing"}?checkout=cancelled`,
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

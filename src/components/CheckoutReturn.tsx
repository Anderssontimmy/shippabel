import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";

const PLAN_NAMES: Record<string, string> = { ship: "Ship", unlimited: "Unlimited" };

// Stripe sends the buyer back to the page they paid from, with ?checkout=success or ?checkout=cancelled.
// The dashboard has its own, bigger confirmation; everywhere else this says it in a line and makes sure the
// session knows the new plan, so the page that asked for payment unlocks without a reload.
export const CheckoutReturn = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const status = params.get("checkout");
    if ((status !== "success" && status !== "cancelled") || pathname === "/dashboard" || handled.current) return;
    handled.current = true;
    params.delete("checkout");
    const rest = params.toString();
    navigate(`${pathname}${rest ? `?${rest}` : ""}`, { replace: true });

    if (status === "cancelled") {
      toast("info", "No payment was made. Nothing was charged.");
      return;
    }
    // The webhook that writes the plan can lag behind the redirect: ask a few times.
    void (async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data } = await supabase.auth.refreshSession();
        const plan = data?.user?.app_metadata?.plan as string | undefined;
        if (plan) {
          toast("success", `Payment confirmed. You're on the ${PLAN_NAMES[plan] ?? "paid"} plan!`);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      toast("success", "Payment received. Your plan is being activated, refresh in a minute if it does not unlock.");
    })();
  }, [pathname, search, navigate, toast]);

  return null;
};

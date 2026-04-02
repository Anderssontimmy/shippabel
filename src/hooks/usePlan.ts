import { useAuth } from "@/hooks/useAuth";

export type PlanTier = "free" | "ship" | "unlimited";

export const usePlan = () => {
  const { user } = useAuth();

  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const plan = (metadata?.plan as string) ?? null;
  const hasCustomer = !!metadata?.stripe_customer_id;

  const tier: PlanTier =
    plan === "unlimited" ? "unlimited" :
    plan === "ship" ? "ship" :
    "free";

  const isPaid = tier === "ship" || tier === "unlimited";

  return {
    tier,
    isPaid,
    plan,
    hasCustomer,
    isShip: tier === "ship",
    isUnlimited: tier === "unlimited",
    isFree: tier === "free",
  };
};

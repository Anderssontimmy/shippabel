import { useAuth } from "@/hooks/useAuth";

export type PlanTier = "free" | "ship" | "unlimited";

export const usePlan = () => {
  const { user } = useAuth();

  // Entitlement is read from app_metadata (server-controlled, not user-writable).
  // This client gate is UX only — the edge functions enforce it server-side.
  const appMeta = user?.app_metadata as Record<string, unknown> | undefined;
  const userMeta = user?.user_metadata as Record<string, unknown> | undefined;
  const plan = (appMeta?.plan as string) ?? null;
  const hasCustomer = !!userMeta?.stripe_customer_id;

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

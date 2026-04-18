import { Link } from "react-router-dom";
import { Check, Rocket, Zap, Loader2, Infinity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStripe, type PlanId } from "@/hooks/useStripe";
import { useAuth } from "@/hooks/useAuth";

const plans = [
  {
    name: "Free",
    planId: null as PlanId | null,
    price: "$0",
    period: "forever",
    description: "See exactly what's stopping your app from going live",
    icon: Zap,
    color: "text-surface-300",
    features: [
      "Check unlimited apps",
      "See every problem explained in plain language",
      "AI store page preview",
      "Share your results with anyone",
    ],
    cta: "Check my app",
    ctaVariant: "secondary" as const,
    ctaTo: "/scan",
  },
  {
    name: "Ship",
    planId: "ship" as PlanId,
    price: "$49",
    originalPrice: "$99",
    period: "one-time",
    description: "Everything you need to get your app live in the store",
    icon: Rocket,
    color: "text-green-400",
    popular: true,
    features: [
      "Everything in Free",
      "Auto-fix problems with one click",
      "AI writes your full store page",
      "Professional screenshot frames",
      "Privacy policy created & hosted",
      "We build & submit your app",
      "Track your review status",
    ],
    cta: "Get Ship — $49",
    ctaVariant: "primary" as const,
  },
  {
    name: "Unlimited",
    planId: "unlimited" as PlanId,
    price: "$179",
    period: "one-time",
    description: "For people with more than one app to publish",
    icon: Infinity,
    color: "text-surface-500",
    features: [
      "Everything in Ship",
      "Unlimited apps — publish as many as you want",
      "Priority support when you need help",
    ],
    cta: "Get Unlimited — $179",
    ctaVariant: "secondary" as const,
  },
];

export const Pricing = () => {
  const { checkout, loading, error } = useStripe();
  const { user } = useAuth();

  const handleCheckout = async (planId: PlanId | null) => {
    if (!planId) return;
    if (!user) {
      window.location.href = "/login";
      return;
    }
    await checkout(planId);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold">
          Pay once. Get your app live.
        </h1>
        <p className="mt-4 text-surface-400 text-lg">
          No subscriptions. No monthly fees. Just a one-time payment.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-8 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-center">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col ${plan.popular ? "border-green-500/30 bg-green-500/5" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-3 py-0.5 text-xs font-semibold text-white">
                Most popular
              </div>
            )}

            <div className="mb-6">
              <plan.icon className={`h-6 w-6 ${plan.color} mb-3`} />
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-surface-400 mt-1">{plan.description}</p>
            </div>

            <div className="mb-6">
              {'originalPrice' in plan && plan.originalPrice && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-surface-500 line-through">{plan.originalPrice}</span>
                  <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">50% off — limited time</span>
                </div>
              )}
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-surface-500 text-sm ml-1">{plan.period}</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-surface-300">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {plan.planId ? (
              <Button
                variant={plan.ctaVariant}
                className="w-full gap-2"
                onClick={() => handleCheckout(plan.planId)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {plan.cta}
              </Button>
            ) : (
              <Link to={plan.ctaTo!}>
                <Button variant={plan.ctaVariant} className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-surface-500 text-sm">
          Special launch offer — price goes back to $99 soon.
        </p>
      </div>
    </div>
  );
};

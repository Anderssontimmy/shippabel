import { Link } from "react-router-dom";
import { Check, Sparkles, Rocket, Zap, Loader2 } from "lucide-react";
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
    description: "See what's stopping your app from going live",
    icon: Zap,
    color: "text-surface-300",
    features: [
      "Check unlimited apps",
      "See everything that needs fixing",
      "Plain-language explanations",
      "Share your results with anyone",
    ],
    cta: "Check my app",
    ctaVariant: "secondary" as const,
    ctaTo: "/scan",
  },
  {
    name: "Launch",
    planId: "launch" as PlanId,
    price: "$99",
    period: "one-time",
    description: "Everything you need to get your first app live",
    icon: Sparkles,
    color: "text-primary-400",
    popular: true,
    features: [
      "Everything in Free",
      "Auto-fix problems with one click",
      "AI writes your store page for you",
      "Professional screenshot frames",
      "Privacy policy created & hosted",
      "We build & submit your app",
      "Track your app's review status",
    ],
    cta: "Get Launch",
    ctaVariant: "primary" as const,
  },
  {
    name: "Pro",
    planId: "pro" as PlanId,
    price: "$29",
    period: "/month",
    description: "For people publishing multiple apps",
    icon: Rocket,
    color: "text-emerald-400",
    features: [
      "Everything in Launch",
      "Submit unlimited apps",
      "Unlimited privacy policies",
      "See how your apps are doing",
      "Always-on review tracking",
      "Your own privacy policy page",
      "Priority help when you need it",
    ],
    cta: "Get Pro",
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
          Simple pricing. No surprises.
        </h1>
        <p className="mt-4 text-surface-400 text-lg">
          Check your app for free. Only pay when you're ready to publish.
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
            className={`relative flex flex-col ${plan.popular ? "border-primary-500/30 bg-primary-500/5" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-semibold text-white">
                Most popular
              </div>
            )}

            <div className="mb-6">
              <plan.icon className={`h-6 w-6 ${plan.color} mb-3`} />
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-surface-400 mt-1">{plan.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-surface-500 text-sm ml-1">{plan.period}</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-surface-300">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
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
          All plans include a 14-day money-back guarantee. No questions asked.
        </p>
      </div>
    </div>
  );
};

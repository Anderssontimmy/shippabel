import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, CheckCircle2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  benefits?: string[];
  compact?: boolean;
}

export const UpgradePrompt = ({ feature, description, benefits, compact = false }: UpgradePromptProps) => {
  if (compact) {
    return (
      <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3.5 py-2 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
        <Sparkles className="h-3 w-3" />
        Unlock with Ship plan
      </Link>
    );
  }

  const defaultBenefits = [
    "Auto-fix all problems with one click",
    "AI writes your store page",
    "We build and submit your app",
    "Privacy policy created and hosted",
  ];

  const displayBenefits = benefits ?? defaultBenefits;

  return (
    <div className="rounded-2xl border border-surface-200 bg-white overflow-hidden">
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-green-400 to-green-600" />

      <div className="px-8 py-10 sm:px-10 sm:py-12">
        <div className="max-w-md mx-auto text-center">
          {/* Icon */}
          <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
            <Rocket className="h-7 w-7 text-green-600" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-surface-900 mb-2">{feature}</h3>
          <p className="text-sm text-surface-500 mb-8">
            {description ?? "Get everything you need to publish your app. One-time payment — no subscription, no surprises."}
          </p>

          {/* Benefits */}
          <div className="text-left space-y-3 mb-8">
            {displayBenefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-surface-700">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link to="/pricing">
            <Button size="lg" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
              Get Ship — $99 one-time
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-surface-400 mt-3">14-day money-back guarantee</p>
        </div>
      </div>
    </div>
  );
};

import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
}

export const UpgradePrompt = ({ feature, description, compact = false }: UpgradePromptProps) => {
  if (compact) {
    return (
      <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-lg bg-surface-100 border border-surface-200 px-3 py-2 text-xs font-medium text-surface-500 hover:bg-surface-50 hover:border-surface-300 transition-colors">
        <Lock className="h-3 w-3" />
        Upgrade to unlock
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-surface-200 bg-surface-50 p-6 text-center">
      <div className="h-10 w-10 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
        <Lock className="h-5 w-5 text-surface-400" />
      </div>
      <h3 className="text-sm font-semibold text-surface-900 mb-1">{feature}</h3>
      <p className="text-xs text-surface-500 mb-4 max-w-sm mx-auto">
        {description ?? "This feature is available on the Ship plan. One-time payment, no subscription."}
      </p>
      <Link to="/pricing">
        <Button size="sm" className="gap-1.5">
          See plans — from $99
        </Button>
      </Link>
    </div>
  );
};

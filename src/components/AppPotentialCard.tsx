import { Link } from "react-router-dom";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Zap,
  Rocket,
  Target,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AppPotentialAnalysis } from "@/lib/types";

interface AppPotentialCardProps {
  analysis: AppPotentialAnalysis;
  projectId: string;
}

export const AppPotentialCard = ({ analysis, projectId }: AppPotentialCardProps) => {
  return (
    <Card className="relative overflow-hidden border-primary-500/20">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-blue-500 to-emerald-500" />

      {/* Header + hook */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">
          Your App's Potential
        </span>
      </div>
      <p className="text-sm italic text-surface-300 mb-6 leading-relaxed">
        &ldquo;{analysis.excitement_hook}&rdquo;
      </p>

      {/* What we see */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Target className="h-4 w-4 text-blue-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-400">What We See</h4>
        </div>
        <p className="text-sm text-surface-200 leading-relaxed">{analysis.app_description}</p>
      </div>

      {/* Market + Revenue in 2-col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        {/* Market opportunity */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-400">Market Opportunity</h4>
          </div>
          <p className="text-sm text-surface-300 mb-2">{analysis.market_potential.market_size}</p>
          <div className="space-y-1">
            {analysis.market_potential.comparable_apps.map((app) => (
              <div key={app} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span className="text-xs text-surface-400">{app}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue potential */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign className="h-4 w-4 text-amber-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-400">Revenue Potential</h4>
          </div>
          <p className="text-sm text-surface-300 leading-relaxed">{analysis.revenue_potential}</p>
        </div>
      </div>

      {/* Strengths + Growth in 2-col */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        {/* Strengths */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-400">Your Strengths</h4>
          </div>
          <div className="space-y-1.5">
            {analysis.strengths.map((s) => (
              <div key={s} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                <span className="text-xs text-surface-300">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth suggestions */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="h-4 w-4 text-cyan-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-400">Quick Wins</h4>
          </div>
          <div className="space-y-1.5">
            {analysis.growth_suggestions.map((s) => (
              <div key={s} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span className="text-xs text-surface-300">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl bg-gradient-to-r from-primary-600/10 to-emerald-600/10 border border-primary-500/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm font-medium text-surface-200">
          Ready to ship? Let us handle the App Store submission.
        </p>
        <Link to={projectId === "demo" ? "/pricing" : `/app/${projectId}/listing`}>
          <Button size="sm" className="gap-1.5 shrink-0">
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
};

import { Link } from "react-router-dom";
import { Check, ChevronRight, Lock } from "lucide-react";
import { useShipFlow, type FlowStep } from "@/hooks/useShipFlow";

const stepRoutes: Record<FlowStep, (id: string) => string> = {
  scan: () => "/scan",
  fix: (id) => `/scan/${id}`,
  signup: () => "/login",
  listing: (id) => `/app/${id}/listing`,
  screenshots: (id) => `/app/${id}/screenshots`,
  connect: () => "/settings",
  build: (id) => `/app/${id}/submit`,
  submit: (id) => `/app/${id}/submit`,
};

// Steps to hide when completed (infrastructure steps, not user-facing)
const hideWhenDone: Set<FlowStep> = new Set(["signup", "connect"]);

export const ShipFlowBar = ({ projectId }: { projectId: string }) => {
  const { steps, currentStep } = useShipFlow(projectId);

  // Filter out completed infrastructure steps to reduce clutter
  const visibleSteps = steps.filter((step) => {
    if (hideWhenDone.has(step.id) && step.completed) return false;
    return true;
  });

  return (
    <div className="border-b border-surface-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide">
          {visibleSteps.map((step, i) => {
            const isActive = step.id === currentStep;
            const isPast = step.completed;
            const route = stepRoutes[step.id](projectId);

            return (
              <div key={step.id} className="flex items-center shrink-0">
                {step.available ? (
                  <Link
                    to={route}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-surface-900 text-white"
                        : isPast
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "text-surface-500 hover:text-surface-700"
                    }`}
                  >
                    {isPast && <Check className="h-3 w-3" />}
                    {step.label}
                  </Link>
                ) : (
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-surface-300 cursor-not-allowed"
                    title={`Complete the previous steps to unlock "${step.label}"`}
                  >
                    <Lock className="h-3 w-3" />
                    {step.label}
                  </span>
                )}

                {i < visibleSteps.length - 1 && (
                  <ChevronRight aria-hidden="true" className={`h-3 w-3 mx-0.5 shrink-0 ${isPast ? "text-green-300" : "text-surface-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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

export const ShipFlowBar = ({ projectId }: { projectId: string }) => {
  const { steps, currentStep } = useShipFlow(projectId);

  return (
    <div className="border-b border-surface-800/50 bg-surface-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide">
          {steps.map((step, i) => {
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
                        ? "bg-primary-600 text-white"
                        : isPast
                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "text-surface-500 hover:text-surface-300"
                    }`}
                  >
                    {isPast && <Check className="h-3 w-3" />}
                    {step.label}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-surface-600 cursor-not-allowed">
                    <Lock className="h-3 w-3" />
                    {step.label}
                  </span>
                )}

                {i < steps.length - 1 && (
                  <ChevronRight aria-hidden="true" className={`h-3 w-3 mx-0.5 shrink-0 ${isPast ? "text-emerald-500/40" : "text-surface-800"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

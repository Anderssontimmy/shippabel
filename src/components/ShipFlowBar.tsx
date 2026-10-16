import { useCallback, useEffect, useRef, useState } from "react";
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
  const scroller = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState({ left: false, right: false });

  // On a phone the bar scrolls sideways: start at the current step and fade the edge that hides more.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setHidden({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ inline: "center", block: "nearest" });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [currentStep, steps.length, measure]);
  const fade = `linear-gradient(to right, ${hidden.left ? "transparent, black 12%" : "black, black"}, ${hidden.right ? "black 88%, transparent" : "black, black"})`;

  // Filter out completed infrastructure steps to reduce clutter
  const visibleSteps = steps.filter((step) => {
    if (hideWhenDone.has(step.id) && step.completed) return false;
    return true;
  });

  return (
    <div className="border-b border-surface-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div
          ref={scroller}
          onScroll={measure}
          style={hidden.left || hidden.right ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
          className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide"
        >
          {visibleSteps.map((step, i) => {
            const isActive = step.id === currentStep;
            const isPast = step.completed;
            const route = stepRoutes[step.id](projectId);

            return (
              <div key={step.id} ref={isActive ? currentRef : undefined} className="flex items-center shrink-0">
                {step.available ? (
                  <Link
                    to={route}
                    className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all ${
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
                    className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-surface-500 cursor-not-allowed"
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

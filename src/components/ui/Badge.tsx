import type { IssueSeverity } from "@/lib/types";

const severityStyles: Record<IssueSeverity, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

interface BadgeProps {
  severity: IssueSeverity;
  children: React.ReactNode;
}

export const Badge = ({ severity, children }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityStyles[severity]}`}
    >
      {children}
    </span>
  );
};

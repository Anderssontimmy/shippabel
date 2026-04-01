import type { IssueSeverity } from "@/lib/types";

const severityStyles: Record<IssueSeverity, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
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

import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = ({ hover = false, className = "", children, ...props }: CardProps) => {
  return (
    <div
      className={`rounded-2xl border border-surface-800 bg-surface-900/50 p-6 ${
        hover ? "transition-all hover:border-surface-700 hover:bg-surface-900" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

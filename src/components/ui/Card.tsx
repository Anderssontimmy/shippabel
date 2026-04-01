import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = ({ hover = false, className = "", children, ...props }: CardProps) => {
  return (
    <div
      className={`rounded-2xl border border-surface-200 bg-white p-6 ${
        hover ? "transition-all hover:shadow-md hover:border-surface-300" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

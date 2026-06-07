import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

interface CardProps extends ComponentPropsWithoutRef<"div"> {
  /** Adds a hover lift effect. */
  interactive?: boolean;
}

/** Rounded surface card with soft border + shadow. */
export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8",
        interactive &&
          "transition-all duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-lift",
        className,
      )}
      {...props}
    />
  );
}

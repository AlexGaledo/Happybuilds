import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/dashboard/format";

/**
 * Single headline metric.
 *
 * Numbers use `tabular-nums` so a value changing from 99 to 472 doesn't shift
 * the card's layout — the same reason data tables use tabular figures.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "navy",
  className,
}: {
  label: string;
  value: number | string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "navy" | "coral" | "amber" | "mint";
  className?: string;
}) {
  const accents = {
    navy: "text-navy-500 bg-navy-800/6 dark:bg-white/10 dark:text-navy-50",
    coral: "text-coral-ink bg-coral-500/12",
    amber: "text-amber-ink bg-amber-500/16",
    mint: "text-mint-ink bg-mint-500/14",
  } as const;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-soft",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {label}
        </p>
        {icon && (
          <span
            aria-hidden
            className={cn("grid size-8 shrink-0 place-items-center rounded-xl", accents[tone])}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums leading-none">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {hint && (
        <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>
      )}
    </div>
  );
}

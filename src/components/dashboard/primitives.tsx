import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AlertTriangle, Inbox, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared dashboard surfaces.
 *
 * The marketing `Card` is deliberately not reused: it carries 2.5rem radii and
 * 2rem padding tuned for a spacious landing page, which wastes vertical space
 * on a data screen. These use a tighter scale on the same tokens.
 */

export function Panel({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

/** Neutral "there is nothing here" state with an optional next action. */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-navy-800/5 text-navy-400 dark:bg-white/5">
        <Icon aria-hidden className="size-5" />
      </span>
      <div>
        <p className="font-display text-base font-bold">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

/**
 * Failure state. Always states the cause and offers a way forward — an error
 * with no recovery path is a dead end (`error-recovery`).
 */
export function ErrorState({
  title = "Couldn't load this",
  message,
  hint,
}: {
  title?: string;
  message: string;
  hint?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-coral-500/10 text-coral-ink">
        <AlertTriangle aria-hidden className="size-5" />
      </span>
      <div>
        <p className="font-display text-base font-bold">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
          {message}
        </p>
        {hint && (
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** Small pill used for job type, category, cache state, run status. */
export function Chip({
  children,
  tone = "neutral",
  className,
  icon: Icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "coral" | "amber" | "mint" | "muted";
  className?: string;
  icon?: typeof Lock;
}) {
  const tones = {
    neutral: "bg-navy-800/6 text-navy-700 dark:bg-white/10 dark:text-navy-50",
    coral: "bg-coral-500/12 text-coral-ink",
    amber: "bg-amber-500/18 text-amber-ink",
    mint: "bg-mint-500/14 text-mint-ink",
    muted: "bg-navy-800/4 text-muted dark:bg-white/5",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

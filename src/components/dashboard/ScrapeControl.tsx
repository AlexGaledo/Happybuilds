"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Loader2, RefreshCw } from "lucide-react";
import type { ScrapeStatus } from "@/lib/dashboard/types";
import { formatDuration, relativeTime } from "@/lib/dashboard/format";
import { Chip } from "./primitives";
import { cn } from "@/lib/utils";

type Feedback = { tone: "ok" | "busy" | "error"; message: string } | null;

/**
 * Manual scrape trigger plus live run status.
 *
 * A run takes ~36 minutes, so this polls rather than blocking. The backend
 * holds a Redis lock, so a manual trigger can never collide with the 08:00 /
 * 20:00 cron run — it returns 409 and we surface that as "already running",
 * which is information, not an error.
 */
export function ScrapeControl({ initial }: { initial: ScrapeStatus | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<ScrapeStatus | null>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const wasRunning = useRef(Boolean(initial?.running));

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/scrape", { cache: "no-store" });
      if (!res.ok) return;
      const next: ScrapeStatus = await res.json();
      setStatus(next);
      // Run just finished — pull fresh counts into the server-rendered panels.
      if (wasRunning.current && !next.running) router.refresh();
      wasRunning.current = next.running;
    } catch {
      /* transient network blips shouldn't wipe the last known status */
    }
  }, [router]);

  useEffect(() => {
    if (!status?.running) return;
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, [status?.running, poll]);

  async function onTrigger() {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/dashboard/scrape", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setFeedback({ tone: "busy", message: "A scrape is already running." });
      } else if (!res.ok) {
        setFeedback({
          tone: "error",
          message: typeof body?.detail === "string" ? body.detail : "Couldn't start the scrape.",
        });
      } else {
        setFeedback({
          tone: "ok",
          message: "Scrape started. New rows appear within a couple of minutes.",
        });
        wasRunning.current = true;
      }
      await poll();
    } catch {
      setFeedback({ tone: "error", message: "Network error — the API is unreachable." });
    } finally {
      setSubmitting(false);
    }
  }

  const running = Boolean(status?.running);
  const last = status?.last_run ?? null;
  const failed = last?.status === "error";

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <Chip tone="amber">
            <Loader2 aria-hidden className="mr-1 inline size-3 animate-spin" />
            Running now
          </Chip>
        ) : failed ? (
          <Chip tone="coral" icon={CircleAlert}>
            Last run failed
          </Chip>
        ) : (
          <Chip tone="mint" icon={CircleCheck}>
            Idle
          </Chip>
        )}
        {status?.lock_holder && (
          <Chip tone="muted">Holder: {status.lock_holder.split(":")[0]}</Chip>
        )}
      </div>

      {/* Two columns at every width: this panel sits in a narrow rail, and at
          four columns "3 hours ago" truncated to "3 hours…". */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Stat label="Last run" value={relativeTime(last?.finished_at ?? last?.started_at)} />
        <Stat label="Duration" value={formatDuration(last?.total_seconds)} />
        <Stat
          label="In window"
          value={last?.listings_in_window != null ? String(last.listings_in_window) : "—"}
        />
        <Stat
          label="Inserted"
          value={last?.inserted != null ? String(last.inserted) : "—"}
        />
      </dl>

      {failed && last?.error && (
        <p className="rounded-xl bg-coral-500/8 px-3 py-2 text-xs leading-relaxed text-coral-600">
          {last.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTrigger}
          disabled={submitting || running}
          aria-busy={submitting}
          data-testid="scrape-trigger"
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
            "transition-colors duration-200 ease-[var(--ease-out-soft)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "bg-navy-800 text-white hover:bg-navy-700",
            "disabled:cursor-not-allowed disabled:opacity-45",
          )}
        >
          {submitting ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden className="size-4" />
          )}
          {running ? "Scrape in progress" : "Run scrape now"}
        </button>
        <p className="text-xs text-muted">
          Scheduled 08:00 and 20:00 UTC. A manual run never interrupts one.
        </p>
      </div>

      {/* aria-live so the outcome reaches screen readers without stealing focus. */}
      <p
        aria-live="polite"
        className={cn(
          "text-xs leading-relaxed",
          feedback?.tone === "error" && "text-coral-600",
          feedback?.tone === "busy" && "text-amber-600",
          feedback?.tone === "ok" && "text-mint-500",
        )}
      >
        {feedback?.message ?? ""}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import type { ProcessStatus } from "@/lib/dashboard/types";
import { relativeTime } from "@/lib/dashboard/format";
import { Chip } from "./primitives";
import { cn } from "@/lib/utils";

/**
 * Live status for the drafting batch.
 *
 * A batch takes minutes, so the trigger returns 202 and this polls. It only
 * polls while a run is in flight — an idle dashboard makes no requests — and
 * refreshes the server-rendered tables once on the running→idle edge, which is
 * the moment the new drafts become visible.
 */
export function ProcessStatusPoller({ initial }: { initial: ProcessStatus | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<ProcessStatus | null>(initial);
  const wasRunning = useRef(Boolean(initial?.running));

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/process", { cache: "no-store" });
      if (!res.ok) return;
      const next: ProcessStatus = await res.json();
      setStatus(next);
      if (wasRunning.current && !next.running) router.refresh();
      wasRunning.current = next.running;
    } catch {
      /* a transient blip shouldn't wipe the last known status */
    }
  }, [router]);

  useEffect(() => {
    if (!status?.running) return;
    const id = setInterval(poll, 8_000);
    return () => clearInterval(id);
  }, [status?.running, poll]);

  const last = status?.last_run ?? null;
  const running = Boolean(status?.running);

  if (!status?.agent_available) {
    return (
      <div
        role="note"
        className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm leading-relaxed text-amber-ink"
      >
        <strong className="font-semibold">The drafting agent is unavailable.</strong>{" "}
        The Claude Code CLI was not found on the API host. Install it there, or
        set <code className="font-mono text-xs">CLAUDE_BIN</code> to its absolute
        path — <code className="font-mono text-xs">systemd</code> does not
        inherit <code className="font-mono text-xs">~/.local/bin</code>. You can
        still mark leads processed by hand.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3">
      {running ? (
        <Chip tone="amber">
          <Loader2 aria-hidden className="mr-1 inline size-3 animate-spin" />
          Drafting
        </Chip>
      ) : last?.error ? (
        <Chip tone="coral" icon={CircleAlert}>
          Last run failed
        </Chip>
      ) : (
        <Chip tone="mint" icon={CircleCheck}>
          Idle
        </Chip>
      )}

      {last && (
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <Stat label="Last run" value={relativeTime(last.finished_at ?? last.started_at)} />
          <Stat
            label="Drafted"
            value={
              last.requested != null
                ? `${last.drafted ?? 0} of ${last.requested}`
                : String(last.drafted ?? 0)
            }
          />
          <Stat label="Filtered out" value={String(last.rejected ?? 0)} />
          <Stat label="Contacts found" value={String(last.contacts_found ?? 0)} />
          {(last.failed ?? 0) > 0 && (
            <Stat label="Failed" value={String(last.failed)} tone="error" />
          )}
        </dl>
      )}

      {last?.error && (
        <p className="w-full rounded-xl bg-coral-500/8 px-3 py-2 text-xs leading-relaxed text-coral-ink">
          {last.error}
        </p>
      )}

      {/* The log is where prompt-injection flags and per-lead failures surface.
          Collapsed by default: it is diagnostic, not the headline. */}
      {last?.log && last.log.length > 0 && (
        <details className="w-full">
          <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-foreground">
            Run log ({last.log.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1 rounded-xl bg-navy-800/[0.04] p-3 dark:bg-white/5">
            {last.log.map((line, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted">
                {line}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "error";
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "font-semibold tabular-nums",
          tone === "error" && "text-coral-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

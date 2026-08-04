"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Ban,
  Bot,
  CheckCircle2,
  ExternalLink,
  Hand,
  Inbox,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import type { PipelineCounts, PipelineItem, TargetKind } from "@/lib/dashboard/types";
import {
  PIPELINE_PAGE_SIZE,
  pipelineQueryString,
  type PipelineFilters,
} from "@/lib/dashboard/pipelineFilters";
import { relativeTime, truncate } from "@/lib/dashboard/format";
import { processLeadsAction, setProcessedAction } from "@/lib/dashboard/actions";
import { Chip, EmptyState } from "./primitives";
import { cn } from "@/lib/utils";

/**
 * The two halves of the pipeline, side by side.
 *
 * Side by side rather than a tab pair because the whole point is watching work
 * move from left to right: a tab would hide the destination. Below `xl` they
 * stack, and below `md` each table becomes a list of cards — the table needs
 * ~30rem before its columns collide, which on a phone would be a horizontal
 * scroller showing one truncated column.
 *
 * Selection lives in React state, not the URL. Everything else on this page is
 * URL-driven and shareable, but a selection is momentary and per-person — a
 * shared link that arrives with 12 rows pre-ticked and a Send button is a trap.
 */
export function PipelineTables({
  unprocessed,
  processed,
  counts,
  filters,
  agentAvailable,
  running,
}: {
  unprocessed: PipelineItem[];
  processed: PipelineItem[];
  counts: PipelineCounts | null;
  filters: PipelineFilters;
  agentAvailable: boolean;
  running: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  const key = (item: PipelineItem) => `${item.kind}:${item.id}`;
  const selectableKeys = useMemo(() => unprocessed.map(key), [unprocessed]);
  const allSelected =
    selectableKeys.length > 0 && selectableKeys.every((k) => selected.has(k));

  function toggle(item: PipelineItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      const k = key(item);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableKeys));
  }

  function run(work: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await work();
      setFeedback(
        result.ok
          ? { tone: "ok", text: okText }
          : { tone: "error", text: result.error ?? "Something went wrong" },
      );
      if (result.ok) router.refresh();
    });
  }

  function processSelected() {
    const targets = [...selected].map((k) => {
      const [kind, id] = k.split(":");
      return { kind: kind as TargetKind, id };
    });
    run(
      () => processLeadsAction({ targets }),
      `Processing ${targets.length} lead${targets.length === 1 ? "" : "s"}. This takes a few minutes.`,
    );
    setSelected(new Set());
  }

  const busy = pending || running;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={processSelected}
          disabled={busy || selected.size === 0 || !agentAvailable}
          aria-busy={pending}
          data-testid="process-selected"
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
            "transition-colors duration-200 ease-[var(--ease-out-soft)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "bg-navy-800 text-white hover:bg-navy-700",
            "disabled:cursor-not-allowed disabled:opacity-45",
          )}
        >
          {pending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Bot aria-hidden className="size-4" />
          )}
          {selected.size > 0
            ? `Process ${selected.size} selected`
            : "Process selected"}
        </button>

        <button
          type="button"
          onClick={() =>
            run(
              () => processLeadsAction({ kind: filters.kind, limit: 10 }),
              "Processing the next 10 in the queue.",
            )
          }
          disabled={busy || !agentAvailable || unprocessed.length === 0}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold",
            "transition-colors hover:bg-navy-800/[0.04] dark:hover:bg-white/5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
            "disabled:cursor-not-allowed disabled:opacity-45",
          )}
        >
          Process next 10
        </button>

        {running && (
          <Chip tone="amber">
            <Loader2 aria-hidden className="mr-1 inline size-3 animate-spin" />
            Agent running
          </Chip>
        )}

        {/* aria-live so the outcome reaches a screen reader without taking focus. */}
        <p
          aria-live="polite"
          className={cn(
            "w-full text-xs leading-relaxed sm:w-auto",
            feedback?.tone === "error" ? "text-coral-ink" : "text-mint-ink",
          )}
        >
          {feedback?.text ?? ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TableCard
          title="Queue"
          subtitle="Not yet read by the agent"
          icon={Inbox}
          tone="amber"
          count={counts?.unprocessed ?? unprocessed.length}
          offset={filters.qOffset}
          total={counts?.unprocessed ?? 0}
          hrefFor={(offset) =>
            `/dashboard/pipeline${pipelineQueryString({ ...filters, qOffset: offset })}`
          }
        >
          {unprocessed.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Queue is empty"
              description="Every stored lead has been processed. New ones arrive with the next scrape."
            />
          ) : (
            <>
              {/* Cards below md, table at md+. Different test ids so the two
                  renderings never double-count. */}
              <ul className="divide-y divide-border md:hidden">
                {unprocessed.map((item) => (
                  <li key={key(item)} data-testid="queue-card">
                    <div className="flex items-start gap-1 px-2 py-3">
                      <CheckboxTarget
                        checked={selected.has(key(item))}
                        onChange={() => toggle(item)}
                        label={`Select ${item.title}`}
                      />
                      <div className="min-w-0 flex-1 pr-2">
                        <LeadCell item={item} />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs tabular-nums text-muted">
                            {relativeTime(item.received_at)}
                          </span>
                          <RowButton
                            label="Mark processed"
                            icon={Hand}
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setProcessedAction(item.kind, item.id, true),
                                "Marked as processed.",
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <caption className="sr-only">Unprocessed leads</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="w-12 px-2 py-2.5">
                        <CheckboxTarget
                          checked={allSelected}
                          onChange={toggleAll}
                          label="Select every lead on this page"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted"
                      >
                        Lead
                      </th>
                      <th
                        scope="col"
                        className="w-28 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted"
                      >
                        Age
                      </th>
                      <th scope="col" className="w-16 px-3 py-2.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border" data-testid="queue-body">
                    {unprocessed.map((item) => (
                      <tr key={key(item)} data-testid="queue-row" className="align-top">
                        <td className="px-2 py-3">
                          <CheckboxTarget
                            checked={selected.has(key(item))}
                            onChange={() => toggle(item)}
                            label={`Select ${item.title}`}
                          />
                        </td>
                        <td className="min-w-0 px-3 py-3">
                          <LeadCell item={item} />
                        </td>
                        <td className="px-3 py-3 text-xs tabular-nums text-muted">
                          {relativeTime(item.received_at)}
                        </td>
                        <td className="px-3 py-3">
                          <RowButton
                            label="Mark processed"
                            icon={Hand}
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setProcessedAction(item.kind, item.id, true),
                                "Marked as processed.",
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TableCard>

        <TableCard
          title="Processed"
          subtitle={
            counts
              ? `${counts.qualified} a fit · ${counts.rejected} filtered out`
              : "Read and judged by the agent"
          }
          icon={CheckCircle2}
          tone="mint"
          count={counts?.processed ?? processed.length}
          offset={filters.pOffset}
          total={counts?.processed ?? 0}
          hrefFor={(offset) =>
            `/dashboard/pipeline${pipelineQueryString({ ...filters, pOffset: offset })}`
          }
        >
          {processed.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="Nothing processed yet"
              description="Select leads on the left and run the agent, or tick one off by hand."
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {processed.map((item) => (
                  <li key={key(item)} data-testid="processed-card" className="px-4 py-3">
                    <LeadCell item={item} />
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <DraftChip item={item} />
                      </div>
                      <RowButton
                        label="Return to queue"
                        icon={RotateCcw}
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => setProcessedAction(item.kind, item.id, false),
                            "Returned to the queue. Its draft was kept.",
                          )
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <caption className="sr-only">Processed leads</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted"
                      >
                        Lead
                      </th>
                      <th
                        scope="col"
                        className="w-40 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted"
                      >
                        Draft
                      </th>
                      <th scope="col" className="w-16 px-3 py-2.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border" data-testid="processed-body">
                    {processed.map((item) => (
                      <tr key={key(item)} data-testid="processed-row" className="align-top">
                        <td className="min-w-0 px-3 py-3">
                          <LeadCell item={item} />
                        </td>
                        <td className="px-3 py-3">
                          <DraftChip item={item} />
                        </td>
                        <td className="px-3 py-3">
                          <RowButton
                            label="Return to queue"
                            icon={RotateCcw}
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setProcessedAction(item.kind, item.id, false),
                                "Returned to the queue. Its draft was kept.",
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TableCard>
      </div>

      {/* On a phone the Process button is scrolled far above by the time you
          have ticked anything, so the action follows the selection down. Hidden
          at xl, where both controls and rows are on screen together. */}
      {selected.size > 0 && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur xl:hidden",
            // Clears the iOS home indicator without adding dead space elsewhere.
            "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
          )}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4">
            <span className="text-sm font-semibold tabular-nums">
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
              className="inline-grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-navy-800/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:hover:bg-white/10"
            >
              <X aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={processSelected}
              disabled={busy || !agentAvailable}
              aria-busy={pending}
              className={cn(
                "ml-auto inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold",
                "bg-navy-800 text-white transition-colors hover:bg-navy-700",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
            >
              {pending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Bot aria-hidden className="size-4" />
              )}
              Process {selected.size}
            </button>
          </div>
        </div>
      )}
      {/* Reserves the bar's height so the last row is never trapped under it. */}
      {selected.size > 0 && <div aria-hidden className="h-20 xl:hidden" />}
    </div>
  );
}

/**
 * A checkbox with a 44px hit area.
 *
 * The input itself stays 16px — a giant checkbox looks wrong — so the padding
 * on the wrapping label is what makes it tappable. `-m-3` pulls the layout back
 * in so the enlarged target costs no visual space.
 */
function CheckboxTarget({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="-m-3 inline-flex size-11 cursor-pointer items-center justify-center p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="size-4 accent-coral-500"
      />
    </label>
  );
}

function LeadCell({ item }: { item: PipelineItem }) {
  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</p>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open "${item.title}" on ${item.source ?? "the source site"} in a new tab`}
            className="-m-2.5 grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
          >
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
        )}
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
        {truncate(item.preview, 120) || "No text captured."}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Chip tone={item.kind === "lead" ? "coral" : "muted"}>
          {item.kind === "lead" ? "Enquiry" : "Job post"}
        </Chip>
        {item.contact_email ? (
          <Chip tone="mint" icon={Mail}>
            {item.contact_email}
          </Chip>
        ) : (
          <Chip tone="muted">No contact</Chip>
        )}
      </div>
    </div>
  );
}

/** A chip is only ~24px tall, so the link around it carries the tap target. */
const DRAFT_LINK =
  "inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:min-h-0";

/** What happened to this lead's draft, if it has one. */
function DraftChip({ item }: { item: PipelineItem }) {
  // Rejected by the qualifier: a decision, not a missing draft. Shown before
  // the no-draft fallback, and with its reason, or the table reads as if the
  // agent silently skipped the row.
  if (item.qualified === false) {
    return (
      <div className="min-w-0">
        <Chip tone="muted" icon={Ban}>
          Not a fit
        </Chip>
        {item.fit_reason && (
          <p
            className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted"
            title={item.fit_reason}
          >
            {item.fit_reason}
          </p>
        )}
      </div>
    );
  }

  if (!item.draft_id) {
    return (
      <span className="text-xs text-muted">
        {item.processed_by === "manual" ? "Ticked off by hand" : "No draft"}
      </span>
    );
  }
  if (item.draft_status === "sent") {
    return (
      <Link href="/dashboard/drafts" prefetch={false} className={DRAFT_LINK}>
        <Chip tone="mint" icon={Send}>
          Sent
        </Chip>
      </Link>
    );
  }
  if (item.draft_channel === "manual") {
    return (
      <Link href="/dashboard/drafts" prefetch={false} className={DRAFT_LINK}>
        <Chip tone="amber" icon={Hand}>
          Send by hand
        </Chip>
      </Link>
    );
  }
  return (
    <Link href="/dashboard/drafts" prefetch={false} className={DRAFT_LINK}>
      <Chip tone="coral" icon={Mail}>
        In outbox
      </Chip>
    </Link>
  );
}

function RowButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof Hand;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        // 44px on touch, tightened at sm+ where the pointer is precise.
        "inline-grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors pointer-fine:size-9",
        "hover:bg-navy-800/6 hover:text-foreground dark:hover:bg-white/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      <Icon aria-hidden className="size-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function TableCard({
  title,
  subtitle,
  icon: Icon,
  tone,
  count,
  offset,
  total,
  hrefFor,
  children,
}: {
  title: string;
  subtitle: React.ReactNode;
  icon: typeof Inbox;
  tone: "amber" | "mint";
  count: number;
  offset: number;
  total: number;
  hrefFor: (offset: number) => string;
  children: React.ReactNode;
}) {
  const hasPrev = offset > 0;
  const hasNext = offset + PIPELINE_PAGE_SIZE < total;

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface shadow-soft">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Icon
          aria-hidden
          className={cn("size-4 shrink-0", tone === "amber" ? "text-amber-ink" : "text-mint-ink")}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-bold">{title}</h2>
          <p className="truncate text-[11px] text-muted">{subtitle}</p>
        </div>
        <Chip tone={tone}>{count}</Chip>
      </header>

      <div className="min-w-0 flex-1">{children}</div>

      {(hasPrev || hasNext) && (
        <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs">
          <span className="tabular-nums text-muted">
            {offset + 1}–{Math.min(offset + PIPELINE_PAGE_SIZE, total)} of {total}
          </span>
          <span className="flex gap-1.5">
            <PageLink
              href={hrefFor(Math.max(0, offset - PIPELINE_PAGE_SIZE))}
              disabled={!hasPrev}
            >
              Previous
            </PageLink>
            <PageLink
              href={hrefFor(offset + PIPELINE_PAGE_SIZE)}
              disabled={!hasNext}
            >
              Next
            </PageLink>
          </span>
        </footer>
      )}
    </section>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="inline-flex min-h-11 items-center rounded-lg px-3 text-muted/45"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-coral-ink hover:bg-coral-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
    >
      {children}
    </Link>
  );
}

import { CheckCircle2, ShieldAlert } from "lucide-react";
import type { PrefilterDryRun, PrefilterVerdictSample } from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/dashboard/format";
import { Chip } from "./primitives";
import { cn } from "@/lib/utils";

/**
 * The dry-run verdict, laid out so one number decides the outcome.
 *
 * `false_kills` is the acceptance metric: posts the agent had already judged
 * QUALIFIED that these keywords would have discarded. A prefiltered post never
 * reaches the agent and has no retry path, so a single false kill is a lead
 * thrown away silently — which is why it gets the headline and everything else
 * gets a small muted row underneath.
 *
 * The supporting counts are deliberately quiet. `true_kills` in particular is
 * the tempting number (it is the money saved) and it must not be read as a
 * score to maximise: a list that kills 900 posts and loses one real lead is a
 * worse list than one that kills 400 and loses none.
 */
export function PrefilterReport({ report }: { report: PrefilterDryRun }) {
  const safe = report.false_kills === 0;

  return (
    <div className="flex flex-col gap-4" data-testid="prefilter-report">
      <div
        data-testid="prefilter-false-kills"
        className={cn(
          "flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border p-5",
          safe
            ? "border-mint-500/30 bg-mint-500/8"
            : "border-coral-500/30 bg-coral-500/8",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl",
            safe ? "bg-mint-500/16 text-mint-ink" : "bg-coral-500/14 text-coral-ink",
          )}
        >
          {safe ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <ShieldAlert className="size-5" />
          )}
        </span>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            False kills
          </p>
          <p
            className={cn(
              "font-display text-4xl font-bold leading-none tabular-nums",
              safe ? "text-mint-ink" : "text-coral-ink",
            )}
          >
            {formatNumber(report.false_kills)}
          </p>
        </div>

        <p className="min-w-0 flex-1 basis-64 text-sm leading-relaxed">
          {safe ? (
            <>
              No post the agent qualified would have been thrown away. Across{" "}
              {formatNumber(report.judged)} already-judged post
              {report.judged === 1 ? "" : "s"}, these keywords are safe to
              enable.
            </>
          ) : (
            <>
              <strong className="font-semibold">
                {formatNumber(report.false_kills)} qualified lead
                {report.false_kills === 1 ? "" : "s"}
              </strong>{" "}
              would have been discarded before the agent ever saw{" "}
              {report.false_kills === 1 ? "it" : "them"}. Fix or narrow the
              keywords named below, then run this again. The bar for enabling is
              zero.
            </>
          )}
        </p>
      </div>

      <SupportingCounts report={report} />

      {report.false_kill_samples.length > 0 && (
        <FalseKillSamples samples={report.false_kill_samples} />
      )}

      {report.samples.length > 0 && <VerdictSpread samples={report.samples} />}
    </div>
  );
}

/** Context for the headline. Small on purpose — see the file comment. */
function SupportingCounts({ report }: { report: PrefilterDryRun }) {
  const counts: { label: string; value: number; hint: string }[] = [
    { label: "Scanned", value: report.scanned, hint: "Posts replayed" },
    { label: "Judged", value: report.judged, hint: "Have an agent verdict" },
    { label: "Would reject", value: report.would_reject, hint: "Killed by a keyword" },
    { label: "Would pass", value: report.would_pass, hint: "Still cost a turn" },
    { label: "True kills", value: report.true_kills, hint: "Rejects caught free" },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
      {counts.map((c) => (
        <div key={c.label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {c.label}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums">
            {formatNumber(c.value)}
            <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted">
              {c.hint}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Every false kill, with the keyword that caused it.
 *
 * Naming the keyword is the point: "3 false kills" is a grade, but "'wordpress'
 * killed this qualified post" is a one-line edit. Cards below `md` and a table
 * above, with distinct testids so the two renderings never double-count.
 */
function FalseKillSamples({ samples }: { samples: PrefilterVerdictSample[] }) {
  return (
    <div className="rounded-xl border border-coral-500/30">
      <p className="border-b border-coral-500/20 px-4 py-2.5 text-xs font-semibold text-coral-ink">
        Qualified posts these keywords would have discarded
      </p>

      <ul className="divide-y divide-border md:hidden" data-testid="prefilter-false-kill-cards">
        {samples.map((s) => (
          <li key={`${s.kind}-${s.id}`} className="flex flex-col gap-2 px-4 py-3">
            <span className="text-sm font-semibold leading-snug">{s.title}</span>
            <MatchedKeywords matched={s.matched} />
          </li>
        ))}
      </ul>

      {/* Scrolls in its own box: a long title must not widen the page. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm" data-testid="prefilter-false-kill-table">
          <thead className="text-xs text-muted">
            <tr className="border-b border-border">
              <th scope="col" className="px-4 py-2 font-medium">Post the agent qualified</th>
              <th scope="col" className="px-4 py-2 font-medium">Keyword that killed it</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border" data-testid="prefilter-false-kill-body">
            {samples.map((s) => (
              <tr key={`${s.kind}-${s.id}`} className="align-top">
                <td className="px-4 py-3 leading-snug">{s.title}</td>
                <td className="px-4 py-3">
                  <MatchedKeywords matched={s.matched} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * A spread of ordinary verdicts, folded away.
 *
 * Useful for sanity-checking that the rules fire at all, but it is not the
 * decision — so it opens only if asked for, and cannot crowd the headline.
 */
function VerdictSpread({ samples }: { samples: PrefilterVerdictSample[] }) {
  return (
    <details className="rounded-xl border border-border">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 text-xs font-semibold text-muted">
        Sample verdicts ({samples.length})
      </summary>
      <ul className="divide-y divide-border border-t border-border">
        {samples.map((s) => (
          <li key={`${s.kind}-${s.id}`} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <VerdictChip verdict={s.verdict} />
              <span className="text-xs text-muted">{s.kind}</span>
            </div>
            <span className="text-sm leading-snug">{s.title}</span>
            {s.matched.length > 0 && <MatchedKeywords matched={s.matched} />}
          </li>
        ))}
      </ul>
    </details>
  );
}

function MatchedKeywords({ matched }: { matched: string[] }) {
  if (matched.length === 0) {
    return <span className="text-xs text-muted">no keyword matched</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {matched.map((keyword) => (
        <Chip key={keyword} tone="coral" className="font-mono">
          {keyword}
        </Chip>
      ))}
    </span>
  );
}

function VerdictChip({ verdict }: { verdict: PrefilterVerdictSample["verdict"] }) {
  if (verdict === "reject") return <Chip tone="coral">reject</Chip>;
  if (verdict === "keep") return <Chip tone="mint">keep — override</Chip>;
  return <Chip tone="muted">pass — goes to the agent</Chip>;
}

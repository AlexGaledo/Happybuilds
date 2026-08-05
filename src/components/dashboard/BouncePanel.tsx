import { AlertTriangle, MailWarning, ShieldAlert, Timer } from "lucide-react";
import type { BounceStats } from "@/lib/dashboard/types";
import { absoluteTime, relativeTime, truncate } from "@/lib/dashboard/format";
import { Chip, EmptyState, Panel, PanelHeader } from "./primitives";
import { StatCard } from "./StatCard";

/**
 * Bounce rate for the sending domain.
 *
 * Why this panel exists at all: `fickles.tech` is a young sending domain, and
 * the fastest way to burn it is mailing addresses that do not exist. The
 * drafting agent recovers recipient addresses by web lookup, so they are
 * *guesses* until something delivers. Bounce rate is the feedback loop on that
 * guess, and without it a bad batch is invisible until deliverability is
 * already gone.
 *
 * The thresholds below are the industry-standard read: under 2% is healthy,
 * 2–5% wants attention, over 5% is where mailbox providers start throttling
 * and filtering a domain. Hard bounces are weighted separately because they
 * are the ones that signal a bad list rather than a bad afternoon.
 */
export function BouncePanel({ stats }: { stats: BounceStats | null }) {
  if (!stats) {
    return (
      <Panel>
        <PanelHeader title="Deliverability" />
        <EmptyState
          icon={MailWarning}
          title="Bounce stats unavailable"
          description="The API did not return bounce data. Everything else on this page is still live."
        />
      </Panel>
    );
  }

  const { rate, hardRate, tone, verdict } = readRate(stats);

  return (
    <Panel>
      <PanelHeader
        title="Deliverability"
        description={`Bounces on the ${stats.sent.toLocaleString("en-US")} message${
          stats.sent === 1 ? "" : "s"
        } sent in the last ${stats.window_days} days.`}
      />

      <div className="grid grid-cols-2 gap-3 px-5 py-4 lg:grid-cols-4">
        <StatCard
          label="Bounce rate"
          value={rate}
          tone={tone}
          icon={<MailWarning aria-hidden className="size-4" />}
          hint={verdict}
        />
        <StatCard
          label="Hard bounces"
          value={stats.hard}
          tone={stats.hard > 0 ? "coral" : "navy"}
          icon={<ShieldAlert aria-hidden className="size-4" />}
          hint={
            stats.hard > 0
              ? `${hardRate} — permanent. Stop mailing these addresses.`
              : "Permanent failures. None recorded."
          }
        />
        <StatCard
          label="Soft bounces"
          value={stats.soft}
          tone={stats.soft > 0 ? "amber" : "navy"}
          icon={<Timer aria-hidden className="size-4" />}
          hint="Transient — full mailbox, greylisting. Retrying is fine."
        />
        <StatCard
          label="Send failures"
          value={stats.send_failures}
          tone={stats.send_failures > 0 ? "amber" : "navy"}
          icon={<AlertTriangle aria-hidden className="size-4" />}
          hint="Rejected at SMTP time — never left this host. Not a bounce."
        />
      </div>

      {stats.recent.length === 0 ? (
        <EmptyState
          icon={MailWarning}
          title="No bounces recorded"
          description={
            stats.sent === 0
              ? "Nothing has been sent yet, so there is nothing to bounce."
              : "Every message sent in this window was accepted by the receiving server."
          }
        />
      ) : (
        <div className="border-t border-border">
          {/* Cards below md, table above — the same split the dense tables use,
              with a distinct testid so the two renderings never double-count. */}
          <ul
            className="divide-y divide-border md:hidden"
            data-testid="bounce-cards"
          >
            {stats.recent.map((b) => (
              <li key={b.draft_id} className="flex flex-col gap-1.5 px-5 py-3">
                <div className="flex items-center gap-2">
                  <KindChip kind={b.kind} />
                  <span className="font-mono text-xs text-muted">{b.code ?? "—"}</span>
                </div>
                <span className="font-mono text-xs break-all">
                  {b.recipient_email ?? "unknown recipient"}
                </span>
                <span className="text-xs text-muted">{truncate(b.detail, 120)}</span>
                <time
                  className="text-[11px] text-muted"
                  dateTime={b.bounced_at ?? undefined}
                  title={absoluteTime(b.bounced_at)}
                >
                  {relativeTime(b.bounced_at)}
                </time>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm" data-testid="bounce-table">
              <thead className="text-xs text-muted">
                <tr className="border-b border-border">
                  <th scope="col" className="px-5 py-2 font-medium">Kind</th>
                  <th scope="col" className="px-3 py-2 font-medium">Recipient</th>
                  <th scope="col" className="px-3 py-2 font-medium">Code</th>
                  <th scope="col" className="px-3 py-2 font-medium">Reason</th>
                  <th scope="col" className="px-5 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border" data-testid="bounce-body">
                {stats.recent.map((b) => (
                  <tr key={b.draft_id} className="align-top">
                    <td className="px-5 py-3">
                      <KindChip kind={b.kind} />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs break-all">
                      {b.recipient_email ?? "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{b.code ?? "—"}</td>
                    <td className="min-w-0 px-3 py-3 text-xs text-muted">
                      {truncate(b.detail, 160) || "—"}
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap text-muted">
                      <time
                        dateTime={b.bounced_at ?? undefined}
                        title={absoluteTime(b.bounced_at)}
                      >
                        {relativeTime(b.bounced_at)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}

function KindChip({ kind }: { kind: string | null }) {
  if (kind === "hard") return <Chip tone="coral">hard</Chip>;
  if (kind === "soft") return <Chip tone="amber">soft</Chip>;
  return <Chip tone="muted">unknown</Chip>;
}

/**
 * Turn the rate into something with a verdict attached.
 *
 * A bare percentage is not actionable — 3% means nothing unless you know that
 * mailbox providers start throttling somewhere above it. `null` (nothing sent)
 * renders as an em dash rather than 0%, because a 0% bounce rate on zero sends
 * reads as a clean bill of health that has not been earned.
 */
function readRate(stats: BounceStats) {
  const rate = stats.rate === null ? "—" : `${stats.rate}%`;
  const hardRate = stats.hard_rate === null ? "—" : `${stats.hard_rate}%`;

  if (stats.rate === null) {
    return {
      rate,
      hardRate,
      tone: "navy" as const,
      verdict: "Nothing sent in this window yet.",
    };
  }
  if (stats.rate >= 5) {
    return {
      rate,
      hardRate,
      tone: "coral" as const,
      verdict: "Above 5% — providers throttle domains here. Stop and clean the list.",
    };
  }
  if (stats.rate >= 2) {
    return {
      rate,
      hardRate,
      tone: "amber" as const,
      verdict: "2–5% — worth attention before increasing volume.",
    };
  }
  return {
    rate,
    hardRate,
    tone: "mint" as const,
    verdict: "Under 2% — healthy for a young sending domain.",
  };
}

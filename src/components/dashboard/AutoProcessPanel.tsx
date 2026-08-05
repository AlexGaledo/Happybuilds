"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CirclePause, Gauge, Inbox, Loader2, Save } from "lucide-react";
import type {
  AutoProcessConfig,
  AutoProcessConfigUpdate,
} from "@/lib/dashboard/types";
import { saveAutoProcessAction } from "@/lib/dashboard/actions";
import {
  AUTOPROCESS_MAX_BATCH_SIZE,
  AUTOPROCESS_MAX_DAILY_CAP,
  AUTOPROCESS_MIN_BATCH_SIZE,
  AUTOPROCESS_MIN_DAILY_CAP,
  AUTOPROCESS_RUNS_PER_DAY,
  formatAgentTime,
  readCount,
  readThroughput,
  type NumberFieldState,
} from "@/lib/dashboard/autoprocess";
import { absoluteTime, formatNumber, percent, relativeTime } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

/**
 * Automatic lead processing — the schedule and the budget that bounds it.
 *
 * This is a spend control, and only a spend control. ~640 leads a day survive
 * the keyword prefilter, a batch of ten costs 3–6 minutes of `claude -p`, and
 * keeping up with the intake would be roughly five hours a day of agent time
 * charged to a personal Claude subscription — not to an API key that would stop
 * at a limit. The cap is the only thing standing in front of that, so the panel
 * leads with what has already been spent rather than with the settings.
 *
 * The neighbouring prefilter panel warns in amber because it discards leads
 * permanently. This one deliberately does not borrow that intensity: turning it
 * on loses nothing and sends nothing, it just costs. Matching the prefilter's
 * alarm here would teach an operator to ignore both.
 *
 * The copy states in three places that enabling sends no mail, because the
 * opposite is the natural assumption from a switch labelled "automatic" on a
 * tool whose job is outreach. Drafts land in the outbox at `ready`; the Drafts
 * tab is still the only thing that sends.
 */
export function AutoProcessPanel({ initial }: { initial: AutoProcessConfig }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  // The last shape known to be stored. The budget readout reads from this and
  // not from the boxes, so it always describes what is actually happening —
  // the boxes describe what *would* happen, which is a different question and
  // gets its own line further down.
  const [saved, setSaved] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [batchText, setBatchText] = useState(String(initial.batch_size));
  const [capText, setCapText] = useState(String(initial.daily_cap));

  const batch = readCount(batchText, {
    min: AUTOPROCESS_MIN_BATCH_SIZE,
    max: AUTOPROCESS_MAX_BATCH_SIZE,
    label: "Batch size",
  });
  const cap = readCount(capText, {
    min: AUTOPROCESS_MIN_DAILY_CAP,
    max: AUTOPROCESS_MAX_DAILY_CAP,
    label: "Daily cap",
  });
  const valid = batch.valid && cap.valid;

  const dirty =
    enabled !== saved.enabled ||
    batch.value !== saved.batch_size ||
    cap.value !== saved.daily_cap;

  function save() {
    if (!valid || batch.value === null || cap.value === null) return;
    const payload: AutoProcessConfigUpdate = {
      enabled,
      batch_size: batch.value,
      daily_cap: cap.value,
    };

    setFeedback(null);
    startTransition(async () => {
      const result = await saveAutoProcessAction(payload);
      if (result.ok && result.config) {
        // Adopt what came back rather than assuming the sent values stuck —
        // the response also carries fresh budget counters.
        setSaved(result.config);
        setEnabled(result.config.enabled);
        setBatchText(String(result.config.batch_size));
        setCapText(String(result.config.daily_cap));
        setFeedback({ tone: "ok", text: "Saved." });
        router.refresh();
      } else {
        setFeedback({ tone: "error", text: result.error ?? "Could not save" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted">
        Runs a drafting batch on a schedule instead of waiting for you to press
        Process. Every{" "}
        <strong className="font-semibold text-foreground">2 hours</strong>, the
        cron takes the oldest unqualified leads, up to the batch size below, and
        stops for the day once the cap is reached.
      </p>

      {/* The one thing an operator will assume the opposite of, stated once and
          prominently — the same treatment the prefilter gives "keep wins".
          Mint rather than amber: this is reassurance, not a hazard. */}
      <p className="flex items-start gap-2 rounded-xl border border-mint-500/30 bg-mint-500/8 px-3.5 py-3 text-sm leading-relaxed">
        <Inbox aria-hidden className="mt-0.5 size-4 shrink-0 text-mint-ink" />
        <span>
          <strong className="font-semibold">This sends no email.</strong>{" "}
          Scheduled runs write drafts into the outbox at{" "}
          <code className="font-mono text-[11px]">ready</code> and stop there.
          Mail only leaves when you press Send on the Drafts tab. What this
          switch costs is agent time, not messages.
        </span>
      </p>

      <BudgetReadout config={saved} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          id="autoprocess-batch-size"
          label="Batch size"
          hint={`Leads handed to the agent per scheduled run. ${AUTOPROCESS_MIN_BATCH_SIZE}–${AUTOPROCESS_MAX_BATCH_SIZE}.`}
          value={batchText}
          onChange={setBatchText}
          field={batch}
          disabled={pending}
        />
        <NumberField
          id="autoprocess-daily-cap"
          label="Daily cap"
          hint={`Most leads drafted in any rolling 24 hours. ${AUTOPROCESS_MIN_DAILY_CAP}–${AUTOPROCESS_MAX_DAILY_CAP}.`}
          value={capText}
          onChange={setCapText}
          field={cap}
          disabled={pending}
        />
      </div>

      <Projection batch={batch.value} cap={cap.value} spent={saved.processed_last_24h} />

      <div className="rounded-xl border border-border px-3 py-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            data-testid="autoprocess-enabled"
            className="mt-0.5 size-4 shrink-0 accent-coral-500"
          />
          <span className="text-sm leading-relaxed">
            <strong className="font-semibold">
              Draft automatically on the schedule
            </strong>
            <span className="mt-0.5 block text-xs text-muted">
              Off by default. While off, these numbers are stored but nothing
              runs on its own — drafting only happens when you press Process on
              the Pipeline tab, and that still counts against the cap.
            </span>
          </span>
        </label>

        {enabled && (
          <p
            role="note"
            className="mt-2 flex items-start gap-2 rounded-lg bg-navy-800/[0.04] px-2.5 py-2 text-xs leading-relaxed dark:bg-white/5"
          >
            <Gauge aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted" />
            <span>
              Agent time is billed to the Claude subscription on the API host,
              which has no spend ceiling of its own — the daily cap is the
              ceiling. Runs are skipped, never queued, so a batch that hits the
              cap does not catch up later. Still nothing sends.
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty || !valid}
          aria-busy={pending}
          data-testid="autoprocess-save"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden className="size-4" />
          )}
          Save schedule
        </button>

        {dirty && !pending && <span className="text-xs text-amber-ink">Unsaved</span>}

        <p
          aria-live="polite"
          className={cn(
            "text-xs",
            feedback?.tone === "error" ? "text-coral-ink" : "text-mint-ink",
          )}
        >
          {feedback?.text ?? ""}
        </p>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        A scheduled batch and one you start by hand share the same Redis lock,
        so they cannot collide — whichever is second is skipped rather than run
        twice.
      </p>
    </div>
  );
}

/**
 * What the budget has actually done in the last 24 hours.
 *
 * The most useful thing on the panel, so it comes before the settings. A bar
 * rather than a bare fraction because the question it answers is "how much room
 * is left", which is a proportion — but the bar is `aria-hidden` and every
 * figure it encodes is also written out, since a coloured strip is not a
 * readout on its own.
 *
 * The "includes manual runs" note is not a footnote-grade detail. The cap
 * counts drafted rows, not scheduled runs, so an operator who drafts fifty by
 * hand from the Pipeline tab has spent that budget too — without the sentence
 * the number reads as broken.
 */
function BudgetReadout({ config }: { config: AutoProcessConfig }) {
  const used = config.processed_last_24h;
  const share = percent(used, config.daily_cap);
  const exhausted = config.remaining_today <= 0;

  return (
    <div
      data-testid="autoprocess-budget"
      className="rounded-xl border border-border px-4 py-3.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Drafted in the last 24 hours
        </p>
        <p className="text-xs tabular-nums text-muted">{share}% of cap</p>
      </div>

      <p className="mt-1 text-sm">
        <span className="font-display text-2xl font-bold tabular-nums">
          {formatNumber(used)}
        </span>
        <span className="text-muted"> of {formatNumber(config.daily_cap)}</span>
        <span className="ml-2 font-semibold tabular-nums">
          {formatNumber(Math.max(config.remaining_today, 0))} left
        </span>
      </p>

      {/* Same bar idiom as the category breakdown: decorative, capped at 100%
          so an over-budget window cannot overflow its track. */}
      <span
        aria-hidden
        className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-navy-800/6 dark:bg-white/10"
      >
        <span
          className={cn(
            "block h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out-soft)]",
            exhausted ? "bg-amber-500" : "bg-navy-500",
          )}
          style={{ width: `${Math.min(Math.max(share, 2), 100)}%` }}
        />
      </span>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        Counts leads drafted, not runs fired — so batches you started by hand on
        the Pipeline tab are in this number too. The window rolls continuously
        rather than resetting at midnight, so room frees up gradually.
        {config.last_run_at ? (
          <>
            {" "}
            Last scheduled run{" "}
            {/* Rendered client-side, so the server's "3 minutes ago" and the
                browser's can land either side of a rounding boundary. The
                absolute time in the tooltip is the authoritative one. */}
            <time
              suppressHydrationWarning
              dateTime={config.last_run_at}
              title={absoluteTime(config.last_run_at)}
              className="font-medium text-foreground"
            >
              {relativeTime(config.last_run_at)}
            </time>
            .
          </>
        ) : null}
      </p>

      {exhausted && (
        <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-amber-ink">
          <CirclePause aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            The cap is spent. Scheduled runs skip until earlier drafts roll out
            of the 24-hour window. Nothing is queued up waiting.
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * What the numbers in the boxes would actually produce.
 *
 * The batch size and the cap are two independent ceilings and only the lower
 * one is real. Without this line, a batch of 50 against a cap of 60 looks
 * generous and in practice stops before mid-morning — the exact
 * misconfiguration this panel is shaped to prevent. Reads from the boxes, not
 * from the saved config, so it answers "what am I about to save".
 */
function Projection({
  batch,
  cap,
  spent,
}: {
  batch: number | null;
  cap: number | null;
  spent: number;
}) {
  // Nothing worth projecting from a half-typed box; the field's own error is
  // already saying what is wrong.
  if (batch === null || cap === null) return null;

  const { ceiling, effective, limitedBy } = readThroughput(batch, cap);

  return (
    <p
      data-testid="autoprocess-projection"
      className="rounded-xl bg-navy-800/[0.04] px-3.5 py-3 text-xs leading-relaxed dark:bg-white/5"
    >
      <span className="text-muted">
        {formatNumber(batch)} per run × {AUTOPROCESS_RUNS_PER_DAY} runs a day is
        a ceiling of {formatNumber(ceiling)}. Against a cap of{" "}
        {formatNumber(cap)}, the effective rate is{" "}
      </span>
      <strong className="font-semibold">
        {formatNumber(effective)} leads a day
      </strong>
      <span className="text-muted">
        {" — roughly "}
        {formatAgentTime(effective)} of agent time.{" "}
        {limitedBy === "cap" &&
          "The cap is what binds: runs stop part-way through the day, so raising the batch size alone changes nothing. "}
        {limitedBy === "schedule" &&
          "The schedule is what binds: the cap is never reached, so lowering it alone changes nothing. "}
        {limitedBy === "both" && "Both limits land on the same number. "}
      </span>
      {cap <= spent && (
        <strong className="font-semibold text-amber-ink">
          This cap is at or below the {formatNumber(spent)} already drafted in
          the last 24 hours, so saving it pauses drafting until some of that
          rolls off.
        </strong>
      )}
    </p>
  );
}

/**
 * One bounded number.
 *
 * `type="text"` with `inputMode="numeric"` rather than `type="number"`: a
 * numeric input hands back an empty string for unparseable text in Chrome,
 * which collapses "you typed nonsense" and "you cleared the box" into the same
 * state and leaves nothing to name in the error. It also silently clamps on
 * some platforms, which is precisely what this panel must not do. `inputMode`
 * still gets the numeric keypad on a phone.
 */
function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  field,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  field: NumberFieldState;
  disabled: boolean;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="min-w-0">
      <label className="block" htmlFor={id}>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
          {hint}
        </span>
        <input
          id={id}
          data-testid={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={field.error !== null}
          aria-describedby={field.error ? errorId : undefined}
          className={cn(
            // text-base by default so iOS does not zoom the page on focus;
            // only shrinks where a real pointer is driving.
            "mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 py-2 font-mono text-base tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:opacity-60 pointer-fine:text-sm",
            field.error ? "border-coral-500/50" : "border-border",
          )}
        />
      </label>

      {field.error && (
        <p id={errorId} className="mt-1 text-xs leading-relaxed text-coral-ink">
          {field.error}
        </p>
      )}
    </div>
  );
}

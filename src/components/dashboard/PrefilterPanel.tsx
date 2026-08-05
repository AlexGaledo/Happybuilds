"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2, RotateCcw, Save, TriangleAlert } from "lucide-react";
import type {
  PrefilterConfig,
  PrefilterConfigUpdate,
  PrefilterDryRun,
} from "@/lib/dashboard/types";
import {
  dryRunPrefilterAction,
  resetPrefilterAction,
  savePrefilterAction,
} from "@/lib/dashboard/actions";
import {
  PREFILTER_MAX_KEYWORDS,
  PREFILTER_MAX_KEYWORD_CHARS,
  keywordsToText,
  readKeywordList,
  type KeywordListState,
} from "@/lib/dashboard/prefilter";
import { PrefilterReport } from "./PrefilterReport";
import { Chip } from "./primitives";
import { cn } from "@/lib/utils";

type Busy = "save" | "reset" | "dry-run" | null;
type Feedback = { tone: "ok" | "error"; text: string } | null;

/** Identifies the lists a dry-run report was produced for, so an edit made
 * afterwards can mark that report stale instead of leaving it looking current. */
function signature(reject: string[], keep: string[]): string {
  return JSON.stringify([reject, keep]);
}

/**
 * Keyword prefilter editor.
 *
 * The scraper brings in ~1030 posts a day and the agent rejects roughly two
 * thirds of them, one full agent turn each. Keyword matching kills the obvious
 * ones for free. These lists change with what the market posts, so they are
 * edited here rather than in code.
 *
 * The switch is separated from the lists on purpose, the same way the special
 * instruction separates its own. Editing keywords with the prefilter off costs
 * nothing and is reversible. Turning it on makes those keywords drop real posts
 * out of the queue permanently — there is no retry path for a post that was
 * never handed to the agent — so it is a deliberate second action, and Dry run
 * exists to be used before it.
 */
export function PrefilterPanel({ initial }: { initial: PrefilterConfig }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Busy>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // The last shape known to be stored, so "unsaved" is computed against the
  // server's normalised lists rather than against whatever was first rendered.
  const [saved, setSaved] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [rejectText, setRejectText] = useState(keywordsToText(initial.reject_keywords));
  const [keepText, setKeepText] = useState(keywordsToText(initial.keep_keywords));

  // The signature is carried alongside the report so a later edit can mark it
  // stale. A "0 false kills" verdict sitting next to keywords it never saw is
  // precisely the misread this panel is built to avoid.
  const [report, setReport] = useState<{
    data: PrefilterDryRun;
    signature: string;
  } | null>(null);

  const reject = readKeywordList(rejectText);
  const keep = readKeywordList(keepText);
  const listsValid = reject.valid && keep.valid;
  const currentSignature = signature(reject.keywords, keep.keywords);

  const dirty =
    enabled !== saved.enabled ||
    currentSignature !== signature(saved.reject_keywords, saved.keep_keywords);

  const reportStale = report !== null && report.signature !== currentSignature;
  const cleanRun = report !== null && !reportStale && report.data.false_kills === 0;
  /** Enabling without a clean dry run is the failure mode this panel exists to
   * prevent, so it is called out rather than silently permitted. */
  const enablingUnverified = enabled && !saved.enabled && !cleanRun;

  function payload(): PrefilterConfigUpdate {
    return {
      enabled,
      reject_keywords: reject.keywords,
      keep_keywords: keep.keywords,
    };
  }

  /** Adopt a config the server just returned — the normalised lists land in the
   * boxes, so nothing about the round trip is a surprise. */
  function adopt(config: PrefilterConfig) {
    setSaved(config);
    setEnabled(config.enabled);
    setRejectText(keywordsToText(config.reject_keywords));
    setKeepText(keywordsToText(config.keep_keywords));
  }

  function run(kind: Exclude<Busy, null>) {
    setBusy(kind);
    setFeedback(null);
    startTransition(async () => {
      if (kind === "dry-run") {
        const result = await dryRunPrefilterAction(payload());
        if (result.ok && result.report) {
          setReport({ data: result.report, signature: currentSignature });
        } else {
          setFeedback({ tone: "error", text: result.error ?? "Dry run failed" });
        }
      } else {
        const result =
          kind === "save" ? await savePrefilterAction(payload()) : await resetPrefilterAction();
        if (result.ok && result.config) {
          adopt(result.config);
          setConfirmingReset(false);
          // A reset replaces the lists wholesale, so any report describes rules
          // that no longer exist.
          if (kind === "reset") setReport(null);
          setFeedback({ tone: "ok", text: kind === "save" ? "Saved." : "Defaults restored." });
          router.refresh();
        } else {
          setFeedback({ tone: "error", text: result.error ?? "Could not save" });
        }
      }
      setBusy(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted">
        Every scraped post costs one agent turn to qualify, and about two thirds
        come back rejected. Keywords kill the obvious rejects first, for free.
        Matching is against the post&rsquo;s{" "}
        <strong className="font-semibold text-foreground">
          title, category and job type only — never the description
        </strong>
        , because a word buried in a paragraph of prose says nothing about what
        the job is.
      </p>

      {/* The precedence rule, stated once and prominently. An operator who
          assumes reject-wins writes broad rules that quietly bin good leads. */}
      <p className="rounded-xl border border-mint-500/30 bg-mint-500/8 px-3.5 py-3 text-sm leading-relaxed">
        <strong className="font-semibold">Keep wins.</strong> A post matching
        both lists is <strong className="font-semibold">kept</strong> and goes to
        the agent — the keep list is an override, not a second reject list. That
        is what makes a broad reject rule safe: carve the exceptions back out
        with keep.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KeywordEditor
          id="prefilter-reject"
          label="Reject keywords"
          hint="Match one of these and the post is dropped without an agent turn."
          placeholder={"wordpress\nshopify\ngraphic design\nvideo editing"}
          value={rejectText}
          onChange={setRejectText}
          list={reject}
          disabled={pending}
        />
        <KeywordEditor
          id="prefilter-keep"
          label="Keep keywords (override)"
          hint="Rescues a post that a reject keyword would otherwise have killed."
          placeholder={"crm\nautomation\ninternal tool\ndashboard"}
          value={keepText}
          onChange={setKeepText}
          list={keep}
          disabled={pending}
        />
      </div>

      <div className="rounded-xl border border-border px-3 py-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            data-testid="prefilter-enabled"
            className="mt-0.5 size-4 shrink-0 accent-coral-500"
          />
          <span className="text-sm leading-relaxed">
            <strong className="font-semibold">
              Apply the prefilter to incoming posts
            </strong>
            <span className="mt-0.5 block text-xs text-muted">
              Off by default. While off, these lists are stored and can be dry
              run, but nothing is filtered — every post still reaches the agent.
            </span>
          </span>
        </label>

        {enabled && (
          <p
            role="note"
            className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/8 px-2.5 py-2 text-xs leading-relaxed text-amber-ink"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Rejected posts leave the queue permanently. They are never handed
              to the agent, so there is no draft, no reason recorded against
              them, and no retry — a keyword that is too broad loses leads
              silently.
              {enablingUnverified && (
                <>
                  {" "}
                  <strong className="font-semibold">
                    Run a dry run and get to zero false kills before saving this
                    on.
                  </strong>
                </>
              )}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run("dry-run")}
          disabled={pending || !listsValid}
          aria-busy={busy === "dry-run"}
          data-testid="prefilter-dry-run"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy === "dry-run" ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <FlaskConical aria-hidden className="size-4" />
          )}
          Dry run
        </button>

        <button
          type="button"
          onClick={() => run("save")}
          disabled={pending || !dirty || !listsValid}
          aria-busy={busy === "save"}
          data-testid="prefilter-save"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted transition-colors hover:bg-navy-800/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-white/10"
        >
          {busy === "save" ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden className="size-4" />
          )}
          Save keywords
        </button>

        {confirmingReset ? (
          <>
            <button
              type="button"
              onClick={() => run("reset")}
              disabled={pending}
              aria-busy={busy === "reset"}
              data-testid="prefilter-reset-confirm"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-coral-ink transition-colors hover:bg-coral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === "reset" && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Discard my lists
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-muted transition-colors hover:bg-navy-800/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </>
        ) : (
          // Two-step: restoring throws away every keyword the operator wrote,
          // and this button sits next to Save.
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            disabled={pending || saved.is_default}
            data-testid="prefilter-reset"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted transition-colors hover:bg-navy-800/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-white/10"
          >
            <RotateCcw aria-hidden className="size-4" />
            Restore defaults
          </button>
        )}

        {dirty && !pending && <span className="text-xs text-amber-ink">Unsaved</span>}
        {saved.is_default && !dirty && <Chip tone="muted">Shipped defaults</Chip>}

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
        Dry run grades the keywords in the boxes above — including unsaved edits
        — by replaying them over posts the agent has already judged. It writes
        nothing and filters nothing.
      </p>

      {report && (
        <div className="flex flex-col gap-2">
          {reportStale && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-500/8 px-2.5 py-2 text-xs leading-relaxed text-amber-ink">
              <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>
                The keywords have changed since this ran. These numbers describe
                the previous lists — run it again.
              </span>
            </p>
          )}
          <div className={cn(reportStale && "opacity-60")}>
            <PrefilterReport report={report.data} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One keyword list, as a textarea.
 *
 * A textarea rather than a tag/chip widget: these lists run to ~25 entries and
 * are maintained in bulk — pasted in, sorted, half of them deleted at once.
 * A chip widget makes every one of those a separate interaction and gives no
 * way to see the whole list at a glance, and the value is plain lowercase words
 * with no structure that a richer control could enforce.
 */
function KeywordEditor({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  list,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  list: KeywordListState;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="block" htmlFor={id}>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
          {hint} One per line.
        </span>
        <textarea
          id={id}
          data-testid={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={10}
          spellCheck={false}
          placeholder={placeholder}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:opacity-60 pointer-fine:text-xs"
        />
      </label>

      <p
        className={cn(
          "mt-1 text-xs",
          list.overCap ? "text-coral-ink" : "text-muted",
        )}
      >
        {list.count}/{PREFILTER_MAX_KEYWORDS} keywords
        <span className="text-muted">
          {" "}
          · stored lowercase, duplicates dropped
        </span>
      </p>

      {list.overCap && (
        <p className="mt-1 text-xs leading-relaxed text-coral-ink">
          Over the {PREFILTER_MAX_KEYWORDS}-keyword cap. Remove{" "}
          {list.count - PREFILTER_MAX_KEYWORDS} before saving.
        </p>
      )}

      {list.tooLong.length > 0 && (
        <p className="mt-1 text-xs leading-relaxed text-coral-ink">
          Longer than {PREFILTER_MAX_KEYWORD_CHARS} characters and would be cut:{" "}
          <span className="font-mono break-all">{list.tooLong.join(", ")}</span>.
          Shorten to the part that actually matches.
        </p>
      )}
    </div>
  );
}

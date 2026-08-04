"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles, TriangleAlert } from "lucide-react";
import type { SpecialInstruction } from "@/lib/dashboard/types";
import { saveInstructionAction } from "@/lib/dashboard/actions";
import { cn } from "@/lib/utils";

/**
 * Standing context for the agent, editable here rather than in the environment.
 *
 * Everything else on this page requires a deploy to change, and should — it
 * describes wiring. This is the one setting that is genuinely editorial, so it
 * lives in `app_settings` and is written from the browser.
 *
 * The toggle is separated from the text on purpose. Typing into the box only
 * affects template generation, which is reviewed before anything is saved.
 * Turning the switch on routes the same text into the drafting agent's system
 * prompt, where it shapes messages that go out as real mail — so it is an
 * explicit second action, and the copy says what it costs.
 */
export function InstructionPanel({ initial }: { initial: SpecialInstruction }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(initial.instruction);
  const [applies, setApplies] = useState(initial.applies_to_drafting);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  const dirty =
    text !== initial.instruction || applies !== initial.applies_to_drafting;
  const overLimit = text.length > initial.max_chars;

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveInstructionAction({
        instruction: text,
        applies_to_drafting: applies,
      });
      setFeedback(
        result.ok
          ? { tone: "ok", text: "Saved." }
          : { tone: "error", text: result.error ?? "Could not save" },
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">
        Standing context the agent reads before it writes anything — who you
        are, what you sell, the tone to keep, anything it must never claim. The
        template generator always uses it. The drafting agent only does when the
        switch below is on.
      </p>

      <label className="block">
        <span className="text-xs font-semibold">Special instruction</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          maxLength={initial.max_chars}
          data-testid="instruction-text"
          placeholder={
            "e.g. We are a small PH-based studio. Never promise timelines or " +
            "quote prices. Lead with the hours a process costs them today, not " +
            "the technology. British spelling. Never claim prior work with a " +
            "named brand."
          }
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-xs"
        />
        <span
          className={cn(
            "mt-1 block text-xs",
            overLimit ? "text-coral-ink" : "text-muted",
          )}
        >
          {text.length}/{initial.max_chars} characters
        </span>
      </label>

      <div className="rounded-xl border border-border px-3 py-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={applies}
            onChange={(e) => setApplies(e.target.checked)}
            data-testid="instruction-applies"
            className="mt-0.5 size-4 shrink-0 accent-coral-500"
          />
          <span className="text-sm leading-relaxed">
            <strong className="font-semibold">
              Also apply to the drafting agent
            </strong>
            <span className="mt-0.5 block text-xs text-muted">
              Appends this text to the system prompt used for every batch, so it
              shapes the messages actually sent. Drafts already written are
              unchanged — this affects the next batch onward.
            </span>
          </span>
        </label>

        {applies && (
          <p
            role="note"
            className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/8 px-2.5 py-2 text-xs leading-relaxed text-amber-ink"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Drafts written under this instruction are sent as real email.
              Review the first batch before sending it.
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty || overLimit}
          aria-busy={pending}
          data-testid="instruction-save"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden className="size-4" />
          )}
          Save instruction
        </button>

        {dirty && !pending && (
          <span className="text-xs text-amber-ink">Unsaved</span>
        )}
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

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
        <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Used by <strong className="font-semibold">Generate with AI</strong> on
          the Templates tab every time, whether or not the switch above is on.
        </span>
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { ArrowUp, Bot, Paperclip, User } from "lucide-react";
import { LockedFeature } from "@/components/dashboard/LockedFeature";
import { PageHeader } from "@/components/dashboard/primitives";

export const metadata: Metadata = { title: "AI Assistant" };

/**
 * AI assistant — locked.
 *
 * The backend has a `/chat` route, but it is a LangChain skeleton with no
 * grounding in the listings table: it would answer pipeline questions from the
 * model's imagination. Shipping that behind a chat box would be worse than
 * shipping nothing, so the surface is previewed and locked.
 */

const TRANSCRIPT: { role: "user" | "assistant"; text: string }[] = [
  {
    role: "user",
    text: "Which roles from the last 24 hours mention automation or internal tools?",
  },
  {
    role: "assistant",
    text: "I'd search the stored listings for those terms, rank them by how closely the description matches your services, and return them with links to the original posts.",
  },
  {
    role: "user",
    text: "Draft an intro for the top three.",
  },
  {
    role: "assistant",
    text: "Each draft would quote a specific requirement from the post and reference relevant work, so it doesn't read like a template.",
  },
];

const SUGGESTIONS = [
  "Summarise this week's pipeline",
  "Which categories are growing?",
  "Find posts matching our automation service",
  "Flag duplicate listings",
];

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Ask questions about the lead pipeline in plain language — search, summarise and draft, grounded in your own data."
      />

      <LockedFeature
        title="The assistant is locked"
        reason="The chat endpoint exists but isn't grounded in the listings table yet, so it would answer pipeline questions from the model's own guesses rather than your data."
        requirements={[
          "Retrieval over the listings table so answers cite real rows",
          "Tool access to the CRUD endpoints for filtering and drafting",
          "Prompt-injection handling — scraped job posts are untrusted text",
        ]}
      >
        <div className="mx-auto flex h-[34rem] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface">
          <div className="flex-1 space-y-4 overflow-hidden p-5">
            {TRANSCRIPT.map((message, i) => (
              <div
                key={i}
                className={
                  message.role === "user"
                    ? "flex justify-end gap-3"
                    : "flex justify-start gap-3"
                }
              >
                {message.role === "assistant" && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-navy-800/6 text-navy-500 dark:bg-white/10">
                    <Bot aria-hidden className="size-4" />
                  </span>
                )}
                <p
                  className={
                    message.role === "user"
                      ? "max-w-[78%] rounded-2xl rounded-tr-sm bg-navy-800 px-4 py-2.5 text-sm leading-relaxed text-white"
                      : "max-w-[78%] rounded-2xl rounded-tl-sm bg-navy-800/[0.05] px-4 py-2.5 text-sm leading-relaxed dark:bg-white/[0.07]"
                  }
                >
                  {message.text}
                </p>
                {message.role === "user" && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-coral-500/12 text-coral-600">
                    <User aria-hidden className="size-4" />
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted"
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
              <Paperclip aria-hidden className="size-4 shrink-0 text-muted" />
              <span className="flex-1 truncate py-1 text-sm text-muted">
                Ask about your leads…
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-coral-500 text-white">
                <ArrowUp aria-hidden className="size-4" />
              </span>
            </div>
          </div>
        </div>
      </LockedFeature>
    </>
  );
}

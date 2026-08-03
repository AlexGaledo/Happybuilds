import type { Metadata } from "next";
import { GripVertical, Mail, MessageSquare, Send, Sparkles, UserCheck } from "lucide-react";
import { LockedFeature } from "@/components/dashboard/LockedFeature";
import { Chip, PageHeader } from "@/components/dashboard/primitives";

export const metadata: Metadata = { title: "Outreach" };

/**
 * Outreach kanban — locked.
 *
 * No outreach engine exists yet, and the two fields it would need (employer
 * name and email) are login-gated at the source, so there is nothing to send
 * to. The board is rendered as an inert preview so the intended shape is
 * legible without implying it works.
 */

interface PreviewCard {
  title: string;
  meta: string;
  tone: "muted" | "coral" | "amber" | "mint" | "neutral";
}

const COLUMNS: {
  id: string;
  label: string;
  icon: typeof Mail;
  hint: string;
  cards: PreviewCard[];
}[] = [
  {
    id: "sourced",
    label: "Sourced",
    icon: Sparkles,
    hint: "Scraped and scored",
    cards: [
      { title: "Virtual Assistant — E-commerce ops", meta: "Full time · 2h ago", tone: "muted" },
      { title: "Shopify store manager", meta: "Part time · 5h ago", tone: "muted" },
      { title: "Data entry & CRM cleanup", meta: "Gig · 6h ago", tone: "muted" },
    ],
  },
  {
    id: "queued",
    label: "Queued",
    icon: Send,
    hint: "Waiting to send",
    cards: [
      { title: "Automation engineer (Zapier/Make)", meta: "Sends in 40m", tone: "amber" },
      { title: "Bookkeeping assistant", meta: "Sends tomorrow 09:00", tone: "amber" },
    ],
  },
  {
    id: "contacted",
    label: "Contacted",
    icon: Mail,
    hint: "First touch sent",
    cards: [
      { title: "Internal tools developer", meta: "Sent 1d ago · follow-up in 2d", tone: "neutral" },
      { title: "Landing page designer", meta: "Sent 2d ago", tone: "neutral" },
    ],
  },
  {
    id: "replied",
    label: "Replied",
    icon: MessageSquare,
    hint: "Awaiting your response",
    cards: [{ title: "Ops dashboard build", meta: "Replied 3h ago", tone: "coral" }],
  },
  {
    id: "booked",
    label: "Booked",
    icon: UserCheck,
    hint: "Call scheduled",
    cards: [{ title: "Warehouse reporting automation", meta: "Call Thu 14:00", tone: "mint" }],
  },
];

export default function OutreachPage() {
  return (
    <>
      <PageHeader
        title="Outreach"
        description="A kanban board for automated outreach sequences — sourced leads move right as they're contacted, reply and convert."
      />

      <LockedFeature
        title="Outreach is locked"
        reason="There's no outreach engine behind this board yet, and nothing to send to: employer name and email are hidden from anonymous visitors on onlinejobs.ph."
        requirements={[
          "An authenticated enrichment pass to recover employer contact details",
          "A sending integration with per-domain rate limits and unsubscribe handling",
          "Sequence and reply-tracking tables in Postgres",
        ]}
      >
        {/* A grid, not a scrolling row: the preview is inert, so a column that
            needs scrolling to reach can never be reached. */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((column) => (
              <section
                key={column.id}
                className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface"
              >
                <header className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <column.icon aria-hidden className="size-4 text-navy-400" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-sm font-bold">
                      {column.label}
                    </h3>
                    <p className="truncate text-[11px] text-muted">{column.hint}</p>
                  </div>
                  <span className="rounded-full bg-navy-800/6 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted dark:bg-white/10">
                    {column.cards.length}
                  </span>
                </header>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  {column.cards.map((card) => (
                    <article
                      key={card.title}
                      className="rounded-xl border border-border bg-background p-3 shadow-soft"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical
                          aria-hidden
                          className="mt-0.5 size-3.5 shrink-0 text-muted/50"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-snug">
                            {card.title}
                          </p>
                          <p className="mt-1 text-[11px] text-muted">{card.meta}</p>
                        </div>
                      </div>
                      <div className="mt-2 pl-5">
                        <Chip tone={card.tone}>{column.label}</Chip>
                      </div>
                    </article>
                  ))}
                  {column.cards.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted">
                      Nothing here
                    </p>
                  )}
                </div>
              </section>
            ))}
        </div>
      </LockedFeature>
    </>
  );
}

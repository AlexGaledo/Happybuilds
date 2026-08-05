import type { Metadata } from "next";
import {
  getBounceStats,
  getDraftCounts,
  getDrafts,
  getMailboxStatus,
  getReplies,
  safe,
} from "@/lib/dashboard/server";
import { BouncePanel } from "@/components/dashboard/BouncePanel";
import { DraftsBoard } from "@/components/dashboard/DraftsBoard";
import { ErrorState, PageHeader } from "@/components/dashboard/primitives";

export const metadata: Metadata = { title: "Drafts" };
export const dynamic = "force-dynamic";

/**
 * Inbox, outbox, and the drafts that have to be sent by hand.
 *
 * `include_sent` on the outbox so a message you just sent stays visible where
 * you sent it from, rather than vanishing the instant it succeeds.
 */
export default async function DraftsPage() {
  const [replies, outbox, manual, counts, mailbox, bounces] = await Promise.all([
    safe(getReplies({ limit: 50 })),
    safe(getDrafts({ channel: "email", include_sent: true, limit: 50 })),
    safe(getDrafts({ channel: "manual", include_sent: true, limit: 50 })),
    safe(getDraftCounts()),
    safe(getMailboxStatus()),
    safe(getBounceStats(30)),
  ]);

  if (outbox.error && manual.error && replies.error) {
    return (
      <>
        <PageHeader title="Drafts" />
        <ErrorState
          title="Can't load drafts"
          message={outbox.error}
          hint="The dashboard reads the backend over loopback. Check the API and its Postgres/Redis containers."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Drafts"
        description="Messages the agent wrote, and what came back. Drafts with a contact address send from the configured mailbox; the rest carry a link to the original post so you can send them yourself."
      />

      <div className="flex flex-col gap-6">
        <DraftsBoard
          replies={replies.data?.items ?? []}
          outbox={outbox.data?.items ?? []}
          manual={manual.data?.items ?? []}
          counts={counts.data}
          mailbox={mailbox.data}
        />

        {/* Below the board, not above it: the board is what you act on, and a
            deliverability number you cannot act on shouldn't outrank it. */}
        <BouncePanel stats={bounces.data} />
      </div>
    </>
  );
}

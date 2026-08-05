"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  Hand,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import type {
  Draft,
  DraftCounts,
  MailboxStatus,
  Reply,
} from "@/lib/dashboard/types";
import { absoluteTime, relativeTime, truncate } from "@/lib/dashboard/format";
import {
  deleteDraftAction,
  markDraftSentAction,
  markReplyReadAction,
  sendDraftsAction,
  syncRepliesAction,
  updateDraftAction,
  type ActionResult,
} from "@/lib/dashboard/actions";
import { Chip, EmptyState } from "./primitives";
import { cn } from "@/lib/utils";

/**
 * Three columns: what came back, what can go out, and what has to go out by
 * hand.
 *
 * The split is not cosmetic — it is the only thing that distinguishes a draft
 * that can be sent from one that cannot. Scraped job posts hide employer
 * contact details, so a draft written for one often has nowhere to go; rather
 * than being hidden or shown with a dead Send button, those sit in their own
 * column with a link to the original post.
 */
export function DraftsBoard({
  replies,
  outbox,
  manual,
  counts,
  mailbox,
}: {
  replies: Reply[];
  outbox: Draft[];
  manual: Draft[];
  counts: DraftCounts | null;
  mailbox: MailboxStatus | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  const sendableIds = useMemo(
    () => outbox.filter((d) => d.status !== "sent").map((d) => d.id),
    [outbox],
  );
  const allSelected =
    sendableIds.length > 0 && sendableIds.every((id) => selected.has(id));

  function run(work: () => Promise<ActionResult>, okText: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await work();
      setFeedback(
        result.ok
          ? {
              tone: "ok",
              text: result.failed
                ? `${okText} ${result.failed} failed — ${result.detail ?? "see the row"}.`
                : result.detail
                  ? `${okText} ${result.detail}.`
                  : okText,
            }
          : { tone: "error", text: result.error ?? "Something went wrong" },
      );
      if (result.ok) router.refresh();
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sendMany(ids: string[]) {
    run(
      () => sendDraftsAction(ids),
      `Sent ${ids.length} message${ids.length === 1 ? "" : "s"}.`,
    );
    setSelected(new Set());
  }

  const mailReady = mailbox?.configured ?? false;
  // Two transports are wired at once (MAIL_TRANSPORT). Naming the wrong one
  // here sends you to the wrong half of .env, so every string below keys off
  // whichever is actually live rather than hardcoding "Gmail".
  const isHostinger = mailbox?.transport === "hostinger";
  const mailLabel = isHostinger ? "Hostinger mail" : "Gmail";

  return (
    <div className="flex flex-col gap-4">
      {!mailReady && (
        <div
          role="note"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm leading-relaxed text-amber-ink"
        >
          <strong className="font-semibold">Sending is not configured.</strong>{" "}
          {isHostinger ? (
            <>
              Set <code className="font-mono text-xs">SMTP_USERNAME</code> and{" "}
              <code className="font-mono text-xs">SMTP_PASSWORD</code> on the API
              host — see{" "}
              <code className="font-mono text-xs">
                docs/hostinger-mail-setup.md
              </code>
              , then verify with{" "}
              <code className="font-mono text-xs">
                uv run python -m app.cli mail-check
              </code>
              .
            </>
          ) : (
            <>
              Set <code className="font-mono text-xs">GMAIL_ADDRESS</code>,{" "}
              <code className="font-mono text-xs">GMAIL_CLIENT_ID</code>,{" "}
              <code className="font-mono text-xs">GMAIL_CLIENT_SECRET</code> and{" "}
              <code className="font-mono text-xs">GMAIL_REFRESH_TOKEN</code> on
              the API host — run{" "}
              <code className="font-mono text-xs">
                uv run python -m app.cli gmail-auth
              </code>{" "}
              to get them.
            </>
          )}{" "}
          Drafts still generate; only sending is blocked.
        </div>
      )}

      <p
        aria-live="polite"
        className={cn(
          "min-h-4 text-xs leading-relaxed",
          feedback?.tone === "error" ? "text-coral-ink" : "text-mint-ink",
        )}
      >
        {feedback?.text ?? ""}
      </p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* ------------------------------------------------------- inbox */}
        <Column
          title="Inbox"
          subtitle="Replies to messages you sent"
          icon={Inbox}
          tone="coral"
          count={counts?.replies ?? replies.length}
          badge={counts?.inbox ? `${counts.inbox} unread` : undefined}
          action={
            <ColumnButton
              onClick={() => run(syncRepliesAction, "Checked for new replies.")}
              disabled={pending || !mailReady}
              icon={RefreshCw}
              busy={pending}
            >
              Check
            </ColumnButton>
          }
        >
          {replies.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No replies yet"
              description={
                mailReady
                  ? `Replies to sent messages land here. Use Check to poll ${mailLabel} now.`
                  : `Replies are read from ${mailLabel}, which isn't configured yet.`
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {replies.map((reply) => (
                <li key={reply.id}>
                  <ReplyCard
                    reply={reply}
                    pending={pending}
                    onToggleRead={() =>
                      run(
                        () => markReplyReadAction(reply.id, !reply.read_at),
                        reply.read_at ? "Marked unread." : "Marked read.",
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Column>

        {/* ------------------------------------------------------ outbox */}
        <Column
          title="Outbox"
          subtitle="Drafted, with an address to send to"
          icon={Mail}
          tone="mint"
          count={counts?.outbox ?? outbox.length}
          action={
            <div className="flex items-center gap-1.5">
              {sendableIds.length > 0 && (
                <label className="flex min-h-11 cursor-pointer items-center gap-1.5 px-1 text-[11px] font-semibold text-muted">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(sendableIds))
                    }
                    aria-label="Select every draft in the outbox"
                    className="size-4 accent-coral-500"
                  />
                  All
                </label>
              )}
              <ColumnButton
                onClick={() =>
                  sendMany(selected.size > 0 ? [...selected] : sendableIds)
                }
                disabled={pending || !mailReady || sendableIds.length === 0}
                icon={Send}
                busy={pending}
              >
                {selected.size > 0 ? `Send ${selected.size}` : "Send all"}
              </ColumnButton>
            </div>
          }
        >
          {outbox.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Outbox is empty"
              description="Process leads on the Pipeline tab. Drafts with a contact address arrive here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {outbox.map((draft) => (
                <li key={draft.id}>
                  <DraftCard
                    draft={draft}
                    pending={pending}
                    selectable
                    selected={selected.has(draft.id)}
                    onSelect={() => toggle(draft.id)}
                    onSend={() => sendMany([draft.id])}
                    canSend={mailReady}
                    onSave={(patch) =>
                      run(() => updateDraftAction(draft.id, patch), "Draft saved.")
                    }
                    onDelete={() =>
                      run(() => deleteDraftAction(draft.id), "Draft deleted.")
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Column>

        {/* ------------------------------------------------- send by hand */}
        <Column
          title="Send by hand"
          subtitle="Drafted, but no contact address exists"
          icon={Hand}
          tone="amber"
          count={counts?.manual ?? manual.length}
        >
          {manual.length === 0 ? (
            <EmptyState
              icon={Hand}
              title="Nothing waiting"
              description="Drafts whose lead has no reachable address appear here, with a link to the original post."
            />
          ) : (
            <ul className="divide-y divide-border">
              {manual.map((draft) => (
                <li key={draft.id}>
                  <DraftCard
                    draft={draft}
                    pending={pending}
                    manual
                    onMarkSent={() =>
                      run(
                        () => markDraftSentAction(draft.id),
                        "Recorded as sent by hand.",
                      )
                    }
                    onSave={(patch) =>
                      run(() => updateDraftAction(draft.id, patch), "Draft saved.")
                    }
                    onDelete={() =>
                      run(() => deleteDraftAction(draft.id), "Draft deleted.")
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Column>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- draft card

function DraftCard({
  draft,
  pending,
  selectable,
  selected,
  manual,
  canSend,
  onSelect,
  onSend,
  onMarkSent,
  onSave,
  onDelete,
}: {
  draft: Draft;
  pending: boolean;
  selectable?: boolean;
  selected?: boolean;
  manual?: boolean;
  canSend?: boolean;
  onSelect?: () => void;
  onSend?: () => void;
  onMarkSent?: () => void;
  onSave: (patch: { subject?: string; body?: string; recipient_email?: string }) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [email, setEmail] = useState(draft.recipient_email ?? "");
  const [copied, setCopied] = useState(false);

  const sent = draft.status === "sent";
  const dirty =
    subject !== draft.subject ||
    body !== draft.body ||
    email !== (draft.recipient_email ?? "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard is permission-gated; the textarea below is the fallback */
    }
  }

  return (
    <article className={cn("px-4 py-3.5", sent && "opacity-60")} data-testid="draft-card">
      <div className="flex items-start gap-2.5">
        {selectable && !sent && (
          <label className="-m-3 mt-0 inline-flex size-11 shrink-0 cursor-pointer items-start justify-center p-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              aria-label={`Select "${draft.subject}"`}
              className="mt-1 size-4 accent-coral-500"
            />
          </label>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{draft.subject}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {draft.recipient_email ? (
              <>
                To {draft.recipient_name ? `${draft.recipient_name} · ` : ""}
                {draft.recipient_email}
              </>
            ) : (
              draft.source_title ?? "No recipient"
            )}
          </p>
        </div>
        {draft.reply_count > 0 && (
          <Chip tone="coral">
            {draft.reply_count} repl{draft.reply_count === 1 ? "y" : "ies"}
          </Chip>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
        {truncate(draft.body, 150)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {sent && (
          <Chip tone="mint" icon={Check}>
            Sent {relativeTime(draft.sent_at)}
          </Chip>
        )}
        {draft.template_name && <Chip tone="muted">{draft.template_name}</Chip>}
        {draft.status === "failed" && draft.error && (
          <Chip tone="coral" icon={CircleAlert}>
            {truncate(draft.error, 40)}
          </Chip>
        )}
      </div>

      {/* Why the agent chose this template and where the contact came from.
          Shown so a draft can be judged without re-reading the source post. */}
      {draft.rationale && (
        <p className="mt-2 rounded-lg bg-navy-800/[0.04] px-2.5 py-1.5 text-[11px] leading-relaxed text-muted dark:bg-white/5">
          {draft.rationale}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <SmallButton onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : "Edit"}
        </SmallButton>

        {manual && draft.source_url && (
          <a
            href={draft.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-coral-ink hover:bg-coral-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:min-h-9 pointer-fine:px-2.5"
          >
            <ExternalLink aria-hidden className="size-3.5" />
            Open post
          </a>
        )}

        {manual && (
          <SmallButton onClick={copy}>
            <Copy aria-hidden className="size-3.5" />
            {copied ? "Copied" : "Copy"}
          </SmallButton>
        )}

        {manual && !sent && (
          <SmallButton onClick={onMarkSent} disabled={pending} tone="primary">
            <Check aria-hidden className="size-3.5" />
            Mark sent
          </SmallButton>
        )}

        {!manual && !sent && (
          <SmallButton
            onClick={onSend}
            disabled={pending || !canSend}
            tone="primary"
            // Deliberately not naming the transport: this card is several
            // levels down and the banner at the top of the board already says
            // which one, with the exact variables to set.
            title={canSend ? undefined : "Sending is not configured"}
          >
            <Send aria-hidden className="size-3.5" />
            Send
          </SmallButton>
        )}

        <SmallButton onClick={onDelete} disabled={pending} tone="danger">
          <Trash2 aria-hidden className="size-3.5" />
          <span className="sr-only">Delete draft</span>
        </SmallButton>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {manual && (
            <Field
              label="Recipient email"
              hint="Adding an address moves this draft into the outbox."
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-sm"
              />
            </Field>
          )}
          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-sm"
            />
          </Field>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-xs"
            />
          </Field>
          <div className="flex items-center gap-2">
            <SmallButton
              onClick={() =>
                onSave({
                  subject,
                  body,
                  ...(manual && email ? { recipient_email: email } : {}),
                })
              }
              disabled={pending || !dirty}
              tone="primary"
            >
              Save changes
            </SmallButton>
            {dirty && <span className="text-[11px] text-amber-ink">Unsaved</span>}
          </div>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- reply card

function ReplyCard({
  reply,
  pending,
  onToggleRead,
}: {
  reply: Reply;
  pending: boolean;
  onToggleRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = !reply.read_at;

  return (
    <article
      data-testid="reply-card"
      className={cn("px-4 py-3.5", unread && "bg-coral-500/[0.05]")}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {reply.from_name ?? reply.from_email}
            {/* Unread is a dot AND a weight change, never colour alone. */}
            {unread && (
              <span
                aria-hidden
                className="ml-1.5 inline-block size-1.5 rounded-full bg-coral-500 align-middle"
              />
            )}
            {unread && <span className="sr-only"> (unread)</span>}
          </p>
          <p className="truncate text-xs text-muted">{reply.subject ?? "(no subject)"}</p>
        </div>
        <time
          dateTime={reply.received_at}
          title={absoluteTime(reply.received_at)}
          className="shrink-0 text-[11px] tabular-nums text-muted"
        >
          {relativeTime(reply.received_at)}
        </time>
      </div>

      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
        {reply.snippet || truncate(reply.body, 150)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <SmallButton onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : "Read"}
        </SmallButton>
        <SmallButton onClick={onToggleRead} disabled={pending}>
          <MailOpen aria-hidden className="size-3.5" />
          {unread ? "Mark read" : "Mark unread"}
        </SmallButton>
        <a
          href={`mailto:${reply.from_email}?subject=${encodeURIComponent(
            reply.subject?.startsWith("Re:") ? reply.subject : `Re: ${reply.subject ?? ""}`,
          )}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-coral-ink hover:bg-coral-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:min-h-9 pointer-fine:px-2.5"
        >
          Reply
        </a>
      </div>

      {open && (
        // whitespace-pre-wrap: this is a plain-text mail body, and collapsing
        // its newlines turns a quoted thread into one run-on paragraph.
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-navy-800/[0.04] p-3 font-mono text-[11px] leading-relaxed dark:bg-white/5">
          {reply.body || reply.snippet}
        </pre>
      )}
    </article>
  );
}

// ------------------------------------------------------------------- shared

function Column({
  title,
  subtitle,
  icon: Icon,
  tone,
  count,
  badge,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Inbox;
  tone: "coral" | "mint" | "amber";
  count: number;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const iconTone = {
    coral: "text-coral-ink",
    mint: "text-mint-ink",
    amber: "text-amber-ink",
  } as const;

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface shadow-soft">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Icon aria-hidden className={cn("size-4 shrink-0", iconTone[tone])} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-bold">{title}</h2>
          <p className="truncate text-[11px] text-muted">{subtitle}</p>
        </div>
        {badge && <Chip tone="coral">{badge}</Chip>}
        <Chip tone={tone}>{count}</Chip>
        {action}
      </header>
      {/* Capped height only once the columns sit side by side — three
          unbounded lists in a row would make the page as tall as the longest.
          Stacked on a phone they scroll with the page instead: a scroll region
          inside the page scroll is the thing that eats swipes. */}
      <div className="min-w-0 flex-1 xl:max-h-[38rem] xl:overflow-y-auto">{children}</div>
    </section>
  );
}

function ColumnButton({
  onClick,
  disabled,
  icon: Icon,
  busy,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  icon: typeof Send;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-navy-800 px-3.5 text-xs font-semibold text-white pointer-fine:min-h-9 pointer-fine:px-3",
        "transition-colors hover:bg-navy-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-45",
      )}
    >
      {busy ? (
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
      ) : (
        <Icon aria-hidden className="size-3.5" />
      )}
      {children}
    </button>
  );
}

function SmallButton({
  onClick,
  disabled,
  tone = "neutral",
  title,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "danger";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "text-muted hover:bg-navy-800/6 hover:text-foreground dark:hover:bg-white/10",
    primary: "text-coral-ink hover:bg-coral-500/10",
    danger: "text-coral-ink hover:bg-coral-500/10",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        // min-w-11 as well as min-h-11: an icon-only variant (Delete) is only
        // ~38px wide otherwise, which passes the height check and still misses
        // the 44px target.
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors pointer-fine:min-h-9 pointer-fine:min-w-0 pointer-fine:px-2.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tones[tone],
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {hint && <span className="mb-1 block text-[11px] text-muted">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

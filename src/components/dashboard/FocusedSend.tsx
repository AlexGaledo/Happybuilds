"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import type { Draft } from "@/lib/dashboard/types";
import { markDraftSentAction } from "@/lib/dashboard/actions";
import { Chip } from "./primitives";
import { cn } from "@/lib/utils";

/**
 * One-at-a-time delivery for the drafts that have nowhere to send.
 *
 * onlinejobs.ph strips employer contact details, so ~90% of drafts come back
 * `channel: "manual"` — a finished message whose only delivery path is the
 * site's own message box on the original post. Doing that from the board costs
 * about two minutes a lead, almost all of it context-switching: find the card,
 * read it, copy it, find the link, come back, find the card again.
 *
 * This screen removes the finding. It shows exactly one draft, full width, and
 * puts copy / open / mark-sent on single keys. The buttons exist because the
 * same job gets done from a phone, where there is no keyboard.
 *
 * **It never touches onlinejobs.ph.** Their terms (clause 7.4) forbid automated
 * access, so the entire mechanism here is the clipboard and a normal new tab.
 * Every click on their side is made by a person. Nothing in this file may grow
 * into a fetch, an iframe, or a form post aimed at that domain.
 */
export function FocusedSend({
  drafts,
  onExit,
}: {
  /** Manual drafts still at `status: "ready"`, in the order to work through. */
  drafts: Draft[];
  /** Leave focused mode. Called by Escape, the Close button, and nothing else. */
  onExit: () => void;
}) {
  /**
   * The queue is snapshotted once, on open, and never re-derived from props.
   *
   * `markDraftSentAction` revalidates `/dashboard/drafts`, so the board behind
   * this overlay re-renders after every mark and hands down a *shorter* list.
   * Following that would slide the next draft under the cursor between reading
   * it and pressing `m` — i.e. mark the wrong one, irreversibly. Position is
   * held against this frozen array instead; `sentIds` is what tracks progress.
   */
  const [queue] = useState(() => drafts);
  const [index, setIndex] = useState(0);

  /**
   * Drafts whose source post has actually been opened in this session.
   *
   * This is the arming condition for `m`. Marking sent is one-way — the backend
   * has no unmark route — and you cannot have pasted a message into a post you
   * never opened, so "opened" is the cheapest honest proof that the action is
   * plausible. It is per-draft and resets when focused mode closes.
   */
  const [openedIds, setOpenedIds] = useState<ReadonlySet<string>>(new Set());
  const [sentIds, setSentIds] = useState<ReadonlySet<string>>(new Set());

  /**
   * Result of the last copy, cleared whenever the draft changes.
   *
   * Deliberately sticky rather than a 2-second flash: a copy that silently
   * failed means the *previous* draft is still on the clipboard, and pasting
   * that into a stranger's job post is the worst thing this screen can cause.
   * The state is per-draft so it can never be read as belonging to another one.
   */
  const [copyStatus, setCopyStatus] = useState<{
    field: "body" | "subject";
    ok: boolean;
  } | null>(null);

  /** Queue-level notice — survives advancing, unlike `copyStatus`. */
  const [notice, setNotice] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const [saving, startTransition] = useTransition();

  const panel = useRef<HTMLDivElement>(null);
  /**
   * The visible "Open post" anchor. The `o` shortcut clicks *this element*
   * rather than calling `window.open`, for two reasons: the anchor already
   * carries `rel="noopener noreferrer"`, and `window.open(url, "_blank",
   * "noopener")` returns null on success, so its return value cannot be used to
   * tell a real open from a blocked popup — and a blocked popup that armed `m`
   * would be exactly the false positive the guard exists to prevent.
   */
  const openLink = useRef<HTMLAnchorElement>(null);
  /**
   * Ids already handed to the action, tracked in a ref rather than in state.
   *
   * Two `m` presses inside a single frame both see the pre-update `sentIds`
   * closure and would both fire. A ref mutates synchronously, so the second one
   * loses — which matters here and nowhere else on this screen, because this is
   * the one call with no undo.
   */
  const submitted = useRef<Set<string>>(new Set());

  const current: Draft | undefined = queue[index];
  const alreadySent = current ? sentIds.has(current.id) : false;
  const opened = current ? openedIds.has(current.id) : false;
  const canMark = Boolean(current) && opened && !alreadySent;

  /** Why Mark sent is unavailable, in the operator's terms. Null when armed. */
  const markBlockedReason = useMemo(() => {
    if (!current) return "Nothing to mark.";
    if (alreadySent) return "Already marked sent.";
    if (!current.source_url) {
      return "This draft has no link to its original post, so it can't be armed here. Mark it from the board instead.";
    }
    if (!opened) return "Open the post first — that's what arms this key.";
    return null;
  }, [current, alreadySent, opened]);

  /** Move through the queue. Clamps at both ends and clears the copy status. */
  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(queue.length - 1, Math.max(0, i + delta)));
      setCopyStatus(null);
    },
    [queue.length],
  );

  const copyField = useCallback(
    async (field: "body" | "subject") => {
      const draft = queue[index];
      if (!draft) return;
      try {
        // Requires a secure context. True over HTTPS in production and on
        // localhost; the failure branch below is what covers everything else.
        await navigator.clipboard.writeText(
          field === "body" ? draft.body : draft.subject,
        );
        setCopyStatus({ field, ok: true });
      } catch {
        setCopyStatus({ field, ok: false });
      }
    },
    [queue, index],
  );

  /**
   * Record the send, then move on without waiting for the round trip.
   *
   * Waiting would put a spinner between every lead and undo the point of the
   * screen. The write is optimistic and rolls itself back on failure, naming
   * the draft in the notice — which is also why the confirmation names a title:
   * a mis-fire on the wrong row has to be visible after the fact, since there
   * is no undo to offer.
   */
  const markSent = useCallback(() => {
    const draft = queue[index];
    if (!draft || !openedIds.has(draft.id) || sentIds.has(draft.id)) return;
    if (submitted.current.has(draft.id)) return;
    submitted.current.add(draft.id);
    const name = draft.source_title ?? draft.subject;

    setSentIds((prev) => new Set(prev).add(draft.id));
    setNotice({ tone: "ok", text: `Marked sent: ${name}` });
    go(1);

    startTransition(async () => {
      const result = await markDraftSentAction(draft.id);
      if (result.ok) return;
      // Rolled back, so a retry is allowed to reach the API again.
      submitted.current.delete(draft.id);
      setSentIds((prev) => {
        const next = new Set(prev);
        next.delete(draft.id);
        return next;
      });
      setNotice({
        tone: "error",
        text: `Couldn't mark "${name}" as sent — ${
          result.error ?? "the API refused it"
        }. It's still in the queue.`,
      });
    });
  }, [queue, index, openedIds, sentIds, go]);

  const markOpened = useCallback((id: string) => {
    setOpenedIds((prev) => new Set(prev).add(id));
  }, []);

  // ---------------------------------------------------------------- keyboard

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Leave every browser and OS chord alone — Cmd/Ctrl+C especially, which
      // is how someone copies a hand-selected fragment out of the body below.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Never steal a keystroke from someone typing. There is no text field in
      // this overlay today, but the board behind it is full of them and this
      // listener is on `document`.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Caps lock shouldn't disarm the whole screen.
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      switch (key) {
        case "Escape":
          onExit();
          break;
        case "c":
          void copyField("body");
          break;
        case "s":
          void copyField("subject");
          break;
        case "o":
          openLink.current?.click();
          break;
        case "m":
          markSent();
          break;
        case "j":
        case "ArrowDown":
        case "ArrowRight":
          go(1);
          break;
        case "k":
        case "ArrowUp":
        case "ArrowLeft":
          go(-1);
          break;
        default:
          return;
      }
      // Only reached for a key we handled, so arrow keys don't also scroll.
      event.preventDefault();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [copyField, go, markSent, onExit]);

  // Move focus off the board so the shortcuts have somewhere sensible to land
  // and a screen reader announces the dialog rather than the page behind it.
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
  }, []);

  // The overlay owns the viewport while open; letting the board scroll behind
  // it means arrow keys and a stray swipe both move the wrong thing.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // ------------------------------------------------------------------ render

  const remaining = queue.length - sentIds.size;

  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Send by hand, one draft at a time"
      data-testid="focused-send"
      // z-[60] rather than z-50: the sidebar's mobile drawer is already z-50,
      // and "focused" has to mean the whole viewport, chrome included.
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background outline-none"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">
            Send by hand
            {saving && (
              <Loader2
                aria-hidden
                className="ml-1.5 inline size-3 animate-spin align-middle text-muted"
              />
            )}
          </p>
          <p className="truncate text-[11px] tabular-nums text-muted">
            {queue.length === 0
              ? "Nothing queued"
              : `${index + 1} of ${queue.length} · ${remaining} left`}
          </p>
        </div>
        <FocusButton onClick={onExit} icon={X} shortcut="Esc">
          Close
        </FocusButton>
      </header>

      {/* One live region for queue-level outcomes. Copy results are separate
          and sit next to the text they describe. */}
      <p
        aria-live="polite"
        className={cn(
          "shrink-0 px-4 text-xs leading-relaxed",
          notice ? "py-1.5" : "h-0 overflow-hidden",
          notice?.tone === "error" ? "text-coral-ink" : "text-mint-ink",
        )}
      >
        {notice?.text ?? ""}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pb-6 pt-3">
          {!current ? (
            <p className="py-12 text-center text-sm text-muted">
              This queue is empty. Close and pick up the board.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-2">
                <h2 className="min-w-0 flex-1 break-words font-display text-lg font-bold leading-snug">
                  {current.source_title ?? "Untitled post"}
                </h2>
                {alreadySent && (
                  <Chip tone="mint" icon={Check}>
                    Marked sent
                  </Chip>
                )}
                {current.template_name && (
                  <Chip tone="muted">{current.template_name}</Chip>
                )}
                {/* This is the last screen before the message leaves, which is
                    the only place the flags can still change what happens. */}
                {current.requires_portfolio && (
                  <Chip tone="amber">Wants past work</Chip>
                )}
                {current.requires_proposal && (
                  <Chip tone="amber">Wants a proposal</Chip>
                )}
              </div>

              <Labelled label="Subject">
                <p className="break-words text-sm font-semibold">
                  {current.subject}
                </p>
              </Labelled>

              {current.rationale && (
                <Labelled label="Why the agent wrote this">
                  <p className="text-xs leading-relaxed text-muted">
                    {current.rationale}
                  </p>
                </Labelled>
              )}

              {current.format_notes && (
                <Labelled label="What the post asked applicants to do">
                  <p className="text-xs leading-relaxed text-muted">
                    {current.format_notes}
                  </p>
                </Labelled>
              )}

              <Labelled label="Message">
                {/* whitespace-pre-wrap keeps the paragraph breaks the employer
                    will see; break-words stops a bare URL widening the page,
                    which is the one thing e2e/mobile.spec.ts will not forgive.
                    Left selectable on purpose — it is the fallback when the
                    clipboard API is unavailable. */}
                <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-surface p-3 font-mono text-[13px] leading-relaxed pointer-fine:text-xs">
                  {current.body}
                </pre>
              </Labelled>

              {/* Quiet, but it answers a question the operator will otherwise
                  ask the Replies tab: a hand-sent message leaves no message id
                  behind, so nothing can thread a reply back to this draft. That
                  is inherent to the manual column, not a fault to chase. */}
              <p className="text-[11px] leading-relaxed text-muted">
                Sent by hand, so no message id is recorded — replies to this one
                can&apos;t be tracked and won&apos;t appear in the Inbox.
              </p>
            </>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-surface px-4 py-2.5">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-wrap items-center gap-1.5">
            <FocusButton
              onClick={() => void copyField("body")}
              icon={Copy}
              shortcut="c"
              disabled={!current}
            >
              Copy body
            </FocusButton>
            <FocusButton
              onClick={() => void copyField("subject")}
              icon={Copy}
              shortcut="s"
              disabled={!current}
            >
              Copy subject
            </FocusButton>

            {current?.source_url ? (
              <a
                ref={openLink}
                href={current.source_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markOpened(current.id)}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
                  "text-coral-ink hover:bg-coral-500/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
                  "pointer-fine:min-h-9 pointer-fine:min-w-0 pointer-fine:px-2.5",
                )}
              >
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                Open post
                <Kbd>o</Kbd>
              </a>
            ) : (
              <FocusButton icon={ExternalLink} shortcut="o" disabled>
                Open post
              </FocusButton>
            )}

            <FocusButton
              onClick={() => go(-1)}
              icon={ChevronLeft}
              shortcut="k"
              disabled={index === 0}
              aria-label="Previous draft"
            />
            <FocusButton
              onClick={() => go(1)}
              icon={ChevronRight}
              shortcut="j"
              disabled={index >= queue.length - 1}
              aria-label="Next draft"
            />

            <FocusButton
              onClick={markSent}
              icon={Check}
              shortcut="m"
              tone="primary"
              disabled={!canMark}
              title={markBlockedReason ?? undefined}
            >
              Mark sent
            </FocusButton>
          </div>

          {/* Copy result and arming reason share a row: both explain why the
              next keystroke will or won't do what you expect. */}
          <p
            aria-live="polite"
            className={cn(
              "mt-1.5 min-h-4 text-[11px] leading-relaxed",
              copyStatus && !copyStatus.ok ? "text-coral-ink" : "text-muted",
            )}
          >
            {copyStatus
              ? copyStatus.ok
                ? `${copyStatus.field === "body" ? "Message" : "Subject"} copied — safe to paste.`
                : `Copy failed. Nothing new is on your clipboard — select the ${copyStatus.field} above and copy it by hand before pasting anything.`
              : (markBlockedReason ?? "Ready. Paste it into the post, then press m.")}
          </p>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------------- pieces

/** Small caps label above a block of draft content. */
function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

/**
 * Shortcut hint.
 *
 * Hidden on a coarse pointer: a phone has no `m` key, so the chip would be
 * pure noise taking width off a row that has to wrap at 375px anyway.
 */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      aria-hidden
      className="hidden rounded border border-border px-1 font-mono text-[10px] font-semibold leading-4 text-muted pointer-fine:inline-block"
    >
      {children}
    </kbd>
  );
}

/**
 * Action button for the focus bar: label, icon, and its keyboard shortcut.
 *
 * 44px in both axes by default, shrinking only under `pointer-fine:` — a
 * landscape phone is 812px wide, so a width breakpoint would hand thumb-sized
 * targets back to desktop density. `min-w-11` matters as much as `min-h-11`:
 * the icon-only prev/next variants are ~36px wide without it.
 */
function FocusButton({
  onClick,
  disabled,
  icon: Icon,
  shortcut,
  tone = "neutral",
  title,
  children,
  "aria-label": ariaLabel,
}: {
  onClick?: () => void;
  disabled?: boolean;
  icon: typeof Check;
  /** Rendered as a `<kbd>` hint and documented here only — the listener that
   * actually binds it lives in `FocusedSend`. */
  shortcut: string;
  tone?: "neutral" | "primary";
  title?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
}) {
  const tones = {
    neutral:
      "text-muted hover:bg-navy-800/6 hover:text-foreground dark:hover:bg-white/10",
    primary: "text-coral-ink hover:bg-coral-500/10",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-keyshortcuts={shortcut}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "pointer-fine:min-h-9 pointer-fine:min-w-0 pointer-fine:px-2.5",
        tones[tone],
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {children}
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}

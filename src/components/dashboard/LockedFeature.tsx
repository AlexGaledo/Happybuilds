import type { ReactNode } from "react";
import { Lock } from "lucide-react";

/**
 * Wraps an unfinished feature's preview.
 *
 * The preview is real markup so the shape of the feature is legible, but it is
 * `aria-hidden`, `inert` and `pointer-events-none` — nothing behind the veil is
 * clickable, focusable, or reachable by a screen reader. A blur alone would
 * still leave a keyboard user tabbing through dead controls.
 *
 * The card states *why* it's locked and what unlocks it, rather than a bare
 * padlock: an unavailable destination should explain itself.
 */
export function LockedFeature({
  title,
  reason,
  requirements,
  children,
}: {
  title: string;
  reason: string;
  requirements: string[];
  children: ReactNode;
}) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none select-none blur-[3px] saturate-50 opacity-60"
      >
        {children}
      </div>

      {/* Scrim keeps the card legible over a busy preview. */}
      <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/45 px-4 py-10 sm:items-center">
        <div
          role="note"
          data-testid="locked-notice"
          className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-lift"
        >
          <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-600">
            <Lock aria-hidden className="size-5" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{reason}</p>

          <div className="mt-5 rounded-xl bg-navy-800/[0.04] p-4 text-left dark:bg-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Needed to unlock
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {requirements.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            What&rsquo;s below is a layout preview, not live data.
          </p>
        </div>
      </div>
    </div>
  );
}

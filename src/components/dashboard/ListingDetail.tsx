import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import type { Listing, ListingFilters } from "@/lib/dashboard/types";
import { toQueryString } from "@/lib/dashboard/filters";
import { absoluteTime, humanise, relativeTime } from "@/lib/dashboard/format";
import { Chip } from "./primitives";

/**
 * Detail view for one listing, opened via `?selected=<id>`.
 *
 * Keeping it in the URL rather than component state means a specific lead can
 * be linked to, and closing it is a normal back navigation.
 *
 * It renders as a slide-over rather than a grid column: the table needs about
 * 46rem before columns start colliding, and reserving a 22rem sidebar next to
 * it crushed the role column to nothing on a 1440px screen. Overlaying keeps
 * the table at full width at every viewport.
 */
export function ListingDetail({
  listing,
  filters,
}: {
  listing: Listing;
  filters: ListingFilters;
}) {
  const closeHref = `/dashboard/leads${toQueryString({ ...filters, selected: undefined })}`;

  const facts: [string, string | null][] = [
    ["Job type", listing.job_type ? humanise(listing.job_type) : null],
    ["Category", listing.category ? humanise(listing.category) : null],
    ["Salary", listing.salary],
    ["Hours / week", listing.hours_per_week],
    ["Posted", absoluteTime(listing.posted_at)],
    ["First seen", listing.first_seen_at ? absoluteTime(listing.first_seen_at) : null],
    ["Source", listing.source],
    ["External ID", listing.external_id],
  ];

  return (
    <>
      {/* Scrim doubles as the click-outside target, and is a link so it works
          with JS disabled. */}
      <Link
        href={closeHref}
        scroll={false}
        prefetch={false}
        aria-label="Close details"
        tabIndex={-1}
        className="fixed inset-0 z-40 bg-navy-900/25 backdrop-blur-[2px]"
      />
      <aside
        aria-label={`Details for ${listing.title}`}
        data-testid="lead-detail"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface shadow-lift"
      >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold leading-snug">
            {listing.title}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Posted {relativeTime(listing.posted_at)} ·{" "}
            <span className="tabular-nums">{absoluteTime(listing.posted_at)}</span>
          </p>
        </div>
        <Link
          href={closeHref}
          scroll={false}
          prefetch={false}
          aria-label="Close details"
          data-testid="lead-detail-close"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-navy-800/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:hover:bg-white/10"
        >
          <X aria-hidden className="size-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-5 px-5 py-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {label}
                </dt>
                <dd className="mt-0.5 truncate font-medium" title={value ?? undefined}>
                  {value}
                </dd>
              </div>
            ))}
        </dl>

        {listing.skills && listing.skills.length > 0 && (
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Skills
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {listing.skills.map((skill) => (
                <Chip key={skill} tone="muted">
                  {skill}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Description
          </h3>
          {listing.description ? (
            // whitespace-pre-line: the source markup uses line breaks for
            // structure, and collapsing them turns a bulleted brief into a wall.
            // No inner max-height — the panel already scrolls, and nesting a
            // second scroll region inside it makes the wheel behave unpredictably.
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {listing.description}
            </p>
          ) : listing.description_snippet ? (
            <div className="text-sm leading-relaxed text-foreground/90">
              <p>{listing.description_snippet}</p>
              <p className="mt-2 text-xs text-muted">
                Only the card snippet so far — the full text arrives with the
                next enrichment pass.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">No description captured.</p>
          )}
        </div>

        <div className="rounded-xl bg-navy-800/[0.04] px-3 py-2.5 text-xs leading-relaxed text-muted dark:bg-white/5">
          <span className="font-semibold text-foreground">Client:</span>{" "}
          {listing.client ?? "not available"} ·{" "}
          <span className="font-semibold text-foreground">Email:</span>{" "}
          {listing.email ?? "not available"}
          <br />
          Both are hidden from anonymous visitors on onlinejobs.ph. Open the
          source post to see them while signed in.
        </div>

        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-navy-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Open original post
          <ExternalLink aria-hidden className="size-4" />
        </a>
      </div>
      </aside>
    </>
  );
}

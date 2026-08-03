import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Minus } from "lucide-react";
import type { Listing, ListingFilters, ListingSort } from "@/lib/dashboard/types";
import { toQueryString } from "@/lib/dashboard/filters";
import { absoluteTime, humanise, relativeTime, truncate } from "@/lib/dashboard/format";
import { Chip } from "./primitives";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  sortKey?: ListingSort;
  className?: string;
  /** Hidden below this breakpoint to keep the table readable on narrow screens. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

const COLUMNS: Column[] = [
  // w-full + max-w-0 on the cell is the standard way to make one column absorb
  // the leftover width in a table whose other columns are fixed. Without the
  // w-full the browser shrinks it to its minimum and the title truncates to a
  // few characters.
  { key: "title", label: "Role", sortKey: "title", className: "w-full" },
  { key: "posted", label: "Posted", sortKey: "posted_at", className: "w-32" },
  { key: "type", label: "Type", className: "w-28", hideBelow: "md" },
  { key: "category", label: "Category", className: "w-44", hideBelow: "lg" },
  { key: "salary", label: "Salary", className: "w-48", hideBelow: "xl" },
  { key: "contact", label: "Contact", className: "w-24", hideBelow: "lg" },
  { key: "open", label: "Source", className: "w-20" },
];

const hideClass = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

/**
 * The leads table.
 *
 * Server-rendered: sorting and paging are links, so the table works before
 * hydration, back/forward behave, and every view is a shareable URL. Sorting
 * state is exposed through `aria-sort`, which is what a screen reader reads —
 * an arrow glyph alone conveys nothing.
 *
 * Every link here sets `prefetch={false}`. The route is `force-dynamic`, so a
 * prefetch is a full server render plus two API calls; with a link per row
 * Next queued ~50 of them on load and the navigation the user actually asked
 * for sat behind the lot, taking over ten seconds to commit.
 */
export function LeadTable({
  listings,
  filters,
  selectedId,
}: {
  listings: Listing[];
  filters: ListingFilters;
  selectedId?: string;
}) {
  return (
    <>
      {/* Below md the table needs ~44rem and would become a horizontal
          scroller showing one truncated column. Cards carry the same data in a
          shape that fits a phone. Different test id from the table rows so the
          two never double-count. */}
      <ul className="divide-y divide-border md:hidden">
        {listings.map((listing) => (
          <li key={listing.id}>
            <MobileCard
              listing={listing}
              filters={filters}
              selected={listing.id === selectedId}
            />
          </li>
        ))}
      </ul>

      {/* The table scrolls inside its own container so the page body never
          scrolls horizontally. */}
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[44rem] table-fixed border-collapse text-left text-sm">
        <caption className="sr-only">
          Scraped job posts, {filters.sort} {filters.order === "asc" ? "ascending" : "descending"}
        </caption>
        <thead>
          <tr className="border-b border-border">
            {COLUMNS.map((col) => {
              const isSorted = col.sortKey && filters.sort === col.sortKey;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    !col.sortKey
                      ? undefined
                      : isSorted
                        ? filters.order === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                  }
                  className={cn(
                    // Sticky header: 25–100 rows is longer than a viewport, and
                    // scrolling past the column names makes a wide table
                    // unreadable.
                    "sticky top-0 z-10 bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted",
                    col.className,
                    col.hideBelow && hideClass[col.hideBelow],
                  )}
                >
                  {col.sortKey ? (
                    <SortLink
                      column={col.sortKey}
                      label={col.label}
                      filters={filters}
                      active={Boolean(isSorted)}
                    />
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border" data-testid="lead-table-body">
          {listings.map((listing) => (
            <Row
              key={listing.id}
              listing={listing}
              filters={filters}
              selected={listing.id === selectedId}
            />
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

/** One listing as a card, for viewports too narrow for the table. */
function MobileCard({
  listing,
  filters,
  selected,
}: {
  listing: Listing;
  filters: ListingFilters;
  selected: boolean;
}) {
  const detailHref = `/dashboard/leads${toQueryString({
    ...filters,
    selected: listing.id,
  })}`;

  return (
    <div
      data-testid="lead-card"
      data-listing-id={listing.id}
      className={cn("px-4 py-3.5", selected && "bg-coral-500/[0.07]")}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          href={detailHref}
          scroll={false}
          prefetch={false}
          className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
        >
          <span className="block text-sm font-semibold leading-snug">
            {listing.title}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted">
            {truncate(listing.description_snippet ?? listing.description, 120) ||
              "No description captured yet."}
          </span>
        </Link>
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open "${listing.title}" on ${listing.source} in a new tab`}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
        >
          <ExternalLink aria-hidden className="size-4" />
        </a>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <time
          dateTime={listing.posted_at}
          className="mr-1 text-xs tabular-nums text-muted"
        >
          {relativeTime(listing.posted_at)}
        </time>
        {listing.job_type && <Chip tone="neutral">{humanise(listing.job_type)}</Chip>}
        {listing.category && <Chip tone="muted">{humanise(listing.category)}</Chip>}
        {listing.salary && <Chip tone="muted">{truncate(listing.salary, 24)}</Chip>}
      </div>
    </div>
  );
}

function SortLink({
  column,
  label,
  filters,
  active,
}: {
  column: ListingSort;
  label: string;
  filters: ListingFilters;
  active: boolean;
}) {
  // Clicking the active column flips direction; a new column starts descending
  // (newest / Z-A first), which is what people expect from a feed of posts.
  const nextOrder = active && filters.order === "desc" ? "asc" : "desc";
  const Icon = !active ? ArrowUpDown : filters.order === "asc" ? ArrowUp : ArrowDown;

  return (
    <Link
      href={`/dashboard/leads${toQueryString({
        ...filters,
        sort: column,
        order: nextOrder,
        offset: 0,
      })}`}
      prefetch={false}
      data-testid={`sort-${column}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
        active ? "text-foreground" : "hover:text-foreground",
      )}
    >
      {label}
      <Icon
        aria-hidden
        className={cn("size-3.5", active ? "text-coral-500" : "text-muted/60")}
      />
      <span className="sr-only">
        {active
          ? `, sorted ${filters.order === "asc" ? "ascending" : "descending"}, select to reverse`
          : ", select to sort"}
      </span>
    </Link>
  );
}

function Row({
  listing,
  filters,
  selected,
}: {
  listing: Listing;
  filters: ListingFilters;
  selected: boolean;
}) {
  const detailHref = `/dashboard/leads${toQueryString({
    ...filters,
    selected: listing.id,
  })}`;

  return (
    <tr
      data-testid="lead-row"
      data-listing-id={listing.id}
      className={cn(
        "group transition-colors",
        selected ? "bg-coral-500/[0.07]" : "hover:bg-navy-800/[0.025] dark:hover:bg-white/[0.04]",
      )}
    >
      <td className="w-full max-w-0 px-4 py-3 align-top">
        {/* The whole cell is the click target; a bare link on the title would
            be a small hit area in a dense row. */}
        <Link
          href={detailHref}
          scroll={false}
          prefetch={false}
          data-testid="lead-row-link"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
        >
          <span className="block truncate font-semibold text-foreground group-hover:text-coral-600">
            {listing.title}
          </span>
          <span className="mt-0.5 block truncate text-xs leading-relaxed text-muted">
            {truncate(listing.description_snippet ?? listing.description, 110) ||
              "No description captured yet."}
          </span>
        </Link>
      </td>

      <td className="px-4 py-3 align-top">
        <time
          dateTime={listing.posted_at}
          title={absoluteTime(listing.posted_at)}
          className="whitespace-nowrap tabular-nums text-muted"
        >
          {relativeTime(listing.posted_at)}
        </time>
      </td>

      <td className={cn("px-4 py-3 align-top", hideClass.md)}>
        {listing.job_type ? (
          <Chip tone="neutral">{humanise(listing.job_type)}</Chip>
        ) : (
          <Dash />
        )}
      </td>

      <td className={cn("px-4 py-3 align-top", hideClass.lg)}>
        {listing.category ? (
          <span className="block truncate text-muted">{humanise(listing.category)}</span>
        ) : (
          <Dash />
        )}
      </td>

      <td className={cn("px-4 py-3 align-top", hideClass.xl)}>
        {listing.salary ? (
          <span className="block truncate tabular-nums text-muted">{listing.salary}</span>
        ) : (
          <Dash />
        )}
      </td>

      <td className={cn("px-4 py-3 align-top", hideClass.lg)}>
        {listing.email ? (
          <a
            href={`mailto:${listing.email}`}
            className="truncate text-coral-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
          >
            {listing.email}
          </a>
        ) : (
          // A dash, not the words "login-gated" on every row: repeating the
          // same label 25 times is noise. The reason stays reachable through
          // the tooltip and the screen-reader text.
          <span
            className="text-muted/60"
            title="Not available — onlinejobs.ph hides employer contact details from anonymous visitors"
          >
            <Minus aria-hidden className="size-3.5" />
            <span className="sr-only">
              Not available, login-gated at the source
            </span>
          </span>
        )}
      </td>

      <td className="px-4 py-3 align-top">
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open "${listing.title}" on ${listing.source} in a new tab`}
          className="inline-grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-navy-800/6 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:hover:bg-white/10"
        >
          <ExternalLink aria-hidden className="size-4" />
        </a>
      </td>
    </tr>
  );
}

function Dash() {
  return (
    <span className="text-muted/60">
      <Minus aria-hidden className="size-3.5" />
      <span className="sr-only">Not available</span>
    </span>
  );
}

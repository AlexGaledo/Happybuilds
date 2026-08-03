import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ListingFilters } from "@/lib/dashboard/types";
import { PAGE_SIZES, toQueryString } from "@/lib/dashboard/filters";
import { cn } from "@/lib/utils";

/**
 * Offset paging, rendered as links.
 *
 * Links rather than buttons so pages are shareable, work without JS, and land
 * correctly in browser history — the same reason filters live in the URL.
 */
export function Pagination({
  filters,
  total,
}: {
  filters: ListingFilters;
  total: number;
}) {
  const { limit, offset } = filters;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(Math.ceil(total / limit), 1);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  const prevHref = `/dashboard/leads${toQueryString({
    ...filters,
    offset: Math.max(offset - limit, 0),
  })}`;
  const nextHref = `/dashboard/leads${toQueryString({
    ...filters,
    offset: offset + limit,
  })}`;

  const navClass =
    "inline-flex min-h-11 items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500";

  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3"
    >
      <p className="text-xs text-muted">
        Showing <span className="font-semibold tabular-nums text-foreground">{from}</span>–
        <span className="font-semibold tabular-nums text-foreground">{to}</span> of{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {total.toLocaleString("en-US")}
        </span>
      </p>

      <div className="flex items-center gap-1.5" aria-label="Rows per page">
        <span className="mr-1 text-xs text-muted">Rows</span>
        {PAGE_SIZES.map((size) => (
          <Link
            key={size}
            href={`/dashboard/leads${toQueryString({ ...filters, limit: size, offset: 0 })}`}
            prefetch={false}
            aria-current={limit === size ? "true" : undefined}
            className={cn(
              "grid min-h-9 min-w-9 place-items-center rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
              limit === size
                ? "bg-navy-800 text-white"
                : "text-muted hover:bg-navy-800/6 hover:text-foreground dark:hover:bg-white/10",
            )}
          >
            {size}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-muted">
          Page {page} of {pages}
        </span>
        {offset > 0 ? (
          <Link href={prevHref} prefetch={false} data-testid="page-prev" className={cn(navClass, "hover:bg-navy-800/6 dark:hover:bg-white/10")}>
            <ChevronLeft aria-hidden className="size-4" />
            Previous
          </Link>
        ) : (
          <span aria-disabled className={cn(navClass, "cursor-not-allowed opacity-45")}>
            <ChevronLeft aria-hidden className="size-4" />
            Previous
          </span>
        )}
        {to < total ? (
          <Link href={nextHref} prefetch={false} data-testid="page-next" className={cn(navClass, "hover:bg-navy-800/6 dark:hover:bg-white/10")}>
            Next
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : (
          <span aria-disabled className={cn(navClass, "cursor-not-allowed opacity-45")}>
            Next
            <ChevronRight aria-hidden className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}

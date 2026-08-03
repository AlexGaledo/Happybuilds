"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import type { ListingFacets } from "@/lib/dashboard/types";
import { HOUR_WINDOWS } from "@/lib/dashboard/filters";
import { humanise } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Filter bar for the leads table.
 *
 * Writes to the URL and lets the server re-render the table, so filter state
 * is shareable and survives a refresh. Search is debounced — a request per
 * keystroke would hammer the API for results the user isn't reading yet.
 */
export function LeadFilters({
  facets,
  total,
  activeCount,
}: {
  facets: ListingFacets | null;
  total: number;
  activeCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const committed = searchParams.toString();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  /**
   * Optimistic view of the query string.
   *
   * The selects and the checkbox are controlled by the URL, and a navigation
   * only lands once the server has re-rendered the table. Reading the committed
   * params directly made a control snap back to its old value for the length of
   * that round trip — a checkbox that visibly un-ticks itself when you click it.
   * `useOptimistic` shows the intended value immediately and is reconciled by
   * the real URL when the transition settles.
   */
  const [optimistic, setOptimistic] = useOptimistic(committed);
  const params = new URLSearchParams(optimistic);

  // Keep the box in step when the URL changes from elsewhere — Clear, a link
  // from the overview, browser back. Adjusted during render rather than in an
  // effect (React's "adjusting state when a prop changes" pattern) so there is
  // no flash of the stale value.
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);

  /**
   * The search value already handed to the router.
   *
   * A navigation is not instant, so between pushing and the URL landing,
   * `query !== urlQuery` even though there is nothing left to send. Without
   * this the debounce re-armed after Clear and pushed the pre-Clear filters
   * straight back over the empty URL.
   */
  const [pushedQuery, setPushedQuery] = useState(urlQuery);

  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setQuery(urlQuery);
    setPushedQuery(urlQuery);
  }

  // A pending search debounce has to be cancellable from the other controls.
  // Without this, clicking Clear pushed the empty URL and the in-flight
  // debounce then pushed its own stale copy over the top, resurrecting the
  // filters the user had just cleared.
  const pendingSearch = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelPendingSearch() {
    if (pendingSearch.current) {
      clearTimeout(pendingSearch.current);
      pendingSearch.current = null;
    }
  }

  function apply(patch: Record<string, string | undefined>) {
    cancelPendingSearch();
    const next = new URLSearchParams(committed);
    // The current search text rides along with every other filter change, so
    // cancelling the debounce never drops what the user typed.
    const merged = { q: query || undefined, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Any filter change invalidates the current page and the open row.
    next.delete("offset");
    next.delete("selected");
    setPushedQuery(merged.q ?? "");
    const qs = next.toString();
    startTransition(() => {
      setOptimistic(qs);
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function clearAll() {
    cancelPendingSearch();
    setQuery("");
    setPushedQuery("");
    startTransition(() => {
      setOptimistic("");
      router.push(pathname);
    });
  }

  useEffect(() => {
    if (query === urlQuery || query === pushedQuery) return;
    const id = setTimeout(() => {
      pendingSearch.current = null;
      apply({});
    }, SEARCH_DEBOUNCE_MS);
    pendingSearch.current = id;
    return () => clearTimeout(id);
    // `apply` closes over searchParams, which changes on every navigation;
    // depending on it would re-fire the debounce after its own push.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, urlQuery, pushedQuery]);

  const selectClass =
    "min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-navy-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500";

  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* basis + min-width: with `flex-1` alone the box collapsed to a few
            pixels once the selects were on the same row. It now wraps to its
            own line instead of shrinking to unusable. */}
        <div className="relative flex-1 basis-64 min-w-[15rem] sm:max-w-sm">
          <label htmlFor="lead-search" className="sr-only">
            Search leads by title or description
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            id="lead-search"
            type="search"
            inputMode="search"
            data-testid="filter-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Search title or description…"
            className="min-h-11 w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-9 text-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                apply({ q: undefined });
              }}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-navy-800/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>

        <label className="sr-only" htmlFor="filter-hours">
          Posted within
        </label>
        <select
          id="filter-hours"
          data-testid="filter-hours"
          value={params.get("hours") ?? ""}
          onChange={(e) => apply({ hours: e.target.value || undefined })}
          className={selectClass}
        >
          {HOUR_WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-job-type">
          Job type
        </label>
        <select
          id="filter-job-type"
          data-testid="filter-job-type"
          value={params.get("job_type") ?? ""}
          onChange={(e) => apply({ job_type: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">All job types</option>
          {facets?.job_types.map((f) => (
            <option key={f.value} value={f.value}>
              {humanise(f.value)} ({f.count})
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-category">
          Category
        </label>
        <select
          id="filter-category"
          data-testid="filter-category"
          value={params.get("category") ?? ""}
          onChange={(e) => apply({ category: e.target.value || undefined })}
          className={cn(selectClass, "max-w-[14rem]")}
        >
          <option value="">All categories</option>
          {facets?.categories.map((f) => (
            <option key={f.value} value={f.value}>
              {humanise(f.value)} ({f.count})
            </option>
          ))}
        </select>

        <label
          className={cn(
            "inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
            params.get("has_email") === "true"
              ? "border-coral-500 bg-coral-500/10 text-coral-ink"
              : "border-border bg-surface text-foreground hover:border-navy-300",
          )}
        >
          <input
            type="checkbox"
            data-testid="filter-has-email"
            checked={params.get("has_email") === "true"}
            onChange={(e) => apply({ has_email: e.target.checked ? "true" : undefined })}
            className="size-4 accent-[var(--color-coral-500)]"
          />
          Has email
        </label>

        {activeCount > 0 && (
          <button
            type="button"
            data-testid="filter-clear"
            onClick={clearAll}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-coral-ink transition-colors hover:bg-coral-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
          >
            <X aria-hidden className="size-4" />
            Clear {activeCount}
          </button>
        )}
      </div>

      <p
        aria-live="polite"
        data-testid="result-count"
        className="flex items-center gap-2 text-xs text-muted"
      >
        {pending ? (
          <>
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            Updating…
          </>
        ) : (
          <>
            <SlidersHorizontal aria-hidden className="size-3.5" />
            <span className="tabular-nums">{total.toLocaleString("en-US")}</span>
            {total === 1 ? "lead" : "leads"} match
            {activeCount === 0 ? " (no filters applied)" : ""}
          </>
        )}
      </p>
    </div>
  );
}

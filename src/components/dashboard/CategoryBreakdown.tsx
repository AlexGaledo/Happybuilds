import Link from "next/link";
import type { FacetValue } from "@/lib/dashboard/types";
import { humanise, percent } from "@/lib/dashboard/format";
import { EmptyState } from "./primitives";

/**
 * Top categories as a horizontal bar list.
 *
 * Horizontal bars, not a pie: there are far more than five categories, and pie
 * slices become unreadable past that. Each row is a link that pre-applies the
 * matching filter on the leads table.
 */
export function CategoryBreakdown({
  facets,
  total,
  limit = 6,
}: {
  facets: FacetValue[];
  total: number;
  limit?: number;
}) {
  if (!facets.length) {
    return (
      <EmptyState
        title="No categories yet"
        description="Categories appear once the scraper has stored some listings."
      />
    );
  }

  const top = facets.slice(0, limit);
  const max = Math.max(...top.map((f) => f.count), 1);

  return (
    <ul className="flex flex-col gap-3 px-5 py-4">
      {top.map((facet) => {
        const share = percent(facet.count, total || max);
        return (
          <li key={facet.value}>
            <Link
              href={`/dashboard/leads?category=${encodeURIComponent(facet.value)}`}
              prefetch={false}
              className="group block rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
            >
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium group-hover:text-coral-ink">
                  {humanise(facet.value)}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {facet.count}
                  <span className="ml-1 text-xs">({share}%)</span>
                </span>
              </span>
              <span
                aria-hidden
                className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-navy-800/6 dark:bg-white/10"
              >
                <span
                  className="block h-full rounded-full bg-navy-500 transition-[width] duration-300 ease-[var(--ease-out-soft)] group-hover:bg-coral-500"
                  style={{ width: `${Math.max((facet.count / max) * 100, 3)}%` }}
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

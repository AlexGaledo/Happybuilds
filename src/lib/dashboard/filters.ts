import {
  LISTING_SORTS,
  type ListingFilters,
  type ListingSort,
  type SortOrder,
} from "./types";

/**
 * Filter state lives in the URL, not in React state.
 *
 * That makes every view shareable and bookmarkable, survives a refresh, and
 * lets the table render on the server — `state-preservation` and `deep-linking`
 * both fall out of it for free. This module is the single place where the
 * query string is parsed and re-serialised, so the two can never drift.
 */

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Time windows offered in the UI. `undefined` means "no limit". */
export const HOUR_WINDOWS = [
  { value: "", label: "Any time" },
  { value: "12", label: "Last 12 hours" },
  { value: "24", label: "Last 24 hours" },
  { value: "48", label: "Last 2 days" },
  { value: "168", label: "Last 7 days" },
] as const;

export type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function intParam(
  params: SearchParams,
  key: string,
  { min, max }: { min: number; max: number },
): number | undefined {
  const raw = one(params, key);
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return undefined;
  return Math.min(Math.max(n, min), max);
}

/** Parse and clamp the query string. Anything unrecognised falls back to a
 * default rather than being forwarded to the API. */
export function parseFilters(params: SearchParams): ListingFilters {
  const sortRaw = one(params, "sort");
  const sort: ListingSort = LISTING_SORTS.includes(sortRaw as ListingSort)
    ? (sortRaw as ListingSort)
    : "posted_at";
  const order: SortOrder = one(params, "order") === "asc" ? "asc" : "desc";

  const hasEmailRaw = one(params, "has_email");
  const limit = intParam(params, "limit", { min: 1, max: 200 }) ?? DEFAULT_PAGE_SIZE;

  return {
    q: one(params, "q"),
    hours: intParam(params, "hours", { min: 1, max: 720 }),
    job_type: one(params, "job_type"),
    category: one(params, "category"),
    has_email:
      hasEmailRaw === "true" ? true : hasEmailRaw === "false" ? false : undefined,
    sort,
    order,
    limit,
    offset: intParam(params, "offset", { min: 0, max: 1_000_000 }) ?? 0,
  };
}

/** Serialise filters back to a query string, omitting defaults so URLs stay
 * short and two equivalent views share one URL. */
export function toQueryString(
  filters: Partial<ListingFilters> & { selected?: string },
): string {
  const search = new URLSearchParams();
  if (filters.q) search.set("q", filters.q);
  if (filters.hours) search.set("hours", String(filters.hours));
  if (filters.job_type) search.set("job_type", filters.job_type);
  if (filters.category) search.set("category", filters.category);
  if (filters.has_email !== undefined) search.set("has_email", String(filters.has_email));
  if (filters.sort && filters.sort !== "posted_at") search.set("sort", filters.sort);
  if (filters.order && filters.order !== "desc") search.set("order", filters.order);
  if (filters.limit && filters.limit !== DEFAULT_PAGE_SIZE)
    search.set("limit", String(filters.limit));
  if (filters.offset) search.set("offset", String(filters.offset));
  if (filters.selected) search.set("selected", filters.selected);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** How many filters (not paging or sorting) the user has applied. */
export function activeFilterCount(filters: ListingFilters): number {
  return [
    filters.q,
    filters.hours,
    filters.job_type,
    filters.category,
    filters.has_email,
  ].filter((v) => v !== undefined && v !== "").length;
}

import "server-only";

import type {
  ListingFacets,
  ListingFilters,
  ListingHistogram,
  ListingListResponse,
  ListingStats,
  Listing,
  LeadListResponse,
  LeadStats,
  ScrapeStatus,
} from "./types";

/**
 * Server-side client for the lead backend.
 *
 * The dashboard fetches on the server, not in the browser. Two reasons:
 * the backend binds to loopback on the VPS, so the Next server can reach it
 * without a public `api.` hostname or CORS; and the table then arrives fully
 * rendered instead of flashing a spinner.
 *
 * `API_INTERNAL_URL` is server-only and must NOT be `NEXT_PUBLIC_*` — that
 * would leak the internal address into the client bundle.
 */
export const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000/api/v1";

/** Non-2xx from the backend, carrying the status so pages can distinguish. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, typeof value === "boolean" ? String(value) : String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function apiGet<T>(
  path: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = `${API_INTERNAL_URL}${path}${buildQuery(params)}`;
  let res: Response;
  try {
    // no-store: the dashboard must show what the DB holds right now. The
    // backend's own Redis layer is what keeps this cheap.
    res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError(0, path, `Cannot reach the API at ${API_INTERNAL_URL}`);
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = JSON.stringify(body.detail);
    } catch {
      /* body wasn't JSON; the status line is enough */
    }
    throw new ApiError(res.status, path, detail);
  }
  return (await res.json()) as T;
}

/**
 * Run a fetch and fold failures into a value instead of throwing.
 *
 * The overview shows several independent panels; one dead endpoint should
 * degrade that panel, not blank the page.
 */
export async function safe<T>(
  promise: Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    return { data: await promise, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ------------------------------------------------------------------ listings

export function getListings(
  filters: Partial<ListingFilters> = {},
): Promise<ListingListResponse> {
  return apiGet<ListingListResponse>("/listings", {
    limit: filters.limit ?? 25,
    offset: filters.offset ?? 0,
    hours: filters.hours,
    job_type: filters.job_type,
    category: filters.category,
    q: filters.q,
    has_email: filters.has_email,
    sort: filters.sort,
    order: filters.order,
  });
}

export function getListing(id: string): Promise<Listing> {
  return apiGet<Listing>(`/listings/${id}`);
}

export function getListingStats(): Promise<ListingStats> {
  return apiGet<ListingStats>("/listings/stats");
}

export function getListingFacets(): Promise<ListingFacets> {
  return apiGet<ListingFacets>("/listings/facets");
}

export function getListingHistogram(hours = 48): Promise<ListingHistogram> {
  return apiGet<ListingHistogram>("/listings/histogram", { hours });
}

export function getScrapeStatus(): Promise<ScrapeStatus> {
  return apiGet<ScrapeStatus>("/listings/scrape/status");
}

/** Fire a manual scrape. 409 if the cron run already holds the Redis lock. */
export async function triggerScrape(): Promise<{ status: string; detail?: string }> {
  const res = await fetch(`${API_INTERNAL_URL}/listings/scrape`, {
    method: "POST",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      "/listings/scrape",
      typeof body?.detail === "string" ? body.detail : `${res.status}`,
    );
  }
  return body;
}

// --------------------------------------------------------------------- leads

export function getLeads(
  params: { limit?: number; offset?: number; status?: string; q?: string } = {},
): Promise<LeadListResponse> {
  return apiGet<LeadListResponse>("/leads", {
    limit: params.limit ?? 25,
    offset: params.offset ?? 0,
    status: params.status,
    q: params.q,
  });
}

export function getLeadStats(): Promise<LeadStats> {
  return apiGet<LeadStats>("/leads/stats");
}

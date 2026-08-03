/**
 * Types mirroring the fickles-automated-lead API schemas.
 *
 * Kept hand-written (rather than generated) because the surface is small, but
 * they must stay in step with `app/schemas/listing.py` and `app/schemas/lead.py`.
 * `scripts/check-api-contract.mjs` asserts that at runtime against the live API.
 */

/** A scraped job post — the "lead" the dashboard table is built around. */
export interface Listing {
  id: string;
  external_id: string;
  source: string;
  title: string;
  url: string;
  posted_at: string;
  description: string | null;
  description_snippet: string | null;
  /**
   * Both null for onlinejobs.ph: the site hides employer identity and contact
   * details from anonymous visitors. See docs/scraping-notes.md — the UI must
   * degrade gracefully rather than show empty columns as a bug.
   */
  client: string | null;
  email: string | null;
  job_type: string | null;
  salary: string | null;
  hours_per_week: string | null;
  category: string | null;
  skills: string[] | null;
  detail_fetched_at: string | null;
  first_seen_at: string | null;
  scraped_at: string | null;
}

export interface ListingListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Listing[];
}

export interface ListingStats {
  total: number;
  with_description: number;
  pending_detail: number;
  posted_last_24h: number;
  newest_posted_at: string | null;
  oldest_posted_at: string | null;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface ListingFacets {
  job_types: FacetValue[];
  categories: FacetValue[];
}

export interface HistogramBucket {
  bucket: string;
  count: number;
}

export interface ListingHistogram {
  hours: number;
  buckets: HistogramBucket[];
}

/** Summary of the last scrape run, as published to Redis by scrape_service. */
export interface ScrapeRunState {
  status?: string;
  trigger?: string;
  started_at?: string;
  finished_at?: string;
  total_seconds?: number;
  listings_in_window?: number;
  inserted?: number;
  updated?: number;
  enriched?: number;
  detail_fetches?: number;
  pages_fetched?: number;
  errors?: string[];
  error?: string;
  [key: string]: unknown;
}

export interface ScrapeStatus {
  running: boolean;
  lock_holder: string | null;
  last_run: ScrapeRunState | null;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  service: string | null;
  budget: string | null;
  message: string;
  status: LeadStatus;
  created_at: string;
}

export interface LeadListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Lead[];
}

export interface LeadStats {
  total: number;
  by_status: Record<LeadStatus, number>;
  created_last_7d: number;
  newest_created_at: string | null;
}

/** Columns the API will sort by. Mirrors `repos/listings.SORTABLE`. */
export type ListingSort = "posted_at" | "title" | "scraped_at" | "first_seen_at";
export type SortOrder = "asc" | "desc";

/** Every filter the listings table can apply, all URL-serialisable. */
export interface ListingFilters {
  q?: string;
  hours?: number;
  job_type?: string;
  category?: string;
  has_email?: boolean;
  sort: ListingSort;
  order: SortOrder;
  limit: number;
  offset: number;
}

export const LISTING_SORTS: ListingSort[] = [
  "posted_at",
  "title",
  "scraped_at",
  "first_seen_at",
];

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

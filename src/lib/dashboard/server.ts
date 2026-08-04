import "server-only";

import type {
  DashboardConfig,
  DraftCounts,
  DraftListResponse,
  ListingFacets,
  ListingFilters,
  ListingHistogram,
  ListingListResponse,
  ListingStats,
  Listing,
  LeadListResponse,
  LeadStats,
  MailboxStatus,
  PipelineCounts,
  PipelineListResponse,
  ProcessStatus,
  ReplyListResponse,
  ScrapeStatus,
  TargetKind,
  TemplateListResponse,
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

// ------------------------------------------------------------------ pipeline

/** Generic non-GET call. Same error shape as `apiGet`, so callers only ever
 * have to catch `ApiError`. */
async function apiSend<T>(
  path: string,
  { method = "POST", body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = `${API_INTERNAL_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, path, `Cannot reach the API at ${API_INTERNAL_URL}`);
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const parsed = await res.json();
      if (parsed?.detail) {
        detail =
          typeof parsed.detail === "string"
            ? parsed.detail
            : JSON.stringify(parsed.detail);
      }
    } catch {
      /* body wasn't JSON */
    }
    throw new ApiError(res.status, path, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface PipelineQuery {
  processed?: boolean;
  kind?: TargetKind;
  qualified?: boolean;
  q?: string;
  hours?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: string;
}

export function getPipeline(query: PipelineQuery = {}): Promise<PipelineListResponse> {
  return apiGet<PipelineListResponse>("/pipeline", {
    processed: query.processed,
    kind: query.kind,
    qualified: query.qualified,
    q: query.q,
    hours: query.hours,
    limit: query.limit ?? 25,
    offset: query.offset ?? 0,
    sort: query.sort,
    order: query.order,
  });
}

export function getPipelineCounts(): Promise<PipelineCounts> {
  return apiGet<PipelineCounts>("/pipeline/counts");
}

export function getProcessStatus(): Promise<ProcessStatus> {
  return apiGet<ProcessStatus>("/pipeline/process/status");
}

/** Start a drafting batch. 409 when one already holds the Redis lock. */
export function startProcessing(payload: {
  targets?: { kind: TargetKind; id: string }[];
  kind?: TargetKind;
  limit?: number;
}): Promise<{ status: string }> {
  return apiSend("/pipeline/process", { body: payload });
}

export function setProcessed(
  kind: TargetKind,
  id: string,
  processed: boolean,
): Promise<{ processed: boolean }> {
  return apiSend(`/pipeline/${kind}/${id}/processed`, { body: { processed } });
}

// -------------------------------------------------------------------- drafts

export function getDrafts(
  query: {
    channel?: "email" | "manual";
    status?: string;
    include_sent?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<DraftListResponse> {
  return apiGet<DraftListResponse>("/drafts", {
    channel: query.channel,
    status: query.status,
    include_sent: query.include_sent,
    q: query.q,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  });
}

export function getDraftCounts(): Promise<DraftCounts> {
  return apiGet<DraftCounts>("/drafts/counts");
}

export function getMailboxStatus(): Promise<MailboxStatus> {
  return apiGet<MailboxStatus>("/drafts/mailbox");
}

export function sendDrafts(draftIds: string[]) {
  return apiSend("/drafts/send", { body: { draft_ids: draftIds } });
}

export function updateDraft(
  id: string,
  patch: { subject?: string; body?: string; recipient_email?: string },
) {
  return apiSend(`/drafts/${id}`, { method: "PATCH", body: patch });
}

export function markDraftSent(id: string) {
  return apiSend(`/drafts/${id}/mark-sent`, { body: {} });
}

export function deleteDraft(id: string) {
  return apiSend(`/drafts/${id}`, { method: "DELETE" });
}

// ------------------------------------------------------------------- replies

export function getReplies(
  query: { unread_only?: boolean; q?: string; limit?: number; offset?: number } = {},
): Promise<ReplyListResponse> {
  return apiGet<ReplyListResponse>("/drafts/replies", {
    unread_only: query.unread_only,
    q: query.q,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
  });
}

export function syncReplies() {
  return apiSend<{ threads: number; fetched: number; stored: number }>(
    "/drafts/replies/sync",
    { body: {} },
  );
}

export function markReplyRead(id: string, read: boolean) {
  return apiSend(`/drafts/replies/${id}/read`, { body: { read } });
}

// ----------------------------------------------------------------- templates

export function getConfig(): Promise<DashboardConfig> {
  return apiGet<DashboardConfig>("/config");
}

export function getTemplates(activeOnly = false): Promise<TemplateListResponse> {
  return apiGet<TemplateListResponse>("/templates", { active_only: activeOnly });
}

export function createTemplate(payload: unknown) {
  return apiSend("/templates", { body: payload });
}

export function updateTemplate(id: string, payload: unknown) {
  return apiSend(`/templates/${id}`, { method: "PATCH", body: payload });
}

export function deleteTemplate(id: string) {
  return apiSend(`/templates/${id}`, { method: "DELETE" });
}

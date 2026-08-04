import type { SearchParams } from "./filters";
import type { TargetKind } from "./types";

/**
 * URL state for the pipeline tab.
 *
 * The two tables page independently — working through the queue must not
 * scroll the processed list out from under you — so each carries its own
 * offset. Everything else (search, source, window) is shared, because filtering
 * one side but not the other makes the split meaningless.
 */

export const PIPELINE_PAGE_SIZE = 20;

export interface PipelineFilters {
  q?: string;
  kind?: TargetKind;
  hours?: number;
  /** Offset into the unprocessed table. */
  qOffset: number;
  /** Offset into the processed table. */
  pOffset: number;
}

function one(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function intParam(params: SearchParams, key: string, max: number): number {
  const raw = one(params, key);
  if (raw === undefined) return 0;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, max);
}

export function parsePipelineFilters(params: SearchParams): PipelineFilters {
  const kindRaw = one(params, "kind");
  const hoursRaw = one(params, "hours");
  const hours = hoursRaw ? Number.parseInt(hoursRaw, 10) : NaN;

  return {
    q: one(params, "q"),
    kind: kindRaw === "listing" || kindRaw === "lead" ? kindRaw : undefined,
    hours: Number.isNaN(hours) ? undefined : Math.min(Math.max(hours, 1), 8760),
    qOffset: intParam(params, "qOffset", 1_000_000),
    pOffset: intParam(params, "pOffset", 1_000_000),
  };
}

export function pipelineQueryString(filters: Partial<PipelineFilters>): string {
  const search = new URLSearchParams();
  if (filters.q) search.set("q", filters.q);
  if (filters.kind) search.set("kind", filters.kind);
  if (filters.hours) search.set("hours", String(filters.hours));
  if (filters.qOffset) search.set("qOffset", String(filters.qOffset));
  if (filters.pOffset) search.set("pOffset", String(filters.pOffset));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  getPipeline,
  getPipelineCounts,
  getProcessStatus,
  safe,
} from "@/lib/dashboard/server";
import type { SearchParams } from "@/lib/dashboard/filters";
import {
  PIPELINE_PAGE_SIZE,
  parsePipelineFilters,
} from "@/lib/dashboard/pipelineFilters";
import { PipelineTables } from "@/components/dashboard/PipelineTables";
import { ProcessStatusPoller } from "@/components/dashboard/ProcessStatusPoller";
import { ErrorState, PageHeader } from "@/components/dashboard/primitives";

export const metadata: Metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

/**
 * The unified pipeline: everything unworked on the left, everything processed
 * on the right, across both lead sources.
 *
 * "Processed" means the agent read the lead, resolved a contact if one exists,
 * and wrote a message — or that you ticked it off by hand.
 */
export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parsePipelineFilters(params);

  const shared = {
    q: filters.q,
    kind: filters.kind,
    hours: filters.hours,
    limit: PIPELINE_PAGE_SIZE,
  };

  const [queue, done, counts, status] = await Promise.all([
    safe(getPipeline({ ...shared, processed: false, offset: filters.qOffset })),
    safe(
      getPipeline({
        ...shared,
        processed: true,
        offset: filters.pOffset,
        // Most recently processed first — the right-hand table is a record of
        // what just happened, so newest work belongs at the top.
        sort: "processed_at",
        order: "desc",
      }),
    ),
    safe(getPipelineCounts()),
    safe(getProcessStatus()),
  ]);

  // Both tables dead means the API is down; that is a page-level failure, not
  // two empty panels.
  if (queue.error && done.error) {
    return (
      <>
        <PageHeader title="Pipeline" />
        <ErrorState
          title="Can't load the pipeline"
          message={queue.error}
          hint="The dashboard reads the backend over loopback. Check the API and its Postgres/Redis containers."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Every lead from both sources, split by whether the agent has read it and drafted a message. Filters live in the URL, so any view can be shared."
      />

      <div className="flex flex-col gap-4">
        <ProcessStatusPoller initial={status.data} />

        <FilterBar
          q={filters.q}
          kind={filters.kind}
          hours={filters.hours}
          total={(counts.data?.unprocessed ?? 0) + (counts.data?.processed ?? 0)}
        />

        <PipelineTables
          unprocessed={queue.data?.items ?? []}
          processed={done.data?.items ?? []}
          counts={counts.data}
          filters={filters}
          agentAvailable={status.data?.agent_available ?? false}
          running={status.data?.running ?? false}
        />
      </div>
    </>
  );
}

/**
 * A plain GET form. It works before hydration and with JavaScript off, and it
 * writes the same query string the page parses — no client state to drift.
 */
function FilterBar({
  q,
  kind,
  hours,
  total,
}: {
  q?: string;
  kind?: string;
  hours?: number;
  total: number;
}) {
  const active = Boolean(q || kind || hours);

  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
    >
      <div className="min-w-0 flex-1 basis-56">
        <label
          htmlFor="pipeline-q"
          className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
        >
          Search
        </label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search aria-hidden className="size-4 shrink-0 text-muted" />
          <input
            id="pipeline-q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Title, description, name or email"
            className="min-h-11 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/70"
          />
        </div>
      </div>

      <Select id="pipeline-kind" name="kind" label="Source" defaultValue={kind ?? ""}>
        <option value="">Both sources</option>
        <option value="listing">Job posts</option>
        <option value="lead">Enquiries</option>
      </Select>

      <Select
        id="pipeline-hours"
        name="hours"
        label="Window"
        defaultValue={hours ? String(hours) : ""}
      >
        <option value="">Any time</option>
        <option value="24">Last 24 hours</option>
        <option value="72">Last 3 days</option>
        <option value="168">Last 7 days</option>
      </Select>

      <button
        type="submit"
        className="min-h-11 rounded-full bg-navy-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Apply
      </button>

      {active && (
        <Link
          href="/dashboard/pipeline"
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-coral-ink hover:bg-coral-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
        >
          Clear
        </Link>
      )}

      <p className="ml-auto text-xs tabular-nums text-muted">{total} leads stored</p>
    </form>
  );
}

function Select({
  id,
  name,
  label,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="mt-1 min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
      >
        {children}
      </select>
    </div>
  );
}

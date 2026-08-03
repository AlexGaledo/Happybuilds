import { PageHeader, Panel } from "@/components/dashboard/primitives";

/**
 * Skeleton, not a spinner: it reserves the table's real dimensions so nothing
 * jumps when the data lands, and it reads as "content is coming" rather than
 * "something is happening somewhere".
 *
 * `animate-pulse` is disabled under prefers-reduced-motion by the global rule
 * in globals.css.
 */
export default function LeadsLoading() {
  return (
    <>
      <PageHeader
        title="Leads"
        description="Every job post the scraper has stored. Filters and sorting live in the URL, so any view can be shared."
      />
      <Panel className="overflow-hidden" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading leads…</span>
        <div className="flex flex-wrap gap-3 border-b border-border px-5 py-4">
          <div className="h-11 w-full animate-pulse rounded-xl bg-navy-800/6 sm:w-72 dark:bg-white/10" />
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-11 w-32 animate-pulse rounded-xl bg-navy-800/6 dark:bg-white/10"
            />
          ))}
        </div>
        <div className="divide-y divide-border">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-navy-800/6 dark:bg-white/10" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-navy-800/4 dark:bg-white/[0.06]" />
              </div>
              <div className="hidden h-3 w-20 animate-pulse rounded bg-navy-800/6 sm:block dark:bg-white/10" />
              <div className="hidden h-6 w-24 animate-pulse rounded-full bg-navy-800/6 md:block dark:bg-white/10" />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

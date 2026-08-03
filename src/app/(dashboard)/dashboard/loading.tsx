import { PageHeader, Panel } from "@/components/dashboard/primitives";

/** Overview skeleton mirroring the real grid so the layout doesn't shift. */
export default function OverviewLoading() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Pipeline health at a glance — what's been scraped, how fresh it is, and where the volume sits."
      />
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading overview…</span>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="flex flex-col gap-6 xl:col-span-2">
            <Panel className="h-64 animate-pulse" />
            <Panel className="h-80 animate-pulse" />
          </div>
          <div className="flex flex-col gap-6">
            <Panel className="h-56 animate-pulse" />
            <Panel className="h-64 animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}

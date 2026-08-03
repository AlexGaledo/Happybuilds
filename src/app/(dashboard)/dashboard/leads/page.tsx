import Link from "next/link";
import { Search } from "lucide-react";
import {
  getListing,
  getListingFacets,
  getListings,
  safe,
} from "@/lib/dashboard/server";
import {
  activeFilterCount,
  parseFilters,
  toQueryString,
  type SearchParams,
} from "@/lib/dashboard/filters";
import { LeadFilters } from "@/components/dashboard/LeadFilters";
import { LeadTable } from "@/components/dashboard/LeadTable";
import { Pagination } from "@/components/dashboard/Pagination";
import { ListingDetail } from "@/components/dashboard/ListingDetail";
import { DetailOverlay } from "@/components/dashboard/DetailOverlay";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
} from "@/components/dashboard/primitives";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const selectedId =
    typeof params.selected === "string" ? params.selected : undefined;

  const [page, facets, selected] = await Promise.all([
    safe(getListings(filters)),
    safe(getListingFacets()),
    selectedId ? safe(getListing(selectedId)) : Promise.resolve(null),
  ]);

  const activeCount = activeFilterCount(filters);
  const total = page.data?.total ?? 0;
  const items = page.data?.items ?? [];
  const closeHref = `/dashboard/leads${toQueryString({ ...filters, selected: undefined })}`;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every job post the scraper has stored. Filters and sorting live in the URL, so any view can be shared."
      />

      <div className="grid grid-cols-1 gap-6">
        <Panel className="min-w-0 overflow-hidden">
          <LeadFilters
            facets={facets.data}
            total={total}
            activeCount={activeCount}
          />

          {page.error ? (
            <ErrorState
              title="Can't load leads"
              message={page.error}
              hint="The dashboard reads the backend over loopback. Check the API and its Postgres/Redis containers."
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Search}
              title={activeCount > 0 ? "No leads match these filters" : "No leads stored yet"}
              description={
                activeCount > 0
                  ? "Try widening the time window or clearing a filter — the search matches title and description text only."
                  : "Run a scrape from the overview to populate the pipeline. The first full pass takes about 36 minutes."
              }
            />
          ) : (
            <>
              <LeadTable
                listings={items}
                filters={filters}
                selectedId={selectedId}
              />
              <Pagination filters={filters} total={total} />
            </>
          )}
        </Panel>

        {selected?.data && (
          <DetailOverlay closeHref={closeHref}>
            <ListingDetail listing={selected.data} filters={filters} />
          </DetailOverlay>
        )}

        {/* A stale ?selected= (deleted row, or a link from an old view) should
            say so rather than silently render nothing. */}
        {selectedId && selected?.error && (
          <DetailOverlay closeHref={closeHref}>
            <Link
              href={closeHref}
              scroll={false}
              aria-label="Close details"
              tabIndex={-1}
              className="fixed inset-0 z-40 bg-navy-900/25 backdrop-blur-[2px]"
            />
            <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-surface shadow-lift">
              <div className="flex justify-end px-4 pt-4">
                <Link
                  href={closeHref}
                  scroll={false}
                  data-testid="lead-detail-close"
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-coral-600 hover:bg-coral-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
                >
                  Close
                </Link>
              </div>
              <ErrorState
                title="Lead not found"
                message="This lead no longer exists, or the link is stale."
                hint="Close this panel and pick another row."
              />
            </aside>
          </DetailOverlay>
        )}
      </div>
    </>
  );
}

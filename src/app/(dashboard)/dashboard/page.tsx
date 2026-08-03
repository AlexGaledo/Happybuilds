import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Database,
  FileText,
  Inbox,
  Info,
} from "lucide-react";
import {
  getLeadStats,
  getListingFacets,
  getListingHistogram,
  getListings,
  getListingStats,
  getScrapeStatus,
  safe,
} from "@/lib/dashboard/server";
import { absoluteTime, percent, relativeTime, truncate } from "@/lib/dashboard/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { ScrapeControl } from "@/components/dashboard/ScrapeControl";
import { PostingActivity } from "@/components/dashboard/PostingActivity";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/dashboard/primitives";

// Always render against live data; the backend's Redis layer absorbs the cost.
export const dynamic = "force-dynamic";

const HISTOGRAM_HOURS = 48;

export default async function OverviewPage() {
  // Fetched in parallel and folded through `safe` so one dead endpoint
  // degrades a single panel instead of blanking the page.
  const [stats, scrape, histogram, facets, recent, leads] = await Promise.all([
    safe(getListingStats()),
    safe(getScrapeStatus()),
    safe(getListingHistogram(HISTOGRAM_HOURS)),
    safe(getListingFacets()),
    safe(getListings({ limit: 6, offset: 0 })),
    safe(getLeadStats()),
  ]);

  const s = stats.data;
  const coverage = s ? percent(s.with_description, s.total) : 0;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Pipeline health at a glance — what's been scraped, how fresh it is, and where the volume sits."
        action={
          <Link
            href="/dashboard/leads"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-coral-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-colors duration-200 hover:bg-coral-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Browse leads
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        }
      />

      {stats.error ? (
        <Panel className="mb-6">
          <ErrorState
            title="Can't reach the lead API"
            message={stats.error}
            hint="The dashboard reads the backend over loopback. Check that the API and its Postgres/Redis containers are up."
          />
        </Panel>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total leads"
            value={s!.total}
            tone="navy"
            icon={<Database className="size-4" />}
            hint={
              s!.oldest_posted_at
                ? `Oldest post ${relativeTime(s!.oldest_posted_at)}`
                : undefined
            }
          />
          <StatCard
            label="Posted last 24h"
            value={s!.posted_last_24h}
            tone="coral"
            icon={<Clock className="size-4" />}
            hint={
              s!.newest_posted_at
                ? `Newest ${relativeTime(s!.newest_posted_at)}`
                : undefined
            }
          />
          <StatCard
            label="Full descriptions"
            value={`${coverage}%`}
            tone="mint"
            icon={<FileText className="size-4" />}
            hint={`${s!.with_description} enriched · ${s!.pending_detail} awaiting a detail fetch`}
          />
          <StatCard
            label="Inbound enquiries"
            value={leads.data?.total ?? 0}
            tone="amber"
            icon={<Inbox className="size-4" />}
            hint={
              leads.data
                ? `${leads.data.created_last_7d} in the last 7 days`
                : "Contact-form submissions"
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Posting activity"
              description={`Volume per hour across the last ${HISTOGRAM_HOURS} hours (UTC).`}
            />
            {histogram.error ? (
              <ErrorState message={histogram.error} />
            ) : (
              <PostingActivity
                buckets={histogram.data!.buckets}
                hours={histogram.data!.hours}
              />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Latest leads"
              description="The six most recent job posts."
              action={
                <Link
                  href="/dashboard/leads"
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-coral-ink transition-colors hover:bg-coral-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
                >
                  View all
                </Link>
              }
            />
            {recent.error ? (
              <ErrorState message={recent.error} />
            ) : recent.data!.items.length === 0 ? (
              <EmptyState
                title="No leads stored yet"
                description="Run a scrape to populate the pipeline — the first pass takes about 36 minutes."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.data!.items.map((listing) => (
                  <li key={listing.id}>
                    <Link
                      href={`/dashboard/leads?selected=${listing.id}`}
                      prefetch={false}
                      className="group flex flex-col gap-1.5 px-5 py-3.5 transition-colors hover:bg-navy-800/[0.03] focus-visible:outline-none focus-visible:bg-navy-800/[0.03] dark:hover:bg-white/5"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-semibold group-hover:text-coral-ink">
                          {listing.title}
                        </span>
                        <time
                          dateTime={listing.posted_at}
                          title={absoluteTime(listing.posted_at)}
                          className="shrink-0 text-xs tabular-nums text-muted"
                        >
                          {relativeTime(listing.posted_at)}
                        </time>
                      </span>
                      <span className="line-clamp-1 text-xs leading-relaxed text-muted">
                        {truncate(listing.description_snippet ?? listing.description, 130) ||
                          "No description captured."}
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {listing.job_type && <Chip tone="muted">{listing.job_type}</Chip>}
                        {listing.category && <Chip tone="muted">{listing.category}</Chip>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHeader
              title="Scraper"
              description="Automated twice daily; you can also trigger a run."
            />
            <ScrapeControl initial={scrape.data} />
          </Panel>

          <Panel>
            <PanelHeader
              title="Top categories"
              description="Where the volume sits. Select one to filter the table."
            />
            {facets.error ? (
              <ErrorState message={facets.error} />
            ) : (
              <CategoryBreakdown
                facets={facets.data!.categories}
                total={s?.total ?? 0}
              />
            )}
          </Panel>

          {/* Explains the two permanently empty columns before anyone files it
              as a bug. */}
          <Panel className="border-amber-500/30 bg-amber-500/[0.06]">
            <div className="flex gap-3 px-5 py-4">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-ink" />
              <div className="text-xs leading-relaxed text-muted">
                <p className="font-semibold text-foreground">
                  Client and email are empty by design
                </p>
                <p className="mt-1">
                  onlinejobs.ph hides employer identity and contact details from
                  anonymous visitors, so those fields cannot be scraped. The
                  columns are ready for an authenticated enrichment pass.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

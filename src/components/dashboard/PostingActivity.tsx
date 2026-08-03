import type { HistogramBucket } from "@/lib/dashboard/types";
import { EmptyState } from "./primitives";

/**
 * Job posts per hour over the last N hours.
 *
 * A bar chart, not a line: the values are counts in discrete hourly buckets,
 * and a line would imply a continuous quantity between them.
 *
 * Rendered as inline SVG rather than pulling in a charting library — one chart
 * does not justify ~100kB of client JS on an internal tool. Accessibility is
 * handled the way WCAG asks: the SVG is `aria-hidden` decoration sitting next
 * to a real (visually hidden) data table, plus a one-line text summary.
 */
export function PostingActivity({
  buckets,
  hours,
}: {
  buckets: HistogramBucket[];
  hours: number;
}) {
  const series = fillGaps(buckets, hours);
  const total = series.reduce((sum, b) => sum + b.count, 0);

  if (!total) {
    return (
      <EmptyState
        title="No postings in this window"
        description={`Nothing was posted in the last ${hours} hours, or the scraper hasn't run yet.`}
      />
    );
  }

  const max = Math.max(...series.map((b) => b.count), 1);
  const peak = series.reduce((a, b) => (b.count > a.count ? b : a));
  const perHour = (total / hours).toFixed(1);

  // Chart geometry in a viewBox — the SVG scales to its container rather than
  // needing a resize observer.
  const W = 720;
  const H = 160;
  const PAD_BOTTOM = 22;
  const gap = 2;
  const barWidth = Math.max((W - gap * (series.length - 1)) / series.length, 1);

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground tabular-nums">{total}</span>{" "}
          posts · <span className="tabular-nums">{perHour}</span>/hour average
        </p>
        {/* Legend, adjacent to the chart rather than below a fold. */}
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span aria-hidden className="inline-block size-2.5 rounded-sm bg-navy-500" />
          Posts per hour
          <span aria-hidden className="ml-2 inline-block size-2.5 rounded-sm bg-coral-500" />
          Busiest hour
        </p>
      </div>

      <div className="overflow-x-auto px-5 pb-2 pt-3">
        <svg
          aria-hidden
          role="presentation"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-40 w-full min-w-[520px]"
        >
          {/* Subtle gridlines: reference without competing with the data. */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={0}
              x2={W}
              y1={(H - PAD_BOTTOM) * (1 - f)}
              y2={(H - PAD_BOTTOM) * (1 - f)}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border"
            />
          ))}
          {series.map((bucket, i) => {
            const height = (bucket.count / max) * (H - PAD_BOTTOM);
            const isPeak = bucket.bucket === peak.bucket && bucket.count > 0;
            return (
              <rect
                key={bucket.bucket}
                x={i * (barWidth + gap)}
                y={H - PAD_BOTTOM - height}
                width={barWidth}
                height={Math.max(height, bucket.count > 0 ? 2 : 0)}
                rx={1.5}
                className={isPeak ? "fill-coral-500" : "fill-navy-500/70"}
              >
                <title>{`${hourLabel(bucket.bucket)} — ${bucket.count} posts`}</title>
              </rect>
            );
          })}
          {/* Axis ticks every 6 hours; more would cram on narrow screens. */}
          {series.map((bucket, i) =>
            i % 6 === 0 ? (
              <text
                key={`t-${bucket.bucket}`}
                x={i * (barWidth + gap)}
                y={H - 6}
                className="fill-current text-[10px] text-muted"
                style={{ fontSize: 10 }}
              >
                {hourLabel(bucket.bucket)}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      <figcaption className="px-5 pb-4 text-xs leading-relaxed text-muted">
        Hourly job postings over the last {hours} hours, in UTC. Busiest hour:{" "}
        <span className="font-semibold text-foreground">
          {hourLabel(peak.bucket)}
        </span>{" "}
        with <span className="tabular-nums">{peak.count}</span> posts.
      </figcaption>

      {/* Table alternative — the accessible equivalent of the chart. */}
      <table className="sr-only">
        <caption>Job postings per hour, last {hours} hours (UTC)</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Posts</th>
          </tr>
        </thead>
        <tbody>
          {series.map((b) => (
            <tr key={`r-${b.bucket}`}>
              <th scope="row">{b.bucket}</th>
              <td>{b.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** "14:00" — hour granularity is stated in the caption, so the label stays short. */
function hourLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:00`;
}

/**
 * The API omits empty hours. Rendering only the hours that have data would
 * silently compress quiet periods and misrepresent the trend, so gaps are
 * filled with zeroes here.
 */
function fillGaps(buckets: HistogramBucket[], hours: number): HistogramBucket[] {
  const byHour = new Map<number, number>();
  for (const b of buckets) {
    const t = new Date(b.bucket).getTime();
    if (!Number.isNaN(t)) byHour.set(Math.floor(t / 3_600_000), b.count);
  }

  const lastHour = Math.floor(Date.now() / 3_600_000);
  const out: HistogramBucket[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const hour = lastHour - i;
    out.push({
      bucket: new Date(hour * 3_600_000).toISOString(),
      count: byHour.get(hour) ?? 0,
    });
  }
  return out;
}

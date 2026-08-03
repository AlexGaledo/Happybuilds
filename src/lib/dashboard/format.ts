/** Formatting helpers shared by the dashboard. Pure, so they're safe on both
 * the server and the client — important because the table renders on the
 * server but its filter bar is interactive. */

const UNITS: [limit: number, divisor: number, name: Intl.RelativeTimeFormatUnit][] =
  [
    [60, 1, "second"],
    [3600, 60, "minute"],
    [86400, 3600, "hour"],
    [604800, 86400, "day"],
    [2629800, 604800, "week"],
    [31557600, 2629800, "month"],
    [Infinity, 31557600, "year"],
  ];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * "3 hours ago". Takes an explicit `now` so server-rendered output is
 * deterministic in tests instead of drifting with the clock.
 */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSeconds = (then - now) / 1000;
  const abs = Math.abs(diffSeconds);
  for (const [limit, divisor, unit] of UNITS) {
    if (abs < limit) return rtf.format(Math.round(diffSeconds / divisor), unit);
  }
  return "—";
}

/** Absolute UTC timestamp — the backend stores and returns UTC throughout. */
export function absoluteTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

/** "36m 22s" — scrape runs are minutes long, so ms precision is noise. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "—";
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/** Turn a scraper slug like "web-development" into "Web development". */
export function humanise(value: string | null | undefined): string {
  if (!value) return "—";
  const spaced = value.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Collapse whitespace and cut to `max` characters on a word boundary. */
export function truncate(text: string | null | undefined, max = 140): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max)}…`;
}

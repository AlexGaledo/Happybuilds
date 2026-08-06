/**
 * Bounds, validation and derived figures for automatic lead processing.
 *
 * The panel is a toggle and two numbers, but the two numbers interact: the cron
 * fires on a fixed schedule, so `batch_size` sets a ceiling on throughput and
 * `daily_cap` sets a second one, and only the lower of the pair is real. Working
 * that out in the component would bury it, so it lives here next to the limits
 * it depends on — the same split `prefilter.ts` uses for its keyword caps.
 *
 * Both limits are surfaced as named errors rather than clamped silently. A cap
 * quietly rewritten from 5000 to 1000 looks like the save went through, and the
 * operator then reads a budget four fifths smaller than the one they set.
 */

/** Leads per scheduled run. Mirrors the backend's bounds. */
export const AUTOPROCESS_MIN_BATCH_SIZE = 1;
export const AUTOPROCESS_MAX_BATCH_SIZE = 50;

/** Leads drafted per rolling 24 hours. Mirrors the backend's bounds. */
export const AUTOPROCESS_MIN_DAILY_CAP = 1;
export const AUTOPROCESS_MAX_DAILY_CAP = 1000;

/**
 * How far back a scheduled run looks, in hours. Mirrors the backend's bounds.
 *
 * The minimum is genuinely 0 and not 1 — zero means "no window", which is the
 * safe end of this axis and must stay reachable from the panel. `readCount`
 * would otherwise refuse it and steer the operator toward the switch below,
 * which is the wrong advice here: turning the schedule off is not the same as
 * letting it work the whole queue.
 */
export const AUTOPROCESS_MIN_WINDOW_HOURS = 0;
export const AUTOPROCESS_MAX_WINDOW_HOURS = 720;

/**
 * Scheduled runs in a day.
 *
 * The processing cron fires every 2 hours, matching the scraper's interval.
 * Changing the crontab without changing this makes every projected figure on
 * the panel wrong, so it is named rather than inlined as `12`.
 */
export const AUTOPROCESS_RUNS_PER_DAY = 12;

/**
 * Agent seconds per lead, from production timings: a batch of ten costs 3–6
 * minutes of `claude -p`. Wide because the spread is genuinely that wide —
 * a web lookup for a missing address is most of the difference.
 */
const SECONDS_PER_LEAD_FAST = 18;
const SECONDS_PER_LEAD_SLOW = 36;

/** What the editor needs to know about the text currently in one box. */
export interface NumberFieldState {
  /** Parsed value, or null while the text is not a usable number. */
  value: number | null;
  /** False while the box cannot be saved — Save stays disabled. */
  valid: boolean;
  /** Named reason, ready to render. Null when the box is fine. */
  error: string | null;
}

/**
 * Read one numeric box.
 *
 * Deliberately takes the raw string rather than a number: `<input type="number">`
 * hands back an empty string for "abc" in Chrome, which makes "you typed
 * nonsense" indistinguishable from "you cleared the box" and leaves no way to
 * name the error. The inputs are `type="text" inputMode="numeric"` for that
 * reason, and this is where the text becomes a number.
 */
export function readCount(
  text: string,
  { min, max, label }: { min: number; max: number; label: string },
): NumberFieldState {
  const trimmed = text.trim();

  if (!trimmed) {
    return { value: null, valid: false, error: `${label} is required.` };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      value: null,
      valid: false,
      error: `${label} must be a whole number — no decimals, signs or spaces.`,
    };
  }

  const value = Number(trimmed);
  if (value < min) {
    return {
      value,
      valid: false,
      error: `${label} must be at least ${min}. Use the switch below to stop scheduled runs instead of setting this to zero.`,
    };
  }
  if (value > max) {
    return {
      value,
      valid: false,
      error: `${label} tops out at ${max}. ${value} is ${value - max} over, and the API would reject it.`,
    };
  }

  return { value, valid: true, error: null };
}

/** What the schedule and the cap between them actually allow. */
export interface Throughput {
  /** Everything the schedule could get through: batch size × runs per day. */
  ceiling: number;
  /** What will really happen: the lower of the ceiling and the cap. */
  effective: number;
  /** Which of the two settings is doing the limiting. */
  limitedBy: "schedule" | "cap" | "both";
}

/**
 * The number that stops the classic misconfiguration: a batch of 50 against a
 * cap of 60, which looks generous and in fact stops after the second run of the
 * morning. Showing both ceilings side by side makes that visible before saving.
 */
export function readThroughput(batchSize: number, dailyCap: number): Throughput {
  const ceiling = batchSize * AUTOPROCESS_RUNS_PER_DAY;
  return {
    ceiling,
    effective: Math.min(ceiling, dailyCap),
    limitedBy:
      ceiling === dailyCap ? "both" : ceiling < dailyCap ? "schedule" : "cap",
  };
}

/** Whether the schedule is keeping up with what the window makes eligible. */
export interface WindowPressure {
  /** Unprocessed rows inside the window right now. */
  backlog: number;
  /** What the schedule can get through in a day. */
  capacity: number;
  /** Rows a day that will age out unprocessed. Zero when keeping up. */
  shortfall: number;
  /** True while the window is discarding work. */
  losing: boolean;
}

/**
 * The comparison the window setting lives or dies on.
 *
 * A window is a triage rule: rows older than it stop being eligible, and
 * nothing marks, logs or retries them. That is fine when the schedule outruns
 * the intake and catastrophic when it does not — and the difference is not
 * visible from either number alone, which is why it gets a named function and a
 * dedicated line on the panel rather than being left to the operator to
 * multiply out.
 *
 * Returns null when there is no window, where there is no loss to report.
 */
export function readWindowPressure(
  backlog: number | null,
  capacity: number,
): WindowPressure | null {
  if (backlog === null) return null;
  const shortfall = Math.max(backlog - capacity, 0);
  return { backlog, capacity, shortfall, losing: shortfall > 0 };
}

/**
 * Turn leads-per-day into the thing an operator is actually spending.
 *
 * Agent time is the cost of this feature, and it comes out of a personal Claude
 * subscription rather than an API key that would stop at a spend limit — so the
 * hours matter more than the lead count and are stated as a range, because
 * pretending to a single figure would be false precision.
 */
export function formatAgentTime(leadsPerDay: number): string {
  const fast = leadsPerDay * SECONDS_PER_LEAD_FAST;
  const slow = leadsPerDay * SECONDS_PER_LEAD_SLOW;

  if (slow < 3600) {
    return `${Math.round(fast / 60)}–${Math.round(slow / 60)} minutes`;
  }
  const round = (seconds: number) => (Math.round(seconds / 360) / 10).toFixed(1);
  return `${round(fast)}–${round(slow)} hours`;
}

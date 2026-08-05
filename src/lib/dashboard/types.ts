/**
 * Types mirroring the fickles-automated-lead API schemas.
 *
 * Kept hand-written (rather than generated) because the surface is small, but
 * they must stay in step with `app/schemas/listing.py` and `app/schemas/lead.py`.
 * `scripts/check-api-contract.mjs` asserts that at runtime against the live API.
 */

/** A scraped job post — the "lead" the dashboard table is built around. */
export interface Listing {
  id: string;
  external_id: string;
  source: string;
  title: string;
  url: string;
  posted_at: string;
  description: string | null;
  description_snippet: string | null;
  /**
   * Both null for onlinejobs.ph: the site hides employer identity and contact
   * details from anonymous visitors. See docs/scraping-notes.md — the UI must
   * degrade gracefully rather than show empty columns as a bug.
   */
  client: string | null;
  email: string | null;
  job_type: string | null;
  salary: string | null;
  hours_per_week: string | null;
  category: string | null;
  skills: string[] | null;
  detail_fetched_at: string | null;
  first_seen_at: string | null;
  scraped_at: string | null;
}

export interface ListingListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Listing[];
}

export interface ListingStats {
  total: number;
  with_description: number;
  pending_detail: number;
  posted_last_24h: number;
  newest_posted_at: string | null;
  oldest_posted_at: string | null;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface ListingFacets {
  job_types: FacetValue[];
  categories: FacetValue[];
}

export interface HistogramBucket {
  bucket: string;
  count: number;
}

export interface ListingHistogram {
  hours: number;
  buckets: HistogramBucket[];
}

/** Summary of the last scrape run, as published to Redis by scrape_service. */
export interface ScrapeRunState {
  status?: string;
  trigger?: string;
  started_at?: string;
  finished_at?: string;
  total_seconds?: number;
  listings_in_window?: number;
  inserted?: number;
  updated?: number;
  enriched?: number;
  detail_fetches?: number;
  pages_fetched?: number;
  errors?: string[];
  error?: string;
  [key: string]: unknown;
}

export interface ScrapeStatus {
  running: boolean;
  lock_holder: string | null;
  last_run: ScrapeRunState | null;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  service: string | null;
  budget: string | null;
  message: string;
  status: LeadStatus;
  created_at: string;
}

export interface LeadListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Lead[];
}

export interface LeadStats {
  total: number;
  by_status: Record<LeadStatus, number>;
  created_last_7d: number;
  newest_created_at: string | null;
}

/** Columns the API will sort by. Mirrors `repos/listings.SORTABLE`. */
export type ListingSort = "posted_at" | "title" | "scraped_at" | "first_seen_at";
export type SortOrder = "asc" | "desc";

/** Every filter the listings table can apply, all URL-serialisable. */
export interface ListingFilters {
  q?: string;
  hours?: number;
  job_type?: string;
  category?: string;
  has_email?: boolean;
  sort: ListingSort;
  order: SortOrder;
  limit: number;
  offset: number;
}

export const LISTING_SORTS: ListingSort[] = [
  "posted_at",
  "title",
  "scraped_at",
  "first_seen_at",
];

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

// ------------------------------------------------------- unified pipeline

/**
 * A row in the pipeline tab, projected from either `listings` or `leads`.
 *
 * The two sources are different shapes; the backend's `repos/pipeline.py`
 * unions them onto this one. `kind` is what tells them apart, and it is
 * required on every write back (marking processed, queueing for the agent)
 * because the id alone does not identify a table.
 */
export type TargetKind = "listing" | "lead";

export interface PipelineItem {
  kind: TargetKind;
  id: string;
  title: string;
  preview: string | null;
  contact_name: string | null;
  contact_email: string | null;
  /** The original post. Null for inbound leads — there is no page to open. */
  url: string | null;
  job_type: string | null;
  category: string | null;
  salary: string | null;
  /** Posted-at for a listing, submitted-at for an inbound lead. */
  received_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  /**
   * Three-state. `null` = not judged yet, `false` = the agent read it and
   * decided it isn't a fit for CRM / automation / custom software work, so no
   * draft was written. `false` is a finished outcome, not a failure.
   */
  qualified: boolean | null;
  fit_reason: string | null;
  source: string | null;
  draft_id: string | null;
  draft_status: DraftStatus | null;
  draft_channel: DraftChannel | null;
}

export interface PipelineListResponse {
  total: number;
  limit: number;
  offset: number;
  items: PipelineItem[];
}

export interface PipelineCounts {
  unprocessed: number;
  processed: number;
  unprocessed_listings: number;
  unprocessed_leads: number;
  processed_listings: number;
  processed_leads: number;
  /** Judged a fit — these are the ones that got a draft. */
  qualified: number;
  /** Judged not a fit. Read and closed out, deliberately no draft. */
  rejected: number;
}

/** Published to Redis by the processing service; shape mirrors `ProcessState`. */
export interface ProcessRunState {
  running?: boolean;
  trigger?: string;
  started_at?: string;
  finished_at?: string;
  requested?: number;
  processed?: number;
  drafted?: number;
  /** Qualified out — read, judged not a fit, no draft written. */
  rejected?: number;
  contacts_found?: number;
  failed?: number;
  error?: string | null;
  log?: string[];
}

export interface ProcessStatus {
  running: boolean;
  lock_holder: string | null;
  /** False when the Claude Code CLI is not installed on the API host. */
  agent_available: boolean;
  last_run: ProcessRunState | null;
}

// ---------------------------------------------------------------- drafts

export type DraftChannel = "email" | "manual";
export type DraftStatus = "ready" | "sending" | "sent" | "failed";

export interface Draft {
  id: string;
  target_kind: TargetKind;
  target_id: string;
  template_id: string | null;
  template_name: string | null;
  subject: string;
  body: string;
  /** `manual` means no address was found — send it by hand via `source_url`. */
  channel: DraftChannel;
  status: DraftStatus;
  recipient_name: string | null;
  recipient_email: string | null;
  source_url: string | null;
  source_title: string | null;
  rationale: string | null;
  model: string | null;
  error: string | null;
  /**
   * Opaque thread key, never parsed. Gmail's own `threadId` under
   * `MAIL_TRANSPORT=gmail`; an RFC 5322 `Message-ID` we minted under
   * `hostinger`, because plain SMTP hands back no thread handle.
   */
  mail_thread_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  reply_count: number;

  /**
   * A bounced draft keeps `status: "sent"` — it *was* sent, the far end refused
   * it. That is a different problem from `failed`, which never left the host.
   */
  bounced_at: string | null;
  /** "hard" (permanent — stop mailing this address) or "soft" (transient). */
  bounce_kind: string | null;
  /** RFC 3463 status, e.g. "5.1.1". */
  bounce_code: string | null;
  bounce_detail: string | null;
}

export interface DraftListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Draft[];
}

export interface DraftCounts {
  outbox: number;
  manual: number;
  sent: number;
  failed: number;
  inbox: number;
  replies: number;
  /** Sent, then rejected by the receiving server — distinct from `failed`. */
  bounced: number;
}

export interface BounceRow {
  draft_id: string;
  recipient_email: string | null;
  subject: string;
  kind: string | null;
  code: string | null;
  detail: string | null;
  bounced_at: string | null;
  sent_at: string | null;
}

export interface BounceStats {
  window_days: number;
  /** Denominator: messages *sent* in the window. A draft that never went out
   * cannot bounce, so counting it would dilute the rate exactly when the
   * outbox is full. */
  sent: number;
  bounced: number;
  hard: number;
  soft: number;
  /** Percentages, or null when nothing was sent — "nothing bounced" and
   * "nothing was sent" must not both render as 0%. */
  rate: number | null;
  hard_rate: number | null;
  /** SMTP-time rejections: never left this host. Reported beside the bounce
   * rate, never inside it. */
  send_failures: number;
  recent: BounceRow[];
}

export interface MailboxStatus {
  configured: boolean;
  address: string | null;
  /** "gmail" | "hostinger" — which backend is live, so the UI names the right fix. */
  transport: string;
}

export interface DraftSendResult {
  draft_id: string;
  ok: boolean;
  error: string | null;
}

export interface DraftSendResponse {
  sent: number;
  failed: number;
  results: DraftSendResult[];
}

// --------------------------------------------------------------- replies

export interface Reply {
  id: string;
  draft_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  snippet: string;
  body: string;
  received_at: string;
  read_at: string | null;
  mail_message_id: string;
  mail_thread_id: string;
}

export interface ReplyListResponse {
  total: number;
  limit: number;
  offset: number;
  unread: number;
  items: Reply[];
}

// ------------------------------------------------------------- templates

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  /** The field the agent actually selects on. Empty = it picks on vibes. */
  when_to_use: string;
  tags: string[];
  /** "preloaded" (shipped by the seed migration) or "user". */
  origin: string;
  is_active: boolean;
  times_used: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateListResponse {
  total: number;
  items: MessageTemplate[];
}

// --------------------------------------------------------- configuration

/** One dependency and whether it is usable right now. */
export interface CheckStatus {
  key: string;
  label: string;
  ok: boolean;
  /** "ready" | "missing" | "degraded" — degraded means present but limited. */
  state: string;
  detail: string;
  /** What to do about it. Empty when ok. */
  fix: string;
}

export interface DashboardConfig {
  environment: string;
  checks: CheckStatus[];
  agent: {
    binary: string;
    resolved_path: string | null;
    /** Pinned model id passed to `--model`, and written to `Draft.model`. */
    model: string;
    batch_size: number;
    timeout_seconds: number;
    allowed_tools: string[];
  };
  mail: {
    /** "gmail" | "hostinger". Both transports stay wired; this picks one. */
    transport: string;
    /** Whether the *active* transport can send. What the UI gates on. */
    configured: boolean;
    address: string | null;
    poll_lookback_hours: number;
    gmail: {
      configured: boolean;
      address: string | null;
      /** Masked tail only — never the full credential. */
      client_id_tail: string | null;
    };
    hostinger: {
      configured: boolean;
      smtp_host: string;
      smtp_port: number;
      imap_host: string;
      imap_port: number;
      username: string | null;
      /**
       * Presence only. A mailbox password is the whole credential — unlike an
       * OAuth client id, even a masked tail of it is a leak.
       */
      password_set: boolean;
      from_address: string | null;
      from_name: string | null;
    };
  };
  scrape: {
    window_hours: number;
    crawl_delay: number;
    max_detail_fetches: number;
  };
  active_templates: number;
  total_templates: number;
}

export interface TemplateInput {
  name: string;
  subject: string;
  body: string;
  when_to_use: string;
  tags: string[];
  is_active: boolean;
}

/**
 * A template the agent wrote but nobody has saved yet.
 *
 * Field names match `TemplateInput` so this drops straight into the editor.
 * `notes` and `placeholders` are advisory — they are shown once and never
 * persisted.
 */
export interface GeneratedTemplate {
  name: string;
  subject: string;
  body: string;
  when_to_use: string;
  tags: string[];
  notes: string;
  placeholders: string[];
}

/**
 * Standing context set on the Configuration tab.
 *
 * Always read by the template generator. Reaches the drafting agent — and
 * therefore real outbound mail — only while `applies_to_drafting` is true.
 */
export interface SpecialInstruction {
  instruction: string;
  applies_to_drafting: boolean;
  chars: number;
  max_chars: number;
}

// ----------------------------------------------------------- keyword prefilter

/**
 * Keyword prefilter — the free stage in front of the drafting agent.
 *
 * The scraper brings in ~1030 posts a day and roughly two thirds are rejected
 * by the agent as not a fit, each one costing a full agent turn to reach that
 * conclusion. Matching a keyword list costs nothing, so the obvious rejects are
 * killed before a turn is spent.
 *
 * Matching is against the post's title, category and job type only — never the
 * description. A word that appears once in a paragraph of prose says nothing
 * about what the job is.
 *
 * `keep_keywords` wins. A post matching both lists is KEPT and goes to the
 * agent. That precedence is the whole safety valve: a broad reject rule stays
 * usable because a narrow keep rule can carve back out of it.
 */
export interface PrefilterConfig {
  enabled: boolean;
  reject_keywords: string[];
  /** Override list. Beats `reject_keywords` on a post that matches both. */
  keep_keywords: string[];
  /** True while the stored lists are still the ones shipped in code. */
  is_default: boolean;
}

/** Write shape. `is_default` is derived by the backend, never sent. */
export interface PrefilterConfigUpdate {
  enabled: boolean;
  reject_keywords: string[];
  keep_keywords: string[];
}

/** "reject" and "keep" both mean a rule fired; "pass" means none did. */
export type PrefilterVerdict = "reject" | "keep" | "pass";

/** One post, the verdict the keywords give it, and the words that decided it. */
export interface PrefilterVerdictSample {
  kind: string;
  id: string;
  title: string;
  verdict: PrefilterVerdict;
  /** The keywords that matched. Empty on a "pass". */
  matched: string[];
}

/**
 * Result of replaying a keyword list over posts the agent has already judged.
 * Writes nothing.
 *
 * `false_kills` is the only number that decides whether this is safe to turn
 * on: posts the agent judged QUALIFIED that these keywords would have thrown
 * away. Zero is the bar. `true_kills` — rejects the keywords would have caught
 * for free — is the payoff, but it is worthless if the cost is a lost lead,
 * because a prefiltered post never reaches the agent and has no retry path.
 */
export interface PrefilterDryRun {
  scanned: number;
  would_reject: number;
  would_pass: number;
  /** Of those scanned, how many the agent has already ruled on. The
   * denominator for both kill counts — the rest have no verdict to compare. */
  judged: number;
  false_kills: number;
  true_kills: number;
  /** Every false kill worth showing, so the offending keyword is nameable. */
  false_kill_samples: PrefilterVerdictSample[];
  /** A general spread of verdicts, for sanity-checking the rules. */
  samples: PrefilterVerdictSample[];
  /** True when the report graded the lists sent in the request rather than the
   * saved ones. The panel always sends its edit boxes, so this reads true in
   * the dashboard and false for a CLI dry run. */
  used_override: boolean;
}

// -------------------------------------------------- automatic lead processing

/**
 * Scheduled drafting — the cron that spends agent time on its own.
 *
 * What this governs is budget, not outbound mail. A scheduled run drafts and
 * files the result in the outbox at status `ready`; nothing is sent until the
 * Drafts tab sends it. Enabling therefore costs money and no messages.
 *
 * The cost is real: ~640 leads a day survive the keyword prefilter, a batch of
 * ten takes 3–6 minutes of `claude -p`, and that time is billed to the
 * operator's own Claude subscription rather than to a metered API key with a
 * spend ceiling. `daily_cap` is the ceiling, and it is enforced against rows
 * drafted rather than runs fired — which is why `processed_last_24h` includes
 * batches started by hand from the Pipeline tab.
 */
export interface AutoProcessConfig {
  enabled: boolean;
  /** Leads handed to the agent per scheduled run. 1..50. */
  batch_size: number;
  /** Ceiling on leads drafted in a rolling 24 hours. 1..1000. */
  daily_cap: number;
  /** Observed from the rows, not from a run counter — manual batches count. */
  processed_last_24h: number;
  remaining_today: number;
  /**
   * Optional: the backend may not be able to report this, in which case the
   * field is absent rather than null. Render it only when present.
   */
  last_run_at?: string | null;
}

/** Write shape. The three observed fields are derived, never sent. */
export interface AutoProcessConfigUpdate {
  enabled: boolean;
  batch_size: number;
  daily_cap: number;
}

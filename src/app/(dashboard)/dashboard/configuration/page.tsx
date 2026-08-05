import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Filter,
  Mail,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { getConfig, getInstruction, safe } from "@/lib/dashboard/server";
import type {
  CheckStatus,
  DashboardConfig,
  SpecialInstruction,
} from "@/lib/dashboard/types";
import { InstructionPanel } from "@/components/dashboard/InstructionPanel";
import {
  Chip,
  ErrorState,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Configuration" };
export const dynamic = "force-dynamic";

/**
 * What is wired up, what isn't, and how the pipeline actually behaves.
 *
 * Diagnostics first, then the instructions — a feature that silently does
 * nothing should be explainable from the browser rather than by reading
 * systemd logs. Every value here comes from the live API, so this page cannot
 * drift from reality the way a written runbook does.
 *
 * No secrets: the backend reports credentials as booleans and masked tails.
 */
export default async function ConfigurationPage() {
  const [config, instruction] = await Promise.all([
    safe(getConfig()),
    safe(getInstruction()),
  ]);

  if (config.error || !config.data) {
    return (
      <>
        <PageHeader title="Configuration" />
        <ErrorState
          title="Can't reach the API"
          message={config.error ?? "No response"}
          hint="Everything on this page is read live from the backend. If it's down, start the API and its Postgres/Redis containers, then reload."
        />
      </>
    );
  }

  const data = config.data;
  const blocking = data.checks.filter((c) => !c.ok);

  return (
    <>
      <PageHeader
        title="Configuration"
        description="What the pipeline is wired up to, read live from the API. Anything broken is listed first, with the exact fix."
      />

      <div className="flex flex-col gap-6">
        <StatusPanel checks={data.checks} blocking={blocking.length} />
        <InstructionSection instruction={instruction.data} error={instruction.error} />
        <HowItWorks />
        <SettingsPanel data={data} />
        <SetupPanel />
      </div>
    </>
  );
}

function StatusPanel({
  checks,
  blocking,
}: {
  checks: CheckStatus[];
  blocking: number;
}) {
  return (
    <Panel>
      <PanelHeader
        title="System status"
        description="Live checks against the API host."
        action={
          blocking === 0 ? (
            <Chip tone="mint" icon={CheckCircle2}>
              All ready
            </Chip>
          ) : (
            <Chip tone="coral" icon={CircleAlert}>
              {blocking} need attention
            </Chip>
          )
        }
      />
      <ul className="divide-y divide-border">
        {/* Broken first: the point of this page is the thing that isn't
            working, and burying it under six green rows defeats that. */}
        {[...checks]
          .sort((a, b) => Number(a.ok) - Number(b.ok))
          .map((check) => (
            <li key={check.key} className="flex gap-3 px-5 py-3.5">
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg",
                  check.ok
                    ? "bg-mint-500/15 text-mint-ink"
                    : check.state === "degraded"
                      ? "bg-amber-500/18 text-amber-ink"
                      : "bg-coral-500/12 text-coral-ink",
                )}
              >
                {check.ok ? (
                  <CheckCircle2 aria-hidden className="size-3.5" />
                ) : (
                  <TriangleAlert aria-hidden className="size-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {check.label}
                  {/* State as a word, not only a colour. */}
                  <span className="ml-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                    {check.state}
                  </span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  {check.detail}
                </p>
                {check.fix && (
                  <p className="mt-1.5 rounded-lg bg-amber-500/8 px-2.5 py-1.5 text-xs leading-relaxed text-amber-ink">
                    {check.fix}
                  </p>
                )}
              </div>
            </li>
          ))}
      </ul>
    </Panel>
  );
}

/** The behaviour that is easy to misread from the tables alone. */
function HowItWorks() {
  return (
    <Panel>
      <PanelHeader
        title="How the pipeline works"
        description="Read this before wondering why a lead has no draft."
      />
      <div className="grid grid-cols-1 gap-px overflow-hidden bg-border md:grid-cols-3">
        <Step
          icon={Filter}
          n="1"
          title="Qualify"
          body="The agent judges every lead against what Fickles sells — CRM work, workflow automation, and custom software (internal tools, dashboards, integrations). A job post describing a repetitive manual process counts: replacing that process is the product."
          note="Leads that don't fit are marked processed with a reason and get NO draft. They leave the queue without wasting a message. That's the expected outcome, not a failure."
        />
        <Step
          icon={Bot}
          n="2"
          title="Find a contact, draft"
          body="For leads that pass, the agent looks for a real email — first in the post's own text, then on the web if the company is identifiable. It never guesses an address. Then it picks one template from the pool and fills it from that lead's details."
          note="No address found? The draft still gets written and lands in Send by hand with a link to the original post. For scraped posts that's the common case, not a bug."
        />
        <Step
          icon={Mail}
          n="3"
          title="Send, then watch"
          body="Drafts with an address sit in the Outbox until you send them — nothing goes out on its own. Sending records the Gmail thread, which is what lets replies thread back to the exact draft that caused them."
          note="Replies land in the Inbox column. Polling is scoped to threads you started, so the rest of your mail is never read."
        />
      </div>
    </Panel>
  );
}

function Step({
  icon: Icon,
  n,
  title,
  body,
  note,
}: {
  icon: typeof Bot;
  n: string;
  title: string;
  body: string;
  note: string;
}) {
  return (
    <div className="bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-navy-800/6 text-navy-500 dark:bg-white/10 dark:text-navy-50">
          <Icon aria-hidden className="size-4" />
        </span>
        <h3 className="font-display text-sm font-bold">
          <span className="mr-1.5 text-muted">{n}.</span>
          {title}
        </h3>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-muted">{body}</p>
      <p className="mt-2 rounded-lg bg-navy-800/[0.04] px-2.5 py-2 text-xs leading-relaxed dark:bg-white/5">
        {note}
      </p>
    </div>
  );
}

/**
 * The one writable setting on this page.
 *
 * Rendered above "How it works" because it changes behaviour, and a reader who
 * scrolls past the diagnostics is looking for what they can actually change.
 */
function InstructionSection({
  instruction,
  error,
}: {
  instruction: SpecialInstruction | null;
  error: string | null;
}) {
  return (
    <Panel>
      <PanelHeader title="Special instruction" />
      <div className="px-5 py-4">
        {instruction ? (
          <InstructionPanel initial={instruction} />
        ) : (
          <p className="text-sm text-coral-ink">
            Could not load the instruction: {error ?? "no response"}. Everything
            else on this page still reflects the live API.
          </p>
        )}
      </div>
    </Panel>
  );
}

function SettingsPanel({ data }: { data: DashboardConfig }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel>
        <PanelHeader title="Drafting agent" />
        <dl className="flex flex-col gap-2.5 px-5 py-4 text-sm">
          <Row label="Binary" value={data.agent.resolved_path ?? data.agent.binary} mono />
          <Row label="Model" value={data.agent.model} mono />
          <Row label="Batch size" value={`${data.agent.batch_size} leads per run`} />
          <Row
            label="Timeout"
            value={`${Math.round(data.agent.timeout_seconds / 60)} minutes`}
          />
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Allowed tools
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {data.agent.allowed_tools.map((tool) => (
                <Chip key={tool} tone="muted">
                  {tool}
                </Chip>
              ))}
            </dd>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Read-only by design. Scraped job posts are untrusted text, so even a
            successful prompt injection can&rsquo;t write to the database, the
            repo, or git.
          </p>
        </dl>
      </Panel>

      <Panel>
        <PanelHeader title="Mailbox" />
        <dl className="flex flex-col gap-2.5 px-5 py-4 text-sm">
          <Row label="Address" value={data.mail.address ?? "Not set"} mono />
          <Row
            label="Client ID"
            value={data.mail.client_id_tail ?? "Not set"}
            mono
          />
          <Row
            label="Reply lookback"
            value={`${data.mail.poll_lookback_hours} hours`}
          />
          <p className="text-xs leading-relaxed text-muted">
            Gmail REST with an OAuth refresh token, not the MCP connector — that
            connector exposes no send tool at all, only draft creation. Polls
            overlap deliberately; re-reading a message is a no-op.
          </p>
        </dl>
      </Panel>

      <Panel>
        <PanelHeader title="Scraper" />
        <dl className="flex flex-col gap-2.5 px-5 py-4 text-sm">
          <Row label="Window" value={`${data.scrape.window_hours} hours`} />
          <Row label="Crawl delay" value={`${data.scrape.crawl_delay}s per request`} />
          <Row
            label="Detail fetches"
            value={`${data.scrape.max_detail_fetches} max per run`}
          />
          <Row label="Environment" value={data.environment} />
          <p className="text-xs leading-relaxed text-muted">
            The crawl delay is onlinejobs.ph&rsquo;s own{" "}
            <code className="font-mono text-[11px]">robots.txt</code> value and
            is ~95% of run time. Lowering it risks a block.
          </p>
        </dl>
      </Panel>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 font-semibold",
          // break-all, not break-words: paths and ids have no spaces to break
          // on, so break-words leaves them overflowing the panel.
          mono ? "break-all font-mono text-xs" : "break-words",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function SetupPanel() {
  return (
    <Panel>
      <PanelHeader
        title="Setup and operations"
        description="Commands run on the API host, from /opt/fickles/automated-lead."
      />
      <div className="flex flex-col gap-5 px-5 py-4">
        <Instruction
          title="Connect Gmail"
          body="Needed for sending and for the Inbox. Create a Google Cloud project, enable the Gmail API, then create an OAuth client of type Desktop app. Publish the consent screen — while it sits in Testing, Google expires the refresh token after 7 days and sending dies silently."
          command={"uv run python -m app.cli gmail-auth --client-id <ID> --client-secret <SECRET>"}
          after="Prints a consent URL, then a second command to exchange the code. Paste the four values it gives you into .env and restart the API."
        />
        <Instruction
          title="Run a batch by hand"
          body="Processes the oldest unqualified leads first — a queue worked newest-first starves its own tail."
          command={"uv run python -m app.cli process --limit 5"}
          after="Exit codes: 0 ok, 2 another batch holds the lock, 1 failure."
        />
        <Instruction
          title="Automate it"
          body="Both of these are safe to run on a schedule. The Redis lock stops a cron batch colliding with one you start from the dashboard."
          command={
            "*/30 * * * * cd /opt/fickles/automated-lead && .venv/bin/python -m app.cli process\n" +
            "*/15 * * * * cd /opt/fickles/automated-lead && .venv/bin/python -m app.cli sync-replies"
          }
          after="Nothing sends automatically. Drafts wait in the Outbox until you press send."
        />
        <Instruction
          title="Change what counts as a fit"
          body="The qualification rules live in the agent's system prompt, not in config — they need enough nuance that a keyword list would misjudge most posts."
          command={"app/services/processing.py  →  SYSTEM_PROMPT, step 0"}
          after="Templates are separate: those change what a message says, not which leads get one."
        />
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="text-xs leading-relaxed text-muted">
          Deeper detail lives in the repo:{" "}
          <code className="font-mono text-[11px]">docs/processing.md</code> for
          the pipeline and its threat model,{" "}
          <code className="font-mono text-[11px]">docs/gmail-setup.md</code> for
          the mail flow, and{" "}
          <code className="font-mono text-[11px]">docs/scraping-notes.md</code>{" "}
          for why employer contact details are missing in the first place. The{" "}
          <Link
            href="/dashboard/templates"
            prefetch={false}
            className="font-semibold text-coral-ink underline-offset-2 hover:underline"
          >
            Templates tab
          </Link>{" "}
          controls the message pool.
        </p>
      </div>
    </Panel>
  );
}

function Instruction({
  title,
  body,
  command,
  after,
}: {
  title: string;
  body: string;
  command: string;
  after: string;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 font-display text-sm font-bold">
        <Terminal aria-hidden className="size-3.5 text-navy-400" />
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
      {/* Scrolls in its own box so a long command never makes the page scroll. */}
      <pre className="mt-2 overflow-x-auto rounded-xl border border-border bg-navy-800/[0.04] p-3 font-mono text-[11px] leading-relaxed dark:bg-white/5">
        {command}
      </pre>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{after}</p>
    </div>
  );
}

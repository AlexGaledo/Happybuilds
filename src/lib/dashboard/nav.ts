/** Dashboard navigation model.
 *
 * `locked` sections are built and routable but deliberately non-functional —
 * outreach and the assistant have no backend yet. They stay visible rather
 * than hidden so the roadmap is legible; `empty-nav-state` says explain why a
 * destination is unavailable instead of silently dropping it.
 */

export type DashboardIcon =
  | "overview"
  | "leads"
  | "pipeline"
  | "drafts"
  | "templates"
  | "configuration"
  | "outreach"
  | "assistant";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: DashboardIcon;
  description: string;
  locked?: boolean;
  /** Shown next to the label when locked. */
  lockReason?: string;
}

export const dashboardNav: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: "overview",
    description: "Pipeline health, scrape status and recent activity.",
  },
  {
    href: "/dashboard/leads",
    label: "Leads",
    icon: "leads",
    description: "Every scraped job post, filterable and searchable.",
  },
  {
    href: "/dashboard/pipeline",
    label: "Pipeline",
    icon: "pipeline",
    description: "Unworked queue and processed leads, side by side.",
  },
  {
    href: "/dashboard/drafts",
    label: "Drafts",
    icon: "drafts",
    description: "Replies, the outbox, and drafts you send by hand.",
  },
  {
    href: "/dashboard/templates",
    label: "Templates",
    icon: "templates",
    description: "The outreach pool the drafting agent picks from.",
  },
  {
    href: "/dashboard/configuration",
    label: "Configuration",
    icon: "configuration",
    description: "What's wired up, and how the pipeline behaves.",
  },
  {
    href: "/dashboard/outreach",
    label: "Outreach",
    icon: "outreach",
    description: "Kanban board for automated outreach sequences.",
    locked: true,
    lockReason: "Outreach engine not built yet",
  },
  {
    href: "/dashboard/assistant",
    label: "AI Assistant",
    icon: "assistant",
    description: "Ask questions about your lead pipeline.",
    locked: true,
    lockReason: "Assistant not wired to the pipeline yet",
  },
];

/** Longest-prefix match, so /dashboard/leads?x=1 still highlights Leads and
 * /dashboard only matches exactly. */
export function activeNavHref(pathname: string): string {
  const matches = dashboardNav
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  return matches.sort((a, b) => b.length - a.length)[0] ?? "/dashboard";
}

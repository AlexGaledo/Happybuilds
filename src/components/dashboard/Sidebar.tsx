"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Columns2,
  FileText,
  Settings,
  KanbanSquare,
  LayoutDashboard,
  Lock,
  Mails,
  Menu,
  Sparkles,
  Table2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";
import { activeNavHref, dashboardNav, type DashboardIcon } from "@/lib/dashboard/nav";

const icons: Record<DashboardIcon, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  leads: Table2,
  pipeline: Columns2,
  drafts: Mails,
  templates: FileText,
  configuration: Settings,
  outreach: KanbanSquare,
  assistant: Sparkles,
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeNavHref(pathname);

  return (
    <nav aria-label="Dashboard sections" className="flex flex-col gap-1">
      {dashboardNav.map((item) => {
        const Icon = icons[item.icon];
        const isActive = active === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            data-testid={`nav-${item.icon}`}
            className={cn(
              // min-h-11 keeps every target at the 44px minimum.
              "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              "transition-colors duration-200 ease-[var(--ease-out-soft)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900",
              isActive
                ? "bg-white/10 text-white"
                : "text-navy-100/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "size-[18px] shrink-0",
                isActive ? "text-coral-400" : "text-navy-200/60 group-hover:text-navy-100",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.locked && (
              <span
                // amber-400, not amber-ink: this badge sits on the navy-900
                // rail. The `-ink` steps are darkened for light surfaces and
                // would be near-invisible here — accent tokens are only
                // accessible relative to the surface they land on.
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400"
                title={item.lockReason}
              >
                <Lock aria-hidden className="size-2.5" />
                Locked
              </span>
            )}
            {/* Active marker is a shape, not just a colour — color-not-only. */}
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 h-6 w-1 -translate-x-3 rounded-r-full bg-coral-500"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400"
    >
      {/* data-brand-mark: the glyph is a logotype, which WCAG 1.4.3 exempts
          from the contrast minimum. Marked so the contrast audit can skip it
          deliberately rather than by accident. */}
      <span
        data-brand-mark
        className="grid size-8 place-items-center rounded-lg bg-coral-500 font-display text-sm font-extrabold text-white"
      >
        F
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-sm font-bold text-white">
          {site.name}
        </span>
        <span className="text-[11px] text-navy-200/60">Lead console</span>
      </span>
    </Link>
  );
}

/**
 * Persistent sidebar on desktop, drawer on mobile.
 *
 * Adaptive navigation: ≥1024px gets the sidebar, below that a top bar with a
 * drawer — a bottom bar would fight the browser chrome on a data-dense admin
 * screen.
 */
export function Sidebar() {
  const pathname = usePathname();
  const closeButton = useRef<HTMLButtonElement>(null);

  // The drawer remembers which route it was opened on, so navigating away
  // closes it by derivation — no effect that syncs state to the router, and no
  // window where a tap lands behind an overlay that is still up.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn !== null && openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // setOpenedOn directly: `setOpen` is re-created each render, so
      // depending on it would tear down and re-add the listener every time.
      if (e.key === "Escape") setOpenedOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-white/5 bg-navy-900 px-4 py-6 lg:flex">
        <Brand />
        <div className="relative flex-1">
          <NavList />
        </div>
        <p className="rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-navy-200/60">
          Leads are scraped from onlinejobs.ph twice daily.
          <br />
          Employer name and email are login-gated at the source, so those
          columns stay empty.
        </p>
      </aside>

      {/* Mobile bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-navy-900 px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="grid size-11 place-items-center rounded-xl text-navy-100 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <Brand />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Scrim at 60% so the sheet stays legible over a bright page. */}
          <button
            type="button"
            aria-label="Close navigation"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-navy-900 px-4 py-5 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                ref={closeButton}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="grid size-11 place-items-center rounded-xl text-navy-100 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="relative flex-1">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

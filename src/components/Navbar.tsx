"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { navLinks } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // The menu records the route it was opened on, so a navigation closes it by
  // derivation rather than by an effect that syncs state to the router.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn !== null && openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/*
        Nothing at all at the top of the page — no background, no hairline —
        then a translucent blurred bar once you start scrolling.

        The hairline is an *inset* box-shadow rather than `border-b`. A border
        occupies layout, so toggling it on scroll nudges everything below by a
        pixel; an inset shadow paints inside the existing box and costs no
        space. It is also why only background and shadow are transitioned:
        `backdrop-filter` is not usefully animatable, so it snaps.
      */}
      <div
        className={cn(
          "transition-[background-color,box-shadow] duration-300",
          scrolled
            ? "bg-background/75 shadow-[inset_0_-1px_0_0_var(--color-border)] backdrop-blur-xl"
            : "bg-transparent shadow-none",
        )}
      >
        <Container className="flex h-16 items-center justify-between">
          {/* Logo and links are one left-hand group, with the CTA pushed to
              the far right — rather than three items spread evenly, which
              strands the nav in the middle of a 1440px bar. */}
          <div className="flex items-center gap-9 lg:gap-12">
            <Logo priority />

            {/* Plain text links, spaced rather than padded: no pill, no active
                chip. The active route is carried by weight and colour alone. */}
            <nav className="hidden items-center gap-7 md:flex lg:gap-9">
              {navLinks.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-sm transition-colors",
                    active
                      ? "font-medium text-navy-800"
                      : "text-muted hover:text-navy-800",
                  )}
                >
                  {link.label}
                </Link>
              );
              })}
            </nav>
          </div>

          <div className="hidden md:block">
            <Button
              href="/contact"
              size="sm"
              className="h-8 rounded-lg px-3.5 py-0 text-sm font-medium shadow-none hover:translate-y-0 hover:shadow-none"
            >
              Start a project
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="rounded-full p-2 text-navy-800 hover:bg-navy-800/5 md:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </Container>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden bg-background/95 shadow-[inset_0_-1px_0_0_var(--color-border)] backdrop-blur-xl md:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-4 py-3 text-base font-medium text-navy-800 hover:bg-navy-800/5"
                >
                  {link.label}
                </Link>
              ))}
              <Button href="/contact" className="mt-2 w-full rounded-lg">
                Start a project
              </Button>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

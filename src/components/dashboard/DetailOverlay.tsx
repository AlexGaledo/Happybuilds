"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keyboard and focus behaviour for the lead detail slide-over.
 *
 * The panel itself is server-rendered and closes via a plain link, so it works
 * without JS. This adds the two things a link cannot: Escape to dismiss, and
 * moving focus into the panel when it opens so a keyboard user isn't left at
 * the top of the table behind it.
 */
export function DetailOverlay({
  closeHref,
  children,
}: {
  closeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeHref, router]);

  useEffect(() => {
    // preventScroll: the table position behind the panel should not jump.
    panel.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={panel} tabIndex={-1} className="outline-none">
      {children}
    </div>
  );
}

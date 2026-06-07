"use client";

import { ReactLenis } from "lenis/react";
import type { PropsWithChildren } from "react";

/**
 * App-wide smooth scrolling via Lenis. Honors prefers-reduced-motion by
 * disabling smoothing for those users. GSAP ScrollTrigger (used in hero
 * set-pieces) reads window scroll, which Lenis drives, so they stay in sync.
 */
export function SmoothScroll({ children }: PropsWithChildren) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <ReactLenis
      root
      options={{
        duration: 1.1,
        smoothWheel: !prefersReduced,
        lerp: 0.1,
      }}
    >
      {children}
    </ReactLenis>
  );
}

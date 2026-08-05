"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * The site's ambient backdrop: drifting, breathing colour behind every
 * marketing page.
 *
 * This used to live inside the hero, which meant `overflow-hidden` clipped it
 * at the fold — the top of the page had texture and glow, and everything below
 * it fell back to flat cream with a visible horizontal seam. Six other pages
 * repeated the same trick with their own clipped copy. Hoisting it to the
 * layout makes one continuous field instead of eight disconnected ones.
 *
 * `fixed` rather than `absolute`: the floaters are meant to read as light in
 * the room, not as objects glued to the document. A page-height absolute layer
 * would also mean four enormous blurred circles stretched over 4400px, which
 * is both wrong-looking and expensive to composite.
 *
 * Sits at `z-0` with the content at `z-10`. Deliberately not negative z-index —
 * that paints behind the body background, which is opaque cream, and the whole
 * layer would simply vanish.
 */
export function Atmosphere() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      // Non-harmonic durations so the four never settle into a shared rhythm;
      // matched timings make the whole backdrop read as one object sliding.
      gsap.to(".atmo-a", { xPercent: 8, yPercent: -6, scale: 1.06, duration: 17, ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap.to(".atmo-b", { xPercent: -7, yPercent: 8, scale: 1.08, duration: 21, ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap.to(".atmo-c", { xPercent: 6, yPercent: 7, scale: 1.05, duration: 25, ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap.to(".atmo-d", { xPercent: -6, yPercent: -7, scale: 1.07, duration: 29, ease: "sine.inOut", repeat: -1, yoyo: true });

      // The glow: each core breathes on a shorter cycle than its drift, and
      // the stagger keeps them from peaking together. Opacity and scale rather
      // than `filter`, so this stays on the compositor instead of repainting
      // a blur radius every frame.
      gsap.to(".atmo-core", {
        opacity: 0.4,
        scale: 0.86,
        duration: 5.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 1.9,
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Spread across the viewport rather than clustered at the top, so no
          scroll position is ever left on bare cream.

          Opacities are roughly 40% of what the hero-only version used. That
          version could afford to be vivid because it covered one screen and
          then stopped; at full-page scale the same values tint every section
          warm and cost the amber guarantee card its contrast against the page.
          Amber is cut hardest — it is the widest and the warmest, so it reads
          louder than its number suggests. */}
      <div className="atmo-a absolute -left-[12vw] -top-[10vh] h-[46vh] w-[38vw]">
        <div className="absolute inset-0 rounded-full bg-coral-400/16 blur-3xl" />
        <div className="atmo-core absolute inset-[26%] rounded-full bg-coral-500/20 blur-2xl" />
      </div>
      <div className="atmo-b absolute -right-[10vw] top-[18vh] h-[50vh] w-[40vw]">
        <div className="absolute inset-0 rounded-full bg-amber-400/13 blur-3xl" />
        <div className="atmo-core absolute inset-[28%] rounded-full bg-amber-500/16 blur-2xl" />
      </div>
      <div className="atmo-c absolute -bottom-[12vh] left-[18vw] h-[44vh] w-[34vw]">
        <div className="absolute inset-0 rounded-full bg-mint-500/10 blur-3xl" />
        <div className="atmo-core absolute inset-[30%] rounded-full bg-mint-500/14 blur-2xl" />
      </div>
      <div className="atmo-d absolute -bottom-[8vh] -right-[8vw] h-[40vh] w-[32vw]">
        <div className="absolute inset-0 rounded-full bg-coral-400/10 blur-3xl" />
        <div className="atmo-core absolute inset-[30%] rounded-full bg-coral-500/12 blur-2xl" />
      </div>
    </div>
  );
}

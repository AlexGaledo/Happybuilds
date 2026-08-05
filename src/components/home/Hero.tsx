"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Entrance: stagger headline lines, copy, CTAs.
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-line", { yPercent: 120, opacity: 0, duration: 0.9, stagger: 0.12 })
        .from(".hero-sub", { y: 20, opacity: 0, duration: 0.7 }, "-=0.4")
        .from(".hero-cta", { y: 16, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.3")
        .from(".hero-art", { scale: 0.85, opacity: 0, duration: 0.9 }, "-=0.9");

      if (!reduce) {
        // Gentle perpetual float on the logo mark.
        gsap.to(".hero-art", {
          y: -14,
          rotation: 2,
          duration: 3,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });

        // Drift on the decorative floaters. The durations are deliberately
        // non-harmonic (9 / 11 / 13) so the three never settle into a visible
        // shared rhythm — with matching durations the whole backdrop starts to
        // look like one object sliding around.
        gsap.to(".blob-a", { x: 34, y: -26, scale: 1.06, duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(".blob-b", { x: -28, y: 30, scale: 1.08, duration: 11, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(".blob-c", { x: 22, y: 26, scale: 1.05, duration: 13, ease: "sine.inOut", repeat: -1, yoyo: true });

        // The glow itself: each floater's bright core breathes on a shorter
        // cycle than its drift, staggered so they peak at different moments.
        // Animating opacity + scale rather than `filter` keeps this on the
        // compositor — a blur-radius tween would repaint every frame.
        gsap.to(".blob-core", {
          opacity: 0.38,
          scale: 0.88,
          duration: 4.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 1.6,
        });
      }
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative overflow-hidden bg-dotted">
      {/* Decorative floaters.
          Two layers each: a wide, soft colour wash plus a smaller, brighter
          core. The core is what the glow tween breathes, which reads as light
          coming from inside the shape — a single flat circle fading in and out
          just looks like it is switching off. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="blob-a absolute -left-24 top-10 h-72 w-72">
          <div className="absolute inset-0 rounded-full bg-coral-400/25 blur-3xl" />
          <div className="blob-core absolute inset-[26%] rounded-full bg-coral-500/35 blur-2xl" />
        </div>
        <div className="blob-b absolute -right-16 top-40 h-80 w-80">
          <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="blob-core absolute inset-[28%] rounded-full bg-amber-500/35 blur-2xl" />
        </div>
        <div className="blob-c absolute -bottom-16 left-1/3 h-64 w-64">
          <div className="absolute inset-0 rounded-full bg-mint-500/18 blur-3xl" />
          <div className="blob-core absolute inset-[30%] rounded-full bg-mint-500/28 blur-2xl" />
        </div>
      </div>

      <Container className="grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <div className="hero-sub mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-sm font-semibold text-navy-700 backdrop-blur">
            <Sparkles size={15} className="text-coral-ink" />
            Digital & technical solutions, built happily
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="block overflow-hidden">
              <span className="hero-line block">Software that makes</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block">
                work feel{" "}
                <span className="relative inline-block text-coral-ink">
                  lighter
                  <BrushUnderline />
                </span>
              </span>
            </span>
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-lg leading-relaxed text-muted">
            We&apos;re Fickles — a software studio that automates the boring
            stuff, builds internal tools your team loves, and ships friendly
            websites that convert. Big-agency quality, minus the headache.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="hero-cta">
              <Button href="/contact" size="lg">
                Start a project <ArrowRight size={18} />
              </Button>
            </span>
            <span className="hero-cta">
              <Button href="/portfolio" variant="outline" size="lg">
                See our work
              </Button>
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="hero-art relative mx-auto max-w-sm">
            <Image
              src="/brand/fickles-mark-navy.png"
              alt="The Fickles paintbrush mascot"
              width={1049}
              height={517}
              priority
              className="h-auto w-full drop-shadow-[0_24px_48px_rgba(10,25,48,0.18)]"
            />
            {/* Wordmark is live text, not baked into the art — so a rename is a
                one-line edit here instead of re-cutting the PNGs. */}
            <p className="mt-5 text-center font-display text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
              fickles<span className="text-coral-ink">.tech</span>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}

/** Hand-drawn brush underline that strokes itself on view. */
function BrushUnderline() {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 240 24"
      fill="none"
      className="absolute -bottom-3 left-0 h-3 w-full"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M4 14 C 60 4, 120 22, 236 8"
        stroke="var(--color-amber-500)"
        strokeWidth="7"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.svg>
  );
}

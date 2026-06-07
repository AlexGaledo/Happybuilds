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
        // Parallax drift on the decorative blobs.
        gsap.to(".blob-a", { x: 30, y: -20, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(".blob-b", { x: -24, y: 24, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true });
      }
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative overflow-hidden bg-dotted">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="blob-a absolute -left-24 top-10 h-72 w-72 rounded-full bg-coral-400/25 blur-3xl" />
        <div className="blob-b absolute -right-16 top-40 h-80 w-80 rounded-full bg-amber-400/25 blur-3xl" />
      </div>

      <Container className="grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <div className="hero-sub mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-sm font-semibold text-navy-700 backdrop-blur">
            <Sparkles size={15} className="text-coral-500" />
            Digital & technical solutions, built happily
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="block overflow-hidden">
              <span className="hero-line block">Software that makes</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block">
                work feel{" "}
                <span className="relative inline-block text-coral-500">
                  lighter
                  <BrushUnderline />
                </span>
              </span>
            </span>
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-lg leading-relaxed text-muted">
            We&apos;re Happy Builds — a software studio that automates the boring
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
              src="/brand/happybuilds-navy.png"
              alt="The Happy Builds paintbrush mascot"
              width={1264}
              height={1264}
              priority
              className="h-auto w-full drop-shadow-[0_24px_48px_rgba(10,25,48,0.18)]"
            />
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

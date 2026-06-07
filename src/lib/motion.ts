import type { Variants, Transition } from "motion/react";

/**
 * Shared Motion variants. Keep animations subtle + friendly:
 * short distance, soft easing. Respect reduced-motion via <MotionConfig>.
 */

export const easeOutSoft: Transition["ease"] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutSoft },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: easeOutSoft } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: easeOutSoft },
  },
};

/** Parent that staggers its children's entrance. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

/** Common props for a scroll-triggered reveal section. */
export const reveal = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, amount: 0.3 },
} as const;

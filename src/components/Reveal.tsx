"use client";

import { motion } from "motion/react";
import type { ComponentPropsWithoutRef } from "react";
import { fadeUp, reveal, staggerContainer } from "@/lib/motion";

type RevealProps = ComponentPropsWithoutRef<typeof motion.div> & {
  /** Delay in seconds before the reveal animates in. */
  delay?: number;
};

/** Scroll-triggered fade-up wrapper (animates once when in view). */
export function Reveal({ delay = 0, children, ...props }: RevealProps) {
  return (
    <motion.div
      variants={fadeUp}
      {...reveal}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Staggers the entrance of its direct <Reveal>/motion children. */
export function RevealGroup({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof motion.div>) {
  return (
    <motion.div variants={staggerContainer} {...reveal} {...props}>
      {children}
    </motion.div>
  );
}

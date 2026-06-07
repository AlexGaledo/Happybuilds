"use client";

import { MotionConfig } from "motion/react";
import type { PropsWithChildren } from "react";

/** Wraps the app so all Motion animations respect the user's reduced-motion setting. */
export function MotionProvider({ children }: PropsWithChildren) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

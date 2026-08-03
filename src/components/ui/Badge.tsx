import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type Tone = "coral" | "amber" | "mint" | "navy";

const tones: Record<Tone, string> = {
  coral: "bg-coral-500/10 text-coral-ink",
  amber: "bg-amber-500/15 text-amber-ink",
  mint: "bg-mint-500/12 text-mint-ink",
  navy: "bg-navy-800/8 text-navy-700 dark:bg-white/10 dark:text-white",
};

interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: Tone;
}

export function Badge({ className, tone = "navy", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

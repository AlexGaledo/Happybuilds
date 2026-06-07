import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

/** Centered max-width wrapper with responsive horizontal padding. */
export function Container({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}
      {...props}
    />
  );
}

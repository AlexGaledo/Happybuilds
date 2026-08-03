import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "full" uses the stacked lockup image; "horizontal" pairs the mark with a text wordmark. */
  variant?: "full" | "horizontal" | "mark";
  /** Colour theme of the surface the logo sits on. */
  theme?: "light" | "dark";
  className?: string;
  priority?: boolean;
}

/**
 * Fickles logo. The mark is a paintbrush stroke with a smiley face.
 * Light surfaces use the navy lockup; dark surfaces use the white one.
 */
export function Logo({
  variant = "horizontal",
  theme = "light",
  className,
  priority,
}: LogoProps) {
  const markSrc =
    theme === "dark" ? "/brand/icon-white-512.png" : "/brand/icon-512.png";
  const fullSrc =
    theme === "dark"
      ? "/brand/fickles-mark-white.png"
      : "/brand/fickles-mark-navy.png";

  if (variant === "full") {
    return (
      <Link href="/" aria-label="Fickles home" className={cn("inline-block", className)}>
        <Image
          src={fullSrc}
          alt=""
          width={1049}
          height={517}
          priority={priority}
          className="h-auto w-full"
        />
        <span
          className={cn(
            "mt-3 block text-center font-display text-2xl font-extrabold tracking-tight",
            theme === "dark" ? "text-white" : "text-navy-800",
          )}
        >
          fickles<span className={theme === "dark" ? "text-coral-400" : "text-coral-ink"}>.tech</span>
        </span>
      </Link>
    );
  }

  if (variant === "mark") {
    return (
      <Link href="/" aria-label="Fickles home" className={cn("inline-block", className)}>
        <Image
          src={markSrc}
          alt="Fickles"
          width={512}
          height={512}
          priority={priority}
          className="h-full w-auto"
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      aria-label="Fickles home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <Image
        src={markSrc}
        alt=""
        width={512}
        height={512}
        priority={priority}
        className="h-9 w-9 transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:-rotate-6"
      />
      <span
        className={cn(
          "font-display text-lg font-extrabold tracking-tight",
          theme === "dark" ? "text-white" : "text-navy-800",
        )}
      >
        fickles<span className={theme === "dark" ? "text-coral-400" : "text-coral-ink"}>.tech</span>
      </span>
    </Link>
  );
}

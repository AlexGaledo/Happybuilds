import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const fieldBase =
  "w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted/70 transition-colors focus:border-coral-500 focus:outline-none focus:ring-2 focus:ring-coral-500/30 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn(fieldBase, "min-h-32 resize-y", className)} {...props} />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  ComponentPropsWithoutRef<"select">
>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(fieldBase, "appearance-none", className)} {...props} />;
});

interface LabelledFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/** Label + control + error message wrapper. */
export function LabelledField({
  label,
  htmlFor,
  error,
  required,
  children,
}: LabelledFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-coral-ink"> *</span>}
      </label>
      {children}
      {error && <p className="text-sm font-medium text-coral-ink">{error}</p>}
    </div>
  );
}

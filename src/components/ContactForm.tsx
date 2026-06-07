"use client";

/**
 * ContactForm — the interactive client island on /contact.
 *
 * Handles validation (react-hook-form + zod), submission (createLead from the
 * API client), and three UX states: editing, success (replaces the form with a
 * friendly confirmation card), and error (an inline banner above the form).
 * Designed to feel snappy: only the submit button shows a loading state, never
 * a full-page spinner.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, LabelledField, Select, Textarea } from "@/components/ui/Field";
import { createLead } from "@/lib/api";
import { services } from "@/lib/site";

// Budget options live as a constant so the labels are easy to find and edit
// in one place (no magic strings scattered through the JSX).
const BUDGET_OPTIONS = [
  "< $1k",
  "$1k–$3k",
  "$3k–$10k",
  "$10k+",
  "Not sure",
] as const;

// Service options come from site.ts so the form stays in sync with our
// services, plus an escape hatch for anything that doesn't fit.
const SERVICE_OPTIONS = [
  ...services.map((service) => service.title),
  "Something else",
] as const;

// Minimum message length keeps submissions meaningful enough to act on.
const MESSAGE_MIN_LENGTH = 10;

// Zod schema is the single source of truth for what a valid form looks like.
// react-hook-form infers its types from this via zodResolver.
const contactSchema = z.object({
  name: z.string().min(1, "Please tell us your name."),
  email: z.string().min(1, "We need an email to reply.").email("That doesn't look like a valid email."),
  company: z.string().optional(),
  service: z.string().optional(),
  budget: z.string().optional(),
  message: z
    .string()
    .min(MESSAGE_MIN_LENGTH, `A little more detail helps — at least ${MESSAGE_MIN_LENGTH} characters.`),
});

// Form values type is derived from the schema so the two can never drift apart.
type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  // `isSubmitted` flips the form over to the success card.
  const [isSubmitted, setIsSubmitted] = useState(false);
  // `submitError` holds a message from a failed createLead call (network/server).
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(values: ContactFormValues) {
    setSubmitError(null);
    try {
      // Drop empty optional strings so we send a clean payload to the backend.
      await createLead({
        name: values.name,
        email: values.email,
        message: values.message,
        company: values.company || undefined,
        service: values.service || undefined,
        budget: values.budget || undefined,
      });
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? "Something went wrong sending your message. Please try again, or email us directly."
          : "Something went wrong. Please try again.",
      );
    }
  }

  // Success state: replace the whole form with a warm confirmation.
  if (isSubmitted) {
    return (
      <Card className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint-500/12 text-mint-500">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Message sent — thank you!</h2>
        <p className="mt-3 leading-relaxed text-muted">
          We've got your note and we'll reply within one business day with honest
          next steps. Talk soon!
        </p>
      </Card>
    );
  }

  return (
    <Card>
      {/* Error banner — only shown when a submission actually fails. */}
      {submitError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl bg-coral-500/10 px-4 py-3 text-sm font-medium text-coral-600"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
        <LabelledField label="Name" htmlFor="name" required error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Jane Builder"
            aria-invalid={errors.name ? "true" : "false"}
            {...register("name")}
          />
        </LabelledField>

        <LabelledField label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="jane@company.com"
            aria-invalid={errors.email ? "true" : "false"}
            {...register("email")}
          />
        </LabelledField>

        <LabelledField label="Company" htmlFor="company" error={errors.company?.message}>
          <Input
            id="company"
            autoComplete="organization"
            placeholder="Acme Co. (optional)"
            {...register("company")}
          />
        </LabelledField>

        <div className="grid gap-5 sm:grid-cols-2">
          <LabelledField label="What can we help with?" htmlFor="service" error={errors.service?.message}>
            <Select id="service" defaultValue="" {...register("service")}>
              <option value="" disabled>
                Pick a service
              </option>
              {SERVICE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </LabelledField>

          <LabelledField label="Budget" htmlFor="budget" error={errors.budget?.message}>
            <Select id="budget" defaultValue="" {...register("budget")}>
              <option value="" disabled>
                Rough range
              </option>
              {BUDGET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </LabelledField>
        </div>

        <LabelledField label="Message" htmlFor="message" required error={errors.message?.message}>
          <Textarea
            id="message"
            placeholder="Tell us a little about what you're trying to do…"
            aria-invalid={errors.message ? "true" : "false"}
            {...register("message")}
          />
        </LabelledField>

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full sm:w-auto">
          {isSubmitting ? "Sending…" : "Send message"}
        </Button>
      </form>
    </Card>
  );
}

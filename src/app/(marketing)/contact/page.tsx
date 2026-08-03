import type { Metadata } from "next";
import { Mail, Clock, MessageSquareHeart } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell us what's slowing you down. Fickles replies within one business day with honest next steps — no pressure, no jargon.",
};

/** What happens after someone hits "Send" — sets expectations up front. */
const whatHappensNext = [
  "We read your note and reply within one business day.",
  "A quick, friendly call to make sure we understand the goal.",
  "An honest plan with clear scope, timeline, and pricing.",
];

export default function ContactPage() {
  return (
    <Section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-dotted opacity-60" />

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: friendly intro + ways to reach us */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-coral-ink">
            Contact
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Let&rsquo;s build something lighter together
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Got a workflow that&rsquo;s driving you up the wall, or an idea you&rsquo;d love
            to ship? Drop us a line — we&rsquo;re friendly, we promise.
          </p>

          <div className="mt-10 space-y-6">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-coral-500/10 text-coral-ink">
                <Mail size={20} />
              </span>
              <div>
                <p className="font-semibold">Email us</p>
                <a
                  href={`mailto:${site.email}`}
                  className="text-muted transition-colors hover:text-coral-ink"
                >
                  {site.email}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-ink">
                <Clock size={20} />
              </span>
              <div>
                <p className="font-semibold">Response time</p>
                <p className="text-muted">
                  We reply within one business day — usually much sooner.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint-500/12 text-mint-ink">
                <MessageSquareHeart size={20} />
              </span>
              <div>
                <p className="font-semibold">What happens next</p>
                <ol className="mt-2 space-y-2 text-muted">
                  {whatHappensNext.map((step, index) => (
                    <li key={step} className="flex gap-2">
                      <span className="font-semibold text-navy-800">
                        {index + 1}.
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Right: the interactive client island */}
        <div>
          <ContactForm />
        </div>
      </div>
    </Section>
  );
}

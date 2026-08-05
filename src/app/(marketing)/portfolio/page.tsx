import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Reveal, RevealGroup } from "@/components/Reveal";
import { CTASection } from "@/components/CTASection";
import { caseStudies } from "@/lib/site";

/**
 * /portfolio — the work index.
 *
 * Server component that renders every case study from `caseStudies` (src/lib/site.ts)
 * as a card linking to its detail page at /portfolio/[slug]. The card layout mirrors
 * the "portfolio teaser" on the home page so the two stay visually consistent.
 */

const hasWork = caseStudies.length > 0;

/**
 * Shown while there is no client work. These describe how a first project
 * would run — capability and terms, never a claim that any of it has happened.
 */
const approach = [
  {
    title: "We scope it before you commit",
    description:
      "First conversation is about whether the thing is worth building at all. If buying something off the shelf is the better answer, we'll say so and you'll have lost an hour, not a budget.",
  },
  {
    title: "You see it working every week",
    description:
      "Progress arrives as something you can click, not a status update. Small visible steps mean a wrong turn costs a week, never a quarter.",
  },
  {
    title: "Fixed price, written down",
    description:
      "Scope and price agreed up front. If the scope changes we re-quote in the open — no surprise line items at the end of a build.",
  },
  {
    title: "It's yours, including the keys",
    description:
      "Repository, documentation, and deploy access handed over as we go. Nothing about the arrangement depends on you being unable to leave.",
  },
];

export const metadata: Metadata = {
  title: "Work",
  description: hasWork
    ? "A look at recent builds from Fickles — automations, internal tools, websites, and custom software that made everyday work feel lighter."
    : "Fickles is a new studio and hasn't shipped a client build yet. Here's how we'd approach yours, and what the first few clients get for taking the chance.",
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioPage() {
  return (
    <>
      {/* Intro / hero */}
      <Section className="relative overflow-hidden pb-12">
        {/* Subtle dotted backdrop, matched to the services page intro. */}
        <SectionHeading
          eyebrow="Work"
          title={hasWork ? "Builds we're proud of" : "Nothing here yet"}
          description={
            hasWork
              ? "Real problems, right-sized solutions. Here are a few of the things we've helped teams ship lately."
              : "We're a new studio, and no client build has shipped yet. This page will fill up with real work and real numbers — until then it stays empty rather than borrowing someone else's."
          }
        />
      </Section>

      {/* No client work yet: say how we'd approach the first one instead. */}
      {!hasWork && (
        <>
          <Section className="pt-4">
            <RevealGroup className="grid gap-6 md:grid-cols-2">
              {approach.map((item) => (
                <Reveal key={item.title}>
                  <Card className="flex h-full flex-col">
                    <h2 className="text-xl font-bold">{item.title}</h2>
                    <p className="mt-3 flex-1 leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </Card>
                </Reveal>
              ))}
            </RevealGroup>
          </Section>

          <Section className="pt-0">
            <Reveal>
              <Card className="bg-amber-500/8 text-center">
                <h2 className="text-2xl font-bold">
                  Want to be the first case study?
                </h2>
                <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted">
                  Founding-project pricing, direct access to the person building
                  it, and you keep the source and deploy access whatever
                  happens next.
                </p>
                <p className="mt-6">
                  <Link
                    href="/contact"
                    className="font-semibold text-coral-ink underline underline-offset-4"
                  >
                    Tell us what you need
                  </Link>
                </p>
              </Card>
            </Reveal>
          </Section>
        </>
      )}

      {/* Case-study grid */}
      {hasWork && (
      <Section className="pt-4">
        <RevealGroup className="grid gap-6 md:grid-cols-2">
          {caseStudies.map((caseStudy) => (
            <Reveal key={caseStudy.slug}>
              <Link
                href={`/portfolio/${caseStudy.slug}`}
                className="group block h-full"
              >
                <Card interactive className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    {/* Badge tone is driven by the case study's accent color. */}
                    <Badge tone={caseStudy.accent}>{caseStudy.category}</Badge>
                    <span className="text-sm text-muted">{caseStudy.year}</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold transition-colors group-hover:text-coral-ink">
                    {caseStudy.title}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {caseStudy.client}
                  </p>
                  <p className="mt-3 flex-1 leading-relaxed text-muted">
                    {caseStudy.summary}
                  </p>
                  {/* Metrics strip — same shape as the home teaser cards. */}
                  <div className="mt-6 flex flex-wrap gap-6">
                    {caseStudy.metrics.map((metric) => (
                      <div key={metric.label}>
                        <p className="font-display text-xl font-extrabold text-navy-800">
                          {metric.value}
                        </p>
                        <p className="text-xs text-muted">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </Link>
            </Reveal>
          ))}
        </RevealGroup>
      </Section>
      )}

      <CTASection />
    </>
  );
}

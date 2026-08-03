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

export const metadata: Metadata = {
  title: "Work",
  description:
    "A look at recent builds from Fickles — automations, internal tools, websites, and custom software that made everyday work feel lighter.",
};

export default function PortfolioPage() {
  return (
    <>
      {/* Intro / hero */}
      <Section className="relative overflow-hidden pb-12">
        {/* Subtle dotted backdrop, matched to the services page intro. */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-dotted opacity-60" />
        <SectionHeading
          eyebrow="Work"
          title="Builds we're proud of"
          description="Real problems, right-sized solutions. Here are a few of the things we've helped teams ship lately."
        />
      </Section>

      {/* Case-study grid */}
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

      <CTASection />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Reveal, RevealGroup } from "@/components/Reveal";
import { CTASection } from "@/components/CTASection";
import { caseStudies, type CaseStudy } from "@/lib/site";

/**
 * /portfolio/[slug] — a single case study.
 *
 * Server component. Statically generated from the `caseStudies` slugs and rendered
 * as a rich layout: back link, meta, metrics strip, Challenge / Solution / Result
 * narrative, the tech stack as chips, and a "more work" link before the shared CTA.
 */

/**
 * In Next 16 the dynamic route `params` is a Promise, so it must be awaited.
 * We type it once here and reuse it for both metadata and the page component.
 */
type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Find a case study by slug, or return undefined if there's no match. */
function findCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((caseStudy) => caseStudy.slug === slug);
}

/** Pre-render a static page for every case study at build time. */
export function generateStaticParams() {
  return caseStudies.map((caseStudy) => ({ slug: caseStudy.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = findCaseStudy(slug);

  if (!caseStudy) {
    return { title: "Work" };
  }

  return {
    title: caseStudy.title,
    description: caseStudy.summary,
    alternates: { canonical: `/portfolio/${slug}` },
  };
}

/**
 * The three narrative blocks share the same structure, so we describe them as
 * data and map over them rather than repeating markup three times.
 */
const narrativeBlocks = [
  { key: "challenge", label: "The challenge" },
  { key: "solution", label: "What we built" },
  { key: "result", label: "The result" },
] as const;

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const caseStudy = findCaseStudy(slug);

  // Unknown slug → render the 404 page.
  if (!caseStudy) {
    notFound();
  }

  // Pick a different case study to feature as "more work" (fall back to the
  // first one if this is the only study, so we never link back to itself).
  const moreWork =
    caseStudies.find((other) => other.slug !== caseStudy.slug) ?? caseStudy;

  return (
    <>
      {/* Header */}
      <Section className="relative overflow-hidden pb-10">
        <Reveal>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-coral-ink"
          >
            <ArrowLeft size={15} /> All work
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <Badge tone={caseStudy.accent}>{caseStudy.category}</Badge>
            <span className="text-sm text-muted">
              {caseStudy.client} · {caseStudy.year}
            </span>
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold sm:text-5xl">
            {caseStudy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            {caseStudy.summary}
          </p>
        </Reveal>
      </Section>

      {/* Metrics strip */}
      <Section className="py-0">
        <Reveal>
          <Card className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {caseStudy.metrics.map((metric) => (
              <div key={metric.label} className="text-center sm:text-left">
                <p className="font-display text-3xl font-extrabold text-coral-ink">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-muted">{metric.label}</p>
              </div>
            ))}
          </Card>
        </Reveal>
      </Section>

      {/* Challenge / Solution / Result narrative */}
      <Section>
        <RevealGroup className="grid gap-12 sm:gap-16">
          {narrativeBlocks.map((block) => (
            <Reveal key={block.key}>
              <div className="grid gap-3 sm:grid-cols-[14rem_1fr] sm:gap-8">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-coral-ink">
                  {block.label}
                </h2>
                <p className="max-w-2xl text-lg leading-relaxed text-foreground">
                  {caseStudy[block.key]}
                </p>
              </div>
            </Reveal>
          ))}
        </RevealGroup>
      </Section>

      {/* Tech stack */}
      <Section className="pt-0">
        <Reveal>
          <Card className="bg-surface">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              Stack
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {caseStudy.stack.map((tool) => (
                <li
                  key={tool}
                  className="rounded-full border border-border bg-background px-4 py-1.5 text-sm font-semibold text-navy-800"
                >
                  {tool}
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </Section>

      {/* More work */}
      <Section className="pt-0">
        <Reveal>
          <Link href={`/portfolio/${moreWork.slug}`} className="group block">
            <Card interactive className="sm:flex sm:items-center sm:justify-between sm:gap-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                  Next up
                </p>
                <h2 className="mt-2 text-2xl font-bold transition-colors group-hover:text-coral-ink">
                  {moreWork.title}
                </h2>
                <p className="mt-1 text-muted">{moreWork.summary}</p>
              </div>
              <span className="mt-5 inline-flex shrink-0 items-center gap-1.5 font-semibold text-navy-800 transition-colors group-hover:text-coral-ink sm:mt-0">
                See the build <ArrowRight size={16} />
              </span>
            </Card>
          </Link>
        </Reveal>
      </Section>

      <CTASection />
    </>
  );
}

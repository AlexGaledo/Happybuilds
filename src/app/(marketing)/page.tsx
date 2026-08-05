import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { Container } from "@/components/ui/Container";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup } from "@/components/Reveal";
import { ServiceIcon } from "@/components/ServiceIcon";
import { Testimonials } from "@/components/Testimonials";
import { CTASection } from "@/components/CTASection";
import { caseStudies, process, services } from "@/lib/site";

/**
 * The "by the numbers" strip that used to sit here claimed 30+ projects
 * shipped and 10 hrs saved weekly. None of that had happened. It is gone
 * rather than softened — put it back when there are real numbers to put in it.
 */

/**
 * Title and description are inherited from the root layout — the home page is
 * what its defaults describe. Only the canonical is set here, so that
 * www.fickles.tech and any tracking-parameter variants collapse onto one URL.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** What we can honestly promise before there is a track record to point at. */
const firstClientOffer = [
  {
    title: "Founding-project pricing",
    description:
      "A genuinely discounted rate, because you're taking the risk on a studio with nothing to show yet. That cuts both ways and the price should say so.",
  },
  {
    title: "You talk to the builder",
    description:
      "No account manager in the middle. The person writing your code is the person answering your questions, for as long as the project runs.",
  },
  {
    title: "You keep everything",
    description:
      "Source, docs, and deploy access are yours from day one — not held hostage as leverage. If we're not a fit, you walk away with the work.",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Services preview */}
      <Section className="pt-16 sm:pt-20">
        <SectionHeading
          eyebrow="What we do"
          title="One friendly team, four ways to help"
          description="Whether it's a tiny automation or a full custom platform, we right-size the solution to the problem in front of you."
        />
        <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2">
          {services.map((service) => (
            <Reveal key={service.slug}>
              <Card interactive className="flex h-full flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-500/10 text-coral-ink">
                  <ServiceIcon name={service.icon} className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{service.title}</h3>
                <p className="mt-1 text-sm font-semibold text-coral-ink">
                  {service.tagline}
                </p>
                <p className="mt-3 flex-1 leading-relaxed text-muted">
                  {service.description}
                </p>
                <Link
                  href={`/services#${service.slug}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 transition-colors hover:text-coral-ink"
                >
                  Learn more <ArrowRight size={15} />
                </Link>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      </Section>

      {/* Process */}
      <Section className="bg-navy-800 text-white" contained={false}>
        <Container>
          <SectionHeading
            eyebrow="How we work"
            title="A calm, transparent process"
            description="No black boxes. You'll always know what's happening and what's next."
            className="[&_h2]:text-white [&_p]:text-navy-100"
          />
          <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((step, i) => (
              <Reveal key={step.title}>
                <div className="rounded-3xl border border-navy-700 bg-navy-900/40 p-6">
                  <span className="font-display text-sm font-bold text-amber-400">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-100">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </RevealGroup>
        </Container>
      </Section>

      {/* Portfolio teaser.
          `caseStudies` is empty until the first client build ships, so this
          says so plainly. Adding the first real entry flips it back to the
          case-study grid with no code change here. */}
      <Section>
        {caseStudies.length > 0 ? (
          <>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <SectionHeading
                align="left"
                eyebrow="Recent work"
                title="Builds we're proud of"
                description="A few problems we've helped solve lately."
                className="text-left"
              />
              <Button href="/portfolio" variant="outline" size="sm">
                View all work <ArrowRight size={16} />
              </Button>
            </div>
            <RevealGroup className="mt-12 grid gap-6 md:grid-cols-2">
              {caseStudies.slice(0, 2).map((cs) => (
                <Reveal key={cs.slug}>
                  <Link href={`/portfolio/${cs.slug}`} className="group block">
                    <Card interactive className="h-full">
                      <div className="flex items-center justify-between">
                        <Badge tone={cs.accent}>{cs.category}</Badge>
                        <span className="text-sm text-muted">{cs.year}</span>
                      </div>
                      <h3 className="mt-4 text-2xl font-bold transition-colors group-hover:text-coral-ink">
                        {cs.title}
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted">
                        {cs.summary}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-6">
                        {cs.metrics.map((m) => (
                          <div key={m.label}>
                            <p className="font-display text-xl font-extrabold text-navy-800">
                              {m.value}
                            </p>
                            <p className="text-xs text-muted">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Link>
                </Reveal>
              ))}
            </RevealGroup>
          </>
        ) : (
          <>
            <SectionHeading
              eyebrow="Recent work"
              title="We're looking for our first"
              description="Fickles is new. We haven't shipped a client build yet, and we'd rather tell you that than invent a case study. Here's what the first few teams get instead."
            />
            <RevealGroup className="mt-14 grid gap-6 md:grid-cols-3">
              {firstClientOffer.map((item) => (
                <Reveal key={item.title}>
                  <Card className="h-full">
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="mt-3 leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </Card>
                </Reveal>
              ))}
            </RevealGroup>
            <Reveal className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <Button href="/contact" size="lg">
                Be our first <ArrowRight size={18} />
              </Button>
              <Button href="/blog" variant="outline" size="lg">
                Read how we think
              </Button>
            </Reveal>
          </>
        )}
      </Section>

      {/* Why us / guarantee strip */}
      <Section className="pt-0">
        <Reveal>
          <Card className="bg-amber-500/8 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <h3 className="text-2xl font-bold">Friendly, but seriously good.</h3>
              <p className="mt-2 max-w-xl leading-relaxed text-muted">
                Modern stack, clean code, honest timelines. We sweat the details
                so your build keeps working long after launch.
              </p>
            </div>
            <ul className="mt-6 grid shrink-0 gap-2 sm:mt-0">
              {["Fixed, fair pricing", "Weekly visible progress", "Post-launch support"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2 font-semibold">
                    <Check size={18} className="text-mint-ink" /> {item}
                  </li>
                ),
              )}
            </ul>
          </Card>
        </Reveal>
      </Section>

      <Testimonials />
      <CTASection />
    </>
  );
}

import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealGroup } from "@/components/Reveal";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CTASection } from "@/components/CTASection";
import { process, services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "From tiny automations to full custom platforms, Fickles right-sizes the solution to the problem in front of you — automation, internal tools, websites, and custom software.",
};

export default function ServicesPage() {
  return (
    <>
      {/* Intro / hero */}
      <Section className="relative overflow-hidden pb-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-dotted opacity-60" />
        <SectionHeading
          eyebrow="Services"
          title="Friendly software, sized to fit"
          description="No bloated retainers or one-size-fits-all packages. Pick what you need today — we'll keep it simple and ship something you'll actually enjoy using."
        />
      </Section>

      {/* Service detail blocks — alternating layout for rhythm */}
      <Section className="pt-4">
        <div className="flex flex-col gap-20 sm:gap-28">
          {services.map((service, index) => {
            // Even rows put the visual on the left, odd rows on the right.
            // We use Tailwind's order utilities so the markup stays in a
            // single, readable order while the layout alternates visually.
            const visualOnRight = index % 2 === 1;

            return (
              <Reveal key={service.slug} id={service.slug} className="scroll-mt-28">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  {/* Text column */}
                  <div className={visualOnRight ? "lg:order-1" : "lg:order-2"}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-500/10 text-coral-600">
                      <ServiceIcon name={service.icon} className="h-7 w-7" />
                    </div>
                    <h2 className="mt-6 text-2xl font-bold sm:text-3xl">
                      {service.title}
                    </h2>
                    <p className="mt-2 text-base font-semibold text-coral-500">
                      {service.tagline}
                    </p>
                    <p className="mt-4 text-lg leading-relaxed text-muted">
                      {service.description}
                    </p>
                    <Button href="/contact" variant="outline" size="sm" className="mt-7">
                      Talk about this
                    </Button>
                  </div>

                  {/* Feature list card */}
                  <div className={visualOnRight ? "lg:order-2" : "lg:order-1"}>
                    <Card className="bg-surface">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                        What's included
                      </p>
                      <ul className="mt-5 grid gap-4">
                        {service.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint-500/12 text-mint-500">
                              <Check size={15} />
                            </span>
                            <span className="leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* Process — reuses the shared `process` data */}
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

      <CTASection />
    </>
  );
}

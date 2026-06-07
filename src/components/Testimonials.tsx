import { Quote } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Reveal, RevealGroup } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { testimonials } from "@/lib/site";

export function Testimonials() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Kind words"
        title="Teams that build happily with us"
        description="We measure success by whether people actually enjoy what we ship — and whether it makes their day easier."
      />
      <RevealGroup className="mt-14 grid gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <Reveal key={t.name}>
            <Card className="flex h-full flex-col">
              <Quote className="h-8 w-8 text-coral-500/40" />
              <p className="mt-4 flex-1 text-lg leading-relaxed text-foreground">
                {t.quote}
              </p>
              <div className="mt-6">
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-sm text-muted">{t.role}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </RevealGroup>
    </Section>
  );
}

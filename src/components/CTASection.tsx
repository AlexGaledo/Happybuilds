import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/Reveal";

interface CTASectionProps {
  title?: string;
  description?: string;
}

/** Reusable closing call-to-action band (navy, used at the bottom of most pages). */
export function CTASection({
  title = "Have something you'd love to build?",
  description = "Tell us what's slowing you down. We'll reply within one business day with honest next steps — no pressure, no jargon.",
}: CTASectionProps) {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-navy-800 px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-coral-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-8 h-56 w-56 rounded-full bg-amber-500/25 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">{title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-navy-100">
              {description}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button href="/contact" size="lg">
                Start a project <ArrowRight size={18} />
              </Button>
              <Button href="/services" variant="ghost" size="lg" className="text-white hover:bg-white/10">
                Explore services
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

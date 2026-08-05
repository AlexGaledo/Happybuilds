import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Reveal, RevealGroup } from "@/components/Reveal";
import { CTASection } from "@/components/CTASection";
import { values } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Fickles is a small, friendly software studio shipping automations, internal tools, websites, and custom software for teams that want to move faster without the headache.",
  alternates: { canonical: "/about" },
};

/**
 * Placeholder team members. Avatars are styled initials (no external images)
 * so the page stays fast and dependency-free until real photos exist.
 */
const team = [
  {
    name: "Sam Rivera",
    role: "Founder & Lead Engineer",
    bio: "Turns gnarly manual workflows into things that quietly run themselves.",
    accent: "bg-coral-500/12 text-coral-ink",
  },
  {
    name: "Jordan Park",
    role: "Product & Design",
    bio: "Obsessed with interfaces that feel obvious on the very first click.",
    accent: "bg-amber-500/15 text-amber-ink",
  },
  {
    name: "Riley Chen",
    role: "Full-stack Engineer",
    bio: "Loves a clean API and a deploy that just works on the first try.",
    accent: "bg-mint-500/12 text-mint-ink",
  },
];

/** Returns the initials for a full name, e.g. "Sam Rivera" -> "SR". */
function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function AboutPage() {
  return (
    <>
      {/* Story */}
      <Section className="relative overflow-hidden pb-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-dotted opacity-60" />
        <SectionHeading
          eyebrow="About us"
          title="A small studio with a soft spot for hard problems"
        />
        <Reveal className="mx-auto mt-10 max-w-2xl space-y-5 text-lg leading-relaxed text-muted">
          <p>
            Fickles started with a simple itch: too many great teams were
            stuck doing repetitive work by hand, wrestling spreadsheets, or
            making do with software that fought them at every turn. We thought
            building should feel lighter than that.
          </p>
          <p>
            So we became the friendly team you call for the technical stuff —
            automations that run themselves, internal tools your team actually
            likes, websites that make a warm first impression, and custom
            software when nothing off-the-shelf will do. We right-size every
            solution to the problem in front of you, no over-engineering.
          </p>
          <p>
            We&rsquo;re proudly small, which means you talk to the people doing the
            work. Expect plain language, honest timelines, visible progress —
            and a paintbrush mascot who&rsquo;s genuinely happy to see your project
            ship.
          </p>
        </Reveal>
      </Section>

      {/* Values grid */}
      <Section className="pt-4">
        <SectionHeading
          eyebrow="What we value"
          title="The principles behind every build"
        />
        <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2">
          {values.map((value) => (
            <Reveal key={value.title}>
              <Card interactive className="h-full">
                <h3 className="text-xl font-bold">{value.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">
                  {value.description}
                </p>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      </Section>

      {/* The "By the numbers" strip that sat here repeated the home page's
          invented stats (30+ projects, 10 hrs saved weekly). Removed with
          them — restore it when there is something real to count. */}

      {/* Team */}
      <Section>
        <SectionHeading
          eyebrow="The humans"
          title="Friendly faces behind the work"
          description="A few of the people you'll actually be working with."
        />
        <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <Reveal key={member.name}>
              <Card interactive className="h-full text-center">
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full font-display text-2xl font-extrabold ${member.accent}`}
                  aria-hidden="true"
                >
                  {getInitials(member.name)}
                </div>
                <h3 className="mt-5 text-xl font-bold">{member.name}</h3>
                <p className="mt-1 text-sm font-semibold text-coral-ink">
                  {member.role}
                </p>
                <p className="mt-3 leading-relaxed text-muted">{member.bio}</p>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      </Section>

      <CTASection />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Reveal, RevealGroup } from "@/components/Reveal";
import { CTASection } from "@/components/CTASection";
import { getAllPosts } from "@/lib/blog";

/**
 * /blog — the article index.
 *
 * Server component that lists every local MDX post (newest first) as a card with
 * its title, description, formatted date, tags, and reading time. Each card links
 * to the full article at /blog/[slug].
 */

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Friendly, practical notes on automation, internal tools, and building software that makes work feel lighter — from the Fickles team.",
  alternates: { canonical: "/blog" },
};

// Build one formatter and reuse it for every post. Intl avoids pulling in a date
// library and gives us a consistent, readable format like "Apr 12, 2026".
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      {/* Intro / hero */}
      <Section className="relative overflow-hidden pb-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-dotted opacity-60" />
        <SectionHeading
          eyebrow="Blog"
          title="Notes from the workshop"
          description="Short, useful reads on automation, internal tools, and shipping software people actually enjoy using."
        />
      </Section>

      {/* Post list */}
      <Section className="pt-4">
        <RevealGroup className="grid gap-6">
          {posts.map((post) => (
            <Reveal key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <Card interactive>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                    <Badge tone={post.frontmatter.cover}>
                      {/* The first tag doubles as the post's category label. */}
                      {post.frontmatter.tags[0]}
                    </Badge>
                    <time dateTime={post.frontmatter.date}>
                      {dateFormatter.format(new Date(post.frontmatter.date))}
                    </time>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} /> {post.readingTime}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold transition-colors group-hover:text-coral-ink">
                    {post.frontmatter.title}
                  </h2>
                  <p className="mt-2 max-w-2xl leading-relaxed text-muted">
                    {post.frontmatter.description}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 transition-colors group-hover:text-coral-ink">
                    Read article <ArrowRight size={15} />
                  </span>
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

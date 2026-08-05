import type { Metadata } from "next";
import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Section } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/Reveal";
import { CTASection } from "@/components/CTASection";
import { JsonLd } from "@/components/JsonLd";
import { blogPostingSchema, breadcrumbSchema } from "@/lib/structuredData";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";

/**
 * /blog/[slug] — a single article.
 *
 * Server component. The MDX body is rendered with next-mdx-remote's RSC variant
 * (<MDXRemote />), which runs entirely on the server. Because the Tailwind
 * typography plugin isn't installed, we style the article by passing a `components`
 * map that maps each MDX element to brand-token classes (see `mdxComponents`).
 */

type PageProps = {
  // Next 16: dynamic route params arrive as a Promise and must be awaited.
  params: Promise<{ slug: string }>;
};

/** Pre-render a static page for every post at build time. */
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: "Blog" };
  }

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    alternates: { canonical: `/blog/${slug}` },
    // `article` rather than the site-wide `website`, so the published date and
    // tags travel with the share instead of being dropped.
    openGraph: {
      type: "article",
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: `/blog/${slug}`,
      publishedTime: post.frontmatter.date,
      authors: [post.frontmatter.author],
      tags: post.frontmatter.tags,
    },
  };
}

// Reusable date formatter (Intl keeps us off external date libraries).
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * MDX element → styled React element map.
 *
 * This is how we get "prose" styling without the typography plugin: every tag the
 * articles use gets brand-token classes here. Each function just spreads through
 * its props (children, href, etc.) and adds className.
 */
const mdxComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-12 text-2xl font-bold sm:text-3xl" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-8 text-xl font-bold" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mt-5 text-lg leading-relaxed text-muted" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mt-5 grid gap-2 pl-1" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mt-5 grid list-decimal gap-2 pl-5" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li
      className="text-lg leading-relaxed text-muted marker:text-coral-ink"
      {...props}
    />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="mt-8 rounded-3xl border-l-4 border-coral-500 bg-surface px-6 py-5 text-lg font-medium italic leading-relaxed text-foreground shadow-soft"
      {...props}
    />
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a
      className="font-semibold text-coral-ink underline underline-offset-4 transition-colors hover:text-coral-ink"
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      className="rounded-md bg-navy-800/8 px-1.5 py-0.5 font-mono text-[0.9em] text-navy-800"
      {...props}
    />
  ),
};

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  // Unknown slug → render the 404 page.
  if (!post) {
    notFound();
  }

  const { frontmatter, content, readingTime } = post;

  return (
    <>
      <JsonLd data={blogPostingSchema(slug, frontmatter)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "" },
          { name: "Blog", path: "/blog" },
          { name: frontmatter.title, path: `/blog/${slug}` },
        ])}
      />

      {/* Article header */}
      <Section className="relative overflow-hidden pb-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-dotted opacity-60" />
        <Reveal className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-coral-ink"
          >
            <ArrowLeft size={15} /> All articles
          </Link>

          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
            {frontmatter.title}
          </h1>

          {/* Meta row: date, author, reading time */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
            <time dateTime={frontmatter.date}>
              {dateFormatter.format(new Date(frontmatter.date))}
            </time>
            <span aria-hidden="true">·</span>
            <span>{frontmatter.author}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} /> {readingTime}
            </span>
          </div>

          {/* Tags */}
          <ul className="mt-5 flex flex-wrap gap-2">
            {frontmatter.tags.map((tag) => (
              <li key={tag}>
                <Badge tone={frontmatter.cover}>{tag}</Badge>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      {/* Article body — MDX rendered on the server with brand-styled elements. */}
      <Section className="pt-0">
        <article className="mx-auto max-w-3xl">
          <MDXRemote source={content} components={mdxComponents} />
        </article>

        <div className="mx-auto mt-14 max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 transition-colors hover:text-coral-ink"
          >
            <ArrowLeft size={15} /> Back to all articles
          </Link>
        </div>
      </Section>

      <CTASection />
    </>
  );
}

import { site } from "@/lib/site";
import type { PostFrontmatter } from "@/lib/blog";

/**
 * schema.org payloads, built in one place so the `@id` values stay consistent.
 *
 * The organisation carries a stable `@id` and every other node references it
 * rather than restating the name and logo — that is what lets a crawler treat
 * the publisher of an article and the organisation behind the site as one
 * entity instead of two that happen to share a name.
 *
 * Everything here describes what Fickles *is*. Nothing asserts a track record:
 * there are no aggregate ratings, no review counts and no client lists, which
 * are exactly the properties that would be fabricated at this stage.
 */

export const ORGANIZATION_ID = `${site.url}/#organization`;

export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: site.name,
    url: site.url,
    description: site.description,
    email: site.email,
    logo: {
      "@type": "ImageObject",
      url: `${site.url}/brand/icon-512.png`,
      width: 512,
      height: 512,
    },
    // Only profiles that actually exist belong here — a dead sameAs is
    // ignored at best and dilutes entity matching at worst.
    sameAs: [site.social.github, site.social.linkedin, site.social.x],
  };
}

export function blogPostingSchema(
  slug: string,
  frontmatter: PostFrontmatter,
): Record<string, unknown> {
  const url = `${site.url}/blog/${slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: frontmatter.title,
    description: frontmatter.description,
    // No separate edit history is tracked, so modified equals published rather
    // than silently claiming a fresher date than the content has.
    datePublished: frontmatter.date,
    dateModified: frontmatter.date,
    keywords: frontmatter.tags.join(", "),
    inLanguage: "en",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: frontmatter.author },
    publisher: { "@id": ORGANIZATION_ID },
    // No `image`. The obvious value is the post's own OG card, but Next builds
    // that route with a content hash in the path
    // (/blog/<slug>/opengraph-image-yqks0s), so any URL written by hand here
    // points at a 404 and silently rots on the next content change. The card
    // still reaches crawlers as `og:image` from generateMetadata; a JSON-LD
    // `image` is optional for BlogPosting and a broken one is worse than none.
  };
}

export function breadcrumbSchema(
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${site.url}${crumb.path}`,
    })),
  };
}

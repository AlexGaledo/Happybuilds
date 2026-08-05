import type { MetadataRoute } from "next";
import { caseStudies, site } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";

/**
 * Generates /sitemap.xml for search engines.
 *
 * Two things worth knowing before editing:
 *
 * - **`lastModified` is only set where a real date exists.** It used to be
 *   `new Date()` on every entry, which told crawlers the whole site changed on
 *   every deploy; the reliable response to that is to stop trusting the field.
 *   Posts carry their frontmatter date, the blog index carries its newest
 *   post's, and the static marketing pages carry nothing at all — the field is
 *   optional, and an absent date beats an invented one.
 * - **Blog posts are listed individually.** They were previously missing, so
 *   the only route into an article was a link from /blog.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  // getAllPosts sorts newest-first, so the index is as fresh as posts[0].
  const newestPostDate = posts[0]?.frontmatter.date;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/services`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.8 },
    {
      url: `${site.url}/blog`,
      lastModified: newestPostDate ? new Date(newestPostDate) : undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    { url: `${site.url}/about`, changeFrequency: "yearly", priority: 0.5 },
    // Low priority while it is an honest empty state; raise it once the first
    // case study lands and the page has something to rank for.
    {
      url: `${site.url}/portfolio`,
      changeFrequency: "monthly",
      priority: caseStudies.length > 0 ? 0.7 : 0.3,
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified: new Date(post.frontmatter.date),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  const caseStudyRoutes: MetadataRoute.Sitemap = caseStudies.map(
    (caseStudy) => ({
      url: `${site.url}/portfolio/${caseStudy.slug}`,
      changeFrequency: "yearly",
      priority: 0.6,
    }),
  );

  return [...staticRoutes, ...postRoutes, ...caseStudyRoutes];
}

import type { MetadataRoute } from "next";
import { caseStudies, site } from "@/lib/site";

/**
 * Generates /sitemap.xml for search engines.
 * Combines our static marketing routes with the dynamic portfolio case-study
 * pages. (Dynamic /blog post slugs are added separately; we only list the
 * /blog index here.)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes = [
    "",
    "/services",
    "/about",
    "/portfolio",
    "/blog",
    "/contact",
  ].map((path) => ({
    url: `${site.url}${path}`,
    lastModified,
  }));

  const caseStudyRoutes = caseStudies.map((caseStudy) => ({
    url: `${site.url}/portfolio/${caseStudy.slug}`,
    lastModified,
  }));

  return [...staticRoutes, ...caseStudyRoutes];
}

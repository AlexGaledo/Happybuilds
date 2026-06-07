import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Generates /robots.txt. Allows all crawlers and points them at our sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}

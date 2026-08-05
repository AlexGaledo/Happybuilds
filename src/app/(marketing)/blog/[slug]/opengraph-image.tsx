import { ImageResponse } from "next/og";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";

/**
 * Per-article social card: the post's own title rather than the site-wide one.
 *
 * Shares the visual language of the root card (src/app/opengraph-image.tsx) —
 * same navy, same corner glows — so a link to an article and a link to the
 * home page read as the same site. Same satori constraints apply: flexbox
 * only, explicit `display: "flex"` on anything with multiple children.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "An article from the Fickles blog";

const NAVY = "#0A1930";
const CREAM = "#FDFCF7";
const CORAL = "#ff5c39";
const AMBER = "#f5b544";

/** Pre-render one card per post at build time, matching the page itself. */
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

// Deliberately no generateImageMetadata: one card per post needs no id, and
// the served path is Next's business either way — it builds this route with a
// content hash (/blog/<slug>/opengraph-image-<hash>), which is why nothing
// else in the codebase writes that URL by hand. Consumers get it from the
// `og:image` tag generateMetadata emits.

export default async function BlogPostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.frontmatter.title ?? "Notes from Fickles";

  // Long titles drop a step in size rather than overflowing the card.
  const titleSize = title.length > 58 ? 60 : 74;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: NAVY,
          padding: "72px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 580,
            height: 580,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${CORAL}4d 0%, ${CORAL}00 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${AMBER}3d 0%, ${AMBER}00 70%)`,
          }}
        />

        <div style={{ display: "flex", fontSize: 30, color: AMBER }}>
          From the Fickles blog
        </div>

        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            lineHeight: 1.1,
            letterSpacing: -2,
            color: CREAM,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", fontSize: 30, color: CREAM }}>
          fickles<span style={{ color: CORAL }}>.tech</span>
          <span style={{ color: "#93A4BE" }}>
            &nbsp;·&nbsp;{post?.readingTime ?? ""}
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

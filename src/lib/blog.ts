import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

/**
 * Server-only blog utilities.
 *
 * Reads local MDX articles from src/content/blog/*.mdx, parses their frontmatter
 * with gray-matter, and computes an estimated reading time. These functions use
 * the Node `fs`/`path` modules, so they must only run on the server (in Server
 * Components, generateStaticParams, generateMetadata, etc.) — never in the browser.
 */

/** Accent color name used to tint a post's cover, matching the brand Badge tones. */
export type CoverAccent = "coral" | "amber" | "mint" | "navy";

/** The typed shape of every blog post's frontmatter block. */
export interface PostFrontmatter {
  title: string;
  description: string;
  /** ISO date string, e.g. "2026-02-14". */
  date: string;
  author: string;
  tags: string[];
  cover: CoverAccent;
}

/** A post in list views: just the metadata, no rendered body. */
export interface PostSummary {
  slug: string;
  frontmatter: PostFrontmatter;
  /** Human-readable estimate, e.g. "4 min read". */
  readingTime: string;
}

/** A fully-loaded post, including the raw MDX body to render. */
export interface Post {
  frontmatter: PostFrontmatter;
  content: string;
  readingTime: string;
}

// Absolute path to the content folder. Resolved from the project root (cwd),
// which Next.js sets to the project directory during build and runtime.
const POSTS_DIRECTORY = path.join(process.cwd(), "src", "content", "blog");
const MDX_EXTENSION = ".mdx";

/**
 * Read and parse a single MDX file by its filename (e.g. "my-post.mdx").
 * Returns the slug, typed frontmatter, raw content, and reading time.
 * gray-matter returns `data` as `unknown`-ish, so we assert our known shape here
 * (the frontmatter in our own content files is trusted and consistent).
 */
function parsePostFile(fileName: string): {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
  readingTime: string;
} {
  const fullPath = path.join(POSTS_DIRECTORY, fileName);
  const rawFile = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(rawFile);

  return {
    slug: fileName.replace(MDX_EXTENSION, ""),
    frontmatter: data as PostFrontmatter,
    content,
    readingTime: readingTime(content).text,
  };
}

/** List every .mdx filename in the content directory. */
function getPostFileNames(): string[] {
  return fs
    .readdirSync(POSTS_DIRECTORY)
    .filter((fileName) => fileName.endsWith(MDX_EXTENSION));
}

/**
 * Return all posts as summaries, sorted newest-first by their `date`.
 * Used by the /blog index page.
 */
export function getAllPosts(): PostSummary[] {
  return getPostFileNames()
    .map((fileName) => {
      const { slug, frontmatter, readingTime } = parsePostFile(fileName);
      return { slug, frontmatter, readingTime };
    })
    .sort(
      // Newer dates first. Comparing timestamps keeps this independent of locale.
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime(),
    );
}

/**
 * Load one post by slug for the detail page, or `null` if the file is missing.
 * Returning null lets the caller decide how to handle a 404 (via notFound()).
 */
export function getPostBySlug(slug: string): Post | null {
  const fileName = `${slug}${MDX_EXTENSION}`;
  const fullPath = path.join(POSTS_DIRECTORY, fileName);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const { frontmatter, content, readingTime } = parsePostFile(fileName);
  return { frontmatter, content, readingTime };
}

/** Return just the slugs — handy for generateStaticParams. */
export function getAllSlugs(): string[] {
  return getPostFileNames().map((fileName) =>
    fileName.replace(MDX_EXTENSION, ""),
  );
}

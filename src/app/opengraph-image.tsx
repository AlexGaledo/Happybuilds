import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/**
 * The default social card for every route that doesn't define its own.
 *
 * Next picks this up by filename — no `openGraph.images` entry is needed in
 * any metadata export. Before it existed the site declared
 * `twitter.card: "summary_large_image"` with no image at all, so every share
 * on LinkedIn, X, Slack and iMessage rendered as a bare text link.
 *
 * Note the constraints of the satori renderer behind ImageResponse: flexbox
 * only (no grid), and every element with more than one child needs an explicit
 * `display: "flex"`. No fonts are fetched — a network call here would make the
 * build depend on a third party being up.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name} — ${site.tagline}`;

const NAVY = "#0A1930";
const CREAM = "#FDFCF7";
const CORAL = "#ff5c39";
const AMBER = "#f5b544";

export default function OpengraphImage() {
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
        {/* The same floaters as the hero, flattened — radial gradients stand in
            for the blur the renderer does not support. */}
        <div
          style={{
            position: "absolute",
            top: -160,
            left: -120,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${CORAL}55 0%, ${CORAL}00 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -140,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${AMBER}44 0%, ${AMBER}00 70%)`,
          }}
        />

        <div style={{ display: "flex", fontSize: 34, color: CREAM }}>
          fickles<span style={{ color: CORAL }}>.tech</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: CREAM,
          }}
        >
          <div style={{ fontSize: 78, lineHeight: 1.05, letterSpacing: -2 }}>
            Software that makes
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            work feel&nbsp;<span style={{ color: AMBER }}>lighter</span>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 28, color: "#93A4BE" }}>
          Automations · Internal tools · Websites · Custom software
        </div>
      </div>
    ),
    { ...size },
  );
}

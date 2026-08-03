import { expect, test, type Page } from "@playwright/test";
import { waitForTable } from "./helpers";

/**
 * Contrast audit.
 *
 * Walks every element that renders its own text, resolves the colour actually
 * painted behind it — compositing every translucent ancestor background in
 * order, which is the step eyeballing always gets wrong — and computes the WCAG
 * ratio. A token like `bg-navy-800/6` looks dark in the class name and paints
 * near-white; only the composite tells you which.
 *
 * Thresholds are WCAG AA: 4.5:1 for body text, 3:1 for large text
 * (>=24px, or >=18.66px bold).
 */

interface Violation {
  text: string;
  selector: string;
  color: string;
  background: string;
  ratio: number;
  required: number;
  fontSize: number;
}

const AUDIT = `(() => {
  const parseColor = (value) => {
    const m = value.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const parts = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    return { r, g, b, a };
  };

  // src over dst, both premultiplied-free straight alpha.
  const over = (src, dst) => {
    const a = src.a + dst.a * (1 - src.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (src.r * src.a + dst.r * dst.a * (1 - src.a)) / a,
      g: (src.g * src.a + dst.g * dst.a * (1 - src.a)) / a,
      b: (src.b * src.a + dst.b * dst.a * (1 - src.a)) / a,
      a,
    };
  };

  const luminance = ({ r, g, b }) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (a, b) => {
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  // Collect ancestor backgrounds outermost-first, then composite downwards so
  // a stack of translucent layers resolves the way the browser paints it.
  const effectiveBackground = (el) => {
    const layers = [];
    let node = el;
    while (node && node !== document.documentElement.parentElement) {
      const cs = getComputedStyle(node);
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0) layers.push(bg);
      if (bg && bg.a === 1) break;
      node = node.parentElement;
    }
    layers.push({ r: 255, g: 255, b: 255, a: 1 });
    let acc = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  };

  const hidden = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return true;
    if (parseFloat(cs.opacity) === 0) return true;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return true;
    // sr-only / inert / decorative previews are intentionally not read.
    if (el.closest("[inert]")) return true;
    // WCAG 1.4.3 exempts logotypes from the contrast minimum.
    if (el.closest("[data-brand-mark]")) return true;
    if (cs.clip === "rect(0px, 0px, 0px, 0px)") return true;
    let n = el;
    while (n) {
      const s = getComputedStyle(n);
      if (s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)") return true;
      n = n.parentElement;
    }
    return false;
  };

  const describe = (el) => {
    const id = el.getAttribute("data-testid");
    if (id) return "[data-testid=" + id + "]";
    const cls = (el.className && typeof el.className === "string")
      ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".")
      : "";
    return el.tagName.toLowerCase() + cls;
  };

  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    // Only elements holding their own text — otherwise a wrapper is blamed for
    // its child's colour.
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!own) continue;
    if (hidden(el)) continue;

    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    if (!fg || fg.a === 0) continue;

    const bg = effectiveBackground(el);
    const composited = over(fg, bg);
    const r = ratio(composited, bg);

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;

    if (r < required) {
      out.push({
        text: own.slice(0, 60),
        selector: describe(el),
        color: cs.color,
        background: "rgb(" + [bg.r, bg.g, bg.b].map(Math.round).join(",") + ")",
        ratio: Math.round(r * 100) / 100,
        required,
        fontSize: size,
      });
    }
  }
  return out;
})()`;

async function audit(page: Page): Promise<Violation[]> {
  return page.evaluate(AUDIT) as Promise<Violation[]>;
}

function report(label: string, violations: Violation[]): string {
  if (!violations.length) return "";
  const lines = violations.map(
    (v) =>
      `  ${v.ratio}:1 (needs ${v.required}) ${v.selector}` +
      `\n      "${v.text}"  ${v.color} on ${v.background} @ ${v.fontSize}px`,
  );
  return [`${label} — ${violations.length} contrast violation(s):`, ...lines].join("\n");
}

/**
 * Both colour schemes are audited.
 *
 * `prefers-color-scheme: dark` is the case that actually broke: Tailwind's
 * `dark:` variant was bound to the media query while the dark tokens lived on a
 * class nothing set, so dark-mode text colours applied over light surfaces —
 * near-white on near-white. Auditing only the light scheme, as the first pass
 * did, cannot see it. A device in dark mode is the common case, not the edge.
 */
const SCHEMES = ["light", "dark"] as const;

for (const scheme of SCHEMES) {
  test.describe(`prefers-color-scheme: ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test("leads table has no low-contrast text", async ({ page }) => {
      await page.goto("/dashboard/leads");
      await waitForTable(page);
      const v = await audit(page);
      expect(report(`leads (${scheme})`, v), report(`leads (${scheme})`, v)).toBe("");
    });

    test("overview has no low-contrast text", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("Total leads")).toBeVisible();
      const v = await audit(page);
      expect(report(`overview (${scheme})`, v), report(`overview (${scheme})`, v)).toBe("");
    });

    test("lead detail panel has no low-contrast text", async ({ page }) => {
      await page.goto("/dashboard/leads");
      await waitForTable(page);
      // Navigate by URL rather than clicking: the click races hydration, and
      // this test is auditing colour, not the click path — leads-table.spec
      // already covers that.
      const id = await page
        .getByTestId("lead-row")
        .first()
        .getAttribute("data-listing-id");
      await page.goto(`/dashboard/leads?selected=${id}`);
      await expect(page.getByTestId("lead-detail")).toBeVisible();
      const v = await audit(page);
      expect(report(`detail (${scheme})`, v), report(`detail (${scheme})`, v)).toBe("");
    });

    test("locked pages have no low-contrast text outside the inert preview", async ({
      page,
    }) => {
      for (const path of ["/dashboard/outreach", "/dashboard/assistant"]) {
        await page.goto(path);
        await expect(page.getByTestId("locked-notice")).toBeVisible();
        const v = await audit(page);
        expect(report(`${path} (${scheme})`, v), report(`${path} (${scheme})`, v)).toBe("");
      }
    });

    test("marketing pages have no low-contrast text", async ({ page }) => {
      for (const path of ["/", "/services", "/contact"]) {
        await page.goto(path);
        await expect(page.locator("footer")).toBeVisible();
        const v = await audit(page);
        expect(report(`${path} (${scheme})`, v), report(`${path} (${scheme})`, v)).toBe("");
      }
    });
  });
}

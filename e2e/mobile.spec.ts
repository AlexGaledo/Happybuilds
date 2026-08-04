import { expect, test } from "@playwright/test";

/**
 * Mobile regression guard.
 *
 * Catches the two things a build cannot: the page body scrolling sideways, and
 * touch targets under 44px. Both were real on every dashboard surface before
 * the responsive pass, and both are the kind of thing a later layout tweak
 * reintroduces silently.
 *
 * Runs at portrait *and* landscape. Landscape matters more than it sounds: a
 * landscape phone is 812px wide, so any sizing gated on a width breakpoint
 * (`sm:`) quietly reverts to desktop density on a device still being operated
 * with a thumb. Touch sizing is therefore gated on `pointer-fine:`, and the
 * pointer assertion below is what stops that regressing back to a width query.
 */

const ROUTES = [
  "/dashboard",
  "/dashboard/pipeline",
  "/dashboard/drafts",
  "/dashboard/templates",
  "/dashboard/configuration",
  "/dashboard/leads",
];

const VIEWPORTS = [
  { name: "portrait", width: 375, height: 812 },
  { name: "landscape", width: 812, height: 375 },
];

// An element laid out at exactly 44px reports 43.996875.
const MIN_TARGET = 43.5;

test.use({ hasTouch: true, isMobile: true });

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} ${vp.width}x${vp.height}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
    });

    test("emulated device reports a coarse pointer", async ({ page }) => {
      await page.goto("/dashboard");
      // Without this the touch-target test below proves nothing: a fine-pointer
      // context would apply the compact `pointer-fine:` sizing and pass.
      expect(
        await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
      ).toBe(true);
    });

    for (const route of ROUTES) {
      test(`${route} does not scroll sideways`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(() => {
          const d = document.documentElement;
          return d.scrollWidth - d.clientWidth;
        });
        expect(overflow).toBeLessThanOrEqual(1);
      });

      test(`${route} has no undersized touch targets`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" });
        const small = await page.evaluate((min) => {
          const sel =
            "button, a[href], input[type=checkbox], select, [role=button]";
          return [...document.querySelectorAll(sel)]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) return false;
              const s = getComputedStyle(el);
              if (s.visibility === "hidden" || s.display === "none") return false;
              // Sized only when focused.
              if (el.classList.contains("sr-only")) return false;
              // WCAG 2.5.8 exempts links inline in a block of text.
              if (el.tagName === "A" && el.closest("p")) return false;
              // A small input inside a padded label is fine — the label is the
              // target, which is how the checkboxes are built.
              const label = el.closest("label");
              if (el.tagName === "INPUT" && label) {
                const lr = label.getBoundingClientRect();
                if (lr.height >= min && lr.width >= min) return false;
              }
              return r.height < min || r.width < min;
            })
            .slice(0, 8)
            .map((el) => {
              const r = el.getBoundingClientRect();
              const name =
                el.getAttribute("aria-label") ||
                el.textContent?.trim().slice(0, 30) ||
                el.tagName;
              return `${name} (${Math.round(r.width)}x${Math.round(r.height)})`;
            });
        }, MIN_TARGET);

        expect(small, `undersized targets on ${route}`).toEqual([]);
      });
    }
  });
}

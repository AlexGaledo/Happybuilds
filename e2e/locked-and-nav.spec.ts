import { expect, test } from "@playwright/test";

/**
 * Navigation, the two locked sections, and the accessibility affordances the
 * dashboard promises.
 *
 * "Locked" has to mean genuinely inert, not merely blurred — a keyboard user
 * must not be able to tab into a preview that does nothing.
 */

test("sidebar marks the current section and flags the locked ones", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByTestId("nav-overview")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("nav-leads")).not.toHaveAttribute("aria-current", "page");

  // Locked destinations stay visible and say so, rather than being hidden.
  await expect(page.getByTestId("nav-outreach")).toContainText("Locked");
  await expect(page.getByTestId("nav-assistant")).toContainText("Locked");

  await page.getByTestId("nav-leads").click();
  await expect(page).toHaveURL(/\/dashboard\/leads/);
  await expect(page.getByTestId("nav-leads")).toHaveAttribute("aria-current", "page");
});

for (const section of [
  {
    path: "/dashboard/outreach",
    heading: "Outreach",
    lockTitle: "Outreach is locked",
  },
  {
    path: "/dashboard/assistant",
    heading: "AI Assistant",
    lockTitle: "The assistant is locked",
  },
]) {
  test(`${section.heading} is locked and its preview is inert`, async ({ page }) => {
    await page.goto(section.path);

    await expect(page.getByRole("heading", { name: section.heading, level: 1 })).toBeVisible();

    const notice = page.getByTestId("locked-notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(section.lockTitle);
    await expect(notice).toContainText("Needed to unlock");

    // The preview must be hidden from assistive tech and non-interactive.
    const preview = page.locator("[inert]");
    await expect(preview).toHaveCount(1);
    await expect(preview).toHaveAttribute("aria-hidden", "true");

    // Tabbing through the page must never land inside the preview. This is the
    // assertion that separates "inert" from "merely blurred".
    await page.locator("body").click({ position: { x: 2, y: 2 } });
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const insidePreview = await page.evaluate(
        () => document.activeElement?.closest("[inert]") !== null &&
          document.activeElement?.closest("[inert]") !== undefined,
      );
      expect(insidePreview, `focus landed inside the locked preview on tab ${i + 1}`)
        .toBeFalsy();
    }
  });
}

test("locked sections make no API calls of their own", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) apiCalls.push(req.url());
  });

  await page.goto("/dashboard/outreach");
  await page.goto("/dashboard/assistant");
  await page.waitForLoadState("networkidle");

  expect(apiCalls).toEqual([]);
});

test("dashboard exposes a skip link and a focusable main region", async ({ page }) => {
  await page.goto("/dashboard");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();

  await skip.click();
  await expect(page.locator("#dashboard-main")).toBeVisible();
});

test("dashboard is excluded from search indexing", async ({ page }) => {
  const response = await page.goto("/dashboard");
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("marketing chrome does not leak into the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  // The public navbar's CTA and the marketing footer must not be present.
  await expect(page.getByRole("link", { name: "Work", exact: true })).toHaveCount(0);
  await expect(page.locator("footer")).toHaveCount(0);
});

test("marketing pages still render after the route-group split", async ({ page }) => {
  // The split moved every public page under (marketing) and relocated the
  // navbar/footer out of the root layout; this checks that chrome survived.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.getByRole("link", { name: "Services" }).first()).toBeVisible();

  const services = await page.goto("/services");
  expect(services?.ok()).toBeTruthy();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.getByRole("navigation").first()).toBeVisible();
});

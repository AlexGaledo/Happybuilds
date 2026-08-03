import { expect, test } from "@playwright/test";
import { apiContext, apiJson, waitForTable } from "./helpers";

/**
 * Captures reference screenshots of each dashboard surface.
 *
 * Not assertions — these are for reviewing the design. Tagged so the wiring
 * suite can run without them: `playwright test --grep-invert @screenshot`.
 */

const DIR = "screenshots";

test.describe("@screenshot", () => {
  test("desktop surfaces", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/01-overview.png`, fullPage: true });

    await page.goto("/dashboard/leads");
    await waitForTable(page);
    await page.screenshot({ path: `${DIR}/02-leads.png`, fullPage: true });

    const api = await apiContext();
    const first = await apiJson<{ items: { id: string }[] }>(
      api,
      "/listings?limit=1",
    );
    await api.dispose();
    await page.goto(`/dashboard/leads?selected=${first.items[0].id}&hours=24`);
    await waitForTable(page);
    await page.screenshot({ path: `${DIR}/03-leads-detail.png`, fullPage: true });

    await page.goto("/dashboard/outreach");
    await expect(page.getByTestId("locked-notice")).toBeVisible();
    await page.screenshot({ path: `${DIR}/04-outreach-locked.png`, fullPage: true });

    await page.goto("/dashboard/assistant");
    await expect(page.getByTestId("locked-notice")).toBeVisible();
    await page.screenshot({ path: `${DIR}/05-assistant-locked.png`, fullPage: true });
  });

  test("mobile surfaces", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/06-overview-mobile.png`, fullPage: true });

    await page.goto("/dashboard/leads");
    await waitForTable(page);
    await page.screenshot({ path: `${DIR}/07-leads-mobile.png`, fullPage: true });

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `${DIR}/08-nav-drawer-mobile.png` });
  });
});

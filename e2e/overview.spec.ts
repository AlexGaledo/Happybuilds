import { expect, test, type APIRequestContext } from "@playwright/test";
import { apiContext, apiJson } from "./helpers";

/**
 * Overview wiring.
 *
 * Every assertion compares what the page rendered against a direct call to the
 * API, so a stat card showing a plausible-but-wrong number fails the test.
 */

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await apiContext();
});

test.afterAll(async () => {
  await api.dispose();
});

interface Stats {
  total: number;
  with_description: number;
  pending_detail: number;
  posted_last_24h: number;
  newest_posted_at: string | null;
}

test("renders the headline stats straight from /listings/stats", async ({ page }) => {
  const stats = await apiJson<Stats>(api, "/listings/stats");

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();

  // Totals are formatted with thousands separators, so compare on that form.
  const totalCard = page.locator("div", { hasText: /^Total leads$/ }).first();
  await expect(totalCard).toBeVisible();

  await expect(page.getByText(stats.total.toLocaleString("en-US"), { exact: true }).first())
    .toBeVisible();
  await expect(
    page.getByText(stats.posted_last_24h.toLocaleString("en-US"), { exact: true }).first(),
  ).toBeVisible();

  // Description coverage is derived in the UI; recompute it here rather than
  // trusting the rendered value.
  const coverage = Math.round((stats.with_description / stats.total) * 100);
  await expect(page.getByText(`${coverage}%`, { exact: true })).toBeVisible();
  await expect(
    page.getByText(`${stats.with_description} enriched`, { exact: false }),
  ).toBeVisible();
});

test("activity chart matches the histogram endpoint", async ({ page }) => {
  const histogram = await apiJson<{ hours: number; buckets: { count: number }[] }>(
    api,
    "/listings/histogram?hours=48",
  );
  const total = histogram.buckets.reduce((sum, b) => sum + b.count, 0);

  await page.goto("/dashboard");

  const figure = page.locator("figure").first();
  await expect(figure).toContainText(`${total} posts`);
  await expect(figure).toContainText("Posts per hour");
  // The accessible equivalent of the chart must exist, not just the SVG.
  await expect(figure.locator("table caption")).toContainText(
    "Job postings per hour",
  );
  // One row per hour, gaps included.
  await expect(figure.locator("table tbody tr")).toHaveCount(48);
});

test("top categories match /listings/facets and deep-link into the table", async ({
  page,
}) => {
  const facets = await apiJson<{ categories: { value: string; count: number }[] }>(
    api,
    "/listings/facets",
  );
  test.skip(facets.categories.length === 0, "no categories stored");
  const top = facets.categories[0];

  await page.goto("/dashboard");

  // Scoped to the category panel: category names are ordinary words, so an
  // unscoped link lookup also matches job titles in the Recent leads panel and
  // navigates to ?selected= instead of ?category=.
  const link = page
    .getByTestId("category-breakdown")
    .getByRole("link", { name: new RegExp(escapeRe(top.value)) })
    .first();
  await expect(link).toBeVisible();
  await link.click();

  await expect(page).toHaveURL(new RegExp(`category=${encodeURIComponent(top.value).replace(/%/g, "%")}`));
  await expect(page.getByTestId("result-count")).toContainText(
    top.count.toLocaleString("en-US"),
  );
});

test("latest leads panel shows the same rows the API returns", async ({ page }) => {
  const listing = await apiJson<{ items: { id: string; title: string }[] }>(
    api,
    "/listings?limit=6&offset=0",
  );
  test.skip(listing.items.length === 0, "no listings stored");

  await page.goto("/dashboard");
  for (const item of listing.items) {
    await expect(page.getByRole("link", { name: new RegExp(escapeRe(item.title)) }).first())
      .toBeVisible();
  }
});

test("scrape panel reflects live lock state without triggering a run", async ({
  page,
  request,
}) => {
  // Read-only: the proxy's GET is safe, POST would start a ~36 minute scrape.
  const res = await request.get("/api/dashboard/scrape");
  expect(res.ok()).toBeTruthy();
  const status = await res.json();
  expect(status).toHaveProperty("running");
  expect(status).toHaveProperty("last_run");

  await page.goto("/dashboard");
  const trigger = page.getByTestId("scrape-trigger");
  await expect(trigger).toBeVisible();

  if (status.running) {
    // While the cron job holds the Redis lock the button must be unavailable.
    await expect(trigger).toBeDisabled();
    await expect(trigger).toContainText("Scrape in progress");
  } else {
    await expect(trigger).toBeEnabled();
    await expect(trigger).toContainText("Run scrape now");
  }
});

test("explains why client and email are empty", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByText("Client and email are empty by design"),
  ).toBeVisible();
});

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

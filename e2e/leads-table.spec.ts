import { expect, test, type APIRequestContext } from "@playwright/test";
import { apiContext, apiJson, reportedTotal, rows, waitForTable } from "./helpers";

/**
 * The leads table — the piece the goal calls out as "tables are properly
 * loaded". Each test drives the UI and then checks the result against a direct
 * API query for the same filter, so a filter that silently doesn't reach the
 * backend fails rather than quietly returning everything.
 */

let api: APIRequestContext;

interface Page_<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}
interface Row {
  id: string;
  title: string;
  job_type: string | null;
  category: string | null;
  posted_at: string;
}

test.beforeAll(async () => {
  api = await apiContext();
});
test.afterAll(async () => {
  await api.dispose();
});

test("loads the first page with the same rows and total as the API", async ({ page }) => {
  const expected = await apiJson<Page_<Row>>(api, "/listings?limit=25&offset=0");

  await page.goto("/dashboard/leads");
  await waitForTable(page);

  await expect(rows(page)).toHaveCount(Math.min(expected.limit, expected.total));
  expect(await reportedTotal(page)).toBe(expected.total);

  // Row order and identity, not just the count.
  const renderedIds = await rows(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );
  expect(renderedIds).toEqual(expected.items.map((i) => i.id));

  // Scoped to the first row's title cell — the "open source" cell also carries
  // the title in its accessible name.
  await expect(rows(page).first().getByTestId("lead-row-link")).toContainText(
    expected.items[0].title,
  );
});

test("job type filter reaches the API", async ({ page }) => {
  const facets = await apiJson<{ job_types: { value: string; count: number }[] }>(
    api,
    "/listings/facets",
  );
  test.skip(facets.job_types.length === 0, "no job types stored");
  const target = facets.job_types[0];

  await page.goto("/dashboard/leads");
  await waitForTable(page);

  await page.getByTestId("filter-job-type").selectOption(target.value);
  await expect(page).toHaveURL(/job_type=/);
  await waitForTable(page);

  expect(await reportedTotal(page)).toBe(target.count);

  // Every visible row really carries that job type.
  const ids = await rows(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );
  const server = await apiJson<Page_<Row>>(
    api,
    `/listings?limit=25&offset=0&job_type=${encodeURIComponent(target.value)}`,
  );
  expect(ids).toEqual(server.items.map((i) => i.id));
  expect(server.items.every((i) => i.job_type === target.value)).toBeTruthy();
});

test("time-window filter narrows the result set", async ({ page }) => {
  const all = await apiJson<Page_<Row>>(api, "/listings?limit=1");
  const window12 = await apiJson<Page_<Row>>(api, "/listings?limit=1&hours=12");

  await page.goto("/dashboard/leads");
  await waitForTable(page);
  expect(await reportedTotal(page)).toBe(all.total);

  await page.getByTestId("filter-hours").selectOption("12");
  await expect(page).toHaveURL(/hours=12/);
  await waitForTable(page);

  expect(await reportedTotal(page)).toBe(window12.total);
  expect(window12.total).toBeLessThanOrEqual(all.total);
});

test("search is debounced, lands in the URL, and filters server-side", async ({ page }) => {
  const seed = await apiJson<Page_<Row>>(api, "/listings?limit=1");
  test.skip(seed.total === 0, "no listings stored");

  // A word from a real title, so the query is guaranteed to match something.
  const term =
    seed.items[0].title.split(/\s+/).find((w) => /^[a-z]{5,}$/i.test(w)) ?? "manager";
  const expected = await apiJson<Page_<Row>>(
    api,
    `/listings?limit=25&offset=0&q=${encodeURIComponent(term)}`,
  );

  await page.goto("/dashboard/leads");
  await waitForTable(page);

  await page.getByTestId("filter-search").fill(term);
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(term)}`), {
    timeout: 5_000,
  });
  await waitForTable(page);

  expect(await reportedTotal(page)).toBe(expected.total);
  expect(expected.total).toBeGreaterThan(0);
});

test("clear resets every filter", async ({ page }) => {
  const all = await apiJson<Page_<Row>>(api, "/listings?limit=1");

  await page.goto("/dashboard/leads?hours=12&q=assistant");
  await waitForTable(page);
  await expect(page.getByTestId("filter-clear")).toBeVisible();

  await page.getByTestId("filter-clear").click();
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
  await waitForTable(page);

  expect(await reportedTotal(page)).toBe(all.total);
  await expect(page.getByTestId("filter-search")).toHaveValue("");
});

test("has-email filter is honoured even though nothing has an email", async ({ page }) => {
  // onlinejobs.ph hides contact details from anonymous visitors, so this is
  // expected to be an empty result — the point is that the filter reaches the
  // API and the empty state explains itself instead of looking broken.
  const withEmail = await apiJson<Page_<Row>>(api, "/listings?limit=1&has_email=true");

  await page.goto("/dashboard/leads");
  await waitForTable(page);
  await page.getByTestId("filter-has-email").check();
  await expect(page).toHaveURL(/has_email=true/);
  await waitForTable(page);

  expect(await reportedTotal(page)).toBe(withEmail.total);
  if (withEmail.total === 0) {
    await expect(page.getByText("No leads match these filters")).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  }
});

test("pagination walks offsets and matches the API page for page", async ({ page }) => {
  const first = await apiJson<Page_<Row>>(api, "/listings?limit=25&offset=0");
  test.skip(first.total <= 25, "not enough rows to paginate");
  const second = await apiJson<Page_<Row>>(api, "/listings?limit=25&offset=25");

  await page.goto("/dashboard/leads");
  await waitForTable(page);

  await page.getByTestId("page-next").click();
  await expect(page).toHaveURL(/offset=25/);
  await waitForTable(page);

  const ids = await rows(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );
  expect(ids).toEqual(second.items.map((i) => i.id));
  // Page 2 must not repeat page 1 — the id tiebreaker in the query exists
  // precisely to prevent that when timestamps collide.
  expect(ids.some((id) => first.items.some((i) => i.id === id))).toBeFalsy();

  await page.getByTestId("page-prev").click();
  await waitForTable(page);
  await expect(page).not.toHaveURL(/offset=25/);
});

test("sorting changes the query, the order, and aria-sort", async ({ page }) => {
  await page.goto("/dashboard/leads");
  await waitForTable(page);

  const postedHeader = page.getByRole("columnheader", { name: /Posted/ });
  await expect(postedHeader).toHaveAttribute("aria-sort", "descending");

  await page.getByTestId("sort-title").click();
  await expect(page).toHaveURL(/sort=title/);
  await waitForTable(page);

  const titleHeader = page.getByRole("columnheader", { name: /Role/ });
  await expect(titleHeader).toHaveAttribute("aria-sort", "descending");

  const expectedDesc = await apiJson<Page_<Row>>(
    api,
    "/listings?limit=25&offset=0&sort=title&order=desc",
  );
  const idsDesc = await rows(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );
  expect(idsDesc).toEqual(expectedDesc.items.map((i) => i.id));

  // Clicking the active column reverses it.
  await page.getByTestId("sort-title").click();
  await expect(page).toHaveURL(/order=asc/);
  await waitForTable(page);
  await expect(titleHeader).toHaveAttribute("aria-sort", "ascending");

  const expectedAsc = await apiJson<Page_<Row>>(
    api,
    "/listings?limit=25&offset=0&sort=title&order=asc",
  );
  const idsAsc = await rows(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-listing-id")),
  );
  expect(idsAsc).toEqual(expectedAsc.items.map((i) => i.id));
  expect(idsAsc).not.toEqual(idsDesc);
});

test("page size links change the number of rows", async ({ page }) => {
  const total = (await apiJson<Page_<Row>>(api, "/listings?limit=1")).total;
  test.skip(total <= 25, "not enough rows");

  await page.goto("/dashboard/leads");
  await waitForTable(page);
  await expect(rows(page)).toHaveCount(25);

  await page.getByRole("link", { name: "50", exact: true }).click();
  await expect(page).toHaveURL(/limit=50/);
  await waitForTable(page);
  await expect(rows(page)).toHaveCount(Math.min(50, total));
});

test("selecting a row opens its detail panel and closing restores the table", async ({
  page,
}) => {
  const first = await apiJson<Page_<Row & { url: string; external_id: string }>>(
    api,
    "/listings?limit=25&offset=0",
  );
  test.skip(first.total === 0, "no listings stored");
  const target = first.items[0];

  await page.goto("/dashboard/leads");
  await waitForTable(page);

  await rows(page).first().getByTestId("lead-row-link").click();
  await expect(page).toHaveURL(new RegExp(`selected=${target.id}`));

  const detail = page.getByTestId("lead-detail");
  await expect(detail).toBeVisible();
  await expect(detail.getByRole("heading", { level: 2 })).toHaveText(target.title);
  await expect(detail.getByRole("link", { name: /Open original post/ })).toHaveAttribute(
    "href",
    target.url,
  );
  await expect(detail).toContainText(target.external_id);

  await page.getByTestId("lead-detail-close").click();
  await expect(page).not.toHaveURL(/selected=/);
  await expect(page.getByTestId("lead-detail")).toHaveCount(0);
  await waitForTable(page);
  await expect(rows(page)).toHaveCount(Math.min(25, first.total));
});

test("filters survive a reload and are shareable", async ({ page }) => {
  await page.goto("/dashboard/leads?hours=24&sort=title&order=asc&limit=50");
  await waitForTable(page);

  const before = await reportedTotal(page);
  await expect(page.getByRole("columnheader", { name: /Role/ })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );

  await page.reload();
  await waitForTable(page);

  expect(await reportedTotal(page)).toBe(before);
  await expect(page.getByTestId("filter-hours")).toHaveValue("24");
  await expect(page.getByRole("columnheader", { name: /Role/ })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
});

test("a stale selected id reports itself instead of rendering nothing", async ({ page }) => {
  await page.goto("/dashboard/leads?selected=00000000-0000-0000-0000-000000000000");
  await waitForTable(page);

  await expect(page.getByText("Lead not found")).toBeVisible();
  // The table is still usable behind the message.
  await expect(rows(page).first()).toBeVisible();
});

test("renders as cards on a phone, with no horizontal page scroll", async ({ page }) => {
  const expected = await apiJson<Page_<Row>>(api, "/listings?limit=25&offset=0");
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/dashboard/leads");
  await waitForTable(page);

  const cards = page.getByTestId("lead-card");
  await expect(cards).toHaveCount(Math.min(25, expected.total));
  await expect(cards.first()).toBeVisible();
  // The table exists in the DOM but must be hidden at this width.
  await expect(page.getByTestId("lead-row").first()).toBeHidden();

  // The body must never scroll sideways; only a bounded container may.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflows).toBeFalsy();
});

test("out-of-range filter values are clamped, not forwarded", async ({ page }) => {
  // 9999 exceeds the API's `hours` ceiling of 720; the UI must clamp rather
  // than hand the backend a value it will reject with a 422.
  await page.goto("/dashboard/leads?hours=9999&limit=9999");
  await waitForTable(page);
  await expect(page.getByTestId("result-count")).toBeVisible();
  await expect(rows(page).first()).toBeVisible();
});

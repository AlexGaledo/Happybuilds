import { expect, request, type APIRequestContext, type Page } from "@playwright/test";

export const API_BASE =
  process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000/api/v1";

/** Direct client for the lead API, so assertions compare the UI against the
 * same source of truth the server rendered from. */
export async function apiContext(): Promise<APIRequestContext> {
  return request.newContext();
}

export async function apiJson<T>(api: APIRequestContext, path: string): Promise<T> {
  // Absolute URL rather than a `baseURL` + relative path: a leading slash
  // resets the path, which would silently drop the `/api/v1` prefix.
  const url = `${API_BASE}${path}`;
  const res = await api.get(url);
  expect(res.ok(), `GET ${url} → ${res.status()}`).toBeTruthy();
  return (await res.json()) as T;
}

/**
 * Wait for the table to reflect the current URL.
 *
 * Filter changes are client-side navigations, so the row markup is replaced
 * without a load event. Asserting on the URL alone would pass while the old
 * rows were still on screen.
 */
export async function waitForTable(page: Page): Promise<void> {
  await expect(page.getByTestId("result-count")).toBeVisible();
  await expect(page.getByTestId("result-count")).not.toContainText("Updating");
}

/** Row count currently rendered. */
export function rows(page: Page) {
  return page.getByTestId("lead-row");
}

/** The count the filter bar reports, parsed out of "1,234 leads match". */
export async function reportedTotal(page: Page): Promise<number> {
  const text = (await page.getByTestId("result-count").textContent()) ?? "";
  const match = text.replace(/,/g, "").match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
}

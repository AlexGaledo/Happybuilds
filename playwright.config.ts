import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end wiring tests for the dashboard.
 *
 * These run against a real Next production server talking to a real lead API —
 * no mocked routes and no fixtures. The point is to prove the wiring holds all
 * the way through: URL → server component → API query → rendered table. A test
 * suite built on stubbed responses would keep passing after the API contract
 * changed underneath it, which is exactly the failure worth catching.
 *
 * The API is reached at `API_BASE`. Locally that's an SSH tunnel to the VPS:
 *
 *   ssh -N -L 8000:127.0.0.1:8000 crm-agency
 *
 * The tests are read-only. Nothing here triggers a scrape or mutates a row.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const API_BASE = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000/api/v1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The API address is handed to tests so they can assert the UI against the
    // same source of truth the server rendered from.
    extraHTTPHeaders: { Accept: "application/json, text/html" },
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    // `next start`, not `next dev`: dev-mode compilation makes the first
    // navigation to each route slow enough to look like a broken page.
    command: `pnpm start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { API_INTERNAL_URL: API_BASE },
  },
});

export { API_BASE };

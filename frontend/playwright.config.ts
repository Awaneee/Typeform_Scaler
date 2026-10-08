import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests. Each test is named after an item in corefeatures.md.
 * Needs the backend on :8000 and the frontend on :3000 (both reused if already running).
 * Uses the locally installed Chrome, so no browser download is needed.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // tests share one SQLite database
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: [
    {
      command: "cd ../backend && .venv\\Scripts\\python -m uvicorn app.main:app --port 8000",
      url: "http://127.0.0.1:8000/api/v1/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000/workspace",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});

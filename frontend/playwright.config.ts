import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests. Each test is named after an item in docs/REQUIREMENTS.md.
 * Needs the backend on :8000 and the frontend on :3000 (both started here, or reused if already running).
 * Locally it uses the installed Chrome; CI uses Playwright's bundled Chromium (E2E_BROWSER_CHANNEL="").
 */
const isWindows = process.platform === "win32";
const python = isWindows ? ".venv\\Scripts\\python" : ".venv/bin/python";
const channel = process.env.E2E_BROWSER_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // tests share one SQLite database
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ...(channel ? { channel } : {}),
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: [
    {
      command: `${python} -m uvicorn app.main:app --port 8000`,
      cwd: "../backend",
      url: "http://127.0.0.1:8000/api/v1/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: process.env.CI ? "npm run start" : "npm run dev",
      url: "http://localhost:3000/workspace",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});

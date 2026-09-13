import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,   // เดิม true
  workers: 1,             // บังคับรันทีละ test กันชนกัน
  expect: { timeout: 8000 },  // เดิมใช้ default 5000ms
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],

  // Both the client dev server AND the backend API must be running for the
  // e2e specs to work — Login/Logout/Change Password all make real
  // POST /api/auth/... calls to http://localhost:3000. Playwright starts
  // (or reuses) both automatically so `npx playwright test` is self-contained.
  webServer: [
    {
      command: "npm run dev -- --host 0.0.0.0",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      cwd: "../server",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});

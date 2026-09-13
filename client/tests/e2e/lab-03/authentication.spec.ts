import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, "../../../../server");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

// All seeded accounts share the fake local-dev password documented in
// server/prisma/seed.ts and README.md. Never a real credential.
const SEED_PASSWORD = "ChangeMe123!";

// jennifer.anderson@tiktockit.com is the only seeded account that does NOT
// require a password change, so it's the stable account for tests that
// don't specifically exercise the Change Password flow.
const ADMIN_EMAIL = "jennifer.anderson@tiktockit.com";

// ethan@example.com is a seeded active Requester with mustChangePassword
// still true. The password-change test restores the seed password at the
// end so the spec can be re-run without a database reset.
const MUST_CHANGE_EMAIL = "ethan@example.com";

test.describe("Login", () => {
  test("E2E-01: rejects invalid credentials with a safe error message", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /sign in to your account/i })
    ).toBeVisible();

    await page.getByLabel(/email address/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^password$/i).fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("E2E-01: logs in a user who has already changed their password", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByLabel(/email address/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Administrator lands straight in the app shell (no forced password
    // change) and sees their name + role in the header.
    await expect(page.getByTestId("current-user-identity")).toContainText(
      "Jennifer Anderson"
    );
    await expect(page.getByTestId("current-user-identity")).toContainText(
      "Administrator"
    );
  });
});

test.describe("Mandatory first-login password change", () => {
  test("E2E-02: normal app screens stay unavailable until a valid password change is saved", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByLabel(/email address/i).fill(MUST_CHANGE_EMAIL);
    await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(
      page.getByRole("heading", { name: /change your password/i })
    ).toBeVisible();

    // The rest of the app is not reachable while this screen is showing.
    await expect(
      page.getByRole("heading", { name: /sign in to your account/i })
    ).toHaveCount(0);

    const newPassword = "E2ETempStr0ng!";

    await page.getByLabel(/current \(temporary\) password/i).fill(SEED_PASSWORD);
    await page.getByLabel(/^new password$/i).fill(newPassword);
    await page.getByLabel(/confirm new password/i).fill(newPassword);
    await page.getByRole("button", { name: /continue/i }).click();

    // Change Password screen is gone; the app shell is now reachable.
    await expect(
      page.getByRole("heading", { name: /change your password/i })
    ).toHaveCount(0);
    await expect(page.getByTestId("current-user-identity")).toContainText(
      "Ethan Hunt"
    );
    // Password restoration to the seed value happens in afterAll below.
  });

  test.afterAll(async ({ request }) => {
    // Best-effort: restore the password value via the API first, in case
    // something else in this describe block is still relying on it mid-run.
    const apiBaseURL = process.env.VITE_API_URL ?? "http://localhost:3000";

    const loginResponse = await request.post(`${apiBaseURL}/api/auth/login`, {
      data: { email: MUST_CHANGE_EMAIL, password: "E2ETempStr0ng!" },
    });

    if (loginResponse.ok()) {
      await request.post(`${apiBaseURL}/api/auth/change-password`, {
        data: {
          currentPassword: "E2ETempStr0ng!",
          newPassword: SEED_PASSWORD,
        },
      });
    }

    // The API call above can restore the PASSWORD, but
    // POST /api/auth/change-password always clears mustChangePassword on
    // success (correct product behavior, per BR-02) — there is no Issue 3
    // endpoint that can set it back to true. So a plain API-based restore
    // leaves Ethan permanently past the "must change password" gate.
    //
    // That's invisible when this spec runs once, but this project config
    // runs the SAME describe block back-to-back for chromium/tablet/mobile
    // against the same shared database. Without a real reseed here, the
    // chromium run's cleanup silently breaks the tablet and mobile runs
    // that follow, even though each one looks self-contained in isolation.
    // Re-running the actual seed script is the only way to fully restore
    // the documented baseline (password AND mustChangePassword) for every
    // account, not just Ethan's.
    execFileSync(npmCommand, ["run", "prisma:seed"], {
      cwd: serverDir,
      stdio: "inherit",
    });
  });
});

test.describe("Logout", () => {
  test("E2E-03/FR-02: logging out returns to Login and blocks direct access", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByLabel(/email address/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByTestId("current-user-identity")).toBeVisible();

    await page
      .getByTestId("current-user-identity")
      .getByRole("button", { name: /logout/i })
      .click();

    await expect(
      page.getByRole("heading", { name: /sign in to your account/i })
    ).toBeVisible();

    // Reloading (simulating direct navigation back into the app) must not
    // reveal any authenticated content — the session cookie was destroyed
    // server-side, so it lands back on Login.
    await page.reload();

    await expect(
      page.getByRole("heading", { name: /sign in to your account/i })
    ).toBeVisible();
  });
});

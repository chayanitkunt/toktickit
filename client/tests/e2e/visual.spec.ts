import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { loginAsRequester, REQUESTER_A } from "./helpers/auth";

// Issue 8 — Lab 3 seeded IT Staff / Administrator accounts used for the
// staff-queue / staff-ticket-detail / user-management screenshots below.
// Same fake local-dev password as every other seeded account (never a real
// credential) — see server/prisma/seed.ts.
const SEED_PASSWORD = "ChangeMe123!";
const STAFF_EMAIL = "michael.brown@tiktockit.com"; // mustChangePassword: false
const ADMIN_EMAIL = "jennifer.anderson@tiktockit.com"; // mustChangePassword: false

async function loginAsStaffOrAdmin(page: Page, email: string) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /sign in to your account/i })
  ).toBeVisible();

  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsRoot = path.resolve(
  __dirname,
  "../../../artifacts/lab-03/screenshots"
);

function screenshotPath(
  screen: string,
  name: string,
  projectName: string
) {
  const dir = path.join(screenshotsRoot, screen);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return path.join(dir, `${name}-${projectName}.png`);
}

async function waitForSpinnerToClear(page: Page) {
  // Wait out any spinner element or text loading indicator
  await expect(page.locator(".spinner-border")).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.getByText("Loading ticket form...")).toHaveCount(0, {
    timeout: 10_000,
  });
}

test.describe("Visual QA screenshots", () => {
  // Issue 4: the Development Requester selector is gone, so the entry-point
  // screenshot is now the real Login screen instead.
  test("Login screen", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /sign in to your account/i })
    ).toBeVisible();

    await page.screenshot({
      path: screenshotPath("authentication", "login", testInfo.project.name),
      fullPage: true,
    });
  });

  test("My Tickets screen", async ({ page }, testInfo) => {
    await loginAsRequester(page, REQUESTER_A.email);

    // Issue: this used to just log in and screenshot whatever was already
    // in Quinn's list. That only worked by accident, because other e2e
    // specs running earlier in the same suite happened to have created
    // tickets under this account first. Quinn/Riley are deliberately seeded
    // with zero tickets (server/prisma/seed.ts) precisely because they're
    // the shared automation accounts every spec creates its own test data
    // under — so right after `test:e2e:reset` + `prisma:seed`, or if this
    // test happens to run before any spec that creates a ticket, My
    // Tickets is legitimately empty and there's no `tbody tr` to wait for.
    // Create a ticket here (same pattern as the Ticket Detail screenshot
    // below) so this screenshot is deterministic regardless of database
    // state or test execution order.
    const summary = `Visual QA My Tickets ${Date.now()}`;

    await page.getByRole("main").getByRole("button", {
      name: "+ Create Ticket",
    }).first().click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    const createSelects = page.locator("select");
    await createSelects.nth(0).selectOption({ label: "Hardware" });
    await createSelects.nth(1).selectOption({ label: "Corporate Laptop" });
    await createSelects.nth(2).selectOption("MEDIUM");

    await page.locator('input[type="text"]').fill(summary);
    await page
      .locator("textarea")
      .fill(
        "This ticket is created by the visual QA spec to screenshot the My Tickets list."
      );

    await page.getByRole("button", { name: "Create Ticket", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Ticket Created" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Go to My Tickets" }).click();

    await expect(
      page.getByRole("heading", { name: "My Tickets", exact: true })
    ).toBeVisible();

    await waitForSpinnerToClear(page);
    // Belt-and-suspenders on top of waitForSpinnerToClear: toHaveCount(0)
    // resolves the instant the spinner is (even momentarily) absent, which
    // can land in a gap between two loading cycles rather than after the
    // final one. Also requiring a real row to be visible — the same guard
    // the staff-queue screenshot already uses — means the screenshot can
    // only fire once actual content has painted, not just once the spinner
    // has (possibly briefly) gone away. Now guaranteed to exist since this
    // test creates its own ticket above.
    await expect(page.locator("tbody tr").first()).toBeVisible();

    await page.screenshot({
      path: screenshotPath("my-tickets", "list", testInfo.project.name),
      fullPage: true,
    });
  });

  test("Create Ticket screen — empty and validation-error states", async ({
    page,
  }, testInfo) => {
    await loginAsRequester(page, REQUESTER_A.email);

    await page.getByRole("main").getByRole("button", {
      name: "+ Create Ticket",
    }).first().click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    await waitForSpinnerToClear(page);
    await expect(page.locator("select").first()).toBeVisible();

    await page.screenshot({
      path: screenshotPath(
        "create-ticket",
        "initial",
        testInfo.project.name
      ),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Create Ticket", exact: true }).click();

    await expect(
      page.locator(".is-invalid, .invalid-feedback").first()
    ).toBeVisible();

    await page.screenshot({
      path: screenshotPath(
        "create-ticket",
        "validation-error",
        testInfo.project.name
      ),
      fullPage: true,
    });
  });

  test("Requester Ticket Detail screen", async ({ page }, testInfo) => {
    await loginAsRequester(page, REQUESTER_A.email);

    // Issue 4: the old version of this test hard-coded a seeded ticket
    // number (TKT-2026-000001) owned by Alice Johnson. Alice is a
    // password-gated demo account now, and Requester A (the automation
    // account used for this screenshot) doesn't own that ticket, so this
    // creates and opens its own ticket instead.
    const summary = `Visual QA Ticket Detail ${Date.now()}`;

    await page.getByRole("main").getByRole("button", {
      name: "+ Create Ticket",
    }).first().click();

    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    const selects = page.locator("select");
    await selects.nth(0).selectOption({ label: "Hardware" });
    await selects.nth(1).selectOption({ label: "Corporate Laptop" });
    await selects.nth(2).selectOption("HIGH");

    await page.locator('input[type="text"]').fill(summary);
    await page
      .locator("textarea")
      .fill(
        "This ticket is created by the visual QA spec to screenshot the Ticket Detail screen."
      );

    await page.getByRole("button", { name: "Create Ticket", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Ticket Created" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Go to My Tickets" }).click();
    await waitForSpinnerToClear(page);

    await page
      .getByPlaceholder("Search by ticket number or summary...")
      .fill(summary);

    const row = page.locator("tbody tr").filter({ hasText: summary });
    await expect(row).toHaveCount(1);
    await row.getByRole("button").click();

    await expect(
      page.getByRole("heading", { name: /^TKT-\d{4}-\d{6}$/ })
    ).toBeVisible({ timeout: 10_000 });

    await waitForSpinnerToClear(page);

    await page.screenshot({
      path: screenshotPath("ticket-detail", "view", testInfo.project.name),
      fullPage: true,
    });
  });

  // -------------------------------------------------------------------
  // Issue 8 — GitHub Issue #35: staff-queue, staff-ticket-detail, and
  // user-management screenshots (§8.3–§8.5 of the Lab 3 handout).
  // -------------------------------------------------------------------

  test("IT Staff Ticket Queue screen", async ({ page }, testInfo) => {
    await loginAsStaffOrAdmin(page, STAFF_EMAIL);

    await expect(
      page.getByRole("heading", { name: "My Queue", exact: true })
    ).toBeVisible();

    await waitForSpinnerToClear(page);
    await expect(page.locator("tbody tr").first()).toBeVisible();

    await page.screenshot({
      path: screenshotPath("staff-queue", "list", testInfo.project.name),
      fullPage: true,
    });
  });

  test("IT Staff Ticket Detail screen", async ({ page }, testInfo) => {
    await loginAsStaffOrAdmin(page, STAFF_EMAIL);

    await expect(
      page.getByRole("heading", { name: "My Queue", exact: true })
    ).toBeVisible();

    await waitForSpinnerToClear(page);

    const row = page.locator("tbody tr").first();
    await expect(row).toBeVisible();
    await row.getByRole("button").first().click();

    await expect(page.getByLabel(/ticket owner/i)).toBeVisible();
    await waitForSpinnerToClear(page);

    await page.screenshot({
      path: screenshotPath("staff-ticket-detail", "view", testInfo.project.name),
      fullPage: true,
    });

    // Also capture the Internal Notes tab open, since it's the panel that
    // must look visually distinct from Public Comments (BR-04).
    //
    // Internal Notes are loaded lazily on first tab open (see the
    // activeTab-keyed useEffect in StaffTicketDetail.tsx), so clicking the
    // tab kicks off its own fetch independent of the page-level spinner
    // waited on above. Without waiting for that fetch to settle here, the
    // screenshot can be taken mid-load and capture the notes-panel spinner
    // instead of its content (the bug behind the stuck internal-notes
    // screenshots).
    await page.getByRole("tab", { name: /internal notes/i }).click();
    await waitForSpinnerToClear(page);

    await page.screenshot({
      path: screenshotPath(
        "staff-ticket-detail",
        "internal-notes",
        testInfo.project.name
      ),
      fullPage: true,
    });
  });

  test("Administrator User Management screen — list and Create User panel", async ({
    page,
  }, testInfo) => {
    await loginAsStaffOrAdmin(page, ADMIN_EMAIL);

    await expect(
      page.getByRole("heading", { name: "My Queue", exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: /^users$/i }).click();

    await expect(
      page.getByRole("heading", { name: "Users", exact: true })
    ).toBeVisible();

    await waitForSpinnerToClear(page);

    await page.screenshot({
      path: screenshotPath("user-management", "list", testInfo.project.name),
      fullPage: true,
    });

    await page.getByRole("button", { name: /create user/i }).click();

    await expect(
      page.getByRole("dialog", { name: /create new user/i })
    ).toBeVisible();

    await page.screenshot({
      path: screenshotPath(
        "user-management",
        "create-panel",
        testInfo.project.name
      ),
      fullPage: true,
    });
  });
});

import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { loginAsRequester, REQUESTER_A } from "./helpers/auth";

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

    await expect(
      page.getByRole("heading", { name: "My Tickets", exact: true })
    ).toBeVisible();

    await waitForSpinnerToClear(page);

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
    }).click();

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
    }).click();

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
});


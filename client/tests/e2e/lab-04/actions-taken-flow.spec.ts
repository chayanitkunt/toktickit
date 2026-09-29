import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const PASSWORD = "ChangeMe123!";
const REQUESTER = "quinn.requester@example.com";
const STAFF = "michael.brown@tiktockit.com";
const screenshotRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../artifacts/lab-04/screenshots/actions-taken");

function screenshotPath(name: string, project: string) {
  fs.mkdirSync(screenshotRoot, { recursive: true });
  return path.join(screenshotRoot, `${name}-${project}.png`);
}

async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
}

async function logout(page: Page) {
  await page.getByTestId("current-user-identity").getByRole("button", { name: /logout/i }).click();
}

test("IT Staff records an Action Taken and the Requester sees it read-only", async ({ page }, testInfo) => {
  const summary = `E2E Actions Taken ${Date.now()}`;
  await login(page, REQUESTER);
  await page.getByRole("button", { name: /Create Ticket.*Submit a new request/i }).click();
  const selects = page.locator("select");
  await selects.nth(0).selectOption({ label: "Hardware" });
  await selects.nth(1).selectOption({ label: "Corporate Laptop" });
  await selects.nth(2).selectOption("MEDIUM");
  await page.locator('input[type="text"]').fill(summary);
  await page.locator("textarea").fill("Action Taken E2E ticket.");
  await page.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await page.getByRole("button", { name: "Go to My Tickets" }).click();
  await logout(page);

  await login(page, STAFF);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "My Queue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Queue", exact: true })).toBeVisible();
  await page.getByLabel(/^search$/i).fill(summary);
  const row = page.locator("tr", { hasText: summary });
  await row.getByRole("button").click();
  await page.getByRole("tab", { name: /actions taken/i }).click();
  await page.getByRole("button", { name: /add action taken/i }).click();
  await page.getByRole("button", { name: /^add action taken$/i }).click();
  await expect(page.getByText(/Action Description is required/i)).toBeVisible();
  await page.screenshot({ path: screenshotPath("staff-actions-validation", testInfo.project.name), fullPage: true });
  await page.getByLabel("Action Description").fill("Reseated the network cable.");
  await page.getByLabel("Result").fill("Connection restored.");
  await page.getByLabel("Yes").click();
  await page.getByLabel("Follow-up Note").fill("Confirm stability tomorrow.");
  await page.getByRole("button", { name: /^add action taken$/i }).click();
  // Both responsive layouts remain mounted; Bootstrap hides one at each
  // breakpoint. Assert against the layout visible in this project rather
  // than letting `.first()` select the hidden desktop table on tablet/mobile.
  const visibleActionLayout = testInfo.project.name === "chromium"
    ? page.locator(".d-lg-block")
    : page.locator(".d-lg-none");
  await expect(visibleActionLayout.getByText("Reseated the network cable.")).toBeVisible();
  await page.screenshot({ path: screenshotPath("staff-actions-list", testInfo.project.name), fullPage: true });
  await visibleActionLayout.getByRole("button", { name: /^edit action taken/i }).click();
  await expect(page.getByRole("heading", { name: /edit action taken/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("staff-actions-edit", testInfo.project.name), fullPage: true });
  await logout(page);

  await login(page, REQUESTER);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "My Tickets", exact: true }).click();
  await page.getByLabel(/^search$/i).fill(summary);
  await page.locator("tbody tr", { hasText: summary }).getByRole("button").click();
  await expect(visibleActionLayout.getByText("Reseated the network cable.")).toBeVisible();
  await page.screenshot({ path: screenshotPath("requester-actions-readonly", testInfo.project.name), fullPage: true });
  await expect(page.getByRole("button", { name: /add action taken/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^edit action taken/i })).toHaveCount(0);
});

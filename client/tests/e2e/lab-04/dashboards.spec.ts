import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const PASSWORD = "ChangeMe123!";
const REQUESTER = "quinn.requester@example.com";
const STAFF = "michael.brown@tiktockit.com";
const ADMIN = "jennifer.anderson@tiktockit.com";
const screenshotRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../artifacts/lab-04/screenshots");

function screenshotPath(screen: string, project: string) {
  const directory = path.join(screenshotRoot, screen);
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, `dashboard-${project}.png`);
}

async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("Requester and IT Staff dashboards load and drill into their existing detailed views", async ({ page }, testInfo) => {
  const summary = `E2E Dashboard ${Date.now()}`;
  await login(page, REQUESTER);
  await expect(page.locator("#requester-dashboard-heading")).toBeVisible();
  await expect(page.getByRole("button", { name: /My Open Tickets:/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("requester-dashboard", testInfo.project.name), fullPage: true });
  await page.getByRole("button", { name: /Create Ticket.*Submit a new request/i }).click();
  const selects = page.locator("select");
  await selects.nth(0).selectOption({ label: "Hardware" });
  await selects.nth(1).selectOption({ label: "Corporate Laptop" });
  await selects.nth(2).selectOption("MEDIUM");
  await page.locator('input[type="text"]').fill(summary);
  await page.locator("textarea").fill("Dashboard drill-down ticket.");
  await page.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await page.getByRole("button", { name: "Go to My Tickets" }).click();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByRole("button", { name: /My Open Tickets:/i }).click();
  await expect(page.getByRole("heading", { name: "My Tickets", exact: true })).toBeVisible();
  await expect(page.getByText(summary)).toBeVisible();
  await page.getByTestId("current-user-identity").getByRole("button", { name: /logout/i }).click();

  await login(page, STAFF);
  await expect(page.locator("#staff-dashboard-heading")).toBeVisible();
  await expect(page.getByRole("button", { name: /New:/i })).toBeVisible();
  await page.screenshot({ path: screenshotPath("staff-dashboard", testInfo.project.name), fullPage: true });
  await page.getByRole("button", { name: /New:/i }).click();
  await expect(page.getByRole("heading", { name: "My Queue", exact: true })).toBeVisible();
  await expect(page.getByText(summary)).toBeVisible();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByRole("button", { name: /Search Tickets/i }).click();
  await expect(page.getByLabel("Search")).toBeFocused();
  await page.getByTestId("current-user-identity").getByRole("button", { name: /logout/i }).click();

  await login(page, ADMIN);
  await expect(page.locator("#staff-dashboard-heading")).toBeVisible();
  await expect(page.getByRole("button", { name: "Users" })).toBeVisible();
});

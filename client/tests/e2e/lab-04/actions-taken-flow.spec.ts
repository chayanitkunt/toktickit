import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "ChangeMe123!";
const REQUESTER = "quinn.requester@example.com";
const STAFF = "michael.brown@tiktockit.com";

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
  await page.getByRole("main").getByRole("button", { name: "+ Create Ticket" }).click();
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
  await expect(page.getByRole("heading", { name: "My Queue", exact: true })).toBeVisible();
  await page.getByLabel(/^search$/i).fill(summary);
  const row = page.locator("tr", { hasText: summary });
  await row.getByRole("button").click();
  await page.getByRole("tab", { name: /actions taken/i }).click();
  await page.getByRole("button", { name: /add action taken/i }).click();
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
  await logout(page);

  await login(page, REQUESTER);
  await page.getByLabel(/^search$/i).fill(summary);
  await page.locator("tbody tr", { hasText: summary }).getByRole("button").click();
  await expect(visibleActionLayout.getByText("Reseated the network cable.")).toBeVisible();
  await expect(page.getByRole("button", { name: /add action taken/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^edit$/i })).toHaveCount(0);
});

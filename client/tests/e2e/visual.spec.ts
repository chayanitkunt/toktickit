import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsRoot = path.resolve(
  __dirname,
  "../../../artifacts/lab-02/screenshots"
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

async function selectRequester(page: Page, label: string) {
  await page.goto("/");

  const requesterSelect = page.locator("#requester-select");
  await expect(requesterSelect).toBeVisible();

  await requesterSelect.selectOption({ label });

  const ticketsLoaded = page.waitForResponse(
    (response) =>
      response.url().includes("/api/tickets") &&
      response.request().method() === "GET"
  );

  await page.getByRole("button", { name: /Continue/i }).click();

  await ticketsLoaded;
  await waitForSpinnerToClear(page);
}

test.describe("Visual QA screenshots", () => {
  test("Development Requester selection screen", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    const requesterSelect = page.locator("#requester-select");
    await expect(requesterSelect).toBeVisible();

    await page.screenshot({
      path: screenshotPath(
        "requester-selection",
        "initial",
        testInfo.project.name
      ),
      fullPage: true,
    });
  });

  test("My Tickets screen", async ({ page }, testInfo) => {
    await selectRequester(page, "Alice Johnson");

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
    await selectRequester(page, "Alice Johnson");

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
    await selectRequester(page, "Alice Johnson");

    await waitForSpinnerToClear(page);

    // กรอกค้นหา Ticket ID เพื่อดึงตั๋วใบนี้มาแสดงในหน้าปัจจุบันเสมอ ไม่ว่าจะอยู่หน้าไหน
    await page
      .getByPlaceholder("Search by ticket number or summary...")
      .fill("TKT-2026-000001");

    const ticket = page
      .getByText("TKT-2026-000001", { exact: true })
      .filter({ visible: true })
      .first();

    await expect(ticket).toBeVisible();
    await ticket.click();

    await expect(
      page.getByRole("heading", { name: /TKT-2026-000001/ })
    ).toBeVisible({ timeout: 10_000 });

    await waitForSpinnerToClear(page);

    await page.screenshot({
      path: screenshotPath("ticket-detail", "view", testInfo.project.name),
      fullPage: true,
    });
  });
});

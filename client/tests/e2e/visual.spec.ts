import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// This spec exists purely to capture the desktop/tablet/mobile screenshots
// required by docs/lab-02/ui-spec.md's visual QA checklist and by Part 9 of
// the Lab 2 submission. It does not assert business behavior — that is
// covered by create-ticket.spec.ts, my-tickets.spec.ts, ticket-detail.spec.ts,
// and requester.spec.ts. Run it across all three Playwright projects:
//
//   npx playwright test tests/e2e/visual.spec.ts
//
// Screenshots are written to artifacts/lab-02/screenshots/<screen>/, one
// file per viewport (project name is appended to the filename).

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

async function selectRequester(page: Page, label: string, name: string) {
  await page.goto("/");

  const requesterSelect = page.locator("#requester-select");
  await expect(requesterSelect).toBeVisible();

  await requesterSelect.selectOption({ label });

  await expect(
    page.getByText(`Current requester: ${name}`, { exact: true })
  ).toBeVisible();
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
    await selectRequester(
      page,
      "Alice Johnson (alice@example.com)",
      "Alice Johnson"
    );

    await expect(page.getByText("My Tickets", { exact: true })).toBeVisible();

    await page.screenshot({
      path: screenshotPath("my-tickets", "list", testInfo.project.name),
      fullPage: true,
    });
  });

  test("Create Ticket screen — empty and validation-error states", async ({
    page,
  }, testInfo) => {
    await selectRequester(
      page,
      "Alice Johnson (alice@example.com)",
      "Alice Johnson"
    );

    await page.getByRole("button", { name: "+ Create Ticket" }).click();
    await expect(
      page.getByRole("heading", { name: "Create Ticket" })
    ).toBeVisible();

    await page.screenshot({
      path: screenshotPath(
        "create-ticket",
        "initial",
        testInfo.project.name
      ),
      fullPage: true,
    });

    // Trigger validation by submitting without required fields.
    await page.getByRole("button", { name: "Create Ticket" }).click();

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
  await selectRequester(
    page,
    "Alice Johnson (alice@example.com)",
    "Alice Johnson"
  );

  const searchInput = page.getByPlaceholder(
    "Search by ticket number or summary..."
  );

  await expect(searchInput).toBeVisible();
  await searchInput.fill("TKT-2026-000001");

  // Desktop/tablet use table rows, while mobile uses card layout.
  const ticket = page.getByText("TKT-2026-000001", { exact: true });

  await expect(ticket).toBeVisible();

  // Click the ticket number/link regardless of desktop or mobile layout.
  await ticket.click();

  await expect(
    page.getByRole("heading", { name: /^TKT-\d{4}-\d{6}$/ })
  ).toBeVisible();

  await expect(
    page.getByText("Loading...", { exact: true })
  ).toBeHidden();

  await page.screenshot({
    path: screenshotPath("ticket-detail", "view", testInfo.project.name),
    fullPage: true,
  });
});
});

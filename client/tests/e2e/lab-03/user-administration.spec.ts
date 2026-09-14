import { test, expect } from "@playwright/test";

// All seeded accounts share the fake local-dev password documented in
// server/prisma/seed.ts and README.md. Never a real credential.
const SEED_PASSWORD = "ChangeMe123!";

// jennifer.anderson@tiktockit.com is the seeded Administrator whose
// mustChangePassword is already false, so it logs straight into the app
// shell (see client/tests/e2e/lab-03/authentication.spec.ts).
const ADMIN_EMAIL = "jennifer.anderson@tiktockit.com";
const ADMIN_NAME = "Jennifer Anderson";

// A seeded active IT Staff account, used to confirm User Management is not
// reachable by a non-Administrator (§5.2 Authorization Matrix).
const STAFF_EMAIL = "michael.brown@tiktockit.com";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel(/email address/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByTestId("current-user-identity")).toContainText(
    ADMIN_NAME
  );
}

test.describe("Administrator User Management", () => {
  test("E2E-05/FR-15-FR-19: full admin flow — create, search, edit, reset password, deactivate", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Navigate to the User Management screen.
    await page.getByRole("button", { name: /^users$/i }).click();
    await expect(
      page.getByRole("heading", { name: "Users", exact: true })
    ).toBeVisible();

    // A unique email per run keeps this spec safely re-runnable without a
    // database reset (BR-13 would otherwise reject a duplicate email).
    const uniqueSuffix = Date.now();
    const newUserEmail = `e2e.user.${uniqueSuffix}@tiktockit.com`;
    const newUserName = "E2E Test User";
    const updatedUserName = "E2E Test User Updated";

    // --- Create ---
    await page.getByRole("button", { name: /create user/i }).click();

    const createDialog = page.getByRole("dialog", { name: /create new user/i });
    await expect(createDialog).toBeVisible();

    await createDialog.getByLabel(/full name/i).fill(newUserName);
    await createDialog.getByLabel(/email address/i).fill(newUserEmail);
    await createDialog.getByLabel(/^role$/i).selectOption("REQUESTER");
    await createDialog.getByLabel(/initial password/i).fill("TempPass123!");

    await createDialog.getByRole("button", { name: /save user/i }).click();

    await expect(page.getByTestId("user-mgmt-toast")).toHaveText(
      "User created"
    );
    await expect(createDialog).not.toBeVisible();

    // --- Search ---
    await page.getByLabel(/^search$/i).fill(newUserEmail);

    const userRow = page.locator("tr", { hasText: newUserEmail });
    await expect(userRow).toBeVisible();
    await expect(userRow).toContainText(newUserName);
    await expect(userRow).toContainText("Requester");
    await expect(userRow).toContainText("Active");

    // --- Edit basic account information ---
    await userRow.getByRole("button", { name: /edit/i }).click();

    const editDialog = page.getByRole("dialog", { name: /edit user/i });
    await expect(editDialog).toBeVisible();

    const nameField = editDialog.getByLabel(/full name/i);
    await nameField.fill(updatedUserName);
    await editDialog.getByLabel(/^role$/i).selectOption("IT_STAFF");

    await editDialog.getByRole("button", { name: /save user/i }).click();
    await expect(page.getByTestId("user-mgmt-toast")).toHaveText(
      "User updated"
    );

    await expect(userRow).toContainText(updatedUserName);
    await expect(userRow).toContainText("IT Staff");

    // Saving closes the panel (per handleSave), so reopen it fresh to set a
    // new initial password.
    await userRow.getByRole("button", { name: /edit/i }).click();
    await expect(editDialog).toBeVisible();

    await editDialog
      .getByRole("button", { name: /set new initial password/i })
      .click();
    await editDialog.getByLabel(/new initial password/i).fill("FreshPass123!");
    await editDialog.getByRole("button", { name: /^set password$/i }).click();

    await expect(page.getByTestId("user-mgmt-toast")).toHaveText(
      "New initial password set"
    );

    // Setting a password does NOT close the panel (only the reset-password
    // sub-form collapses) — the Edit panel for this same user is still
    // open, so continue straight into Deactivate without re-clicking Edit.
    await expect(editDialog).toBeVisible();

    await editDialog
      .getByRole("button", { name: /deactivate user/i })
      .click();

    await expect(page.getByTestId("user-mgmt-toast")).toHaveText(
      "User deactivated"
    );
    await expect(userRow).toContainText("Inactive");
  });

  test("E2E-05/BR-14: an Administrator cannot deactivate their own account", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.getByRole("button", { name: /^users$/i }).click();
    await page.getByLabel(/^search$/i).fill(ADMIN_EMAIL);

    const selfRow = page.locator("tr", { hasText: ADMIN_EMAIL });
    await selfRow.getByRole("button", { name: /edit/i }).click();

    const editDialog = page.getByRole("dialog", { name: /edit user/i });
    await expect(
      editDialog.getByRole("button", { name: /deactivate user/i })
    ).toBeDisabled();
    await expect(
      editDialog.getByText(/you can't deactivate your own account/i)
    ).toBeVisible();
  });

  test("E2E-05/§5.2: User Management is not reachable by a non-Administrator", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel(/email address/i).fill(STAFF_EMAIL);
    await page.getByLabel(/^password$/i).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByTestId("current-user-identity")).toBeVisible();

    // IT Staff sees "My Queue" but no "Users" nav destination.
    await expect(
      page.getByRole("button", { name: /^users$/i })
    ).toHaveCount(0);
  });
});

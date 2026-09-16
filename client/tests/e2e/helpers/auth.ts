import { expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Issue 4 — shared e2e login helper
//
// The Development Requester selector (#requester-select) is gone. Every e2e
// spec that used to call selectRequester()/selectAlice() now logs in for
// real instead. Requester A / Requester B below are the same dedicated
// automation accounts used by the server test suite
// (server/tests/helpers/authClient.ts) — seeded with mustChangePassword
// already false, so a test can log in and land straight on My Tickets
// without exercising (and thereby mutating) the mandatory first-login
// password-change flow on every run.
// ---------------------------------------------------------------------------

export const SEED_PASSWORD = "ChangeMe123!";

export const REQUESTER_A = {
  name: "Quinn Tester",
  email: "quinn.requester@example.com",
};

export const REQUESTER_B = {
  name: "Riley Tester",
  email: "riley.requester@example.com",
};

/**
 * Logs in as the given seeded user from a fresh Login screen and waits for
 * the authenticated app shell (My Tickets) to appear. Only for accounts
 * that do NOT require a password change — see REQUESTER_A/REQUESTER_B above.
 */
export async function loginAsRequester(
  page: Page,
  email: string,
  password: string = SEED_PASSWORD
) {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /sign in to your account/i })
  ).toBeVisible();

  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(
    page.getByRole("heading", { name: "My Tickets", exact: true })
  ).toBeVisible();
}

/**
 * Logs out via the header Logout button and waits for the Login screen to
 * come back, so a test can switch to a different authenticated user within
 * the same page/context.
 */
export async function logout(page: Page) {
  await page
    .getByTestId("current-user-identity")
    .getByRole("button", { name: /logout/i })
    .click();

  await expect(
    page.getByRole("heading", { name: /sign in to your account/i })
  ).toBeVisible();
}

/**
 * Convenience wrapper: logs out of whoever is currently signed in (if
 * anyone) and logs in as the given Requester. Safe to call at the top of a
 * test that previously relied on the old requester-switch pattern.
 */
export async function switchToRequester(
  page: Page,
  email: string,
  password: string = SEED_PASSWORD
) {
  const identity = page.getByTestId("current-user-identity");

  if (await identity.isVisible().catch(() => false)) {
    await logout(page);
  }

  await loginAsRequester(page, email, password);
}

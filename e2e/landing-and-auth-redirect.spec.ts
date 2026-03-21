import { test, expect } from "@playwright/test";

test.describe("Public landing and auth redirect", () => {
  test("landing loads and primary CTA navigates toward auth or app", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    const authLink = page.getByRole("link", { name: /sign in|get started|launch|cockpit/i }).first();
    if (await authLink.isVisible().catch(() => false)) {
      await authLink.click();
      await expect(page).toHaveURL(/\/auth|\/app/, { timeout: 15_000 });
    }
  });

  test("unknown route shows not found", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-12345");
    await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 10_000 });
  });
});

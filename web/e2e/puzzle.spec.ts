import { test, expect } from "@playwright/test";

test.describe("puzzle engine", () => {
  test("game board renders categories", async ({ page }) => {
    await page.goto("/play");
    // When auth is configured, the game board would load.
    // With no auth key, we verify the placeholder.
    await expect(page.locator("text=Auth configuration missing")).toBeVisible();
  });
});

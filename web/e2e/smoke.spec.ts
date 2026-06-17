import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Somewhere between play and possibility." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Enter after dark" })).toBeVisible();
  });

  test("play page shows auth placeholder when key missing", async ({ page }) => {
    await page.goto("/play");
    await expect(page.locator("text=Auth configuration missing")).toBeVisible();
  });

  test("create page shows auth placeholder when key missing", async ({ page }) => {
    await page.goto("/create");
    await expect(page.locator("text=Auth configuration missing")).toBeVisible();
  });
});

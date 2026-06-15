import { test, expect } from "@playwright/test";

test("friend intent travels from lobby choice to the friend room", async ({ page }) => {
  await page.goto("/lobby");

  await expect(
    page.getByRole("heading", { name: "Why did you come tonight?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Make a friend/i }).click();

  await expect(
    page.getByRole("heading", { name: "Tonight's game shelf" }),
  ).toBeVisible();
  await page.locator("[data-game-card]").first().click();

  await expect(
    page.getByRole("heading", { name: "One small choice before the doors open." }),
  ).toBeVisible();
  await page.locator("[data-activity-option]").first().click();

  await expect(
    page.getByRole("heading", { name: "Listening for someone on your frequency." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Another signal answered." }),
  ).toBeVisible({ timeout: 7_000 });

  await page.getByRole("button", { name: "Enter the game" }).click();
  await page.getByRole("button", { name: /Stop/i }).click();
  await expect(
    page.getByRole("heading", { name: /You took it|They took it|Draw/ }),
  ).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "See results" }).click();

  await expect(
    page.getByRole("heading", { name: "A quieter room." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Hold to talk" })).toBeVisible();
});

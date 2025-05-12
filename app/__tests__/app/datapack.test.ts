import { test, expect } from "@playwright/test";

test("datapack button is clickable", async ({ page }) => {
  await page.goto("http://localhost:5173");
  const datapacksTab = page.locator(".qsg-datapacks");
  await expect(datapacksTab).toBeVisible();
  await datapacksTab.click();

  const AfricaBightButton = page.locator("text=Africa Bight");
  await AfricaBightButton.waitFor({ state: "visible" });
  await expect(AfricaBightButton).toBeVisible({ timeout: 15000 });
  await AfricaBightButton.click();

  await expect(page.locator("text=Description")).toBeVisible();
  await expect(page.locator("text=Africa Bight Map")).toBeVisible();
  await expect(page.locator("text=Authored By")).toBeVisible();
  await expect(page.locator("text=James Ogg")).toBeVisible();
  await expect(page.locator("text=Privacy")).toBeVisible();
  await expect(page.locator("text=Public")).toBeVisible();
  await expect(page.locator("text=File Name")).toBeVisible();
  await expect(page.locator("text=AfricaBight.map")).toBeVisible();

  await expect(page.locator("text=View Data")).toBeVisible();
  await expect(page.locator("text=Discussion")).toBeVisible();
  await expect(page.locator("text=Warnings")).toBeVisible();
});

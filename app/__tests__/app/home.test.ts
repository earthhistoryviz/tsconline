import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(4000); // Wait for 4 seconds to ensure the page is fully loaded
});

test("navigation to presets page works", async ({ page }) => {
  const datapacksTab = page.locator(".qsg-presets");
  await expect(datapacksTab).toBeVisible();
  await datapacksTab.click();
  await expect(page).toHaveURL(/.*\/presets/);
});

test("navigation to datapack page works", async ({ page }) => {
  const datapacksTab = page.locator(".qsg-chart");
  await expect(datapacksTab).toBeVisible();
  await datapacksTab.click();
  await expect(page).toHaveURL(/.*\/chart/);
});

test("navigation to settings page works", async ({ page }) => {
  const datapacksTab = page.locator(".qsg-settings");
  await expect(datapacksTab).toBeVisible();
  await datapacksTab.click();
  await expect(page).toHaveURL(/.*\/settings/);
});

test("navigation to help page works", async ({ page }) => {
  const datapacksTab = page.locator(".qsg-help");
  await expect(datapacksTab).toBeVisible();
  await datapacksTab.click();
  await expect(page).toHaveURL(/.*\/help/);
});

test("navigation to workshops page works", async ({ page }) => {
  const datapacksTab = page.locator(".qsg-workshops");
  await expect(datapacksTab).toBeVisible();
  await datapacksTab.click();
  await expect(page).toHaveURL(/.*\/workshops/);
});

test("navigation to about page works", async ({ page }) => {
  const datapacksTab = page.locator(".qsg-about");
  await expect(datapacksTab).toBeVisible();
  await datapacksTab.click();
  await expect(page).toHaveURL(/.*\/about/);
});

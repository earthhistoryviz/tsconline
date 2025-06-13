import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(4000);
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

test("login is functional", async ({ page }) => {
  await page.waitForTimeout(10000);

  const loginButton = page.locator("text=SIGN IN");
  await expect(loginButton).toBeVisible();
  await expect(loginButton).toBeEnabled();
  await loginButton.click();

  const acceptButton = page.locator("text=Accept");
  await expect(acceptButton).toBeVisible();
  await acceptButton.click();

  await expect(page).toHaveURL(/.*\/login/);

  const usernameInput = page.locator("#username");
  const passwordInput = page.locator("#password");
  const signInButton = page.locator('[data-testid="LoginIcon"]');

  await expect(usernameInput).toBeVisible();
  await expect(usernameInput).toBeEnabled();
  await usernameInput.fill("admin");

  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toBeEnabled();
  await passwordInput.fill("admin-password");

  await expect(signInButton).toBeVisible();
  await expect(signInButton).toBeEnabled();
  await signInButton.click();
});

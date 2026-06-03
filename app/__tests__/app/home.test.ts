import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(4000);
});

test("navigation routing works across main pages", async ({ page }) => {
  const datapacksTab = page.locator(".qsg-presets");
  await expect(datapacksTab).toBeVisible();
  await datapacksTab.click();
  await expect(page).toHaveURL(/.*\/presets-view/);

  const chartTab = page.locator(".qsg-chart");
  await expect(chartTab).toBeVisible();
  await chartTab.click();
  await expect(page).toHaveURL(/.*\/chart-view/);

  const settingsTab = page.locator(".qsg-settings");
  await expect(settingsTab).toBeVisible();
  await settingsTab.click();
  await expect(page).toHaveURL(/.*\/settings/);

  const helpTab = page.locator(".qsg-help");
  await expect(helpTab).toBeVisible();
  await helpTab.click();
  await expect(page).toHaveURL(/.*\/help/);

  const workshopsTab = page.locator(".qsg-workshops");
  await expect(workshopsTab).toBeVisible();
  await workshopsTab.click();
  await expect(page).toHaveURL(/.*\/workshops/);

  const aboutTab = page.locator(".qsg-about");
  await expect(aboutTab).toBeVisible();
  await aboutTab.click();
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
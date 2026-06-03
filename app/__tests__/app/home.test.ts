import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(4000);
});

test("navigation routing works across main pages", async ({ page }) => {
  let tab = page.locator(".qsg-presets");
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page).toHaveURL(/.*\/presets-view/);

  tab = page.locator(".qsg-chart");
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page).toHaveURL(/.*\/chart-view/);

  tab = page.locator(".qsg-settings");
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page).toHaveURL(/.*\/settings/);

  tab = page.locator(".qsg-help");
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page).toHaveURL(/.*\/help/);

  tab = page.locator(".qsg-workshops");
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page).toHaveURL(/.*\/workshops/);

  tab = page.locator(".qsg-about");
  await expect(tab).toBeVisible();
  await tab.click();
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
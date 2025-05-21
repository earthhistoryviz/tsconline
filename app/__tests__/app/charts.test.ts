import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(2000);
  const datapacksTab = page.locator(".qsg-datapacks");
  await datapacksTab.click();
  await expect(page.locator("text=Africa Bight")).toBeVisible({ timeout: 15000 });
});

test("check if generate chart works", async ({ page }) => {
  const addCircleWrapper = page.locator(".add-circle").first();
  await expect(addCircleWrapper).toBeVisible();
  await addCircleWrapper.click();
  await page.screenshot({ path: "screenshots/chart-step1-add-circle.png", fullPage: true });

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();
  await page.screenshot({ path: "screenshots/chart-step2-svg-visible.png", fullPage: true });

  const confirmButton = page.locator("text=Confirm Selection");
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await page.screenshot({ path: "screenshots/chart-step3-confirm-selection.png", fullPage: true });

  const loading = page.locator("text=Loading Datapacks");
  await expect(loading).toBeHidden();
  await page.screenshot({ path: "screenshots/chart-step4-datapacks-loaded.png", fullPage: true });

  const configMessage = page.locator("text=Datapack Config Updated");
  await configMessage.waitFor({ state: "visible" }).catch(() => {
    console.warn("Datapack Config Updated message not shown");
  });
  await page.screenshot({ path: "screenshots/chart-step5-config-updated.png", fullPage: true });

  const generateChart = page.locator("text=Generate Chart");
  await expect(generateChart).toBeVisible();

  await generateChart.click();

  await expect(page.locator("text=Loading Chart")).toBeHidden({ timeout: 10000 });
  await page.screenshot({ path: "screenshots/chart-step6-loading-chart-hidden.png", fullPage: true });

  await expect(page.locator("text=Successfully generated chart")).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: "screenshots/chart-step7-success.png", fullPage: true });
});

test("check if generate crossplot works", async ({ page }) => {
  const addCircleWrapper = page.locator(".add-circle").first();
  await expect(addCircleWrapper).toBeVisible();
  await addCircleWrapper.click();
  await page.screenshot({ path: "screenshots/crossplot-step1-add-circle.png", fullPage: true });

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();
  await page.screenshot({ path: "screenshots/crossplot-step2-svg-visible.png", fullPage: true });

  const confirmButton = page.locator("text=Confirm Selection");
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await page.screenshot({ path: "screenshots/crossplot-step3-confirm-selection.png", fullPage: true });

  const loading = page.locator("text=Loading Datapacks");
  await expect(loading).toBeHidden();
  await page.screenshot({ path: "screenshots/crossplot-step4-datapacks-loaded.png", fullPage: true });

  const configMessage = page.locator("text=Datapack Config Updated");
  await configMessage.waitFor({ state: "visible" }).catch(() => {
    console.warn("Datapack Config Updated message not shown");
  });
  await page.screenshot({ path: "screenshots/crossplot-step5-config-updated.png", fullPage: true });

  const createCrossplot = page.locator("text=Create Crossplot");
  await expect(createCrossplot).toBeVisible();

  await createCrossplot.click();

  const generateCrossplot = page.locator("text=Generate Crossplot");
  await expect(generateCrossplot).toBeVisible();
  await generateCrossplot.click();

  await expect(page.locator("text=Loading Chart")).toBeHidden({ timeout: 10000 });
  await page.screenshot({ path: "screenshots/crossplot-step6-loading-chart-hidden.png", fullPage: true });

  await expect(page.locator("text=Successfully generated chart")).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: "screenshots/crossplot-step7-success.png", fullPage: true });
});

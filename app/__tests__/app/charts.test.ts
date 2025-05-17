import { test, expect } from "@playwright/test";

test("check if generate chart works", async ({ page }) => {
  await page.goto("http://localhost:5173");

  const datapacksTab = page.locator(".qsg-datapacks");
  await datapacksTab.click();

  const addCircleWrapper = page.locator(".add-circle").nth(0);
  await expect(addCircleWrapper).toBeVisible();
  await addCircleWrapper.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();

  const confirmButton = page.locator("text=Confirm Selection");
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  await (expect(page.locator("text=Loading Datapacks")).toBeHidden());
  await page.waitForSelector('text=Datapack Config Updated', { timeout: 5000 });

  const generateChart = page.locator("text=Generate Chart");
  await expect(generateChart).toBeVisible();
  await generateChart.click();

  await page.waitForSelector('text=Successfully generated chart', { timeout: 5000 });
});

test("check if generate crossplot works", async ({ page }) => {
    await page.goto("http://localhost:5173");
    
    const datapacksTab = page.locator(".qsg-datapacks");
    await datapacksTab.click();
    
    const addCircleWrapper = page.locator(".add-circle").nth(0);
    await expect(addCircleWrapper).toBeVisible();
    await addCircleWrapper.click();
    
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible();
    
    const confirmButton = page.locator("text=Confirm Selection");
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    await (expect(page.locator("text=Loading Datapacks")).toBeHidden());
    await page.waitForSelector('text=Datapack Config Updated', { timeout: 5000 });
    
    const generateCrossplot = page.locator("text=Generate Crossplot");
    await expect(generateCrossplot).toBeVisible();
    await generateCrossplot.click();
    
    await page.waitForSelector('text=Successfully generated crossplot', { timeout: 5000 });
});

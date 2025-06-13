import { test, expect, Page } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function generateBasicChart(page: Page) {
  const addCircleWrapper = page.locator(".add-circle").first();
  await expect(addCircleWrapper).toBeVisible();
  await addCircleWrapper.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();

  const confirmButton = page.locator("text=Confirm Selection");
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  const loading = page.locator("text=Loading Datapacks");
  await expect(loading).toBeHidden();

  const configMessage = page.locator("text=Datapack Config Updated");
  await configMessage.waitFor({ state: "visible" }).catch(() => {
    console.warn("Datapack Config Updated message not shown");
  });

  const generateChart = page.locator("text=Generate Chart");
  await expect(generateChart).toBeVisible();
  await generateChart.click();

  await expect(page.locator("text=Loading Chart")).toBeHidden();
  await expect(page.locator("text=Successfully generated chart")).toBeVisible();
  await expect(page.locator("text=Central Africa Cenozoic")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.waitForTimeout(5000);
  await page.locator(".qsg-datapacks").click();
  await expect(page.locator("text=Africa Bight")).toBeVisible();
});

test("datapack button is clickable", async ({ page }) => {
  const AfricaBightButton = page.locator("text=Africa Bight");
  await AfricaBightButton.waitFor({ state: "visible" });
  await expect(AfricaBightButton).toBeVisible();
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

test("add-circle button is clickable", async ({ page }) => {
  const addCircleWrapper = page.locator(".add-circle").nth(0);
  await expect(addCircleWrapper).toBeVisible();
  await addCircleWrapper.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();
});

test("check if confirm selection works", async ({ page }) => {
  const addCircleWrapper = page.locator(".add-circle").nth(0);
  await expect(addCircleWrapper).toBeVisible();
  await addCircleWrapper.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();

  const confirmButton = page.locator("text=Confirm Selection");
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  await expect(page.locator("text=Loading Datapacks")).toBeHidden();

  await page.waitForSelector("text=Datapack Config Updated");
});

test("check if generate chart and save chart works", async ({ page }) => {
  await generateBasicChart(page);

  const chartSvg = page.locator(".react-transform-component svg");
  await expect(page.locator("text=Central Africa Cenozoic")).toBeVisible();

  await expect(chartSvg.locator(`text=9`)).toBeVisible();

  await expect(chartSvg.locator("text=Delta").first()).toBeVisible();
  await expect(chartSvg.locator("text=Deep Marine")).toBeVisible();
  await expect(chartSvg.locator("text=ProDelta").last()).toBeVisible();
  await expect(chartSvg.locator("text=Ocean Crust")).toBeVisible();

  await page.locator("text=Save").nth(0).click();
  const [downloadSvg] = await Promise.all([page.waitForEvent("download"), page.locator("text=Save").nth(2).click()]);

  await page.locator("text=Save").nth(0).click();
  await page.locator("text=.svg").click();
  await page.locator("text=.pdf").click();
  await Promise.all([page.waitForEvent("download"), page.locator("text=Save").last().click()]);

  await page.locator("text=Save").nth(0).click();
  await page.locator("text=.pdf").click();
  await page.locator("text=.png").click();
  await Promise.all([page.waitForEvent("download"), page.locator("text=Save").last().click()]);

  const downloadSvgPath = await downloadSvg.path();
  if (!downloadSvgPath) throw new Error("Download path not found");

  const referenceSvg = await fs.readFile(path.resolve(dirname, "charts.test.ts-snapshots/chart.svg"), "utf-8");
  const downloadedSvg = await fs.readFile(downloadSvgPath, "utf-8");
  expect(downloadedSvg).toBe(referenceSvg);
});

test("check if time scaling and column adjustments work", async ({ page }) => {
  await generateBasicChart(page);

  await page.locator("text=Settings").click();
  await page.locator('input[value="10"]').fill("15");
  await page.locator('input[value="2"]').fill("1");

  await page.locator("text=Column").nth(1).click();
  await page.locator("data-testid=ArrowForwardIosSharpIcon").nth(1).click();
  await page.locator("data-testid=CheckBoxIcon").nth(4).click();

  await page.locator("text=Generate Chart").click();

  await expect(page.locator("text=Loading Chart")).toBeHidden();
  await expect(page.locator("text=Central Africa Cenozoic")).toBeVisible();

  const chartSvg = page.locator(".react-transform-component svg");

  await expect(chartSvg.locator(`text=9`)).toBeVisible();

  await expect(chartSvg.locator("text=Delta").first()).toBeVisible();
  await expect(chartSvg.locator("text=ProDelta").last()).toBeVisible();
});

test("Load Basic Settings", async ({ page }) => {
  await page.locator("text=Settings").click();
  await page.locator("text=Load Settings").click();

  const fileChooserPromise = page.waitForEvent("filechooser");

  await page.locator("text=load").nth(2).click();

  const fileChooser = await fileChooserPromise;
  const settingsPath = path.resolve(dirname, "charts.test.ts-snapshots", "basicSettings.tsc");
  await fileChooser.setFiles(settingsPath);

  await expect(page.locator("text=Successfully loaded settings from basicSettings.tsc!")).toBeVisible({
    timeout: 10000
  });
});

test("check if generate crossplot works", async ({ page }) => {
  const addCircleWrapper = page.locator(".add-circle").first();
  await expect(addCircleWrapper).toBeVisible();
  await addCircleWrapper.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();

  const confirmButton = page.locator("text=Confirm Selection");
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  const loading = page.locator("text=Loading Datapacks");
  await expect(loading).toBeHidden();

  const configMessage = page.locator("text=Datapack Config Updated");
  await configMessage.waitFor({ state: "visible" }).catch(() => {
    console.warn("Datapack Config Updated message not shown");
  });

  const createCrossplot = page.locator("text=Create Crossplot");
  await expect(createCrossplot).toBeVisible();

  await createCrossplot.click();

  const generateCrossplot = page.locator("text=Generate Crossplot");
  await expect(generateCrossplot).toBeVisible();
  await generateCrossplot.click();

  await expect(page.locator("text=Loading Chart")).toBeHidden();

  await expect(page.locator("text=Successfully generated chart")).toBeVisible();

  const chartSvg = page.locator(".react-transform-component svg");

  await expect(chartSvg.locator(`text=9`).nth(0)).toBeVisible();
  await expect(chartSvg.locator("text=Delta").nth(0)).toBeVisible();
  await expect(chartSvg.locator("text=Deep Marine").nth(0)).toBeVisible();
  await expect(chartSvg.locator("text=ProDelta").nth(0)).toBeVisible();
  await expect(chartSvg.locator("text=Ocean Crust").nth(0)).toBeVisible();

  await expect(chartSvg.locator(`text=9`).nth(1)).toBeVisible();
  await expect(chartSvg.locator("text=Delta").nth(1)).toBeVisible();
  await expect(chartSvg.locator("text=Deep Marine").nth(1)).toBeVisible();
  await expect(chartSvg.locator("text=ProDelta").nth(1)).toBeVisible();
  await expect(chartSvg.locator("text=Ocean Crust").nth(1)).toBeVisible();
});

test("check if Map Points Functional", async ({ page }) => {
  await generateBasicChart(page);

  const chartSvg = page.locator(".react-transform-component svg");
  await expect(chartSvg.locator(`text=9`)).toBeVisible();

  await expect(chartSvg.locator("text=Delta").first()).toBeVisible();
  await expect(chartSvg.locator("text=Deep Marine")).toBeVisible();
  await expect(chartSvg.locator("text=ProDelta").last()).toBeVisible();
  await expect(chartSvg.locator("text=Ocean Crust")).toBeVisible();

  await page.locator("text=Settings").click();

  await page.locator("text=Map Points").first().click();
  await page.locator("text=Africa Bight").click();

  await expect(page.locator("data-testid=LocationOnSharpIcon").nth(0)).toBeVisible();
  await expect(page.locator("data-testid=LocationOnSharpIcon").nth(1)).toBeVisible();

  await page.locator("data-testid=LocationOnSharpIcon").nth(0).hover();

  await expect(page.locator("text=Nigeria Coast")).toBeVisible();
});

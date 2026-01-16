import { test, expect, Page } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { DOMParser } from "@xmldom/xmldom";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function generateBasicChart(page: Page) {
  const container = page.locator("text=Africa Bight").locator("..").locator("..").locator("..");
  const addButton = container.locator(".add-circle");

  await expect(addButton).toBeVisible();
  await addButton.click();

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

  // Navigate to datapacks page
  await page.locator(".qsg-datapacks").click();
  await page.waitForTimeout(1000);

  // Clear any auto-loaded datapacks by clicking their selection circles
  try {
    // Target the specific selected datapack with checkmark (css-1oo4k8z indicates selected)
    const selectedDatapackDiv = page.locator("div[class*='_cc_w61hf_'][class*='css-1oo4k8z']").first();

    if (await selectedDatapackDiv.isVisible({ timeout: 2000 })) {
      console.log("Found selected datapack, clicking to deselect...");
      await selectedDatapackDiv.click();
      await page.waitForTimeout(500);

      // Confirm the deselection
      const confirmButton = page.locator("text=Confirm Selection");
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        console.log("Clicking Confirm Selection...");
        await confirmButton.click();

        // Wait for datapack processing to complete
        await page
          .locator("text=Loading Datapacks")
          .waitFor({ state: "hidden", timeout: 5000 })
          .catch(() => {
            console.log("No loading indicator found");
          });
        await page.waitForTimeout(1000);
        console.log("Datapack clearing completed");
      }
    } else {
      console.log("No selected datapack found to clear");
    }
  } catch (error) {
    console.log("Clear auto-loaded datapack failed:", error);
  }

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

  const parser = new DOMParser();
  const parsed = parser.parseFromString(downloadedSvg, "image/svg+xml");

  const isValidSvg = parsed.getElementsByTagName("parsererror").length === 0;
  expect(isValidSvg).toBe(true);

  const downloadedSize = Buffer.byteLength(downloadedSvg);
  const referenceSize = Buffer.byteLength(referenceSvg);
  const diff = Math.abs(downloadedSize - referenceSize);
  const allowedDiff = referenceSize * 0.1;
  expect(diff).toBeLessThanOrEqual(allowedDiff);
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
  const container = page.locator("text=Africa Bight").locator("..").locator("..").locator("..");
  const addButton = container.locator(".add-circle");

  await expect(addButton).toBeVisible();
  await addButton.click();

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

test("check if new window button works", async ({ page, context }) => {
  await generateBasicChart(page);
  const newWindowButton = await page.locator(".new-window-button");
  await expect(newWindowButton).toBeVisible();
  const [newPage] = await Promise.all([context.waitForEvent("page"), newWindowButton.click()]);

  await newPage.bringToFront();
  expect(newPage.url()).toContain("/chart/preview");
  await expect(newPage.locator("text=Central Africa Cenozoic")).toBeVisible({ timeout: 10000 });

  const newWindowButtonPrev = await newPage.locator(".new-window-button");
  await expect(newWindowButtonPrev).toBeHidden();
  await newPage.close();
});

//add a test if the updates work
test("check sync of preview with window", async ({ page, context }) => {
  await generateBasicChart(page);
  const newWindowButton = await page.locator(".new-window-button");
  await expect(newWindowButton).toBeVisible();
  const [newPage] = await Promise.all([context.waitForEvent("page"), newWindowButton.click()]);

  await newPage.bringToFront();
  expect(newPage.url()).toContain("/chart/preview");
  await expect(newPage.locator("text=Central Africa Cenozoic")).toBeVisible({ timeout: 10000 });

  //bring first page to front and make an update
  await page.bringToFront();
  await page.locator("text=Datapacks").click();

  const container = page.locator("text=Australia").locator("..").locator("..").locator("..");
  const addButton = container.locator(".add-circle");
  await addButton.click();

  const confirmButton = page.locator("text=Confirm Selection");
  await confirmButton.click();

  const generateChart = page.locator("text=Generate Chart");
  await generateChart.click();
  //wait for chart to load
  await expect(page.locator("text=Loading Chart")).toBeHidden();
  await expect(page.locator("text=Successfully generated chart")).toBeVisible();
  await expect(page.locator("text=Greater NW Shelf")).toBeVisible();

  //bring new page to front and check for update
  await newPage.bringToFront();
  await expect(newPage.locator("text=Greater NW Shelf")).toBeVisible({ timeout: 10000 });

  const newWindowButtonPrev = await newPage.locator(".new-window-button");
  await expect(newWindowButtonPrev).toBeHidden();
});

test("test locking of preview window", async ({ page, context }) => {
  await generateBasicChart(page);
  const newWindowButton = await page.locator(".new-window-button");
  await expect(newWindowButton).toBeVisible();
  const [newPage] = await Promise.all([context.waitForEvent("page"), newWindowButton.click()]);

  await newPage.bringToFront();
  expect(newPage.url()).toContain("/chart/preview");
  await expect(newPage.locator("text=Central Africa Cenozoic")).toBeVisible({ timeout: 10000 });

  await expect(newPage.locator(".lock-button")).toBeVisible();
  await newPage.locator(".lock-button").click();

  //bring first page to front and make an update
  await page.bringToFront();
  await page.locator("text=Datapacks").click();

  const container = page.locator("text=Australia").locator("..").locator("..").locator("..");
  const addButton = container.locator(".add-circle");
  await addButton.click();

  const confirmButton = page.locator("text=Confirm Selection");
  await confirmButton.click();

  const generateChart = page.locator("text=Generate Chart");
  await generateChart.click();
  //wait for chart to load
  await expect(page.locator("text=Loading Chart")).toBeHidden();
  await expect(page.locator("text=Successfully generated chart")).toBeVisible();
  await expect(page.locator("text=Greater NW Shelf")).toBeVisible();

  //bring new page to front and check for update
  await newPage.bringToFront();
  await expect(newPage.locator("text=Central Africa Cenozoic")).toBeVisible({ timeout: 10000 });
  await newPage.locator(".lock-button").click();
  await expect(newPage.locator("text=Greater NW Shelf")).toBeVisible({ timeout: 10000 });
});

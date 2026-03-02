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
  expect(newPage.url()).toContain("/chart-view/preview");
  await expect(newPage.locator("text=Central Africa Cenozoic")).toBeVisible({ timeout: 10000 });

  const newWindowButtonPrev = await newPage.locator(".new-window-button");
  await expect(newWindowButtonPrev).toBeHidden();
  await newPage.close();
});

//generate a test with MCPlink state in the window params

test("check sync of preview with window", async ({ page, context }) => {
  await generateBasicChart(page);
  const newWindowButton = await page.locator(".new-window-button");
  await expect(newWindowButton).toBeVisible();
  const [newPage] = await Promise.all([context.waitForEvent("page"), newWindowButton.click()]);

  await newPage.bringToFront();
  expect(newPage.url()).toContain("/chart-view/preview");
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
  expect(newPage.url()).toContain("/chart-view/preview");
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

test("load cached chart from MCP link state in window params", async ({ page }) => {
  const testChartHash = "mocked-chart-hash";
  const testChartContent = await fs.readFile(path.resolve(dirname, "charts.test.ts-snapshots", "chart.svg"), "utf-8");

  // Create MCP link state with Africa Bight datapack and the test chart hash
  const mcpLinkState = {
    datapacks: ["Africa Bight"],
    chartHash: testChartHash
  };

  // Encode the state to base64
  const encodedState = btoa(JSON.stringify(mcpLinkState));

  // Mock the API responses for cached chart metadata and chart content
  await page.route(`**/cached-chart/**`, async (route) => {
    if (route.request().url().includes(testChartHash)) {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          chartpath: `/charts/${testChartHash}/chart.svg`,
          hash: testChartHash,
          settingspath: `charts/${testChartHash}/settings.tsc`
        })
      });
    } else {
      await route.abort();
    }
  });

  // Mock the SVG chart fetch
  await page.route(`**/charts/**/*.svg`, async (route) => {
    if (route.request().url().includes(testChartHash)) {
      await route.fulfill({
        status: 200,
        body: testChartContent,
        contentType: "image/svg+xml"
      });
    } else {
      await route.continue();
    }
  });
  // mock the fetchSettings API call

  await page.route(`**/settingsXml/**`, async (route) => {
    if (route.request().url().includes(testChartHash)) {
      const settingsContent = await fs.readFile(
        path.resolve(dirname, "charts.test.ts-snapshots", "basicSettings.tsc"),
        "utf-8"
      );

      await route.fulfill({
        status: 200,
        body: settingsContent,
        contentType: "application/xml"
      });
    } else {
      await route.abort();
    }
  });

  // Navigate to chart page with MCP link params
  await page.goto(`http://localhost:5173/chart-view?mcpChartState=${encodedState}`);

  // Wait for the page to load
  await page.waitForTimeout(7000);

  //if confirm datapack selection button appears, click it
  const confirmButton = page.locator("id=confirm-datapack-selection");

  //wait for 5 seconds to allow chart to load
  await page.waitForTimeout(5000);

  if (await confirmButton.isVisible({ timeout: 3000 })) {
    await confirmButton.click();
    await page.waitForTimeout(2000);
  }

  // Verify that the chart content is loaded and displayed
  await expect(page.locator("text=Central Africa Cenozoic")).toBeVisible({ timeout: 15000 });

  //expect no error message about wrong settings. Error will be a snackbar with text "Invalid settings response received from server. Please try again later."
  const errorMessage = page.locator("text=Invalid settings response received from server. Please try again later.");
  await expect(errorMessage).toBeHidden();

  // Verify the SVG chart is rendered
  const chartSvg = page.locator(".react-transform-component svg");
  await expect(chartSvg).toBeVisible();

  // Verify key chart elements are present
  await expect(chartSvg.locator("text=9")).toBeVisible();

  //click settings, expect input to be 12 for baseAge
  await page.locator("text=SETTINGS").click();
  const baseAgeInput = page.locator('input[value="12"]');
  await expect(baseAgeInput).toBeVisible();
});

//future PR test that popoff preview works with MCP link

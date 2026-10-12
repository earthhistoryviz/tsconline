import { test, expect, Page } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { DOMParser } from "@xmldom/xmldom";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function removeAutoLoadedDatapack(page: Page) {
  const deselectButton = page.getByRole("button", { name: "Deselect All" });
  const confirmButton = page.getByRole("button", { name: "Confirm Selection" });

  if ((await deselectButton.count()) === 0) return;
  if (await deselectButton.isDisabled()) return;

  await deselectButton.click();
  if (await confirmButton.isDisabled()) return;
  await confirmButton.click();
  await expect(page.getByText("Loading Datapacks")).toBeHidden();
}

function datapackTitle(page: Page, title: string) {
  return page.locator(".settings-datapack-container").getByText(title, { exact: true }).first();
}

function datapackAddButton(page: Page, title: string) {
  return page.getByRole("button", { name: `Add to chart ${title}` }).first();
}

function columnCheckbox(page: Page, index: number) {
  return page.locator(".column-checkbox input[type='checkbox']").nth(index);
}

async function openCrossplotFromNav(page: Page) {
  const generateButtonGroup = page.getByLabel("Button group with a nested menu");
  await expect(generateButtonGroup).toBeVisible();
  await generateButtonGroup.getByRole("button").nth(1).click();
  await page.getByText("Generate Crossplot", { exact: true }).click();
  await expect(page).toHaveURL(/.*\/crossplot/);
}

async function saveChartAs(page: Page, filetype: "svg" | "pdf" | "png") {
  await page.getByRole("button", { name: "Save" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: `.${filetype}` }).click();

  if (filetype === "svg") {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("button", { name: "Save" }).click()
    ]);
    await expect(dialog).toBeHidden();
    return download;
  }

  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`Saved Chart as ${filetype.toUpperCase()}!`)).toBeVisible({ timeout: 15000 });
  return null;
}

async function generateBasicChart(page: Page) {
  const addButton = datapackAddButton(page, "Africa Bight");

  await expect(addButton).toBeVisible();
  await addButton.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();

  const confirmButton = page.getByRole("button", { name: "Confirm Selection" });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  const loading = page.getByText("Loading Datapacks");
  await expect(loading).toBeHidden();

  const configMessage = page.getByText("Datapack Config Updated");
  await configMessage.waitFor({ state: "visible" }).catch(() => {
    console.warn("Datapack Config Updated message not shown");
  });

  const generateChart = page.getByRole("button", { name: "Generate Chart" });
  await expect(generateChart).toBeEnabled();
  await generateChart.click();

  await expect(page.getByText("Loading Chart")).toBeHidden();
  await expect(page.getByText("Successfully generated chart")).toBeVisible();
  await expect(
    page.locator(".react-transform-component svg text").filter({ hasText: "Central Africa Cenozoic" })
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:5173");

  // Navigate to datapacks page
  await page.locator(".qsg-datapacks").click();
  await removeAutoLoadedDatapack(page);

  await expect(page).toHaveURL(/.*\/datapacks/);
  await expect(page.getByText("Add Datapacks")).toBeVisible();
  await expect(page.getByText("Pick the packs you want, then generate the chart.")).toBeVisible();
  await expect(datapackTitle(page, "Africa Bight")).toBeVisible();
});

test("datapack button is clickable", async ({ page }) => {
  const AfricaBightButton = datapackTitle(page, "Africa Bight");
  await AfricaBightButton.waitFor({ state: "visible" });
  await expect(AfricaBightButton).toBeVisible();
  await AfricaBightButton.click();

  await expect(page).toHaveURL(/.*\/datapack\/Africa%20Bight/);
  await expect(page.locator("text=Africa Bight Map")).toBeVisible();
  await expect(page.getByText("About", { exact: true }).first()).toBeVisible();
  await expect(page.locator("text=Description")).toBeVisible();
  await expect(page.locator("text=Authored By")).toBeVisible();
  await expect(page.locator("text=James Ogg")).toBeVisible();
  await expect(page.locator("text=Privacy")).toBeVisible();
  await expect(page.locator("text=Public")).toBeVisible();
  await expect(page.locator("text=File Name")).toBeVisible();
  await expect(page.locator("text=AfricaBight.map")).toBeVisible();

  await expect(page.getByText("View Data", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Discussion", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Warnings/).first()).toBeVisible();
});

test("datapack add-to-chart button is clickable", async ({ page }) => {
  const addButton = datapackAddButton(page, "Africa Bight");
  await expect(addButton).toBeVisible();
  await addButton.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();
});

test("check if confirm selection works", async ({ page }) => {
  const addButton = datapackAddButton(page, "Africa Bight");
  await expect(addButton).toBeVisible();
  await addButton.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();

  const confirmButton = page.getByRole("button", { name: "Confirm Selection" });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  await expect(page.getByText("Loading Datapacks")).toBeHidden();

  await expect(page.getByText("Datapack Config Updated")).toBeVisible();
});

test("check if generate chart and save chart works", async ({ page }) => {
  await generateBasicChart(page);

  const chartSvg = page.locator(".react-transform-component svg");
  await expect(
    page.locator(".react-transform-component svg text").filter({ hasText: "Central Africa Cenozoic" })
  ).toBeVisible();

  await expect(chartSvg.locator(`text=9`).first()).toBeVisible();

  await expect(chartSvg.locator("text=Delta").first()).toBeVisible();
  await expect(chartSvg.locator("text=Deep Marine")).toBeVisible();
  await expect(chartSvg.locator("text=ProDelta").last()).toBeVisible();
  await expect(chartSvg.locator("text=Ocean Crust")).toBeVisible();

  const downloadSvg = await saveChartAs(page, "svg");
  await saveChartAs(page, "pdf");
  await saveChartAs(page, "png");

  const downloadSvgPath = await downloadSvg.path();
  if (!downloadSvgPath) throw new Error("Download path not found");

  const downloadedSvg = await fs.readFile(downloadSvgPath, "utf-8");

  const parser = new DOMParser();
  const parsed = parser.parseFromString(downloadedSvg, "image/svg+xml");

  const isValidSvg = parsed.getElementsByTagName("parsererror").length === 0;
  expect(isValidSvg).toBe(true);
  expect(downloadedSvg).toContain("<svg");
  expect(downloadedSvg).toContain("Central Africa Cenozoic");
  await page.locator("text=Settings").click();
  await page.locator('input[value="10"]').fill("15");
  await page.locator('input[value="2"]').fill("1");

  await page.locator("text=Column").nth(1).click();
  await page.locator("data-testid=ArrowForwardIosSharpIcon").nth(1).click();
  await columnCheckbox(page, 4).click();

  await page.locator("text=Generate Chart").click();

  await expect(page.locator("text=Loading Chart")).toBeHidden();
  await expect(
    page.locator(".react-transform-component svg text").filter({ hasText: "Central Africa Cenozoic" })
  ).toBeVisible();

  await expect(chartSvg.locator(`text=9`).first()).toBeVisible();

  await expect(chartSvg.locator("text=Delta").first()).toBeVisible();
  await expect(chartSvg.locator("text=ProDelta").last()).toBeVisible();

  await page.locator("text=Settings").click();

  await page.locator("text=Map Points").first().click();
  await page.locator("text=Africa Bight").click();

  await expect(page.locator("data-testid=LocationOnSharpIcon").nth(0)).toBeVisible();
  await expect(page.locator("data-testid=LocationOnSharpIcon").nth(1)).toBeVisible();

  await page.locator("data-testid=LocationOnSharpIcon").nth(0).hover();

  await expect(page.locator("text=Nigeria Coast")).toBeVisible();
});

test("Load Basic Settings", async ({ page }) => {
  await page.locator("text=Settings").click();
  const loadSettingsButton = page.getByRole("button", { name: "Load Settings" }).first();
  await expect(loadSettingsButton).toBeVisible();
  await loadSettingsButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const fileChooserPromise = page.waitForEvent("filechooser");

  await dialog.getByText("Load", { exact: true }).click();

  const fileChooser = await fileChooserPromise;
  const settingsPath = path.resolve(dirname, "charts.test.ts-snapshots", "basicSettings.tsc");
  await fileChooser.setFiles(settingsPath);

  await expect(page.locator("text=Successfully loaded settings from basicSettings.tsc!")).toBeVisible({
    timeout: 10000
  });
});

test("check if generate crossplot works", async ({ page }) => {
  const addButton = datapackAddButton(page, "Africa Bight");

  await expect(addButton).toBeVisible();
  await addButton.click();

  const svg = page.locator("svg").first();
  await expect(svg).toBeVisible();

  const confirmButton = page.getByRole("button", { name: "Confirm Selection" });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  const loading = page.getByText("Loading Datapacks");
  await expect(loading).toBeHidden();

  const configMessage = page.getByText("Datapack Config Updated");
  await configMessage.waitFor({ state: "visible" }).catch(() => {
    console.warn("Datapack Config Updated message not shown");
  });

  await openCrossplotFromNav(page);

  const generateCrossplot = page.getByRole("button", { name: "Generate Crossplot" });
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

test("check sync of preview with window", async ({ page, context }) => {
  await generateBasicChart(page);
  const newWindowButton = await page.locator(".new-window-button");
  await expect(newWindowButton).toBeVisible();
  const [newPage] = await Promise.all([context.waitForEvent("page"), newWindowButton.click()]);

  await newPage.bringToFront();
  expect(newPage.url()).toContain("/chart-view/preview");
  await expect(newPage.locator("text=Central Africa Cenozoic")).toBeVisible({ timeout: 10000 });

  const newWindowButtonPrev = await newPage.locator(".new-window-button");
  await expect(newWindowButtonPrev).toBeHidden();

  await expect(newPage.locator(".lock-button")).toBeVisible();
  await newPage.locator(".lock-button").click();

  //bring first page to front and make an update
  await page.bringToFront();
  await page.locator("text=Datapacks").click();

  const addButton = datapackAddButton(page, "Australia");
  await addButton.click();

  const confirmButton = page.getByRole("button", { name: "Confirm Selection" });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  const generateChart = page.getByRole("button", { name: "Generate Chart" });
  await generateChart.click();
  //wait for chart to load
  await expect(page.getByText("Loading Chart")).toBeHidden();
  await expect(
    page.locator(".react-transform-component svg text").filter({ hasText: "Greater NW Shelf" })
  ).toBeVisible();

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
  await expect(chartSvg.locator("text=9").first()).toBeVisible();

  //click settings, expect input to be 12 for baseAge
  await page.locator("text=SETTINGS").click();
  const baseAgeInput = page.locator('input[value="12"]');
  await expect(baseAgeInput).toBeVisible();
});

//future PR test that popoff preview works with MCP link

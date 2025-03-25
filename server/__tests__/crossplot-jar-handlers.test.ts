import path from "path";
import fsPromises from "fs/promises";
import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import child_process from "child_process";
import * as util from "../src/util";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import * as shared from "@tsconline/shared";
import { assertAssetConfig } from "../src/types";
import { autoPlotPointsWithJar, convertCrossPlotWithModelsInJar } from "../src/crossplot/crossplot-handler";
async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>();
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
    mkdir: vi.fn(actual.mkdir),
    writeFile: vi.fn(() => {}),
    rm: vi.fn(actual.rm)
  };
});
vi.mock("@tsconline/shared", async () => {
  return {
    getUUIDOfDatapackType: vi.fn().mockReturnValue("test-uuid")
  };
});
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof child_process>();
  return {
    spawn: vi.fn(actual.spawn)
  };
});
const returnFilepaths = async (testCaseDir: string) => {
  const modelTextFilepath = path.join(testCaseDir, "models.txt");
  const settingsTextFilepath = path.join(testCaseDir, "settings.xml");
  const outputTextFilepath = path.join(testCaseDir, "output.txt");
  const datapackFilepath = path.join(testCaseDir, "datapack.txt");
  return { modelTextFilepath, settingsTextFilepath, outputTextFilepath, datapackFilepath };
};
const isCI = process.env.CI === "true" || !!process.env.GITHUB_ACTIONS;
const conversionTestKeys = path.join("server", "__tests__", "__data__", "conversion-test-keys");
describe("convertCrossPlotWithModelsInJar", async () => {
  const getActiveJar = vi.spyOn(util, "getActiveJar");
  const spawn = vi.spyOn(child_process, "spawn");
  const getDecryptedDatapackFilePath = vi.spyOn(fetchUserFiles, "getDecryptedDatapackFilePath");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const generatedOutputFileDirectory = path.join(conversionTestKeys, "generated-file");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    if (await checkFileExists(generatedOutputFileDirectory)) {
      await fsPromises.rm(generatedOutputFileDirectory, { recursive: true, force: true });
    }
    await fsPromises.mkdir(generatedOutputFileDirectory, { recursive: true });
    const assetconfigs = JSON.parse(await fsPromises.readFile(path.join("server", "assets", "config.json"), "utf-8"));
    assertAssetConfig(assetconfigs);
    getActiveJar.mockImplementation(() => {
      return isCI
        ? "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar"
        : path.join("server", assetconfigs.activeJar);
    });
  });
  it("should return 500 if spawn fails", async () => {
    spawn.mockImplementationOnce(() => {
      throw new Error("Failed to spawn");
    });
    await expect(
      convertCrossPlotWithModelsInJar(
        [
          {
            title: "datapackTitle",
            type: "official"
          }
        ],
        "output",
        "models",
        "settings"
      )
    ).rejects.toThrow("Failed to spawn");
    expect(spawn).toHaveBeenCalledOnce();
  });
  it("should return 500 if bad datapack file", { timeout: 20000 }, async () => {
    const testCase = "test-case-2";
    const testCaseFilepath = path.join(conversionTestKeys, testCase);
    const { modelTextFilepath, settingsTextFilepath, datapackFilepath } = await returnFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackFilepath);
    const outputFileLocation = path.join(generatedOutputFileDirectory, `${testCase}-output.txt`);
    await convertCrossPlotWithModelsInJar(
      [
        {
          title: "datapackTitle",
          type: "official"
        }
      ],
      outputFileLocation,
      modelTextFilepath,
      settingsTextFilepath
    );
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveReturnedWith(false);
  });
  it("should return 200 and file if successful", { timeout: 20000 }, async () => {
    const testCase = "test-case-1";
    const testCaseFilepath = path.join(conversionTestKeys, testCase);
    const { datapackFilepath, modelTextFilepath, settingsTextFilepath, outputTextFilepath } =
      await returnFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackFilepath);
    const correctOutput = await fsPromises.readFile(outputTextFilepath);
    const outputFileLocation = path.join(generatedOutputFileDirectory, `${testCase}-output.txt`);
    await convertCrossPlotWithModelsInJar(
      [
        {
          title: "datapackTitle",
          type: "official"
        }
      ],
      outputFileLocation,
      modelTextFilepath,
      settingsTextFilepath
    );
    const generatedOutput = await fsPromises.readFile(outputFileLocation);
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledOnce();
    expect(correctOutput).toEqual(generatedOutput);
    expect(verifyFilepath).toHaveBeenCalledOnce();
    await fsPromises.rm(outputFileLocation, { force: true }).catch(() => {
      // eslint-disable-next-line no-console
    });
  });
});
describe("autoPlotPointsWithJar", async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const conversionTestKeys = path.join("server", "__tests__", "__data__", "auto-plot-test-keys");
  const generatedOutputFileDirectory = path.join(conversionTestKeys, "generated-file");
  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    if (await checkFileExists(generatedOutputFileDirectory)) {
      await fsPromises.rm(generatedOutputFileDirectory, { recursive: true, force: true });
    }
    await fsPromises.mkdir(generatedOutputFileDirectory, { recursive: true });
    const assetconfigs = JSON.parse(await fsPromises.readFile(path.join("server", "assets", "config.json"), "utf-8"));
    assertAssetConfig(assetconfigs);
    getActiveJar.mockImplementation(() => {
      return isCI
        ? "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar"
        : path.join("server", assetconfigs.activeJar);
    });
  });
  const getDecryptedDatapackFilePath = vi.spyOn(fetchUserFiles, "getDecryptedDatapackFilePath");
  const getUUIDOfDatapackType = vi.spyOn(shared, "getUUIDOfDatapackType");
  const getActiveJar = vi.spyOn(util, "getActiveJar");
  const spawn = vi.spyOn(child_process, "spawn");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  it("should throw an error if spawn fails", async () => {
    spawn.mockImplementationOnce(() => {
      throw new Error("Failed to spawn");
    });
    await expect(
      autoPlotPointsWithJar(
        [
          {
            title: "datapackTitle",
            type: "official"
          }
        ],
        "output",
        "settings"
      )
    ).rejects.toThrow("Failed to spawn");
    expect(spawn).toHaveBeenCalledOnce();
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(getUUIDOfDatapackType).toHaveBeenCalledOnce();
  });
  it("should return ");
});

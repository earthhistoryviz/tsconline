import path from "path";
import { afterEach, beforeEach, vi, describe, beforeAll, it, expect } from "vitest";
import * as util from "../src/util";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import * as child_process from "child_process";
import * as fsPromises from "fs/promises";
import { convertCrossPlotWithModelsInJar } from "../src/crossplot-handler";
import { assertAssetConfig } from "../src/types";

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
vi.mock("../src/util", async (importOriginal) => {
    const actual = await importOriginal<typeof util>();
    return {
        getActiveJar: vi.fn(() => "test.jar"),
        verifyFilepath: vi.fn(actual.verifyFilepath)
    };
});
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>();
  return {
    ...actual,
    readFile: vi.fn(actual.readFile)
  };
});
vi.mock("../src/user/fetch-user-files", async () => {
  return {
    getDecryptedDatapackFilePath: vi.fn().mockResolvedValue("datapack/filepath")
  };
});

vi.mock("child_process", async (importOriginal) => {
    const actual = await importOriginal<typeof child_process>();
  return {
    spawn: vi.fn(actual.spawn)
  }
});
const returnFilepaths = async (testCaseDir: string) => {
    const modelTextFilepath = path.join(testCaseDir, "models.txt");
    const settingsTextFilepath = path.join(testCaseDir, "settings.xml");
    const outputTextFilepath = path.join(testCaseDir, "output.txt");
    const datapackFilepath = path.join(testCaseDir, "datapack.txt");
    return { modelTextFilepath, settingsTextFilepath, outputTextFilepath, datapackFilepath };
}

const isCI = process.env.CI === "true" || !!process.env.GITHUB_ACTIONS;
const keys = path.join("server", "__tests__", "__data__", "conversion-test-keys");
describe("jar tests", async () => {
  const getActiveJar = vi.spyOn(util, "getActiveJar");
  const spawn = vi.spyOn(child_process, "spawn");
  const getDecryptedDatapackFilePath = vi.spyOn(fetchUserFiles, "getDecryptedDatapackFilePath");
  const generatedOutputFileLocation = path.join(keys, "generated-file", "output.txt");
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach( async () => {
    await fsPromises.rm(generatedOutputFileLocation, { force: true });
  })
  beforeAll(async () => {
    const generatedFileLocation = path.join(keys, "generated-file");
    if (await checkFileExists(generatedFileLocation)) {
      await fsPromises.rm(generatedFileLocation, { recursive: true, force: true });
    }
    await fsPromises.mkdir(generatedFileLocation, { recursive: true });
    const assetconfigs = JSON.parse(await fsPromises.readFile(path.join("server", "assets", "config.json"), "utf-8"));
    assertAssetConfig(assetconfigs);
    getActiveJar.mockImplementation(() => {
      return isCI
        ? "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar"
        : path.join("server",assetconfigs.activeJar);
    });
  });
  it("should return 500 if spawn fails", async () => {
    spawn.mockImplementationOnce(() => {
      throw new Error("Failed to spawn");
    });
    await expect(convertCrossPlotWithModelsInJar("uuid", "datapackTitle", "output", "models", "settings")).rejects.toThrow(
        "Failed to spawn"
        );
    expect(spawn).toHaveBeenCalledOnce();
  });
  it("should return 500 if bad datapack file", async () => {
    const testCase = "test-case-2";
    const testCaseFilepath = path.join(keys, testCase);
    const { modelTextFilepath, settingsTextFilepath, datapackFilepath } = await returnFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackFilepath);
    await convertCrossPlotWithModelsInJar("uuid", "datapackTitle", generatedOutputFileLocation, modelTextFilepath, settingsTextFilepath);
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(util.verifyFilepath).toHaveBeenCalledOnce();
    expect(util.verifyFilepath).toHaveReturnedWith(false)
    });
  it("should return 200 and file if successful", { timeout: 20000 }, async () => {
    const testCase = "test-case-1";
    const testCaseFilepath = path.join(keys, testCase);
    const { datapackFilepath, modelTextFilepath, settingsTextFilepath, outputTextFilepath } = await returnFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackFilepath);
    const correctOutput = await fsPromises.readFile(outputTextFilepath);
    await convertCrossPlotWithModelsInJar("uuid", "datapackTitle", generatedOutputFileLocation, modelTextFilepath, settingsTextFilepath);
    const generatedOutput = await fsPromises.readFile(generatedOutputFileLocation);
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledOnce();
    expect(correctOutput).toEqual(generatedOutput);
    expect(util.verifyFilepath).toHaveBeenCalledOnce();
  });
});

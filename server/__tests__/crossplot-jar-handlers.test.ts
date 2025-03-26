import path from "path";
import fsPromises from "fs/promises";
import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import * as child_process from "child_process";
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
vi.mock("../src/user/fetch-user-files", async () => {
  return {
    getDecryptedDatapackFilePath: vi.fn().mockResolvedValue("datapack/filepath")
  };
});
vi.mock("../src/util", async (importOriginal) => {
  const actual = await importOriginal<typeof util>();
  return {
    verifyFilepath: vi.fn(actual.verifyFilepath),
    getActiveJar: vi.fn(() => "test.jar")
  };
});
const getActiveJar = vi.spyOn(util, "getActiveJar");
beforeAll(async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  // vi.spyOn(console, "log").mockImplementation(() => undefined);
  const assetconfigs = JSON.parse(await fsPromises.readFile(path.join("server", "assets", "config.json"), "utf-8"));
  assertAssetConfig(assetconfigs);
  getActiveJar.mockImplementation(() => {
    return isCI
      ? "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar"
      : path.join("server", assetconfigs.activeJar);
  });
});
const returnModelConversionFilepaths = (testCaseDir: string) => {
  const modelTextFilepath = path.join(testCaseDir, "models.txt");
  const settingsTextFilepath = path.join(testCaseDir, "settings.xml");
  const outputTextFilepath = path.join(testCaseDir, "output.txt");
  const datapackFilepath = path.join(testCaseDir, "datapack.txt");
  return { modelTextFilepath, settingsTextFilepath, outputTextFilepath, datapackFilepath };
};
const isCI = process.env.CI === "true" || !!process.env.GITHUB_ACTIONS;
const conversionTestKeys = path.join("server", "__tests__", "__data__", "conversion-test-keys");
describe("convertCrossPlotWithModelsInJar", async () => {
  const spawn = vi.spyOn(child_process, "spawn");
  const getDecryptedDatapackFilePath = vi.spyOn(fetchUserFiles, "getDecryptedDatapackFilePath");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const generatedOutputFileDirectory = path.join(conversionTestKeys, "generated-file");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  beforeAll(async () => {
    if (await checkFileExists(generatedOutputFileDirectory)) {
      await fsPromises.rm(generatedOutputFileDirectory, { recursive: true, force: true });
    }
    await fsPromises.mkdir(generatedOutputFileDirectory, { recursive: true });
  });
  it("should throw error if spawn fails", async () => {
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
    expect(getActiveJar).toHaveBeenCalledOnce();
  });
  it("should return false if bad datapack file", { timeout: 20000 }, async () => {
    const testCase = "test-case-2";
    const testCaseFilepath = path.join(conversionTestKeys, testCase);
    const { modelTextFilepath, settingsTextFilepath, datapackFilepath } =
      returnModelConversionFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackFilepath);
    const outputFileLocation = path.join(generatedOutputFileDirectory, `${testCase}-output.txt`);
    const response = await convertCrossPlotWithModelsInJar(
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
    expect(response).toEqual(false);
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveReturnedWith(false);
  });
  it("should return true and export output file if successful", { timeout: 20000 }, async () => {
    const testCase = "test-case-1";
    const testCaseFilepath = path.join(conversionTestKeys, testCase);
    const { datapackFilepath, modelTextFilepath, settingsTextFilepath, outputTextFilepath } =
      returnModelConversionFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackFilepath);
    const correctOutput = await fsPromises.readFile(outputTextFilepath);
    const outputFileLocation = path.join(generatedOutputFileDirectory, `${testCase}-output.txt`);
    const response = await convertCrossPlotWithModelsInJar(
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
    expect(response).toEqual(true);
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
const returnAutoPlotFilepaths = (testCaseDir: string) => {
  const settingsTextFilepath = path.join(testCaseDir, "settings.xml");
  const outputTextFilepath = path.join(testCaseDir, "output.txt");
  const datapackOneFilepath = path.join(testCaseDir, "ma.txt");
  const datapackTwoFilepath = path.join(testCaseDir, "feet.txt");
  return {
    settingsTextFilepath,
    outputTextFilepath,
    datapackOneFilepath,
    datapackTwoFilepath
  };
};
describe("autoPlotPointsWithJar", async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const conversionTestKeys = path.join("server", "__tests__", "__data__", "auto-plot-test-keys");
  const generatedOutputFileDirectory = path.join(conversionTestKeys, "generated-file");
  beforeAll(async () => {
    if (await checkFileExists(generatedOutputFileDirectory)) {
      await fsPromises.rm(generatedOutputFileDirectory, { recursive: true, force: true });
    }
    await fsPromises.mkdir(generatedOutputFileDirectory, { recursive: true });
  });
  const getDecryptedDatapackFilePath = vi.spyOn(fetchUserFiles, "getDecryptedDatapackFilePath");
  const getUUIDOfDatapackType = vi.spyOn(shared, "getUUIDOfDatapackType");
  const spawn = vi.spyOn(child_process, "spawn");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  it("should return false if less than 2 datapacks", async () => {
    const response = await autoPlotPointsWithJar(
      [
        {
          title: "datapackTitle",
          type: "official"
        }
      ],
      "output",
      "settings"
    );
    expect(response).toEqual(false);
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledOnce();
    expect(getUUIDOfDatapackType).toHaveBeenCalledOnce();
  });
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
          },
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
    expect(getActiveJar).toHaveBeenCalledOnce();
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledTimes(2);
    expect(getUUIDOfDatapackType).toHaveBeenCalledTimes(2);
  });
  it("should return false if bad datapack file", async () => {
    const testCase = "bad-test-case-1";
    const testCaseFilepath = path.join(conversionTestKeys, testCase);
    const { datapackOneFilepath, datapackTwoFilepath, settingsTextFilepath } =
      returnAutoPlotFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackOneFilepath).mockResolvedValueOnce(datapackTwoFilepath);
    const outputFileLocation = path.join(generatedOutputFileDirectory, `${testCase}-output.txt`);
    const response = await autoPlotPointsWithJar(
      [
        {
          title: "datapackTitle",
          type: "official"
        },
        {
          title: "datapackTitle",
          type: "official"
        }
      ],
      outputFileLocation,
      settingsTextFilepath
    );
    expect(response).toEqual(false);
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(verifyFilepath).toHaveReturnedWith(false);
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledTimes(2);
    expect(getUUIDOfDatapackType).toHaveBeenCalledTimes(2);
  });
  it("should return true and correct output file if successful", async () => {
    const testCase = "test-case-1";
    const testCaseFilepath = path.join(conversionTestKeys, testCase);
    const { datapackOneFilepath, datapackTwoFilepath, settingsTextFilepath, outputTextFilepath } =
      returnAutoPlotFilepaths(testCaseFilepath);
    getDecryptedDatapackFilePath.mockResolvedValueOnce(datapackOneFilepath).mockResolvedValueOnce(datapackTwoFilepath);
    const outputFileLocation = path.join(generatedOutputFileDirectory, `${testCase}-output.txt`);
    const response = await autoPlotPointsWithJar(
      [
        {
          title: "datapackTitle",
          type: "official"
        },
        {
          title: "datapackTitle",
          type: "official"
        }
      ],
      outputFileLocation,
      settingsTextFilepath
    );
    expect(response).toEqual(true);
    const correctOutput = await fsPromises.readFile(outputTextFilepath, "utf-8");
    const generatedOutput = await fsPromises.readFile(outputFileLocation, "utf-8");
    console.log("generatedOutput", generatedOutput);
    console.log("correctOutput", correctOutput);
    expect(generatedOutput).toEqual(correctOutput);
    expect(verifyFilepath).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledOnce();
    expect(getDecryptedDatapackFilePath).toHaveBeenCalledTimes(2);
    expect(getUUIDOfDatapackType).toHaveBeenCalledTimes(2);
    await fsPromises.rm(outputFileLocation, { force: true }).catch(() => {
      // eslint-disable-next-line no-console
    });
  });
});

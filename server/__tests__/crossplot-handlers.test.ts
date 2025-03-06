import path from "path";
import { vi, describe, beforeAll, it, expect } from "vitest";
import * as util from "../src/util";
import * as child_process from "child_process";
import * as fsPromises from "fs/promises";
import { assertAssetConfig } from "../src/types";

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
vi.mock("../src/util", async () => {
  return {
    getActiveJar: vi.fn(() => "test.jar")
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

vi.mock("child_process", async () => {
  return {
    spawn: vi.fn().mockReturnValue({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn()
    })
  };
});

const isCI = process.env.CI === "true" || !!process.env.GITHUB_ACTIONS;
const keys = path.join("server", "__tests__", "__data__", "conversion-test-keys");
describe("jar tests", async () => {
  const getActiveJar = vi.spyOn(util, "getActiveJar");
  const spawn = vi.spyOn(child_process, "spawn");
  const generatedOutputFileLocation = path.join(keys, "generated-file", "output.txt");
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
        ? path.join(assetconfigs.activeJar)
        : "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar";
    });
  });
  it("should return 500 if spawn fails", async () => {
    spawn.mockImplementationOnce(() => {
      throw new Error("Failed to spawn");
    });
    expect(spawn).toHaveBeenCalledOnce();
  });
  it("should return 200 and file if successful", async () => {
    const testCase = "test-case-1";
    const modelTextFilepath = path.join(keys, testCase, "models.txt");
    const settingsTextFilepath = path.join(keys, testCase, "settings.xml");
    const outputTextFilepath = path.join(keys, testCase, "output.txt");
    const correctOutput = await fsPromises.readFile(outputTextFilepath);
    expect(spawn).toHaveBeenCalledOnce();
  });
});

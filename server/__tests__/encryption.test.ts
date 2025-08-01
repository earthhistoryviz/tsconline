import { vi, beforeAll, afterAll, describe, it, expect } from "vitest";
import { getEncryptionDatapackFileSystemDetails, runJavaEncrypt } from "../src/encryption";
import { access, readFile, rm } from "fs/promises";
import { assertAssetConfig } from "../src/types";
import path from "path";
import * as userHandler from "../src/user/user-handler";
vi.mock("../src/user/user-handler", async () => {
  return {
    getUploadedDatapackFilepath: vi.fn().mockResolvedValue("test/filepath"),
    getEncryptedDatapackDirectory: vi
      .fn()
      .mockResolvedValue({ encryptedDir: "test/encryptedDir", encryptedFilepath: "test/encryptedFilepath" })
  };
});
vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof path>();
  return {
    default: {
      ...actual,
      parse: vi.fn().mockReturnValue({ base: "test/filename" })
    }
  };
});
beforeAll(async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

describe("runJavaEncrypt", async () => {
  afterAll(async () => {
    const generatedFilePath = path.resolve("server/__tests__/__data__/encryption-test-generated-file/");
    await rm(generatedFilePath, { recursive: true, force: true });
    if (await checkFileExists(generatedFilePath)) {
      throw new Error("test generated file directory shouldn't exist");
    }
  });
  let jarFilePath = "";
  const resultPath = "server/__tests__/__data__/encryption-test-generated-file";
  try {
    const contents = JSON.parse((await readFile("server/assets/config.json")).toString());
    assertAssetConfig(contents);
    jarFilePath = "server/" + contents.activeJar;
  } catch (e) {
    throw new Error("ERROR: Failed to load local jar file path from assets/config.json.  Error was: " + e);
  }
  if (!jarFilePath) throw new Error("jar file path shouldn't be empty");
  it("should correctly encrypt an unencrypted TSCreator txt file", { timeout: 20000 }, async () => {
    if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-1.txt"))) {
      await runJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-1.txt", resultPath);
    } else {
      throw new Error("test generated file shouldn't exist at this point");
    }
    const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-1.txt";
    const keyFilePath1 = "server/__tests__/__data__/encryption-test-keys/test-1-key.txt";
    const keyFilePath2 = "server/__tests__/__data__/encryption-test-keys/test-1-key(2).txt";
    const [result, key1, key2] = await Promise.all([
      readFile(resultFilePath),
      readFile(keyFilePath1),
      readFile(keyFilePath2)
    ]);
    const sameLength = (value: number) => value == key1.length || value == key2.length;
    const sameContent = (value: Buffer) => value.equals(key1) || value.equals(key2);
    expect(result.length).toSatisfy(sameLength);
    expect(result).toSatisfy(sameContent);
  });
  it(
    "should correctly encrypt an encrypted TSCreator txt file, when the TSCreator Encrypted Datafile title is manually removed from the original encrypted file.",
    { timeout: 20000 },
    async () => {
      if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-2.txt"))) {
        await runJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-2.txt", resultPath);
      } else {
        throw new Error("test generated file shouldn't exist at this point");
      }
      const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-2.txt";
      const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-2-key.txt";
      const [result, key] = await Promise.all([readFile(resultFilePath), readFile(keyFilePath)]);
      expect(result.length).toBe(key.length);
      expect(result).toEqual(key);
    }
  );
  it("should correctly encrypt an unencrypted TSCreator zip file", { timeout: 20000 }, async () => {
    if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-5.dpk"))) {
      await runJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-5.zip", resultPath);
    } else {
      throw new Error("test generated file shouldn't exist at this point");
    }
    const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-5.dpk";
    const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-5-key.dpk";
    const [result, key] = await Promise.all([readFile(resultFilePath), readFile(keyFilePath)]);
    expect(result.length).toBe(key.length);
    expect(result).toEqual(key);
  });
  it("should correctly encrypt an encrypted TSCreator zip file", { timeout: 20000 }, async () => {
    if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-6.dpk"))) {
      await runJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-6.zip", resultPath);
    } else {
      throw new Error("test generated file shouldn't exist at this point");
    }
    const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-6.dpk";
    const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-6-key.dpk";
    const [result, key] = await Promise.all([readFile(resultFilePath), readFile(keyFilePath)]);
    expect(result.length).toBe(key.length);
    expect(result).toEqual(key);
  });
  it("should not encrypt a bad txt file", async () => {
    await runJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-3.txt", resultPath);
    expect(!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-3.txt")));
  });
  it("should not encrypt an encrypted TSCreator txt file with the TSCreator Encrypted Datafile title", async () => {
    await runJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-4.txt", resultPath);
    expect(!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-4.txt")));
  });
});

describe("getEncryptionDatapackFileSystemDetails", async () => {
  const getUploadedDatapackFilepath = vi.spyOn(userHandler, "getUploadedDatapackFilepath");
  const getEncryptedDatapackDirectory = vi.spyOn(userHandler, "getEncryptedDatapackDirectory");
  it("should return the correct file system details for a given datapack", async () => {
    const result = await getEncryptionDatapackFileSystemDetails("test-uuid", "test-datapack");
    expect(result).toEqual({
      filepath: "test/filepath",
      filename: "test/filename",
      encryptedDir: "test/encryptedDir",
      encryptedFilepath: "test/encryptedFilepath"
    });
    expect(getUploadedDatapackFilepath).toHaveBeenCalledWith("test-uuid", "test-datapack");
    expect(getEncryptedDatapackDirectory).toHaveBeenCalledWith("test-uuid", "test-datapack");
  });
});

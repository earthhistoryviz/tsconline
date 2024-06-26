import { vi, beforeAll, afterAll, describe, beforeEach, it, expect, test } from "vitest";
import fastify, { FastifyRequest, FastifyInstance } from "fastify";
import fastifySecureSession from "@fastify/secure-session";
import { exec } from "child_process";
import { requestDownload } from "../src/routes";
import * as runJavaEncryptModule from "../src/encryption";
import * as utilModule from "../src/util";
import * as fspModule from "fs/promises";
import * as fsModule from "fs";
import * as mkdirpModule from "mkdirp";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof fsModule>();
  return {
    ...actual,
    createReadStream: vi.fn().mockImplementation(() => { })
  };
});

vi.mock("mkdirp", async (importOriginal) => {
  const actual = await importOriginal<typeof mkdirpModule>();
  return {
    ...actual,
    mkdirp: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fspModule>();
  return {
    ...actual,
    access: vi.fn().mockImplementation(() => {
      console.log("wrong!");
    }),
    readFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockReturnValue(undefined)
  };
});

vi.mock("../src/encryption.js", async (importOriginal) => {
  const actual = await importOriginal<typeof runJavaEncryptModule>();
  return {
    ...actual,
    runJavaEncrypt: vi.fn().mockResolvedValue(undefined)
  };
});
vi.mock("../src/index", async () => {
  return {
    assetconfigs: { activeJar: "", uploadDirectory: "" },
    datapackIndex: {},
    mapPackIndex: {}
  };
});

vi.mock("../src/util", async (importOriginal) => {
  const actual = await importOriginal<typeof utilModule>();
  return {
    ...actual,
    assetconfigs: { uploadDirectory: "" },
    loadAssetConfigs: vi.fn().mockImplementation(() => { }),
    deleteDirectory: vi.fn().mockImplementation(() => { }),
    resetUploadDirectory: vi.fn().mockImplementation(() => { }),
    checkHeader: vi.fn().mockReturnValue(true)
  };
});

/*---------------------TEST--------------------*/

let app: FastifyInstance;
const uuid = "12345-abcde";
beforeAll(async () => {
  app = fastify();
  app.register(fastifySecureSession, {
    cookieName: "loginSession",
    key: Buffer.from("d30a7eae1e37a08d6d5c65ac91dfbc75b54ce34dd29153439979364046cc06ae", "hex"),
    cookie: {
      path: "/",
      httpOnly: true,
      domain: "localhost",
      secure: false,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  });
  app.get("/download/user-datapacks/:filename", requestDownload);
  app.get(
    "/hasuuid/download/user-datapacks/:filename",
    async (
      request: FastifyRequest<{ Params: { filename: string }; Querystring: { needEncryption?: boolean } }>,
      reply
    ) => {
      request.session.set("uuid", uuid);
      await requestDownload(request, reply);
    }
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await app.listen({ host: "", port: 1234 });
});

afterAll(async () => {
  await app.close();
  const cmd = `rm -rf server/__tests__/__data__/encryption-test-generated-file/`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requestDownload", () => {
  const readFileSpy = vi.spyOn(fspModule, "readFile");
  const checkHeaderSpy = vi.spyOn(utilModule, "checkHeader");
  const accessSpy = vi.spyOn(fspModule, "access");
  const runJavaEncryptSpy = vi.spyOn(runJavaEncryptModule, "runJavaEncrypt");
  const rmSpy = vi.spyOn(fspModule, "rm");
  const mkdirpSpy = vi.spyOn(mkdirpModule, "mkdirp");

  it("should reply with 500 when fail to create encrypted directory for the user", async () => {
    checkHeaderSpy.mockResolvedValueOnce(false);
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce(undefined);
    readFileSpy.mockResolvedValueOnce("default content");
    mkdirpSpy.mockRejectedValueOnce(new Error("Unknown Error"));

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(accessSpy).toHaveBeenCalledTimes(2);
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).toHaveBeenCalledTimes(1);
    expect(checkHeaderSpy).toHaveReturnedWith(false);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Failed to create encrypted directory with error Error: Unknown Error");
  });

  it("should reply 500 when an unknown error occured in readFile when retreive original", async () => {
    accessSpy.mockResolvedValueOnce(undefined);
    readFileSpy.mockRejectedValueOnce(new Error("Unknown error"));

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });
    expect(accessSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });

  it("should reply 500 when an unknown error occured in readFile when need encryption", async () => {
    accessSpy.mockResolvedValueOnce(undefined);
    readFileSpy.mockRejectedValueOnce(new Error("Unknown error"));

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(accessSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });

  it("should reply with 500 when the java program failed to encrypt the file (i.e. runJavaEncrypt failed)", async () => {
    runJavaEncryptSpy.mockRejectedValueOnce(new Error("Unknown error"));
    checkHeaderSpy.mockResolvedValueOnce(false);
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce(undefined);
    readFileSpy.mockResolvedValueOnce("default content");
    mkdirpSpy.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(readFileSpy).toHaveReturnedWith("default content");
    expect(checkHeaderSpy).toHaveBeenCalledTimes(1);
    expect(checkHeaderSpy).toHaveReturnedWith(false);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Failed to encrypt datapacks with error Error: Unknown error");
  });

  it("should remove the newly generated file and reply with 422 when runJavaEncrypt did not properly encrypt the file (i.e. the result file did not pass the header check)", async () => {
    runJavaEncryptSpy.mockResolvedValue(undefined);
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    checkHeaderSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    readFileSpy.mockResolvedValueOnce("default content").mockResolvedValueOnce("not properly encrypted");
    mkdirpSpy.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(runJavaEncryptSpy).toHaveReturnedWith(undefined);
    expect(checkHeaderSpy).toHaveBeenCalledTimes(2);
    expect(rmSpy).toHaveBeenCalled();
    expect(accessSpy).toBeCalledTimes(3);
    expect(response.statusCode).toBe(422);
    expect(response.json().error).toBe(
      "Java file was unable to encrypt the file :filename, resulting in an incorrect encryption header."
    );
  });

  it("should reply 401 if uuid is not present when request retrieve original file", async () => {
    const response1 = await app.inject({
      method: "GET",
      url: "/download/user-datapacks/:filename"
    });
    expect(response1.statusCode).toBe(401);
    expect(response1.json().error).toBe("User not logged in");
  });

  it("should reply 401 if uuid is not present when request encrypted download", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/download/user-datapacks/:nouuid?needEncryption=true"
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe("User not logged in");
  });

  it("should reply 404 if the file does not exist when request retrieve original", async () => {
    //retrieve original
    accessSpy.mockImplementationOnce(() => {
      const error: NodeJS.ErrnoException = new Error("File not found");
      error.code = "ENOENT";
      throw error;
    });
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe(`The file requested :filename does not exist within user's upload directory`);
  });
  it("should reply 404 if the file does not exist when request encrypted download", async () => {
    //need encryption
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      });
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe(`The file requested :filename does not exist within user's upload directory`);
  });
  it("should return the original file when request retrieve original file when the original file is unencrypted", async () => {
    // when the original file is unencrypted

    accessSpy.mockResolvedValueOnce(undefined);
    readFileSpy.mockResolvedValueOnce("default content");

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });

    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveReturnedWith("default content");
    expect(response.statusCode).toBe(200);
  });

  it("should return the original file when request retrieve original file when the original file is encrypted", async () => {
    // when the original file is encrypted
    accessSpy.mockResolvedValueOnce(undefined);
    readFileSpy.mockResolvedValueOnce("TSCreator Encrypted Datafile");

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveReturnedWith("TSCreator Encrypted Datafile");
    expect(response.statusCode).toBe(200);
  });

  it("should return a newly encrypted file when request encrypted download an unencrypted file which has not been encrypted before", async () => {
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    checkHeaderSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    mkdirpSpy.mockResolvedValueOnce(undefined);

    runJavaEncryptSpy.mockResolvedValue(undefined);
    readFileSpy.mockResolvedValueOnce("default content").mockResolvedValueOnce("TSCreator Encrypted Datafile");
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(runJavaEncryptSpy).toHaveBeenCalledTimes(1);
    expect(accessSpy).toHaveBeenCalledTimes(3);
    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(readFileSpy).toHaveNthReturnedWith(2, "TSCreator Encrypted Datafile");
    expect(checkHeaderSpy).toHaveBeenCalledTimes(2);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(2, true);
    expect(response.statusCode).toBe(200);
  });
  it("should return the old encrypted file when request encrypted download an unencrypted file which has been encrypted before", async () => {
    accessSpy.mockResolvedValueOnce(undefined);
    checkHeaderSpy.mockResolvedValueOnce(true);
    readFileSpy.mockResolvedValueOnce("TSCreator Encrypted Datafile");
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(accessSpy).toHaveBeenCalledTimes(1);
    expect(checkHeaderSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveReturnedWith("TSCreator Encrypted Datafile");
    expect(checkHeaderSpy).toHaveReturnedWith(true);
    expect(response.statusCode).toBe(200);
  });

  it("should return the original encrypted file when request encrypted download an encrypted file", async () => {
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce(undefined);
    checkHeaderSpy.mockResolvedValueOnce(true);
    readFileSpy.mockResolvedValueOnce("TSCreator Encrypted Datafile");
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(accessSpy).toHaveBeenCalledTimes(2);
    expect(accessSpy).not.toHaveNthReturnedWith(1, undefined);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveReturnedWith("TSCreator Encrypted Datafile");
    expect(checkHeaderSpy).toHaveBeenCalledTimes(1);
    expect(checkHeaderSpy).toHaveReturnedWith(true);
    expect(response.statusCode).toBe(200);
  });
  it("should remove the old encrypted file and encrypt again when the old file was not properly encrypted", async () => {
    runJavaEncryptSpy.mockResolvedValue(undefined);
    accessSpy.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    checkHeaderSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    readFileSpy
      .mockResolvedValueOnce("not properly encrypted")
      .mockResolvedValueOnce("default content")
      .mockResolvedValueOnce("TSCreator Encrypted Datafile");
    mkdirpSpy.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(rmSpy).toHaveBeenCalledTimes(1);
    expect(checkHeaderSpy).toHaveBeenCalledTimes(3);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(2, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(3, true);
    expect(readFileSpy).toHaveBeenCalledTimes(3);
    expect(readFileSpy).toHaveNthReturnedWith(1, "not properly encrypted");
    expect(readFileSpy).toHaveNthReturnedWith(2, "default content");
    expect(readFileSpy).toHaveNthReturnedWith(3, "TSCreator Encrypted Datafile");
    expect(runJavaEncryptSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });

  it("should reply 500 when an unknown error occured when try to access file when retreive original", async () => {
    accessSpy.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });
  it("should reply 500 when an unknown error occured when try to access file when need encryption", async () => {
    accessSpy.mockRejectedValueOnce(new Error("Unknown error"));

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });
});

vi.doUnmock("../src/encryption");
vi.doUnmock("fs/promises");
const { runJavaEncrypt: unmockedRunJavaEncrypt } = await import("../src/encryption");
const { readFile: unmockedReadFile, access: unmockedAccess } = await import("fs/promises");

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await unmockedAccess(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

let jarFilePath = "server/assets/jars/TSCreatorBASE-8.1_09June2024.jar"
let resultPath = "server/__tests__/__data__/encryption-test-generated-file"
if (await checkFileExists("/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar")) {
  jarFilePath = "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar";
  resultPath = "/home/runner/work/tsconline/tsconline/server/__tests__/__data__/encryption-test-generated-file";
}


describe("runJavaEncrypt", () => {
  it("should correctly encrypt an unencrypted TSCreator txt file", async () => {
    if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-1.txt"))) {
      await unmockedRunJavaEncrypt(
        jarFilePath,
        "server/__tests__/__data__/encryption-test-1.txt",
        resultPath
      );
    }
    const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-1.txt";
    const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-1-key.txt";
    const [result, key] = await Promise.all([unmockedReadFile(resultFilePath), unmockedReadFile(keyFilePath)]);
    expect(result).toEqual(key);
    // Compare the byte size (length)
    expect(result.length).toBe(key.length);
  });
  it("should correctly encrypt an encrypted TSCreator txt file, when the TSCreator Encrypted Datafile title is manually removed from the original encrypted file.", async () => {
    if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-2.txt"))) {
      await unmockedRunJavaEncrypt(
        jarFilePath,
        "server/__tests__/__data__/encryption-test-2.txt",
        resultPath
      );
    }
    const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-2.txt";
    const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-2-key.txt";
    const [result, key] = await Promise.all([unmockedReadFile(resultFilePath), unmockedReadFile(keyFilePath)]);
    expect(result).toEqual(key);
    // Compare the byte size (length)
    expect(result.length).toBe(key.length);
  });
  it("should correctly encrypt an unencrypted TSCreator zip file", async () => {
    if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-5.dpk"))) {
      await unmockedRunJavaEncrypt(
        jarFilePath,
        "server/__tests__/__data__/encryption-test-5.zip",
        resultPath
      );
    }
    const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-5.dpk";
    const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-5-key.dpk";
    const [result, key] = await Promise.all([unmockedReadFile(resultFilePath), unmockedReadFile(keyFilePath)]);
    expect(result).toEqual(key);
    // Compare the byte size (length)
    expect(result.length).toBe(key.length);
  });
  it("should correctly encrypt an encrypted TSCreator zip file", async () => {
    if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-6.dpk"))) {
      await unmockedRunJavaEncrypt(
        jarFilePath,
        "server/__tests__/__data__/encryption-test-6.zip",
        resultPath
      );
    }
    const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-6.dpk";
    const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-6-key.dpk";
    const [result, key] = await Promise.all([unmockedReadFile(resultFilePath), unmockedReadFile(keyFilePath)]);
    expect(result).toEqual(key);
    // Compare the byte size (length)
    expect(result.length).toBe(key.length);
  });
  it("should not encrypt a bad txt file", async () => {
    await unmockedRunJavaEncrypt(
      jarFilePath,
      "server/__tests__/__data__/encryption-test-3.txt",
      resultPath
    );
    expect(!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-3.txt")));
  });
  it("should not encrypt an encrypted TSCreator txt file with the TSCreator Encrypted Datafile title", async () => {
    await unmockedRunJavaEncrypt(
      jarFilePath,
      "server/__tests__/__data__/encryption-test-4.txt",
      resultPath
    );
    expect(!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-4.txt")));
  });
});

vi.doUnmock("../src/util");
const { checkHeader: unmockedCheckHeader } = await import("../src/util");

vi.mock("readline/promises", async () => {
  return {
    createInterface: vi
      .fn()
      .mockImplementationOnce(() => {
        const lines: string[] = ["TSCreator Encrypted Datafile"];
        return lines;
      })
      .mockImplementationOnce(() => {
        const lines: string[] = ["default content"];
        return lines;
      })
  };
});

describe("checkHeader", () => {
  test('checkHeader("encrypted.txt") returns true', async () => {
    expect(await unmockedCheckHeader("encrypted.txt")).toEqual(true);
  });
  test('checkHeader("unencrypted.txt") returns false', async () => {
    expect(await unmockedCheckHeader("unencrypted.txt")).toEqual(false);
  });
});

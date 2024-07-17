import { vi, beforeAll, afterAll, describe, beforeEach, it, expect, test } from "vitest";
import fastify, { FastifyRequest, FastifyInstance } from "fastify";
import fastifySecureSession from "@fastify/secure-session";
import { requestDownload } from "../src/routes";
import * as runJavaEncryptModule from "../src/encryption";
import * as utilModule from "../src/util";
import * as fspModule from "fs/promises";
import * as fsModule from "fs";
import { assertAssetConfig } from "../src/types";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof fsModule>();
  return {
    ...actual,
    createReadStream: vi.fn().mockImplementation(() => {})
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fspModule>();
  return {
    ...actual,
    realpath: vi.fn().mockResolvedValue("/12345-abcde/datapacks"), //only the first two test cases have different mocked value/implementation than this
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
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
    loadAssetConfigs: vi.fn().mockImplementation(() => {}),
    deleteDirectory: vi.fn().mockImplementation(() => {}),
    resetUploadDirectory: vi.fn().mockImplementation(() => {}),
    checkHeader: vi.fn().mockReturnValue(true)
  };
});

vi.mock("path", async () => {
  return {
    default: {
      join: (...args: string[]) => {
        return args.join("/");
      },
      resolve: (...args: string[]) => {
        return args.join("/");
      }
    }
  };
});

/*----------------------TEST---------------------*/
const readFileSpy = vi.spyOn(fspModule, "readFile");
const checkHeaderSpy = vi.spyOn(utilModule, "checkHeader");
const accessSpy = vi.spyOn(fspModule, "access");
const runJavaEncryptSpy = vi.spyOn(runJavaEncryptModule, "runJavaEncrypt");
const rmSpy = vi.spyOn(fspModule, "rm");
const mkdirSpy = vi.spyOn(fspModule, "mkdir");
const realpathSpy = vi.spyOn(fspModule, "realpath");
let app: FastifyInstance;
const uuid = "12345-abcde";
beforeAll(async () => {
  app = fastify();
  app = fastify();
  await app.register(fastifySecureSession, {
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
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  await app.listen({ host: "", port: 1234 });
});

afterAll(async () => {
  await app.close();
  const { rm: unmockedRm } = await import("fs/promises");
  vi.doUnmock("path");
  const { resolve: unmockedResolve } = await import("path");
  const generatedFilePath = unmockedResolve("server/__tests__/__data__/encryption-test-generated-file/");
  await unmockedRm(generatedFilePath, { recursive: true, force: true });
  if (await checkFileExists(generatedFilePath)) {
    throw new Error("test generated file directory shouldn't exist");
  }
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requestDownload", () => {
  it("should reply 403 when realpath throw an error", async () => {
    realpathSpy.mockRejectedValueOnce(new Error("Unknown Error"));
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });
    expect(accessSpy).not.toHaveBeenCalled();
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toBe("Invalid file path");
  });

  it("should reply 403 when file path is invalid", async () => {
    realpathSpy.mockResolvedValueOnce("bad/file/path");
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });
    expect(accessSpy).not.toHaveBeenCalled();
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toBe("Invalid file path");
  });

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
    mkdirSpy.mockRejectedValueOnce(new Error("Unknown Error"));

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(accessSpy).toHaveBeenCalledTimes(2);
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Failed to create encrypted directory with error Error: Unknown Error");
    expect(rmSpy).not.toHaveBeenCalled();
  });

  it("should reply 500 when an unknown error occurred in readFile when retrieved original", async () => {
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

  it("should reply 500 when an unknown error occurred in readFile when need encryption", async () => {
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
    mkdirSpy.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(mkdirSpy).toHaveBeenCalledOnce();
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
    mkdirSpy.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(runJavaEncryptSpy).toHaveReturnedWith(undefined);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(2, false);
    expect(rmSpy).toHaveBeenCalledWith("/12345-abcde/encrypted-datapacks/:filename", { force: true });
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
  it("should return the original file when request retrieve original file", async () => {
    accessSpy.mockResolvedValueOnce(undefined);
    readFileSpy.mockResolvedValueOnce("original file");

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });

    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(readFileSpy).toHaveNthReturnedWith(1, "original file");
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from("original file");
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
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

    mkdirSpy.mockResolvedValueOnce(undefined);

    runJavaEncryptSpy.mockResolvedValue(undefined);
    readFileSpy.mockResolvedValueOnce("default content").mockResolvedValueOnce("TSCreator Encrypted Datafile");
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(runJavaEncryptSpy).toHaveBeenCalledOnce();
    expect(accessSpy).toHaveBeenCalledTimes(3);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(readFileSpy).toHaveNthReturnedWith(2, "TSCreator Encrypted Datafile");
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(2, true);
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from("TSCreator Encrypted Datafile");
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
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
    expect(readFileSpy).toHaveNthReturnedWith(1, "TSCreator Encrypted Datafile");
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, true);
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from("TSCreator Encrypted Datafile");
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
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
    expect(readFileSpy).toHaveNthReturnedWith(1, "TSCreator Encrypted Datafile");
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, true);
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from("TSCreator Encrypted Datafile");
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
  });
  it("should remove the old encrypted file and encrypt again when the old file was not properly encrypted", async () => {
    runJavaEncryptSpy.mockResolvedValueOnce(undefined);
    accessSpy.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    checkHeaderSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    readFileSpy
      .mockResolvedValueOnce("not properly encrypted")
      .mockResolvedValueOnce("default content")
      .mockResolvedValueOnce("TSCreator Encrypted Datafile");
    mkdirSpy.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });

    expect(rmSpy).toHaveBeenCalledTimes(1);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(2, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(3, true);
    expect(readFileSpy).toHaveNthReturnedWith(1, "not properly encrypted");
    expect(readFileSpy).toHaveNthReturnedWith(2, "default content");
    expect(readFileSpy).toHaveNthReturnedWith(3, "TSCreator Encrypted Datafile");
    expect(runJavaEncryptSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from("TSCreator Encrypted Datafile");
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
  });

  it("should reply 500 when an unknown error occured when try to access file when retreive original", async () => {
    accessSpy.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename"
    });
    expect(readFileSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });
  it("should reply 500 when an unknown error occured when try to access file when need encryption", async () => {
    accessSpy.mockRejectedValueOnce(new Error("Unknown error"));

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(readFileSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });

  it("should reply 500 when an unknown error occured when try to access the original file when need encryption (regular datapack file check)", async () => {
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockRejectedValueOnce(new Error("Unknown error"));

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(accessSpy).toHaveBeenCalledTimes(2);
    expect(readFileSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });

  it("should reply 404 when failed to process the file after successfully encrypted it", async () => {
    runJavaEncryptSpy.mockResolvedValueOnce(undefined);
    mkdirSpy.mockResolvedValueOnce(undefined);
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      });
    checkHeaderSpy.mockResolvedValueOnce(false);
    readFileSpy.mockResolvedValueOnce("default content");

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(response.statusCode).toBe(404);
    expect(runJavaEncryptSpy).toHaveNthReturnedWith(1, undefined);
    expect(mkdirSpy).toHaveNthReturnedWith(1, undefined);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(accessSpy).toHaveBeenCalledTimes(3);
    expect(rmSpy).not.toHaveBeenCalled();
    expect(response.json().error).toBe("Java file did not successfully process the file :filename");
  });

  it("should reply 500 when when an error occured when try to access the file after successfully encrypted it", async () => {
    runJavaEncryptSpy.mockResolvedValueOnce(undefined);
    mkdirSpy.mockResolvedValueOnce(undefined);
    accessSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Unknown Error"));
    checkHeaderSpy.mockResolvedValueOnce(false);
    readFileSpy.mockResolvedValueOnce("default content");

    const response = await app.inject({
      method: "GET",
      url: "/hasuuid/download/user-datapacks/:filename?needEncryption=true"
    });
    expect(response.statusCode).toBe(500);
    expect(runJavaEncryptSpy).toHaveNthReturnedWith(1, undefined);
    expect(mkdirSpy).toHaveNthReturnedWith(1, undefined);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(accessSpy).toHaveBeenCalledTimes(3);
    expect(rmSpy).not.toHaveBeenCalled();
    expect(response.json().error).toBe("An error occurred: Error: Unknown Error");
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

let jarFilePath = "";
let resultPath = "server/__tests__/__data__/encryption-test-generated-file";
if (await checkFileExists("/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar")) {
  jarFilePath = "/home/runner/work/tsconline/tsconline/server/assets/jars/testUsageJar.jar";
  resultPath = "/home/runner/work/tsconline/tsconline/server/__tests__/__data__/encryption-test-generated-file";
} else {
  try {
    const contents = JSON.parse((await unmockedReadFile("server/assets/config.json")).toString());
    assertAssetConfig(contents);
    jarFilePath = "server/" + contents.activeJar;
  } catch (e) {
    throw new Error("ERROR: Failed to load local jar file path from assets/config.json.  Error was: " + e);
  }
}
if (!jarFilePath) throw new Error("jar file path shouldn't be empty");

describe("runJavaEncrypt", async () => {
  it(
    "should correctly encrypt an unencrypted TSCreator txt file",
    async () => {
      if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-1.txt"))) {
        await unmockedRunJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-1.txt", resultPath);
      } else {
        throw new Error("test generated file shouldn't exist at this point");
      }
      const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-1.txt";
      const keyFilePath1 = "server/__tests__/__data__/encryption-test-keys/test-1-key.txt";
      const keyFilePath2 = "server/__tests__/__data__/encryption-test-keys/test-1-key(2).txt";
      const [result, key1, key2] = await Promise.all([
        unmockedReadFile(resultFilePath),
        unmockedReadFile(keyFilePath1),
        unmockedReadFile(keyFilePath2)
      ]);
      const sameLength = (value: number) => value == key1.length || value == key2.length;
      const sameContent = (value: Buffer) => value.equals(key1) || value.equals(key2);
      expect(result.length).toSatisfy(sameLength);
      expect(result).toSatisfy(sameContent);
    },
    { timeout: 20000 }
  );
  it(
    "should correctly encrypt an encrypted TSCreator txt file, when the TSCreator Encrypted Datafile title is manually removed from the original encrypted file.",
    async () => {
      if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-2.txt"))) {
        await unmockedRunJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-2.txt", resultPath);
      } else {
        throw new Error("test generated file shouldn't exist at this point");
      }
      const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-2.txt";
      const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-2-key.txt";
      const [result, key] = await Promise.all([unmockedReadFile(resultFilePath), unmockedReadFile(keyFilePath)]);
      expect(result.length).toBe(key.length);
      expect(result).toEqual(key);
    },
    { timeout: 20000 }
  );
  it(
    "should correctly encrypt an unencrypted TSCreator zip file",
    async () => {
      if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-5.dpk"))) {
        await unmockedRunJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-5.zip", resultPath);
      } else {
        throw new Error("test generated file shouldn't exist at this point");
      }
      const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-5.dpk";
      const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-5-key.dpk";
      const [result, key] = await Promise.all([unmockedReadFile(resultFilePath), unmockedReadFile(keyFilePath)]);
      expect(result.length).toBe(key.length);
      expect(result).toEqual(key);
    },
    { timeout: 20000 }
  );
  it(
    "should correctly encrypt an encrypted TSCreator zip file",
    async () => {
      if (!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-6.dpk"))) {
        await unmockedRunJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-6.zip", resultPath);
      } else {
        throw new Error("test generated file shouldn't exist at this point");
      }
      const resultFilePath = "server/__tests__/__data__/encryption-test-generated-file/encryption-test-6.dpk";
      const keyFilePath = "server/__tests__/__data__/encryption-test-keys/test-6-key.dpk";
      const [result, key] = await Promise.all([unmockedReadFile(resultFilePath), unmockedReadFile(keyFilePath)]);
      expect(result.length).toBe(key.length);
      expect(result).toEqual(key);
    },
    { timeout: 20000 }
  );
  it("should not encrypt a bad txt file", async () => {
    await unmockedRunJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-3.txt", resultPath);
    expect(!(await checkFileExists("server/__tests__/__data__/encryption-test-generated-file/encryption-test-3.txt")));
  });
  it("should not encrypt an encrypted TSCreator txt file with the TSCreator Encrypted Datafile title", async () => {
    await unmockedRunJavaEncrypt(jarFilePath, "server/__tests__/__data__/encryption-test-4.txt", resultPath);
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

import { test, vi, beforeAll, afterAll, describe, beforeEach, it, expect } from "vitest";
import fastify, { FastifyInstance, HTTPMethods, InjectOptions } from "fastify";
import fastifySecureSession from "@fastify/secure-session";
import * as runJavaEncryptModule from "../src/encryption";
import * as utilModule from "../src/util";
import * as fspModule from "fs/promises";
import * as database from "../src/database";
import * as verify from "../src/verify";
import logger from "../src/error-logger";
import * as fileMetadataHandler from "../src/file-metadata-handler";
import { userRoutes } from "../src/routes/user-auth";
import path from "path";
import * as pathModule from "path";
import * as userHandler from "../src/user/user-handler";
import { Datapack } from "@tsconline/shared";
import { User } from "../src/types";

vi.mock("../src/upload-handlers", async () => {
  return {
    getFileNameFromCachedDatapack: vi.fn(() => Promise.resolve(filename))
  };
});

vi.mock("../src/error-logger", async () => {
  return {
    default: {
      error: vi.fn().mockResolvedValue(undefined)
    }
  };
});

vi.mock("../src/database", async () => {
  return {
    findUser: vi.fn(() => Promise.resolve([testUser]))
  };
});

vi.mock("../src/file-metadata-handler", async () => {
  return {
    deleteDatapackFoundInMetadata: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock("../src/verify", async () => {
  return {
    checkRecaptchaToken: vi.fn().mockResolvedValue(1)
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fspModule>();
  return {
    ...actual,
    realpath: vi.fn().mockImplementation((str) => str),
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockReturnValue(undefined)
  };
});

vi.mock("../src/encryption", async (importOriginal) => {
  const actual = await importOriginal<typeof runJavaEncryptModule>();
  return {
    ...actual,
    runJavaEncrypt: vi.fn().mockResolvedValue(undefined)
  };
});
vi.mock("../src/index", async () => {
  return {
    datapackIndex: {},
    mapPackIndex: {}
  };
});

vi.mock("../src/util", async (importOriginal) => {
  const actual = await importOriginal<typeof utilModule>();
  return {
    ...actual,
    verifyFilepath: vi.fn().mockResolvedValue(true),
    assetconfigs: { uploadDirectory: "uploadDirectory" },
    loadAssetConfigs: vi.fn().mockImplementation(() => {}),
    deleteDirectory: vi.fn().mockImplementation(() => {}),
    resetUploadDirectory: vi.fn().mockImplementation(() => {}),
    checkHeader: vi.fn().mockReturnValue(true)
  };
});

vi.mock("../src/user/user-handler", () => {
  return {
    getUserDirectory: vi.fn().mockResolvedValue("userDirectory"),
    getDirectories: vi.fn().mockResolvedValue([]),
    fetchUserDatapack: vi.fn().mockResolvedValue({}),
    renameUserDatapack: vi.fn().mockResolvedValue({}),
    writeUserDatapack: vi.fn().mockResolvedValue({})
  };
});

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof pathModule>();
  return {
    default: {
      ...actual,
      join: (...args: string[]) => {
        return args.join("/");
      },
      resolve: (...args: string[]) => {
        return args.join("/");
      },
      basename: (arg: string) => {
        const split = arg.split(".");
        split.pop();
        return split.join(".");
      }
    },
    join: (...args: string[]) => {
      return args.join("/");
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
let app: FastifyInstance;
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
  app.addHook("onRequest", async (request, _reply) => {
    request.session = {
      ...request.session,
      get: (key: string) => {
        if (key === "uuid") {
          return request.headers["mock-uuid"];
        }
        return null;
      }
    };
  });
  await app.register(userRoutes, { prefix: "/user" });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  await app.listen({ host: "", port: 1234 });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});
const uuid = "123e4567-e89b-12d3-a456-426614174000";
const headers = { "mock-uuid": uuid, "recaptcha-token": "mock-token" };
const filename = "test_filename";
const uploadDirectory = utilModule.assetconfigs.uploadDirectory;
const testUser = {
  uuid,
  userId: 123,
  email: "test@example.com",
  emailVerified: 1,
  invalidateSession: 0,
  username: "testuser",
  hashedPassword: "password123",
  pictureUrl: "https://example.com/picture.jpg",
  isAdmin: 0
};

const routes: { method: HTTPMethods; url: string; body?: object }[] = [
  { method: "GET", url: `/user/datapack/download/${filename}`, body: { title: "title" } },
  { method: "POST", url: "/user/datapack" },
  { method: "DELETE", url: `/user/datapack/${filename}` },
  { method: "PATCH", url: `/user/datapack/${filename}`, body: { title: "new_title" } },
  { method: "GET", url: `/user/datapack/${filename}` }
];

describe("get a single user datapack", () => {
  const getUserDirectory = vi.spyOn(userHandler, "getUserDirectory");
  const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
  const findUser = vi.spyOn(database, "findUser");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 401 the user is not find", async () => {
    findUser.mockResolvedValueOnce([testUser as User]).mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(401);
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Unauthorized access" });
  });
  it("should reply 500 if an error occurred in findUser", async () => {
    findUser.mockResolvedValueOnce([testUser as User]).mockRejectedValueOnce(new Error("Database error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Database error" });
  });
  it("should reply 500 if an error occurred in getUserDirectory", async () => {
    getUserDirectory.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Failed to get user directory" });
  });
  it("should reply 500 if an error occurred in fetchUserDatapack", async () => {
    fetchUserDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(getUserDirectory).toHaveBeenCalledOnce();
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ error: "Datapack does not exist or cannot be found" });
  });
  it("should reply 200 if the datapack is successfully retrieved", async () => {
    fetchUserDatapack.mockResolvedValueOnce({ title: "test" } as Datapack);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(200);
    expect(getUserDirectory).toHaveBeenCalledOnce();
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ title: "test" });
  });
});

describe("verifySession tests", () => {
  describe.each(routes)("when request is %s %s", ({ method, url, body }) => {
    const findUser = vi.spyOn(database, "findUser");
    beforeEach(() => {
      findUser.mockClear();
    });
    it("should reply 401 when uuid is not found in session", async () => {
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url,
        headers: { "recaptcha-token": "mock-token", "mock-uuid": "" },
        payload: body
      });
      expect(findUser).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized access" });
    });
    it("should reply 401 when user is not found in database", async () => {
      findUser.mockResolvedValueOnce([]);
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url,
        headers,
        payload: body
      });
      expect(findUser).toHaveBeenCalledOnce();
      expect(response.statusCode).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized access" });
    });
    it("should reply 500 when an error occurred in database", async () => {
      findUser.mockRejectedValueOnce(new Error("Database error"));
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url,
        headers,
        payload: body
      });
      expect(findUser).toHaveBeenCalledOnce();
      expect(response.statusCode).toBe(500);
      expect(await response.json()).toEqual({ error: "Database error" });
    });
  });
});

describe("verifyRecaptcha tests", () => {
  describe.each(routes)("when request is %s %s", ({ method, url, body }) => {
    it("should reply 400 when recaptcha token is missing", async () => {
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url,
        headers: { "mock-uuid": uuid },
        payload: body
      });
      expect(response.statusCode).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing recaptcha token" });
    });
    it("should reply 422 when recaptcha failed", async () => {
      const checkRecaptchaToken = vi.spyOn(verify, "checkRecaptchaToken");
      checkRecaptchaToken.mockResolvedValueOnce(0);
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url,
        headers,
        payload: body
      });
      expect(checkRecaptchaToken).toHaveBeenCalledOnce();
      expect(response.statusCode).toBe(422);
      expect(await response.json()).toEqual({ error: "Recaptcha failed" });
    });
    it("should reply 500 when an error occurred in checkRecaptchaToken", async () => {
      const checkRecaptchaToken = vi.spyOn(verify, "checkRecaptchaToken");
      checkRecaptchaToken.mockRejectedValueOnce(new Error("Recaptcha error"));
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url,
        headers,
        payload: body
      });
      expect(checkRecaptchaToken).toHaveBeenCalledOnce();
      expect(response.statusCode).toBe(500);
      expect(await response.json()).toEqual({ error: "Recaptcha error" });
    });
  });
});

describe("edit datapack tests", () => {
  const getUserDirectory = vi.spyOn(userHandler, "getUserDirectory");
  const getDirectories = vi.spyOn(userHandler, "getDirectories");
  const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
  const renameUserDatapack = vi.spyOn(userHandler, "renameUserDatapack");
  const writeUserDatapack = vi.spyOn(userHandler, "writeUserDatapack");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 400 if no datapack is provided", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/",
      headers
    });
    expect(getUserDirectory).not.toHaveBeenCalled();
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(response.json().error).toBe("Missing datapack");
    expect(response.statusCode).toBe(400);
  });
  it("should reply 400 if no body is provided", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers
    });
    expect(getUserDirectory).not.toHaveBeenCalled();
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(response.json().error).toBe("Missing body");
    expect(response.statusCode).toBe(400);
  });
  test.each([{ storedFileName: "new_title" }, { originalFileName: "new_title" }, { size: 100 }])(
    `should reply 400 if bad body (DatapackMetadata props)`,
    async (body) => {
      const response = await app.inject({
        method: "PATCH",
        url: "/user/datapack/test",
        headers,
        body
      });
      expect(getUserDirectory).not.toHaveBeenCalled();
      expect(renameUserDatapack).not.toHaveBeenCalled();
      expect(response.json().error).toBe("Cannot edit originalFileName, storedFileName, or size");
    }
  );
  it("should reply 400 if body is not partial datapack metadata", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers,
      body: { wrong_key: "new_title" }
    });
    expect(response.json().error).toBe("Invalid body");
    expect(getUserDirectory).not.toHaveBeenCalled();
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if an error occurred in getUserDirectory", async () => {
    getUserDirectory.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers,
      body: { title: "new_title" }
    });
    expect(getUserDirectory).toHaveBeenCalledOnce();
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(response.json().error).toBe("Failed to get user directory");
    expect(response.statusCode).toBe(500);
  });
  it("should return 400 if the datapack already exists", async () => {
    getDirectories.mockResolvedValueOnce(["new_title"]);
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers,
      body: { title: "new_title" }
    });
    expect(getUserDirectory).toHaveBeenCalledOnce();
    expect(getDirectories).toHaveBeenCalledOnce();
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(response.json().error).toBe("Title already exists");
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if an error occurred in fetchUserDatapack", async () => {
    fetchUserDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers,
      body: { title: "new_title" }
    });
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(getDirectories).toHaveBeenCalledOnce();
    expect(response.json().error).toBe("Datapack does not exist or cannot be found");
    expect(getUserDirectory).toHaveBeenCalledOnce();
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if an error occurred in renameUserDatapack", async () => {
    fetchUserDatapack.mockResolvedValueOnce({
      title: "test",
      authoredBy: "author"
    } as Datapack);
    renameUserDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers,
      body: { title: "new_title" }
    });
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(getDirectories).toHaveBeenCalledOnce();
    expect(renameUserDatapack).toHaveBeenCalledOnce();
    expect(response.json().error).toBe("Failed to change datapack title.");
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if an error occurred in writeUserDatapack", async () => {
    writeUserDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers,
      body: { authoredBy: "author" }
    });
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(getDirectories).toHaveBeenCalledOnce();
    expect(writeUserDatapack).toHaveBeenCalledOnce();
    expect(response.json().error).toBe("Failed to write datapack information to file system");
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if the datapack is successfully edited (no title)", async () => {
    fetchUserDatapack.mockResolvedValueOnce({
      title: "test",
      authoredBy: "author"
    } as Datapack);
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers,
      body: { authoredBy: "new_author" }
    });
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(renameUserDatapack).not.toHaveBeenCalled();
    expect(writeUserDatapack).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Successfully updated test" });
  });
  it("should return 200 if the datapack is successfully edited (with title)", async () => {
    fetchUserDatapack.mockResolvedValueOnce({
      title: "test",
      authoredBy: "author"
    } as Datapack);
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers,
      body: { title: "new_title" }
    });
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(renameUserDatapack).toHaveBeenCalledOnce();
    expect(writeUserDatapack).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Successfully updated test" });
  });
});

describe("requestDownload", () => {
  const verifyFilepathSpy = vi.spyOn(utilModule, "verifyFilepath");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 403 when cached datapack is invalid", async () => {
    verifyFilepathSpy.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}`,
      headers
    });
    expect(accessSpy).not.toHaveBeenCalled();
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toBe("Invalid file path");
  });
  it("should reply 500 when verifyFilepath throws an error", async () => {
    verifyFilepathSpy.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}`,
      headers
    });
    expect(accessSpy).not.toHaveBeenCalled();
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Failed to load cached datapack");
  });

  it("should reply 403 when file path is invalid from loaded cache", async () => {
    verifyFilepathSpy.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}`,
      headers
    });
    expect(response.json().error).toBe("Invalid file path");
    expect(accessSpy).not.toHaveBeenCalled();
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
  it("should reply 403 when encrypted filepath given is malicious", async () => {
    const resolveSpy = vi.spyOn(path, "resolve").mockReturnValueOnce("bad/file/path");
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}`,
      headers
    });
    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(accessSpy).not.toHaveBeenCalled();
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.json().error).toBe("Invalid file path");
    expect(response.statusCode).toBe(403);
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });

    expect(runJavaEncryptSpy).toHaveReturnedWith(undefined);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(2, false);
    expect(rmSpy).toHaveBeenCalledWith(
      path.join(uploadDirectory, uuid, path.parse(filename).name, "encrypted-datapacks", filename),
      { force: true }
    );
    expect(accessSpy).toBeCalledTimes(3);
    expect(response.statusCode).toBe(422);
    expect(response.json().error).toBe(
      `Java file was unable to encrypt the file ${filename}, resulting in an incorrect encryption header.`
    );
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
      url: `/user/datapack/download/${filename}`,
      headers
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe(`The file requested ${filename} does not exist within user's upload directory`);
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe(`The file requested ${filename} does not exist within user's upload directory`);
  });
  it("should return the original file when request retrieve original file", async () => {
    accessSpy.mockResolvedValueOnce(undefined);
    readFileSpy.mockResolvedValueOnce("original file");

    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });
    expect(response.statusCode).toBe(404);
    expect(runJavaEncryptSpy).toHaveNthReturnedWith(1, undefined);
    expect(mkdirSpy).toHaveNthReturnedWith(1, undefined);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(accessSpy).toHaveBeenCalledTimes(3);
    expect(rmSpy).not.toHaveBeenCalled();
    expect(response.json().error).toBe(`Java file did not successfully process the file ${filename}`);
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
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });
    expect(response.json().error).toBe("An error occurred: Error: Unknown Error");
    expect(response.statusCode).toBe(500);
    expect(runJavaEncryptSpy).toHaveNthReturnedWith(1, undefined);
    expect(mkdirSpy).toHaveNthReturnedWith(1, undefined);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(readFileSpy).toHaveNthReturnedWith(1, "default content");
    expect(accessSpy).toHaveBeenCalledTimes(3);
    expect(rmSpy).not.toHaveBeenCalled();
  });
});

describe("userDeleteDatapack tests", () => {
  const rmSpy = vi.spyOn(fspModule, "rm");
  const verifyFilepathSpy = vi.spyOn(utilModule, "verifyFilepath");
  const deleteDatapackFoundInMetadata = vi.spyOn(fileMetadataHandler, "deleteDatapackFoundInMetadata");
  const loggerSpy = vi.spyOn(logger, "error");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 400 when datapack title is missing", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/user/datapack/",
      headers
    });
    expect(await response.json()).toEqual({ error: "Missing datapack" });
    expect(response.statusCode).toBe(400);
    expect(rmSpy).not.toHaveBeenCalled();
    expect(verifyFilepathSpy).not.toHaveBeenCalled();
  });
  it("should reply 403 when file path is invalid", async () => {
    verifyFilepathSpy.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "DELETE",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(await response.json()).toEqual({ error: "Invalid datapack/File doesn't exist" });
    expect(response.statusCode).toBe(403);
    expect(rmSpy).not.toHaveBeenCalled();
    expect(verifyFilepathSpy).toHaveBeenCalledOnce();
  });
  it("should reply 500 when an error occurred in verifyFilepath", async () => {
    verifyFilepathSpy.mockRejectedValueOnce(new Error("Unknown Error"));
    const response = await app.inject({
      method: "DELETE",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(await response.json()).toEqual({ error: "Failed to verify file path" });
    expect(response.statusCode).toBe(500);
    expect(rmSpy).not.toHaveBeenCalled();
    expect(verifyFilepathSpy).toHaveBeenCalledOnce();
  });
  it("should reply 500 when an error occurs in deleting the metadata", async () => {
    deleteDatapackFoundInMetadata.mockRejectedValueOnce(new Error("Unknown Error"));
    const response = await app.inject({
      method: "DELETE",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(await response.json()).toEqual({ error: "There was an error deleting the datapack" });
    expect(response.statusCode).toBe(500);
    expect(rmSpy).not.toHaveBeenCalled();
    expect(verifyFilepathSpy).toHaveBeenCalledOnce();
    expect(deleteDatapackFoundInMetadata).toHaveBeenCalledOnce();
  });
  it("should reply 200 when the file exists and has metadata", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(await response.json()).toEqual({ message: "File deleted" });
    expect(response.statusCode).toBe(200);
    expect(verifyFilepathSpy).toHaveBeenCalledOnce();
    expect(deleteDatapackFoundInMetadata).toHaveBeenCalledOnce();
    expect(loggerSpy).not.toHaveBeenCalled();
  });
});

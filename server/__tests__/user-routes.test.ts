import { vi, beforeAll, afterAll, describe, beforeEach, it, expect } from "vitest";
import fastify, { FastifyInstance, HTTPMethods, InjectOptions } from "fastify";
import fastifySecureSession from "@fastify/secure-session";
import * as runJavaEncryptModule from "../src/encryption";
import * as utilModule from "../src/util";
import * as fspModule from "fs/promises";
import * as database from "../src/database";
import * as verify from "../src/verify";
import { userRoutes } from "../src/routes/user-auth";
import * as pathModule from "path";
import * as userHandler from "../src/user/user-handler";
import * as types from "../src/types";
import * as uploadDatapack from "../src/upload-datapack";
import * as editHandler from "../src/cloud/edit-handler";
import formAutoContent from "form-auto-content";
import { Datapack } from "@tsconline/shared";
import { User } from "../src/types";
import fastifyMultipart from "@fastify/multipart";
import { DATAPACK_PROFILE_PICTURE_FILENAME } from "../src/constants";

vi.mock("../src/upload-datapack", async () => {
  return {
    processAndUploadDatapack: vi.fn().mockResolvedValue({ code: 200, message: "success" })
  };
});
vi.mock("../src/types", async () => {
  return {
    isOperationResult: vi.fn().mockReturnValue(false)
  };
});

vi.mock("../src/upload-handlers", async () => {
  return {
    getFileNameFromCachedDatapack: vi.fn(() => Promise.resolve(filename))
  };
});

vi.mock("@tsconline/shared", async () => {
  return {
    isPartialDatapackMetadata: vi.fn().mockReturnValue(true)
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
    rm: vi.fn().mockResolvedValueOnce(undefined)
  };
});

vi.mock("../src/encryption", async (importOriginal) => {
  const actual = await importOriginal<typeof runJavaEncryptModule>();
  return {
    ...actual,
    getEncryptionDatapackFileSystemDetails: vi.fn().mockResolvedValue({
      filepath: "filepath",
      filename: "filename",
      encryptedDir: "encryptedDir",
      encryptedFilepath: "encryptedFilepath"
    }),
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
    loadAssetConfigs: vi.fn().mockImplementation(() => { }),
    deleteDirectory: vi.fn().mockImplementation(() => { }),
    resetUploadDirectory: vi.fn().mockImplementation(() => { }),
    checkHeader: vi.fn().mockReturnValue(true)
  };
});

vi.mock("../src/user/user-handler", () => {
  return {
    convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest: vi.fn().mockResolvedValue({}),
    processEditDatapackRequest: vi.fn().mockResolvedValue({}),
    getUserUUIDDirectory: vi.fn().mockResolvedValue("userDirectory"),
    fetchUserDatapack: vi.fn().mockResolvedValue({}),
    getDirectories: vi.fn().mockResolvedValue([]),
    renameUserDatapack: vi.fn().mockResolvedValue({}),
    writeUserDatapack: vi.fn().mockResolvedValue({}),
    deleteUserDatapack: vi.fn().mockResolvedValue({})
  };
});

vi.mock("../src/cloud/edit-handler.ts", async () => {
  return {
    editDatapack: vi.fn().mockResolvedValue({})
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
  app.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100,
      fileSize: 1024 * 1024 * 60
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
  // vi.spyOn(console, "log").mockImplementation(() => undefined);
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
  const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
  const findUser = vi.spyOn(database, "findUser");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 401 the user is not found", async () => {
    findUser.mockResolvedValueOnce([testUser as User]).mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(401);
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(findUser).toHaveBeenCalledTimes(2);
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
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Database error" });
  });
  it("should reply 500 if an error occurred in fetchUserDatapack", async () => {
    fetchUserDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ error: "Datapack does not exist or cannot be found" });
  });
  it("should reply 500 if no metadata is found", async () => {
    fetchUserDatapack.mockResolvedValueOnce("" as unknown as Datapack);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(findUser).toHaveBeenCalledTimes(2);
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
    expect(findUser).toHaveBeenCalledTimes(2);
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
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  const processEditDatapackRequest = vi.spyOn(userHandler, "processEditDatapackRequest");
  const isOperationResult = vi.spyOn(types, "isOperationResult");
  const editDatapack = vi.spyOn(editHandler, "editDatapack");
  const convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest = vi.spyOn(
    userHandler,
    "convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest"
  );
  const rm = vi.spyOn(fspModule, "rm");
  const id = "test";
  const createForm = (json: Record<string, unknown> = {}) => {
    if ("example" in json) {
      json.example = {
        value: Buffer.from("test"),
        options: {
          filename: "test.txt",
          contentType: "text/plain"
        }
      };
    }
    formData = formAutoContent({ ...json }, { payload: "body", forceMultiPart: true });
    formHeaders = { ...headers, ...(formData.headers as Record<string, string>) };
  };
  beforeEach(() => {
    createForm();
    vi.clearAllMocks();
  });
  it("should reply 400 if no datapack is provided", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/",
      headers
    });
    expect(editDatapack).not.toHaveBeenCalled();
    expect(response.json().error).toBe("Missing datapack");
    expect(response.statusCode).toBe(400);
  });
  it(`should reply 400 if bad body (DatapackMetadata props)`, async () => {
    processEditDatapackRequest.mockRejectedValueOnce(new Error("Invalid body"));
    createForm({ example: "test" });
    const response = await app.inject({
      method: "PATCH",
      url: `/user/datapack/${id}`,
      headers: formHeaders,
      payload: formData.body
    });
    expect(editDatapack).not.toHaveBeenCalled();
    expect(processEditDatapackRequest).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json().error).toBe("Failed to process request");
  });
  it("should return response code if operation result is returned from processEditDatapackRequest", async () => {
    const operationResult = { code: 500, message: "Error" };
    isOperationResult.mockReturnValueOnce(true);
    processEditDatapackRequest.mockResolvedValueOnce(operationResult);
    const response = await app.inject({
      method: "PATCH",
      url: `/user/datapack/${id}`,
      headers: formHeaders,
      payload: formData.body
    });
    expect(await response.json().error).toBe(operationResult.message);
    expect(isOperationResult).toHaveBeenCalledOnce();
    expect(processEditDatapackRequest).toHaveBeenCalledOnce();
    expect(editDatapack).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(operationResult.code);
  });
  it("should reply 500 if an error occurred in editDatapack", async () => {
    editDatapack.mockRejectedValueOnce(new Error("Database error"));
    const response = await app.inject({
      method: "PATCH",
      url: `/user/datapack/${id}`,
      headers: formHeaders,
      payload: formData.body
    });
    expect(await response.json().error).toBe("Failed to edit metadata");
    expect(convertNonStringFieldsToCorrectTypesInDatapackMetadataRequest).toHaveBeenCalledOnce();
    expect(editDatapack).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
  });
  it("should return 422 if there were partial or mitigated errors in editDatapack function", async () => {
    const errors = ["error1", "error2"];
    editDatapack.mockResolvedValueOnce(errors);
    const response = await app.inject({
      method: "PATCH",
      url: `/user/datapack/${id}`,
      headers: formHeaders,
      payload: formData.body
    });
    expect(await response.json()).toEqual({ error: "There were errors updating the datapack", errors });
    expect(editDatapack).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(422);
  });
  it("should reply 200 if the datapack is successfully edited and remove temp files", async () => {
    const operationResult = { code: 200, fields: { id }, tempFiles: ["test.jpg"] };
    processEditDatapackRequest.mockResolvedValueOnce(operationResult);
    const response = await app.inject({
      method: "PATCH",
      url: `/user/datapack/${id}`,
      headers: formHeaders,
      payload: formData.body
    });
    expect(await response.json()).toEqual({ message: `Successfully updated ${id}` });
    expect(editDatapack).toHaveBeenCalledOnce();
    expect(processEditDatapackRequest).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledWith("test.jpg", { force: true });
    expect(response.statusCode).toBe(200);
  });
  it("should still reply 200 even if removing temp files failed", async () => {
    const operationResult = { code: 200, fields: { id }, tempFiles: ["test.jpg"] };
    processEditDatapackRequest.mockResolvedValueOnce(operationResult);
    rm.mockRejectedValueOnce(new Error("Error"));
    const response = await app.inject({
      method: "PATCH",
      url: `/user/datapack/${id}`,
      headers: formHeaders,
      payload: formData.body
    });
    expect(response.json()).toEqual({ message: `Successfully updated ${id}` });
    expect(editDatapack).toHaveBeenCalledOnce();
    expect(processEditDatapackRequest).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledWith("test.jpg", { force: true });
    expect(response.statusCode).toBe(200);
  });
});

describe("requestDownload", () => {
  const readFileSpy = vi.spyOn(fspModule, "readFile");
  const checkHeaderSpy = vi.spyOn(utilModule, "checkHeader");
  const runJavaEncryptSpy = vi.spyOn(runJavaEncryptModule, "runJavaEncrypt");
  const rmSpy = vi.spyOn(fspModule, "rm");
  const mkdirSpy = vi.spyOn(fspModule, "mkdir");
  const getEncryptionDatapackFileSystemDetails = vi.spyOn(
    runJavaEncryptModule,
    "getEncryptionDatapackFileSystemDetails"
  );
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if no datapack is provided", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/user/datapack/download/",
      headers
    });
    expect(response.statusCode).toBe(400);
    expect(await response.json().error).toBe("Missing datapack");
  });
  it("should return 500 if an error occurred in getEncryptionDatapackFileSystemDetails", async () => {
    getEncryptionDatapackFileSystemDetails.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: "/user/datapack/download/test",
      headers
    });
    expect(getEncryptionDatapackFileSystemDetails).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json().error).toBe("Failed to load/fetch datapack information in filesystem");
  });
  it("should return 500 if certain required fields don't exist when getEncryptionDatapackFileSystemDetails returns ", async () => {
    getEncryptionDatapackFileSystemDetails.mockResolvedValueOnce({
      filepath: "filepath",
      filename: "filename",
      encryptedDir: "encryptedDir",
      encryptedFilepath: ""
    });
    const response = await app.inject({
      method: "GET",
      url: "/user/datapack/download/test",
      headers
    });
    expect(getEncryptionDatapackFileSystemDetails).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json().error).toBe("Unknown error occurred");
  });
  it("should reply with 500 when fail to create encrypted directory for the user", async () => {
    checkHeaderSpy.mockResolvedValueOnce(false);
    readFileSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce("default error");
    mkdirSpy.mockRejectedValueOnce(new Error("Unknown Error"));

    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });
    expect(response.json().error).toBe("Failed to create encrypted directory with error Error: Unknown Error");
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(response.statusCode).toBe(500);
    expect(rmSpy).not.toHaveBeenCalled();
  });

  it("should reply 500 when an unknown error occurred in readFile when retrieved original", async () => {
    readFileSpy.mockRejectedValueOnce(new Error("Unknown error"));

    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}`,
      headers
    });
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });

  it("should reply 500 when an unknown error occurred in readFile when need encryption", async () => {
    readFileSpy.mockRejectedValueOnce(new Error("Unknown error"));

    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });

  it("should reply with 500 when the java program failed to encrypt the file (i.e. runJavaEncrypt failed)", async () => {
    runJavaEncryptSpy.mockRejectedValueOnce(new Error("Unknown error"));
    checkHeaderSpy.mockResolvedValueOnce(false);
    readFileSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce("default content");
    mkdirSpy.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });

    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(mkdirSpy).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Failed to encrypt datapacks with error Error: Unknown error");
  });

  it("should remove the newly generated file and reply with 422 when runJavaEncrypt did not properly encrypt the file (i.e. the result file did not pass the header check)", async () => {
    runJavaEncryptSpy.mockResolvedValue(undefined);
    readFileSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("");
    checkHeaderSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    mkdirSpy.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });

    expect(runJavaEncryptSpy).toHaveReturnedWith(undefined);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(2, false);
    expect(rmSpy).toHaveBeenCalledWith("encryptedFilepath", { force: true });
    expect(readFileSpy).toHaveBeenCalledTimes(3);
    expect(response.statusCode).toBe(422);
    expect(response.json().error).toBe(
      `Java file was unable to encrypt the file ${filename}, resulting in an incorrect encryption header.`
    );
  });

  it("should reply 404 if the file does not exist when request retrieve original", async () => {
    //retrieve original

    readFileSpy.mockImplementationOnce(() => {
      const error: NodeJS.ErrnoException = new Error("File not found");
      error.code = "ENOENT";
      throw error;
    });
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}`,
      headers
    });
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe(`The file requested ${filename} does not exist within user's upload directory`);
  });
  it("should reply 404 if the file does not exist when request encrypted download", async () => {
    //need encryption

    readFileSpy
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

    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe(`The file requested ${filename} does not exist within user's upload directory`);
  });
  it("should return the original file when request retrieve original file", async () => {
    readFileSpy.mockResolvedValueOnce("original file");

    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}`,
      headers
    });
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(readFileSpy).toHaveNthReturnedWith(1, "original file");
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from("original file");
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
  });

  it("should return a newly encrypted file when request encrypted download an unencrypted file which has not been encrypted before", async () => {
    const dataFile = "TSCreator Encrypted Datafile";
    readFileSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce(dataFile);

    checkHeaderSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    mkdirSpy.mockResolvedValueOnce(undefined);

    runJavaEncryptSpy.mockResolvedValue(undefined);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });

    expect(runJavaEncryptSpy).toHaveBeenCalledOnce();
    expect(readFileSpy).toHaveBeenCalledTimes(3);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(checkHeaderSpy).toHaveNthReturnedWith(2, true);
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from(dataFile);
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
  });
  it("should return the old encrypted file when request encrypted download an unencrypted file which has been encrypted before", async () => {
    const dataFile = "TSCreator Encrypted Datafile";
    checkHeaderSpy.mockResolvedValueOnce(true);
    readFileSpy.mockResolvedValueOnce(dataFile);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(readFileSpy).toHaveNthReturnedWith(1, dataFile);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, true);
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from("TSCreator Encrypted Datafile");
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
  });

  it("should return the original encrypted file when request encrypted download an encrypted file", async () => {
    const dataFile = "TSCreator Encrypted Datafile";
    readFileSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce(dataFile);
    checkHeaderSpy.mockResolvedValueOnce(true);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });
    expect(runJavaEncryptSpy).not.toHaveBeenCalled();
    expect(readFileSpy).toHaveNthReturnedWith(2, dataFile);
    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, true);
    expect(response.statusCode).toBe(200);
    const isBuffer = Buffer.isBuffer(response.rawPayload);
    const fileContent = Buffer.from("TSCreator Encrypted Datafile");
    expect(isBuffer).toBe(true);
    expect(response.rawPayload).toEqual(fileContent);
  });
  it("should remove the old encrypted file and encrypt again when the old file was not properly encrypted", async () => {
    runJavaEncryptSpy.mockResolvedValueOnce(undefined);
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
    expect(readFileSpy).toHaveBeenCalledTimes(3);
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

  it("should reply 500 when an unknown error occured when try to access the original file when need encryption (regular datapack file check)", async () => {
    readFileSpy
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
    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(checkHeaderSpy).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("An error occurred: Error: Unknown error");
  });

  it("should reply 404 when failed to process the file after successfully encrypted it", async () => {
    runJavaEncryptSpy.mockResolvedValueOnce(undefined);
    mkdirSpy.mockResolvedValueOnce(undefined);
    readFileSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce("")
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      });
    checkHeaderSpy.mockResolvedValueOnce(false);

    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/${filename}?needEncryption=true`,
      headers
    });
    expect(response.statusCode).toBe(404);
    expect(runJavaEncryptSpy).toHaveNthReturnedWith(1, undefined);
    expect(mkdirSpy).toHaveNthReturnedWith(1, undefined);
    expect(checkHeaderSpy).toHaveNthReturnedWith(1, false);
    expect(readFileSpy).toHaveBeenCalledTimes(3);
    expect(rmSpy).not.toHaveBeenCalled();
    expect(response.json().error).toBe(`Java file did not successfully process the file ${filename}`);
  });

  it("should reply 500 when when an error occured when try to access the file after successfully encrypted it", async () => {
    runJavaEncryptSpy.mockResolvedValueOnce(undefined);
    mkdirSpy.mockResolvedValueOnce(undefined);
    readFileSpy
      .mockImplementationOnce(() => {
        const error: NodeJS.ErrnoException = new Error("File not found");
        error.code = "ENOENT";
        throw error;
      })
      .mockResolvedValueOnce("default content")
      .mockRejectedValueOnce(new Error("Unknown Error"));
    checkHeaderSpy.mockResolvedValueOnce(false);

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
    expect(readFileSpy).toHaveNthReturnedWith(2, "default content");
    expect(readFileSpy).toHaveBeenCalledTimes(3);
    expect(rmSpy).not.toHaveBeenCalled();
  });
});

describe("userDeleteDatapack tests", () => {
  const deleteUserDatapack = vi.spyOn(userHandler, "deleteUserDatapack");
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
    expect(deleteUserDatapack).not.toHaveBeenCalled();
  });
  it("should reply 500 when an error occurred in deleteUserDatapack", async () => {
    deleteUserDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "DELETE",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(await response.json()).toEqual({ error: "There was an error deleting the datapack" });
    expect(response.statusCode).toBe(500);
    expect(deleteUserDatapack).toHaveBeenCalledOnce();
  });
  it("should reply 200 when the datapack is successfully deleted", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(await response.json()).toEqual({ message: `Datapack deleted` });
    expect(response.statusCode).toBe(200);
    expect(deleteUserDatapack).toHaveBeenCalledOnce();
  });
});

describe("uploadDatapack tests", () => {
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  const processAndUploadDatapack = vi.spyOn(uploadDatapack, "processAndUploadDatapack");
  const createForm = (json: Record<string, unknown> = {}) => {
    if (!("datapack" in json)) {
      json.datapack = {
        value: Buffer.from("test"),
        options: {
          filename: "test.dpk",
          contentType: "text/plain"
        }
      };
    }
    if (!(DATAPACK_PROFILE_PICTURE_FILENAME in json)) {
      json[DATAPACK_PROFILE_PICTURE_FILENAME] = {
        value: Buffer.from("test"),
        options: {
          filename: "test.jpg",
          contentType: "image/jpeg"
        }
      };
    }
    formData = formAutoContent({ ...json }, { payload: "body", forceMultiPart: true });
    formHeaders = { ...headers, ...(formData.headers as Record<string, string>) };
  };
  beforeEach(() => {
    createForm();
    vi.clearAllMocks();
  });
  it("should reply with non-200 if processAndUploadDatapack returns an operation result", async () => {
    const operationResult = { code: 500, message: "Error" };
    processAndUploadDatapack.mockResolvedValueOnce(operationResult);
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack",
      headers: formHeaders,
      payload: formData.body
    });
    expect(await response.json().error).toBe(operationResult.message);
    expect(response.statusCode).toBe(operationResult.code);
    expect(processAndUploadDatapack).toHaveBeenCalledOnce();
  });
  it("should return 500 if an error occurred in processAndUploadDatapack", async () => {
    processAndUploadDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack",
      headers: formHeaders,
      payload: formData.body
    });
    expect(await response.json().error).toBe("Error uploading datapack");
    expect(response.statusCode).toBe(500);
    expect(processAndUploadDatapack).toHaveBeenCalledOnce();
  });
  it("should return 200 if the datapack is successfully uploaded", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack",
      headers: formHeaders,
      payload: formData.body
    });
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
    expect(processAndUploadDatapack).toHaveBeenCalledOnce();
  });
});

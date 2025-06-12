import fastifyMultipart, { MultipartFile } from "@fastify/multipart";
import fastifySecureSession from "@fastify/secure-session";
import fastify, { FastifyInstance, HTTPMethods, InjectOptions } from "fastify";
import { beforeAll, vi, afterAll, expect, describe, it, beforeEach } from "vitest";
import * as workshopAuth from "../src/workshop/workshop-auth";
import * as database from "../src/database";
import * as verify from "../src/verify";
import * as workshopUtil from "../src/workshop/workshop-util";
import * as generalFileHandlerRequests from "../src/file-handlers/general-file-handler-requests";
import { User, Workshop } from "../src/types";
import * as util from "../src/util";
import * as fsp from "fs/promises";
import * as uploadHandlers from "../src/upload-handlers";
import { SharedWorkshop } from "@tsconline/shared";
import { fetchAllWorkshops, fetchWorkshopCoverImage } from "../src/workshop/workshop-routes";

vi.mock("../src/file-handlers/general-file-handler-requests", async () => {
  return {
    editDatapackMetadataRequestHandler: vi.fn().mockResolvedValue({ code: 200, message: "success" }),
    createZipFile: vi.fn().mockResolvedValue(Buffer.from("fake-zip-content"))
  };
});
vi.mock("../src/workshop/workshop-util", async (importOriginal) => {
  const original = await importOriginal<typeof workshopUtil>();
  return {
    ...original,
    verifyWorkshopValidity: vi.fn().mockResolvedValue({ code: 200, message: "success" }),
    getWorkshopFilesPath: vi.fn().mockResolvedValue("/tmp/fake-files-folder")
  };
});
vi.mock("../src/verify", async () => {
  return {
    checkRecaptchaToken: vi.fn().mockResolvedValue(1)
  };
});
vi.mock("../src/database", async () => {
  return {
    findUser: vi.fn(() => Promise.resolve([testAdminUser])), // just so we can verify the user is an admin for prehandlers
    isUserInWorkshop: vi.fn().mockResolvedValue(true),
    findWorkshop: vi.fn().mockResolvedValue([])
  };
});
vi.mock("../src/user/fetch-user-files", async () => {
  return {
    getUserUUIDDirectory: vi.fn().mockResolvedValue("/tmp/fake-directory")
  };
});
vi.mock("../src/util", async () => {
  return {
    verifyNonExistentFilepath: vi.fn().mockResolvedValue(true),
    checkFileExists: vi.fn().mockRejectedValue(true),
    assetconfigs: { datapackImagesDirectory: "assets/images" }
  };
});
vi.mock("fs/promises", async () => {
  return {
    readFile: vi.fn().mockResolvedValue(Buffer.from("fake-zip-content")),
    readdir: vi.fn().mockResolvedValue(["file1.zip", "file2.zip"])
  };
});
vi.mock("../src/upload-handlers", async () => {
  return {
    fetchWorkshopCoverPictureFilepath: vi.fn().mockResolvedValue(""),
    getWorkshopFilesNames: vi.fn().mockResolvedValue([]),
    uploadFilesToWorkshop: vi.fn(async (id, file) => await consumeStream(file)),
    uploadCoverPicToWorkshop: vi.fn(async (id, file) => await consumeStream(file)),
    getWorkshopDatapacksNames: vi.fn().mockResolvedValue([])
  };
});
vi.mock("../src/error-logger", async () => {
  return {
    default: {
      error: vi.fn().mockReturnValue({})
    }
  };
});
vi.mock("fs", async () => {
  return {
    createReadStream: vi.fn().mockImplementation(() => {})
  };
});

const consumeStream = async (multipartFile: MultipartFile, code: number = 200, message: string = "File uploaded") => {
  const file = multipartFile.file;
  await new Promise<void>((resolve) => {
    file.on("data", () => {});
    file.on("end", () => {
      resolve();
    });
  });
  return { code, message };
};
const mockDate = new Date();
const start = new Date(mockDate);
start.setHours(mockDate.getHours() + 1);
const end = new Date(mockDate);
end.setHours(mockDate.getHours() + 2);
const testWorkshopDatabase: Workshop = {
  title: "test",
  start: start.toISOString(),
  end: end.toISOString(),
  workshopId: 1,
  regRestrict: 0,
  creatorUUID: "123",
  regLink: null,
  description: "description"
};
const testWorkshop: SharedWorkshop = {
  title: "test",
  start: start.toISOString(),
  end: end.toISOString(),
  workshopId: 1,
  regRestrict: false,
  creatorUUID: "123",
  regLink: null,
  description: "description",
  active: false
};

let app: FastifyInstance;
beforeAll(async () => {
  app = fastify();
  await app.register(fastifySecureSession, {
    cookieName: "adminSession",
    key: Buffer.from("c30a7eae1e37a08d6d5c65ac91dfbc75b54ce34dd29153439979364046cc06ae", "hex"),
    cookie: {
      path: "/",
      httpOnly: true,
      domain: "localhostadmin",
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
  await app.register(workshopAuth.workshopRoutes, { prefix: "/workshop" });
  app.get("/workshop", fetchAllWorkshops);
  app.get("/workshop-images/1", fetchWorkshopCoverImage);
  await app.listen({ host: "localhost", port: 1250 });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.setSystemTime(mockDate);
});
afterAll(async () => {
  await app.close();
});
const headers = { "mock-uuid": "uuid", "recaptcha-token": "recaptcha-token" };
const testNonAdminUser = { userId: 1, isAdmin: 0 } as User;
const testAdminUser = { userId: 1, isAdmin: 1 } as User;
const routes: { method: HTTPMethods; url: string; body?: object }[] = [
  { method: "PATCH", url: "/workshop/workshop-1/datapack/datpack" },
  { method: "GET", url: "/workshop/download/42" },
  { method: "GET", url: "/workshop/1/files/presentation" }
];
describe("verifyAuthority", () => {
  describe.each(routes)("should return 401 for route $url with method $method", ({ method, url, body }) => {
    const findUser = vi.spyOn(database, "findUser");
    beforeEach(() => {
      findUser.mockClear();
    });
    it("should return 401 if not logged in", async () => {
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url: url,
        payload: body
      });
      expect(findUser).not.toHaveBeenCalled();
      expect(await response.json()).toEqual({ error: "Unauthorized access" });
      expect(response.statusCode).toBe(401);
    });
    it("should return 401 if not found in database", async () => {
      findUser.mockResolvedValueOnce([]);
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url: url,
        payload: body,
        headers
      });
      expect(findUser).toHaveBeenCalledWith({ uuid: headers["mock-uuid"] });
      expect(findUser).toHaveBeenCalledTimes(1);
      expect(await response.json()).toEqual({ error: "Unauthorized access" });
      expect(response.statusCode).toBe(401);
    });
    it("should return 500 if findUser throws error", async () => {
      findUser.mockRejectedValueOnce(new Error());
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url: url,
        payload: body,
        headers
      });
      expect(findUser).toHaveBeenCalledWith({ uuid: headers["mock-uuid"] });
      expect(findUser).toHaveBeenCalledTimes(1);
      expect(await response.json()).toEqual({ error: "Database error" });
      expect(response.statusCode).toBe(500);
    });
  });
});
describe("verifyRecaptcha tests", () => {
  describe.each(routes.filter(({ url }) => url != "/workshop/1/files/presentation"))(
    "should return 400 or 422 for route $url with method $method",
    ({ method, url, body }) => {
      const checkRecaptchaToken = vi.spyOn(verify, "checkRecaptchaToken");
      beforeEach(() => {
        checkRecaptchaToken.mockClear();
      });
      it("should return 400 if missing recaptcha token", async () => {
        const response = await app.inject({
          method: method as InjectOptions["method"],
          url: url,
          payload: body,
          headers: { ...headers, "recaptcha-token": "" }
        });
        expect(checkRecaptchaToken).not.toHaveBeenCalled();
        expect(await response.json()).toEqual({ error: "Missing recaptcha token" });
        expect(response.statusCode).toBe(400);
      });
      it("should return 422 if recaptcha failed", async () => {
        checkRecaptchaToken.mockResolvedValueOnce(0);
        const response = await app.inject({
          method: method as InjectOptions["method"],
          url: url,
          payload: body,
          headers: headers
        });
        expect(checkRecaptchaToken).toHaveBeenCalledWith(headers["recaptcha-token"]);
        expect(checkRecaptchaToken).toHaveBeenCalledTimes(1);
        expect(await response.json()).toEqual({ error: "Recaptcha failed" });
        expect(response.statusCode).toBe(422);
      });
      it("should return 500 if checkRecaptchaToken throws error", async () => {
        checkRecaptchaToken.mockRejectedValueOnce(new Error());
        const response = await app.inject({
          method: method as InjectOptions["method"],
          url: url,
          payload: body,
          headers: headers
        });
        expect(checkRecaptchaToken).toHaveBeenCalledWith(headers["recaptcha-token"]);
        expect(checkRecaptchaToken).toHaveBeenCalledTimes(1);
        expect(await response.json()).toEqual({ error: "Recaptcha error" });
        expect(response.statusCode).toBe(500);
      });
    }
  );
});

describe("editWorkshopDatapackMetadata", async () => {
  const route = "/workshop/workshop-1/datapack/datpack";
  const verifyWorkshopValidity = vi.spyOn(workshopUtil, "verifyWorkshopValidity");
  const editDatapackMetadataRequestHandler = vi.spyOn(generalFileHandlerRequests, "editDatapackMetadataRequestHandler");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return non-200 code if verifyWorkshopValidity doesn't return 200", async () => {
    verifyWorkshopValidity.mockResolvedValueOnce({ code: 400, message: "error" });
    const response = await app.inject({
      method: "PATCH",
      url: route,
      headers
    });
    expect(verifyWorkshopValidity).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "error" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if workshopUUID is not valid", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/workshop/workshop-invalid/datapack/datpack",
      headers
    });
    expect(verifyWorkshopValidity).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Invalid workshop UUID" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if editDatapackMetadataRequestHandler throws error", async () => {
    editDatapackMetadataRequestHandler.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "PATCH",
      url: route,
      headers
    });
    expect(verifyWorkshopValidity).toHaveBeenCalledTimes(1);
    expect(editDatapackMetadataRequestHandler).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Failed to edit metadata" });
    expect(response.statusCode).toBe(500);
  });
  it("should return status code and message from editDatapackMetadataRequestHandler", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: route,
      headers
    });
    expect(verifyWorkshopValidity).toHaveBeenCalledTimes(1);
    expect(editDatapackMetadataRequestHandler).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "success" });
    expect(response.statusCode).toBe(200);
  });
});

describe("getWorkshops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const findWorkshop = vi.spyOn(database, "findWorkshop");
  const getDatapacksNames = vi.spyOn(uploadHandlers, "getWorkshopDatapacksNames");
  const getFilesNames = vi.spyOn(uploadHandlers, "getWorkshopFilesNames");
  it("should return 500 if findWorkshop throws an error", async () => {
    findWorkshop.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "GET",
      url: "/workshop",
      headers
    });
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful and workshop active as false", async () => {
    findWorkshop.mockResolvedValueOnce([testWorkshopDatabase]);

    const response = await app.inject({
      method: "GET",
      url: "/workshop",
      headers
    });

    expect(getDatapacksNames).toHaveBeenCalledOnce();
    expect(getFilesNames).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual([
      {
        ...testWorkshop,
        active: false,
        datapacks: [],
        files: []
      }
    ]);

    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and workshop active as true", async () => {
    findWorkshop.mockResolvedValueOnce([{ ...testWorkshopDatabase, start: mockDate.toISOString() }]);
    const response = await app.inject({
      method: "GET",
      url: "/workshop",
      headers
    });
    expect(getDatapacksNames).toHaveBeenCalledOnce();
    expect(getFilesNames).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual([
      {
        ...testWorkshop,
        start: mockDate.toISOString(),
        active: true,
        datapacks: [],
        files: []
      }
    ]);
    expect(response.statusCode).toBe(200);
  });
});

describe("downloadWorkshopFilesZip tests", () => {
  const workshopId = 42;
  const route = `/workshop/download/${workshopId}`;
  const findUser = vi.spyOn(database, "findUser");
  const isUserInWorkshop = vi.spyOn(database, "isUserInWorkshop");
  const readFile = vi.spyOn(fsp, "readFile");
  const createZipFile = vi.spyOn(generalFileHandlerRequests, "createZipFile");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 403 if user is not admin AND not in workshop", async () => {
    findUser.mockResolvedValueOnce([testNonAdminUser]).mockResolvedValueOnce([testNonAdminUser]);
    isUserInWorkshop.mockResolvedValueOnce(false);

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });

    expect(response.statusCode).toBe(403);
    expect(await response.json()).toEqual({ error: "Unauthorized access" });
    expect(isUserInWorkshop).toHaveBeenCalledWith(testNonAdminUser.userId, workshopId);
  });
  it("should return 500 if getWorkshopFilesPath fails", async () => {
    vi.spyOn(workshopUtil, "getWorkshopFilesPath").mockRejectedValueOnce(new Error("getWorkshopFilesPath error"));

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "An error occurred" });
  });
  it("should return 500 if verifyNonExistentFilepath returns false", async () => {
    vi.spyOn(util, "verifyNonExistentFilepath").mockResolvedValueOnce(false);

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Invalid directory path" });
  });
  it("should return 500 if readFile throws an error != ENOENT", async () => {
    readFile.mockRejectedValueOnce(new Error("Something else"));

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Read error: Something else" });
  });
  it("should create the zip if readFile returns ENOENT, then return file", async () => {
    const enoentError = new Error("no zip yet") as NodeJS.ErrnoException;
    enoentError.code = "ENOENT";
    readFile.mockRejectedValueOnce(enoentError);

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(200);
    expect(createZipFile).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual("fake-zip-content");
  });
  it("should return existing zip file if readFile succeeds", async () => {
    const existingFileBuffer = Buffer.from("existing-zip-content");
    readFile.mockResolvedValueOnce(existingFileBuffer);

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual("existing-zip-content");
    expect(createZipFile).not.toHaveBeenCalled();
  });
  it("should return 404 if an ENOENT error happens later in the try block", async () => {
    const enoentError = new Error("Creation ENOENT") as NodeJS.ErrnoException;
    enoentError.code = "ENOENT";
    readFile.mockRejectedValueOnce(enoentError);
    const creationError = new Error("failed") as NodeJS.ErrnoException;
    creationError.code = "ENOENT";
    createZipFile.mockRejectedValueOnce(creationError);

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(404);
    expect(await response.json()).toEqual({ error: "Failed to process the file" });
  });
  it("should return 500 if createZipFile throws an error", async () => {
    const enoentError = new Error("Creation ENOENT") as NodeJS.ErrnoException;
    enoentError.code = "ENOENT";
    readFile.mockRejectedValueOnce(enoentError);
    createZipFile.mockRejectedValueOnce(new Error("failed"));

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "An error occurred" });
  });
});

describe("fetchWorkshopCoverImage tests", () => {
  const workshopId = 1;
  const route = `/workshop-images/${workshopId}`;
  const fetchWorkshopCoverPictureFilepathSpy = vi.spyOn(uploadHandlers, "fetchWorkshopCoverPictureFilepath");
  const checkFileExistsSpy = vi.spyOn(util, "checkFileExists");
  const readFileSpy = vi.spyOn(fsp, "readFile");

  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 500 if no cover pic found and failed to fetch default cover pic", async () => {
    fetchWorkshopCoverPictureFilepathSpy.mockResolvedValueOnce(null);
    checkFileExistsSpy.mockRejectedValueOnce(new Error());

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal Server Error" });
  });

  it("should return default cover pic if no cover pic found", async () => {
    fetchWorkshopCoverPictureFilepathSpy.mockResolvedValueOnce(null);
    checkFileExistsSpy.mockResolvedValueOnce(true);
    readFileSpy.mockResolvedValueOnce(Buffer.from("default-cover-pic"));

    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual("default-cover-pic");
    expect(checkFileExistsSpy).toHaveBeenCalledOnce();
  });
  it("should return the cover pic found", async () => {
    fetchWorkshopCoverPictureFilepathSpy.mockResolvedValueOnce("cover-pic-path");
    readFileSpy.mockResolvedValueOnce(Buffer.from("cover-pic"));
    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual("cover-pic");
    expect(checkFileExistsSpy).not.toHaveBeenCalled();
  });
});

describe("serveWorkshopHyperlinks tests", () => {
  const route = "/workshop/1/files/presentation";
  const isUserInWorkshop = vi.spyOn(database, "isUserInWorkshop");
  const checkFileExists = vi.spyOn(util, "checkFileExists");
  beforeEach(() => {
    vi.spyOn(database, "findUser").mockResolvedValueOnce([testNonAdminUser]);
    vi.clearAllMocks();
  });
  it("should return 400 if workshopId is not valid", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/workshop/workshop-invalid/files/presentation",
      headers
    });
    expect(isUserInWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/workshopId must be number",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if filename is not valid", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/workshop/1/files/invalid-file",
      headers
    });
    expect(isUserInWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/filename must be equal to one of the allowed values",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 403 if user is not registered for workshop", async () => {
    isUserInWorkshop.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(isUserInWorkshop).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Not registered for workshop" });
    expect(response.statusCode).toBe(403);
  });
  it("should return 404 if file does not exist", async () => {
    isUserInWorkshop.mockResolvedValueOnce(true);
    checkFileExists.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(isUserInWorkshop).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "File not found" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 500 if isUserInWorkshop fails", async () => {
    isUserInWorkshop.mockRejectedValueOnce(new Error("Database error"));
    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(isUserInWorkshop).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "An error occurred" });
    expect(response.statusCode).toBe(500);
  });
  it("should return hyperlinks if successful", async () => {
    isUserInWorkshop.mockResolvedValueOnce(true);
    checkFileExists.mockResolvedValueOnce(true);
    const response = await app.inject({
      method: "GET",
      url: route,
      headers
    });
    expect(isUserInWorkshop).toHaveBeenCalledTimes(1);
    expect(isUserInWorkshop).toHaveBeenCalledWith(testAdminUser.userId, 1);
    expect(checkFileExists).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });
});

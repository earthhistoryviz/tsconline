import fastify, { FastifyInstance, HTTPMethods, InjectOptions } from "fastify";
import * as adminAuth from "../src/admin/admin-auth";
import * as database from "../src/database";
import * as verify from "../src/verify";
import * as fsPromises from "fs/promises";
import * as fileMetadataHandler from "../src/file-metadata-handler";
import * as path from "path";
import * as util from "../src/util";
import * as streamPromises from "stream/promises";
import * as shared from "@tsconline/shared";
import { afterAll, beforeAll, describe, test, it, vi, expect, beforeEach } from "vitest";
import fastifySecureSession from "@fastify/secure-session";
import { resolve } from "path";
import fastifyMultipart, { MultipartFile } from "@fastify/multipart";
import formAutoContent from "form-auto-content";
import { DatapackMetadata } from "@tsconline/shared";
import * as uploadHandlers from "../src/upload-handlers";
import * as excel from "../src/parse-excel-file";
import * as userHandlers from "../src/user/user-handler";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import * as adminHandler from "../src/admin/admin-handler";
import * as logger from "../src/error-logger";
import { User, Workshop } from "../src/types";
import { DATAPACK_PROFILE_PICTURE_FILENAME } from "../src/constants";
import * as uploadDatapack from "../src/upload-datapack";

vi.mock("../src/upload-datapack", async () => {
  return {
    processAndUploadDatapack: vi.fn().mockResolvedValue({ code: 200, message: "File uploaded" })
  };
});
vi.mock("../src/error-logger", async () => {
  return {
    default: {
      error: vi.fn().mockReturnValue({})
    }
  };
});

vi.mock("../src/admin/admin-handler", async () => {
  return {
    editAdminDatapackPriorities: vi.fn().mockResolvedValue({})
  };
});

vi.mock("node:child_process", async () => {
  return {
    execFile: vi.fn().mockReturnValue({})
  };
});
vi.mock("util", async () => {
  return {
    promisify: vi.fn((fn) => fn)
  };
});
vi.mock("@tsconline/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof shared>();
  return {
    ...actual,
    assertDatapackIndex: vi.fn().mockReturnValue(true),
    assertDatapack: vi.fn().mockReturnValue(true),
    assertDatapackPriorityChangeRequestArray: vi.fn().mockReturnValue(true)
  };
});
vi.mock("../src/user/fetch-user-files", async () => {
  return {
    fetchUserDatapackDirectory: vi.fn().mockResolvedValue("test-user"),
    getPrivateUserUUIDDirectory: vi.fn().mockResolvedValue("test-private")
  };
});

vi.mock("../src/user/user-handler", async () => {
  return {
    fetchAllPrivateOfficialDatapacks: vi.fn().mockResolvedValue([]),
    deleteDatapackFoundInMetadata: vi.fn().mockResolvedValue({}),
    getUploadedDatapackFilepath: vi.fn().mockResolvedValue(""),
    deleteUserDatapack: vi.fn().mockResolvedValue({}),
    deleteAllUserDatapacks: vi.fn().mockResolvedValue({}),
    doesDatapackFolderExistInAllUUIDDirectories: vi.fn().mockResolvedValue(false),
    deleteOfficialDatapack: vi.fn().mockResolvedValue({}),
    fetchAllUsersDatapacks: vi.fn().mockResolvedValue([]),
    checkFileTypeIsDatapack: vi.fn().mockReturnValue(true),
    checkFileTypeIsDatapackImage: vi.fn().mockReturnValue(true),
    fetchUserDatapack: vi.fn().mockResolvedValue({})
  };
});

vi.mock("../src/upload-handlers", async () => {
  return {
    uploadUserDatapackHandler: vi.fn().mockImplementation(() => Promise.resolve(testDatapackDescription)),
    setupNewDatapackDirectoryInUUIDDirectory: vi.fn().mockResolvedValue({}),
    uploadFileToFileSystem: vi.fn(async (file) => await consumeStream(file))
  };
});
vi.mock("../src/util", async (importOriginal) => {
  const actual = await importOriginal<typeof util>();
  return {
    ...actual,
    getBytes: vi.fn().mockReturnValue("30MB"),
    loadAssetConfigs: vi.fn().mockResolvedValue({}),
    assetconfigs: {
      uploadDirectory: "testdir/uploadDirectory",
      fileMetadata: "testdir/fileMetadata.json",
      datapacksDirectory: "testdir/datapacksDirectory",
      decryptionDirectory: "testdir/decryptionDirectory",
      decryptionJar: "testdir/decryptionJar.jar",
      adminConfigPath: "testdir/adminConfig.json"
    },
    checkFileExists: vi.fn().mockResolvedValue(true),
    verifyFilepath: vi.fn().mockReturnValue(true),
    makeTempFilename: vi.fn().mockReturnValue("tempFilename"),
    formatDate: vi.fn().mockReturnValue("date")
  };
});

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof path>();
  return {
    ...actual,
    resolve: vi.fn().mockImplementation(actual.resolve),
    join: vi.fn().mockImplementation((...args) => args.join("/")),
    relative: vi.fn().mockImplementation(actual.relative)
  };
});

vi.mock("stream/promises", async () => {
  return {
    pipeline: vi.fn().mockImplementation(async (readable) => {
      return new Promise<void>((resolve, reject) => {
        readable.on("data", () => {});
        readable.on("end", () => {
          resolve();
        });
        readable.on("error", () => {
          reject();
        });
      });
    })
  };
});

vi.mock("fs", async () => {
  return {
    createWriteStream: vi.fn().mockReturnValue({})
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>();
  return {
    ...actual,
    rm: vi.fn().mockResolvedValue({}),
    writeFile: vi.fn().mockResolvedValue({}),
    realpath: vi.fn().mockImplementation(async (path) => path),
    readFile: vi.fn().mockResolvedValue("")
  };
});

vi.mock("bcrypt-ts", async () => {
  return {
    hash: vi.fn().mockResolvedValue("hashedPassword")
  };
});

vi.mock("node:crypto", async () => {
  return {
    randomUUID: vi.fn(() => "random-uuid")
  };
});

vi.mock("../src/verify", async () => {
  return {
    checkRecaptchaToken: vi.fn().mockResolvedValue(1),
    encrypt: vi.fn().mockReturnValue("encryptedPassword"),
    decrypt: vi.fn().mockReturnValue("password")
  };
});

vi.mock("../src/database", async (importOriginal) => {
  const actual = await importOriginal<typeof database>();
  return {
    ...actual,
    db: {
      deleteFrom: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([])
    },
    findUser: vi.fn(() => Promise.resolve([testAdminUser])), // just so we can verify the user is an admin for prehandlers
    checkForUsersWithUsernameOrEmail: vi.fn().mockResolvedValue([]),
    createUser: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue({}),
    findWorkshop: vi.fn().mockResolvedValue([]),
    updateUser: vi.fn().mockResolvedValue({}),
    deleteWorkshop: vi.fn().mockResolvedValue({}),
    getWorkshopIfNotEnded: vi.fn(() => Promise.resolve(testWorkshop)),
    updateWorkshop: vi.fn().mockResolvedValue({}),
    deleteUsersWorkshops: vi.fn().mockResolvedValue({}),
    findUsersWorkshops: vi.fn().mockResolvedValue([]),
    handleEndedWorkshop: vi.fn().mockResolvedValueOnce({}),
    checkWorkshopHasUser: vi.fn().mockResolvedValue([]),
    createUsersWorkshops: vi.fn().mockResolvedValue({})
  };
});

vi.mock("../src/load-packs", async () => {
  return {
    loadDatapackIntoIndex: vi.fn().mockResolvedValue(true)
  };
});

vi.mock("../src/file-metadata-handler", async () => {
  return {
    deleteAllUserMetadata: vi.fn().mockResolvedValue(undefined),
    deleteDatapackFoundInMetadata: vi.fn().mockResolvedValue({})
  };
});

vi.mock("../src/parse-excel-file", async () => {
  return {
    parseExcelFile: vi.fn().mockResolvedValue([])
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
  await app.register(adminAuth.adminRoutes, { prefix: "/admin" });
  await app.listen({ host: "localhost", port: 1239 });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.setSystemTime(mockDate);
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  process.env.NODE_ENV = "test";
});

const testDatapackDescription: DatapackMetadata = {
  originalFileName: "test.dpk",
  storedFileName: "",
  description: "test-description",
  title: "test-title",
  size: "30MB",
  date: "2021-01-01",
  tags: ["test-tag"],
  references: ["test-reference"],
  contact: "test-contact",
  notes: "test-notes",
  authoredBy: "test-author",
  type: "user",
  uuid: "test-uuid",
  isPublic: false,
  priority: 0
};

const testUserWorkshop = {
  workshopId: 1,
  userId: 123
};

const testUserWorkshop2 = {
  workshopId: 1,
  userId: 321
};

const testAdminUser2: User = {
  userId: 321,
  uuid: "123e4567-e89b-12d3-a456-426614174000",
  email: "test@example.com",
  emailVerified: 1,
  invalidateSession: 0,
  username: "testuser",
  hashedPassword: "password123",
  pictureUrl: "https://example.com/picture.jpg",
  isAdmin: 1,
  accountType: "default"
};

const testAdminUser: User = {
  userId: 123,
  uuid: "123e4567-e89b-12d3-a456-426614174000",
  email: "test@example.com",
  emailVerified: 1,
  invalidateSession: 0,
  username: "testuser",
  hashedPassword: "password123",
  pictureUrl: "https://example.com/picture.jpg",
  isAdmin: 1,
  accountType: "default"
};
const testNonAdminUser = {
  ...testAdminUser,
  isAdmin: 0
};
const testSharedAdminUser = {
  userId: 123,
  uuid: "123e4567-e89b-12d3-a456-426614174000",
  email: "test@example.com",
  emailVerified: 1,
  invalidateSession: 0,
  username: "testuser",
  pictureUrl: "https://example.com/picture.jpg",
  isAdmin: 1,
  accountType: "default"
};
const testNonSharedAdminUser = {
  ...testSharedAdminUser,
  isAdmin: 0
};
const mockDate = new Date("2024-08-20T00:00:00Z");
const start = new Date(mockDate);
start.setHours(mockDate.getHours() + 1);
const end = new Date(mockDate);
end.setHours(mockDate.getHours() + 2);
const testWorkshop: Workshop = {
  title: "test",
  start: start.toISOString(),
  end: end.toISOString(),
  workshopId: 1
};

const routes: { method: HTTPMethods; url: string; body?: object }[] = [
  { method: "POST", url: "/admin/users" },
  {
    method: "POST",
    url: "/admin/user",
    body: { username: "test", email: "test", password: "test", pictureUrl: "test", isAdmin: 1 }
  },
  { method: "DELETE", url: "/admin/user", body: { uuid: "test" } },
  { method: "DELETE", url: "/admin/user/datapack", body: { uuid: "test", datapack: "test" } },
  { method: "DELETE", url: "/admin/official/datapack", body: { datapack: "test" } },
  { method: "POST", url: "/admin/official/datapack", body: { datapack: "test" } },
  { method: "POST", url: "/admin/user/datapacks", body: { uuid: "test" } },
  { method: "POST", url: "/admin/workshop/users", body: { file: "test", emails: "test@email.com", workshopId: "1" } },
  { method: "GET", url: "/admin/workshops" },
  {
    method: "POST",
    url: "/admin/workshop",
    body: { title: "test", start: "2024-08-29T04:00:00.000Z", end: "2024-08-30T04:00:00.000Z" }
  },
  {
    method: "PATCH",
    url: "/admin/workshop",
    body: { workshopId: "1", title: "test", start: "2024-08-29T04:00:00.000Z" }
  },
  { method: "DELETE", url: "/admin/workshop", body: { workshopId: "1" } },
  {
    method: "PATCH",
    url: "/admin/user",
    body: {
      username: "username",
      email: "email@email.com",
      accountType: "pro"
    }
  },
  {
    method: "PATCH",
    url: "/admin/official/datapack/priority",
    body: [{ uuid: "test", id: "test", priority: 1 }]
  },
  { method: "POST", url: "/admin/workshop/datapack", body: { datapack: "test" } },
  { method: "POST", url: "/admin/workshop/official/datapack", body: { workshopId: "1", datapackTitle: "test" } }
];
const headers = { "mock-uuid": "uuid", "recaptcha-token": "recaptcha-token" };
describe("verifyAdmin tests", () => {
  describe.each(routes)("should return 401 for route $url with method $method", ({ method, url, body }) => {
    const findUser = vi.spyOn(database, "findUser");
    beforeEach(() => {
      findUser.mockClear();
    });
    test("should return 401 if not logged in", async () => {
      const response = await app.inject({
        method: method as InjectOptions["method"],
        url: url,
        payload: body
      });
      expect(findUser).not.toHaveBeenCalled();
      expect(await response.json()).toEqual({ error: "Unauthorized access" });
      expect(response.statusCode).toBe(401);
    });
    test("should return 401 if not found in database", async () => {
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
    test("should return 401 if not admin", async () => {
      findUser.mockResolvedValueOnce([testNonAdminUser]);
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
    test("should return 500 if findUser throws error", async () => {
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
  describe.each(routes)("should return 400 or 422 for route $url with method $method", ({ method, url, body }) => {
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
  });
});

describe("adminCreateUser tests", () => {
  const body = {
    username: "username",
    email: "email@email.com",
    password: "password",
    pictureUrl: "pictureUrl",
    isAdmin: 1
  };
  const customUser = {
    username: body.username,
    email: body.email,
    pictureUrl: body.pictureUrl,
    isAdmin: body.isAdmin,
    hashedPassword: "hashedPassword",
    uuid: "random-uuid",
    emailVerified: 1,
    invalidateSession: 0,
    accountType: "default"
  };
  const checkForUsersWithUsernameOrEmail = vi.spyOn(database, "checkForUsersWithUsernameOrEmail");
  const createUser = vi.spyOn(database, "createUser");
  const findUser = vi.spyOn(database, "findUser");
  const deleteUser = vi.spyOn(database, "deleteUser");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test.each([
    { ...body, email: "" },
    { ...body, password: "" },
    { ...body, email: "hi@gmailcom" },
    { ...body, email: "higmail.com" }
  ])("should return 400 for body %p", async (body) => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing/invalid required fields" });
    expect(response.statusCode).toBe(400);
  });

  it("should return 409 if user already exists", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(createUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "User already exists" });
    expect(response.statusCode).toBe(409);
  });

  it("should return 500 if checkForUsersWithUsernameOrEmail throws error", async () => {
    checkForUsersWithUsernameOrEmail.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(createUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Database error" });
    expect(response.statusCode).toBe(500);
  });

  it("should return 500 if createUser throws error", async () => {
    createUser.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith(customUser);
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledOnce();
    expect(deleteUser).toHaveBeenCalledWith({ email: customUser.email });
    expect(await response.json()).toEqual({ error: "Database error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if create user throws error and delete user throws error", async () => {
    createUser.mockRejectedValueOnce(new Error());
    deleteUser.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith(customUser);
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledOnce();
    expect(deleteUser).toHaveBeenCalledWith({ email: customUser.email });
    expect(await response.json()).toEqual({ error: "Database error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if findUser throws error", async () => {
    // twice for prehandler
    findUser.mockResolvedValueOnce([testAdminUser]).mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith(customUser);
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(findUser).toHaveBeenNthCalledWith(1, { uuid: headers["mock-uuid"] });
    expect(findUser).toHaveBeenNthCalledWith(2, { email: body.email });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenCalledOnce();
    expect(deleteUser).toHaveBeenCalledWith({ email: customUser.email });
    expect(await response.json()).toEqual({ error: "Database error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if findUser doesn't return exactly 1 user", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith(customUser);
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(findUser).toHaveBeenNthCalledWith(1, { uuid: headers["mock-uuid"] });
    expect(findUser).toHaveBeenNthCalledWith(2, { email: body.email });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({ error: "Database error" });
    expect(response.statusCode).toBe(500);
  });

  it("should return 200 if successful", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith(customUser);
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(findUser).toHaveBeenNthCalledWith(1, { uuid: headers["mock-uuid"] });
    expect(findUser).toHaveBeenNthCalledWith(2, { email: body.email });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({ message: "User created" });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminDeleteUser tests", () => {
  const findUser = vi.spyOn(database, "findUser");
  const deleteUser = vi.spyOn(database, "deleteUser");
  const deleteAllUserMetadata = vi.spyOn(fileMetadataHandler, "deleteAllUserMetadata");
  const deleteAllUserDatapacks = vi.spyOn(userHandlers, "deleteAllUserDatapacks");
  const body = { uuid: "test" };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if missing uuid", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: {},
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'uuid'",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if uuid is blank", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: { uuid: "" },
      headers
    });
    expect(await response.json()).toEqual({ error: "Missing uuid" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 404 if user not found", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenNthCalledWith(1, { uuid: headers["mock-uuid"] });
    expect(findUser).toHaveBeenNthCalledWith(2, { uuid: body.uuid });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "User not found" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 500 if findUser throws error", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenNthCalledWith(1, { uuid: headers["mock-uuid"] });
    expect(findUser).toHaveBeenNthCalledWith(2, { uuid: body.uuid });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 403 if user is root user", async () => {
    findUser
      .mockResolvedValueOnce([testAdminUser])
      .mockResolvedValueOnce([{ ...testAdminUser, email: "test@gmail.com" }]);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenNthCalledWith(1, { uuid: headers["mock-uuid"] });
    expect(findUser).toHaveBeenNthCalledWith(2, { uuid: body.uuid });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Cannot delete root user" });
    expect(response.statusCode).toBe(403);
  });
  it("should return 403 if user is root user (process.env.ADMIN_EMAIL)", async () => {
    const originalEnv = { ...process.env };
    process.env.ADMIN_EMAIL = "test@admin.com";
    findUser
      .mockResolvedValueOnce([testAdminUser])
      .mockResolvedValueOnce([{ ...testAdminUser, email: process.env.ADMIN_EMAIL }]);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenNthCalledWith(1, { uuid: headers["mock-uuid"] });
    expect(findUser).toHaveBeenNthCalledWith(2, { uuid: body.uuid });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Cannot delete root user" });
    expect(response.statusCode).toBe(403);
    process.env = originalEnv;
  });
  it("should return 500 if deleteUser throws error", async () => {
    deleteUser.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if deleteAllUserMetadata throws error", async () => {
    deleteAllUserMetadata.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(deleteAllUserMetadata).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 even if deleteAllUserDatapacks throws error", async () => {
    deleteAllUserDatapacks.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteAllUserDatapacks).toHaveBeenCalledTimes(1);
    expect(deleteAllUserMetadata).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "User deleted" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteAllUserDatapacks).toHaveBeenCalledTimes(1);
    expect(deleteAllUserMetadata).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "User deleted" });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminDeleteUserDatapack", () => {
  const body = {
    uuid: "test-uuid",
    datapack: "test-datapack"
  };
  const deleteDatapackFoundInMetadata = vi.spyOn(fileMetadataHandler, "deleteDatapackFoundInMetadata");
  const deleteUserDatapack = vi.spyOn(userHandlers, "deleteUserDatapack");
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const relative = vi.spyOn(path, "relative");
  const originalEnv = { ...process.env };
  process.cwd = () => "testdir";
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterAll(() => {
    process.env = originalEnv;
  });
  it("should return 400 if incorrect body", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: {},
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'uuid'",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  test.each([
    { ...body, uuid: "" },
    { ...body, datapack: "" },
    { datapack: "", uuid: "" }
  ])("should return 400 if fields are empty", async (body) => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(await response.json()).toEqual({ error: "Missing uuid or datapack id" });
    expect(response.statusCode).toEqual(400);
  });
  it("should return 500 if delete user datapack throws error", async () => {
    deleteUserDatapack.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(deleteUserDatapack).toBeCalledTimes(1);
    expect(deleteUserDatapack).toBeCalledWith(body.uuid, body.datapack);
    expect(fetchUserDatapackDirectory).not.toBeCalled();
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toEqual(500);
  });
  it("should return 500 if fetchUserDatapackFilepath throws error", async () => {
    fetchUserDatapackDirectory.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(deleteUserDatapack).toHaveBeenCalledTimes(1);
    expect(fetchUserDatapackDirectory).toBeCalledTimes(1);
    expect(fetchUserDatapackDirectory).toBeCalledWith(body.uuid, body.datapack);
    expect(deleteDatapackFoundInMetadata).not.toBeCalled();
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toEqual(500);
  });
  it("should return 500 if deleteDatapackFoundInMetadata throws error", async () => {
    relative.mockReturnValueOnce("test-datapack");
    deleteDatapackFoundInMetadata.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(deleteUserDatapack).toBeCalledTimes(1);
    expect(deleteUserDatapack).toBeCalledWith(body.uuid, body.datapack);
    expect(fetchUserDatapackDirectory).toBeCalledTimes(1);
    expect(fetchUserDatapackDirectory).toBeCalledWith(body.uuid, body.datapack);
    expect(deleteDatapackFoundInMetadata).toBeCalledTimes(1);
    expect(deleteDatapackFoundInMetadata).toBeCalledWith("testdir/fileMetadata.json", "test-datapack");
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toEqual(500);
  });
  it("should return 200 if successful", async () => {
    relative.mockReturnValueOnce("test-datapack");
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(deleteUserDatapack).toBeCalledTimes(1);
    expect(deleteUserDatapack).toBeCalledWith(body.uuid, body.datapack);
    expect(fetchUserDatapackDirectory).toBeCalledTimes(1);
    expect(fetchUserDatapackDirectory).toBeCalledWith(body.uuid, body.datapack);
    expect(deleteDatapackFoundInMetadata).toBeCalledTimes(1);
    expect(deleteDatapackFoundInMetadata).toBeCalledWith("testdir/fileMetadata.json", "test-datapack");
    expect(await response.json()).toEqual({ message: "Datapack deleted" });
    expect(response.statusCode).toEqual(200);
  });
});

describe("adminUploadDatapack", () => {
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  // let jsonOfFormData: Record<string, unknown>;
  const processAndUploadDatapack = vi.spyOn(uploadDatapack, "processAndUploadDatapack");
  // const checkFieldInFormData = (field: string) => {
  //   return field in jsonOfFormData;
  // };
  // const checkCleanupTempFiles = (maxCalls: number = 2) => {
  //   const maxRMCalls =
  //     checkFieldInFormData("datapack") && checkFieldInFormData(DATAPACK_PROFILE_PICTURE_FILENAME)
  //       ? maxCalls
  //       : checkFieldInFormData("datapack") || checkFieldInFormData(DATAPACK_PROFILE_PICTURE_FILENAME)
  //         ? 1
  //         : 0;
  //   expect(rm).toHaveBeenCalledTimes(maxRMCalls);
  //   if (checkFieldInFormData("datapack")) {
  //     expect(rm).toHaveBeenNthCalledWith(1, `test-private/tempFilename`, { force: true });
  //   }
  //   if (checkFieldInFormData(DATAPACK_PROFILE_PICTURE_FILENAME)) {
  //     expect(rm).toHaveBeenNthCalledWith(maxRMCalls, `test-private/${DATAPACK_PROFILE_PICTURE_FILENAME}.jpg`, {
  //       force: true
  //     });
  //   }
  //   if (checkFieldInFormData("title")) {
  //     expect(deleteOfficialDatapack).toHaveBeenCalledTimes(1);
  //   }
  // };
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
  describe.each(["/admin/official/datapack", "/admin/workshop/official/datapack"])(
    `should complete tests for route %s`,
    async (url) => {
      it("should return 500 if processAndUploadDatapack throws error", async () => {
        processAndUploadDatapack.mockRejectedValueOnce(new Error());
        const response = await app.inject({
          method: "POST",
          url: "/admin/official/datapack",
          payload: formData.payload,
          headers: formHeaders
        });
        expect(await response.json()).toEqual({ error: "Error uploading datapack" });
        expect(response.statusCode).toBe(500);
      });
      it("should return code if processAndUploadDatapack returns a non-200 code", async () => {
        processAndUploadDatapack.mockResolvedValueOnce({ code: 400, message: "message" });
        const response = await app.inject({
          method: "POST",
          url: "/admin/official/datapack",
          payload: formData.payload,
          headers: formHeaders
        });
        expect(processAndUploadDatapack).toHaveBeenCalledTimes(1);
        expect(await response.json()).toEqual({ error: "message" });
        expect(response.statusCode).toBe(400);
      });
      it("should return 200 if successful", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/admin/official/datapack",
          payload: formData.payload,
          headers: formHeaders
        });
        expect(processAndUploadDatapack).toHaveBeenCalledTimes(1);
        expect(await response.json()).toEqual({ message: "Datapack uploaded" });
        expect(response.statusCode).toBe(200);
      });
    }
  );
});
describe("getUsers", () => {
  const findUser = vi.spyOn(database, "findUser");
  const findWorkshop = vi.spyOn(database, "findWorkshop");
  const findUsersWorkshops = vi.spyOn(database, "findUsersWorkshops");
  it("should return any users without passwords", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([testAdminUser, testNonAdminUser]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/users",
      headers
    });
    expect(await response.json()).toEqual({
      users: [
        {
          ...testSharedAdminUser,
          isAdmin: true,
          isGoogleUser: false,
          invalidateSession: false,
          emailVerified: true
        },
        {
          ...testNonSharedAdminUser,
          isAdmin: false,
          isGoogleUser: false,
          invalidateSession: false,
          emailVerified: true
        }
      ]
    });
    expect(response.statusCode).toBe(200);
  });
  it("should return user with workshopIds and one without", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([testAdminUser, testNonAdminUser]);
    findWorkshop.mockResolvedValueOnce([testWorkshop]).mockResolvedValueOnce([]);
    findUsersWorkshops.mockResolvedValueOnce([testUserWorkshop]).mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/users",
      headers
    });
    expect(await response.json()).toEqual({
      users: [
        {
          ...testSharedAdminUser,
          isAdmin: true,
          isGoogleUser: false,
          invalidateSession: false,
          emailVerified: true,
          workshopIds: [testWorkshop.workshopId]
        },
        {
          ...testNonSharedAdminUser,
          isAdmin: false,
          isGoogleUser: false,
          invalidateSession: false,
          emailVerified: true
        }
      ]
    });
    expect(response.statusCode).toBe(200);
  });
  it("should return 404 if unknown error occurs", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/users",
      headers
    });
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 404 if displayed users are not correctly processed", async () => {
    const assertAdminSharedUser = vi.spyOn(shared, "assertAdminSharedUser").mockImplementationOnce(() => {
      throw new Error();
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/users",
      headers
    });
    expect(assertAdminSharedUser).toHaveBeenCalledTimes(1);
    expect(assertAdminSharedUser).toHaveBeenCalledWith({
      ...testSharedAdminUser,
      userId: 123,
      isAdmin: true,
      isGoogleUser: false,
      invalidateSession: false,
      emailVerified: true
    });
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(404);
  });
});

describe("adminDeleteOfficialDatapack", () => {
  const deleteOfficialDatapack = vi.spyOn(userHandlers, "deleteOfficialDatapack");
  const datapackTitle = "test-datapack";
  const body = { datapack: datapackTitle };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if incorrect body", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/official/datapack",
      payload: {},
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'datapack'",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if datapack is empty", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/official/datapack",
      payload: { datapack: "" },
      headers
    });
    expect(await response.json()).toEqual({ error: "Missing datapack title" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if deleteOfficialDatapack throws error", async () => {
    deleteOfficialDatapack.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/official/datapack",
      payload: { datapack: "test-datapack" },
      headers
    });
    expect(deleteOfficialDatapack).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Error deleting server datapack" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/official/datapack",
      payload: body,
      headers
    });
    expect(deleteOfficialDatapack).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: `Datapack ${datapackTitle} deleted` });
    expect(response.statusCode).toBe(200);
  });
});

describe("getAllUserDatapacks", () => {
  const fetchAllUsersDatapacks = vi.spyOn(userHandlers, "fetchAllUsersDatapacks");
  const payload = {
    uuid: "test-uuid"
  };
  const testDatapackArray = [
    {
      mock: "test-datapack"
    } as unknown as shared.Datapack
  ];
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if incorrect body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload: {},
      headers
    });
    expect(fetchAllUsersDatapacks).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'uuid'",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if uuid is empty", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload: { uuid: "" },
      headers
    });
    expect(fetchAllUsersDatapacks).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing uuid in body" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if fetchAllUsersDatapacks throws error", async () => {
    fetchAllUsersDatapacks.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload,
      headers
    });
    expect(fetchAllUsersDatapacks).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Unknown error fetching user datapacks" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful", async () => {
    fetchAllUsersDatapacks.mockResolvedValueOnce(testDatapackArray);
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload,
      headers
    });
    expect(fetchAllUsersDatapacks).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual(testDatapackArray);
    expect(response.statusCode).toBe(200);
  });
});

describe("adminAddUsersToWorkshop", () => {
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  const rm = vi.spyOn(fsPromises, "rm");
  const pipeline = vi.spyOn(streamPromises, "pipeline");
  const parseExcelFile = vi.spyOn(excel, "parseExcelFile");
  const findUser = vi.spyOn(database, "findUser");
  const createUser = vi.spyOn(database, "createUser");
  const checkForUsersWithUsernameOrEmail = vi.spyOn(database, "checkForUsersWithUsernameOrEmail");
  const updateUser = vi.spyOn(database, "updateUser");
  const getWorkshopIfNotEnded = vi.spyOn(database, "getWorkshopIfNotEnded");
  const checkWorkshopHasUser = vi.spyOn(database, "checkWorkshopHasUser");
  const createUsersWorkshops = vi.spyOn(database, "createUsersWorkshops");
  const createForm = (json: Record<string, unknown> = {}) => {
    if (!("file" in json)) {
      json.file = {
        value: Buffer.from("test"),
        options: {
          filename: "test.xlsx",
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      };
    }
    if (!("emails" in json)) {
      json.emails = "test@gmail.com, test2@gmail.com";
    }
    if (!("workshopId" in json)) {
      json.workshopId = "1";
    }
    formData = formAutoContent({ ...json }, { payload: "body", forceMultiPart: true });
    formHeaders = { ...headers, ...(formData.headers as Record<string, string>) };
  };
  beforeEach(() => {
    createForm();
    vi.clearAllMocks();
  });
  it("should return 403 if file attempts directory traversal", async () => {
    vi.mocked(path.resolve)
      .mockImplementationOnce((...args) => resolve(...args))
      .mockReturnValueOnce("root");
    createForm({
      file: {
        value: Buffer.from("test"),
        options: {
          filename: "./../../../etc.xlsx", // multipart form data doesn't allow ../ so this goes to etc.xlsx
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(parseExcelFile).not.toHaveBeenCalled();
    expect(pipeline).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Directory traversal detected" });
    expect(response.statusCode).toBe(403);
  });
  test.each(["text.png", "text.jpg", "text.gif", "text.bmp", "text", "text.tx", "text.zip"])(
    `should return 400 if file is not in a correct format: %s`,
    async (filename) => {
      createForm({
        file: {
          value: Buffer.from("test"),
          options: {
            filename: filename,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          }
        }
      });
      const response = await app.inject({
        method: "POST",
        url: "/admin/workshop/users",
        payload: formData.body,
        headers: formHeaders
      });
      expect(pipeline).not.toHaveBeenCalled();
      expect(parseExcelFile).not.toHaveBeenCalled();
      expect(await response.json()).toEqual({ error: "Invalid file type" });
      expect(response.statusCode).toBe(400);
    }
  );
  it("should return 500 if pipeline throws error", async () => {
    pipeline.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Error saving file" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 400 if file is too big", async () => {
    createForm({
      file: {
        value: Buffer.from("t".repeat(60 * 1024 * 1024 + 1)), // 60MB + 1 byte
        options: {
          filename: "test.xlsx",
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(parseExcelFile).not.toHaveBeenCalled();
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "File too large" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if bytesRead is 0", async () => {
    createForm({
      file: {
        value: Buffer.from(""),
        options: {
          filename: "test.xlsx",
          contentType: "application/zip"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Empty file cannot be uploaded" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if missing workshopId", async () => {
    createForm({ workshopId: "" });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Invalid or missing workshop id" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if workshopId is not a number", async () => {
    createForm({ workshopId: "abcd" });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Invalid or missing workshop id" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if missing file field and email field", async () => {
    createForm({
      file: "",
      emails: ""
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Missing either emails or file" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 404 if getWorkshopIfNotEnded returns empty", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(null);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(getWorkshopIfNotEnded).toHaveBeenCalledTimes(1);
    expect(getWorkshopIfNotEnded).toHaveBeenCalledWith(testWorkshop.workshopId);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Workshop not found" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 400 if emails is invalid", async () => {
    createForm({ emails: "test1, test2" });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Invalid email addresses provided", invalidEmails: "test1, test2" });
    expect(response.statusCode).toBe(409);
  });
  it("should return 400 if parseExcelFile fails", async () => {
    parseExcelFile.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Error parsing excel file" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if findUser returns empty", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Error creating user", invalidEmails: "test@gmail.com" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if findUser throws an error", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/uploadDirectory/test.xlsx`), { force: true });
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful and add new users", async () => {
    findUser
      .mockResolvedValueOnce([testAdminUser])
      .mockResolvedValueOnce([testAdminUser])
      .mockResolvedValueOnce([testAdminUser2]);
    checkWorkshopHasUser.mockResolvedValueOnce([testUserWorkshop]).mockResolvedValueOnce([testUserWorkshop2]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(2);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenNthCalledWith(1, "test@gmail.com", "test@gmail.com");
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenNthCalledWith(2, "test2@gmail.com", "test2@gmail.com");
    expect(createUsersWorkshops).toHaveBeenNthCalledWith(1, { userId: 123, workshopId: 1 });
    expect(createUsersWorkshops).toHaveBeenNthCalledWith(2, { userId: 321, workshopId: 1 });
    expect(createUser).toHaveBeenCalledTimes(2);
    expect(createUser).toHaveBeenNthCalledWith(1, {
      email: "test@gmail.com",
      hashedPassword: "hashedPassword",
      isAdmin: 0,
      emailVerified: 1,
      invalidateSession: 0,
      pictureUrl: null,
      username: "test@gmail.com",
      uuid: "random-uuid",
      accountType: "default"
    });
    expect(createUser).toHaveBeenNthCalledWith(2, {
      email: "test2@gmail.com",
      hashedPassword: "hashedPassword",
      isAdmin: 0,
      emailVerified: 1,
      invalidateSession: 0,
      pictureUrl: null,
      username: "test2@gmail.com",
      uuid: "random-uuid",
      accountType: "default"
    });
    expect(findUser).toHaveBeenCalledTimes(3); // 1st call is from the prehandler verifyAdmin
    expect(findUser).toHaveBeenNthCalledWith(2, { email: "test@gmail.com" });
    expect(findUser).toHaveBeenNthCalledWith(3, { email: "test2@gmail.com" });
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(1, 123, 1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(2, 321, 1);
    expect(updateUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ message: "Users added" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and update old users", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([testAdminUser2]);
    checkWorkshopHasUser
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([testUserWorkshop])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([testUserWorkshop2]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(1, 123, 1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(2, 123, 1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(3, 321, 1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(4, 321, 1);
    expect(createUsersWorkshops).toHaveBeenNthCalledWith(1, { userId: 123, workshopId: 1 });
    expect(createUsersWorkshops).toHaveBeenNthCalledWith(2, { userId: 321, workshopId: 1 });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(2);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenNthCalledWith(1, "test@gmail.com", "test@gmail.com");
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenNthCalledWith(2, "test2@gmail.com", "test2@gmail.com");
    expect(createUser).not.toHaveBeenCalled();
    expect(findUser).toHaveBeenCalledTimes(1); // 1st call is from the prehandler verifyAdmin
    expect(await response.json()).toEqual({ message: "Users added" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 500 if fails to update one of multiple old users", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([testAdminUser2]);
    checkWorkshopHasUser
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([testUserWorkshop2]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(1, 123, 1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(2, 123, 1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(3, 321, 1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(4, 321, 1);
    expect(createUsersWorkshops).toHaveBeenNthCalledWith(1, { userId: 123, workshopId: 1 });
    expect(createUsersWorkshops).toHaveBeenNthCalledWith(2, { userId: 321, workshopId: 1 });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(2);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenNthCalledWith(1, "test@gmail.com", "test@gmail.com");
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenNthCalledWith(2, "test2@gmail.com", "test2@gmail.com");
    expect(createUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Error adding user to workshop",
      invalidEmails: ["test@gmail.com"]
    });
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if one of multiple users fails to be added to the workshop", async () => {
    findUser
      .mockResolvedValueOnce([testAdminUser])
      .mockResolvedValueOnce([testAdminUser])
      .mockResolvedValueOnce([testAdminUser2])
      .mockResolvedValueOnce([testAdminUser2]);
    checkWorkshopHasUser.mockResolvedValueOnce([]).mockResolvedValueOnce([testUserWorkshop2]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(2);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenNthCalledWith(1, "test@gmail.com", "test@gmail.com");
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenNthCalledWith(2, "test2@gmail.com", "test2@gmail.com");
    expect(createUsersWorkshops).toHaveBeenNthCalledWith(1, { userId: 123, workshopId: 1 });
    expect(createUsersWorkshops).toHaveBeenNthCalledWith(2, { userId: 321, workshopId: 1 });
    expect(createUser).toHaveBeenCalledTimes(2);
    expect(createUser).toHaveBeenNthCalledWith(1, {
      email: "test@gmail.com",
      hashedPassword: "hashedPassword",
      isAdmin: 0,
      emailVerified: 1,
      invalidateSession: 0,
      pictureUrl: null,
      username: "test@gmail.com",
      uuid: "random-uuid",
      accountType: "default"
    });
    expect(createUser).toHaveBeenNthCalledWith(2, {
      email: "test2@gmail.com",
      hashedPassword: "hashedPassword",
      isAdmin: 0,
      emailVerified: 1,
      invalidateSession: 0,
      pictureUrl: null,
      username: "test2@gmail.com",
      uuid: "random-uuid",
      accountType: "default"
    });

    expect(findUser).toHaveBeenCalledTimes(3); // 1st call is from the prehandler verifyAdmin
    expect(findUser).toHaveBeenNthCalledWith(2, { email: "test@gmail.com" });
    expect(findUser).toHaveBeenNthCalledWith(3, { email: "test2@gmail.com" });
    expect(checkWorkshopHasUser).toHaveBeenCalledTimes(2);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(1, 123, 1);
    expect(checkWorkshopHasUser).toHaveBeenNthCalledWith(2, 321, 1);
    expect(await response.json()).toEqual({
      error: "Error adding user to workshop",
      invalidEmails: ["test@gmail.com"]
    });
    expect(response.statusCode).toBe(500);
  });
});

describe("adminGetWorkshops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const findWorkshop = vi.spyOn(database, "findWorkshop");
  it("should return 500 if findWorkshop throws an error", async () => {
    findWorkshop.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "GET",
      url: "/admin/workshops",
      headers
    });
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful and workshop active as false", async () => {
    findWorkshop.mockResolvedValueOnce([testWorkshop]);
    const response = await app.inject({
      method: "GET",
      url: "/admin/workshops",
      headers
    });
    expect(await response.json()).toEqual({ workshops: [{ ...testWorkshop, active: false }] });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and workshop active as true", async () => {
    findWorkshop.mockResolvedValueOnce([{ ...testWorkshop, start: mockDate.toISOString() }]);
    const response = await app.inject({
      method: "GET",
      url: "/admin/workshops",
      headers
    });
    expect(await response.json()).toEqual({
      workshops: [{ ...testWorkshop, start: mockDate.toISOString(), active: true }]
    });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminCreateWorkshop", () => {
  const createWorkshop = vi.spyOn(database, "createWorkshop");
  const findWorkshop = vi.spyOn(database, "findWorkshop");
  const body = {
    title: testWorkshop.title,
    start: testWorkshop.start,
    end: testWorkshop.end
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if incorrect body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: {},
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'title'",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if title is empty", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, title: "" },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing required fields" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if start is empty", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, start: "" },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing required fields" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if end is empty", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, end: "" },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing required fields" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if start is after end", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, start: testWorkshop.end, end: testWorkshop.start },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Invalid date format or dates are not valid" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if start is before current date", async () => {
    const start = new Date(mockDate);
    start.setHours(mockDate.getHours() - 1);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, start: start.toISOString(), end: testWorkshop.end },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Invalid date format or dates are not valid" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 409 if workshop with title and dates already exists", async () => {
    findWorkshop.mockResolvedValueOnce([testWorkshop]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(findWorkshop).toHaveBeenCalledTimes(1);
    expect(findWorkshop).toHaveBeenCalledWith({ title: body.title, start: body.start, end: body.end });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Workshop with same title and dates already exists" });
    expect(response.statusCode).toBe(409);
  });
  it("should return 500 if createWorkshop does not return a workshopId", async () => {
    createWorkshop.mockResolvedValueOnce(undefined);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(createWorkshop).toHaveBeenCalledTimes(1);
    expect(createWorkshop).toHaveBeenCalledWith(body);
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful", async () => {
    createWorkshop.mockResolvedValueOnce(1);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(createWorkshop).toHaveBeenCalledTimes(1);
    expect(createWorkshop).toHaveBeenCalledWith(body);
    expect(await response.json()).toEqual({ workshop: { ...testWorkshop, active: false } });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminEditWorkshop", () => {
  const updateWorkshop = vi.spyOn(database, "updateWorkshop");
  const findWorkshop = vi.spyOn(database, "findWorkshop");
  const getWorkshopIfNotEnded = vi.spyOn(database, "getWorkshopIfNotEnded");
  const body = {
    workshopId: testWorkshop.workshopId,
    title: "new-title",
    start: testWorkshop.start
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if incorrect body", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: {},
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'workshopId'",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if workshopId is empty", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { ...body, workshopId: null },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing required fields" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if title, start, and end are empty", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { workshopId: body.workshopId },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing required fields" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if start is an invalid date", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { ...body, start: "invalid" },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Invalid start date" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 404 if workshop does not exist", async () => {
    vi.mocked(database.getWorkshopIfNotEnded).mockResolvedValueOnce(null);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Workshop not found or has ended" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 400 if end is an invalid date", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshop);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { ...body, end: "invalid" },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Invalid end date" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if start is after end", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshop);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { ...body, start: testWorkshop.end, end: testWorkshop.start },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Invalid end date" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 409 if workshop with title and dates already exists", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshop);
    findWorkshop.mockResolvedValueOnce([{ ...body, end: testWorkshop.end }]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(getWorkshopIfNotEnded).toHaveBeenCalledTimes(1);
    expect(getWorkshopIfNotEnded).toHaveBeenCalledWith(body.workshopId);
    expect(findWorkshop).toHaveBeenCalledTimes(1);
    expect(findWorkshop).toHaveBeenCalledWith({ title: body.title, start: body.start, end: testWorkshop.end });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Workshop with same title and dates already exists" });
    expect(response.statusCode).toBe(409);
  });
  it("should return 500 if findWorkshop throws an error", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshop);
    findWorkshop.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful and update workshop", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshop);
    findWorkshop.mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(updateWorkshop).toHaveBeenCalledOnce();
    expect(updateWorkshop).toHaveBeenCalledWith({ workshopId: body.workshopId }, { ...body, workshopId: undefined });
    expect(await response.json()).toEqual({ workshop: { ...body, end: testWorkshop.end, active: false } });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminDeleteWorkshop", () => {
  const deleteWorkshop = vi.spyOn(database, "deleteWorkshop");
  const findWorkshop = vi.spyOn(database, "findWorkshop");
  const body = {
    workshopId: testWorkshop.workshopId
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if incorrect body", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/workshop",
      payload: {},
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'workshopId'",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if workshopId is empty", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/workshop",
      payload: { workshopId: null },
      headers
    });
    expect(deleteWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing workshopId" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 404 if workshop does not exist", async () => {
    findWorkshop.mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(deleteWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Workshop not found" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 500 if deleteWorkshop fails", async () => {
    findWorkshop.mockResolvedValueOnce([testWorkshop]);
    deleteWorkshop.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(deleteWorkshop).toHaveBeenCalledTimes(1);
    expect(deleteWorkshop).toHaveBeenCalledWith(body);
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful", async () => {
    findWorkshop.mockResolvedValueOnce([testWorkshop]);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(deleteWorkshop).toHaveBeenCalledTimes(1);
    expect(deleteWorkshop).toHaveBeenCalledWith(body);
    expect(await response.json()).toEqual({ message: "Workshop deleted" });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminModifyUser tests", () => {
  const body = {
    username: "username",
    email: "email@email.com",
    accountType: "pro",
    isAdmin: 1
  };

  const checkForUsersWithUsernameOrEmail = vi.spyOn(database, "checkForUsersWithUsernameOrEmail");
  const updateUser = vi.spyOn(database, "updateUser");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if fields are missing", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: {},
      headers
    });

    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message:
        "body must have required property 'accountType', body must have required property 'isAdmin', body must match a schema in anyOf",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if fields are empty", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: { username: "", email: "", accountType: "", isAdmin: null },
      headers
    });

    expect(await response.json()).toEqual({ error: "Missing/invalid required fields" });
    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if accountType is invalid", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: { username: "username", email: "email@email.com", accountType: "pro+", isAdmin: null },
      headers
    });

    expect(await response.json()).toEqual({ error: "Missing/invalid required fields" });
    expect(response.statusCode).toBe(400);
  });

  it("should return 409 if user does not exist", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: body,
      headers
    });

    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "User does not exist." });
    expect(response.statusCode).toBe(409);
  });

  it("should return 500 if checkForUsersWithUsernameOrEmail throws error", async () => {
    checkForUsersWithUsernameOrEmail.mockRejectedValueOnce(new Error("Database error"));
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: body,
      headers
    });

    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Database error" });
    expect(response.statusCode).toBe(500);
  });

  it("should return 500 if updateUser throws error", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]);
    updateUser.mockRejectedValueOnce(new Error("Database error"));

    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: body,
      headers
    });

    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith(
      { email: body.email },
      { accountType: body.accountType, isAdmin: body.isAdmin }
    );
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Database error" });
    expect(response.statusCode).toBe(500);
  });

  it("should return 200 if successful", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]);

    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: body,
      headers
    });

    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith(
      { email: body.email },
      { accountType: body.accountType, isAdmin: body.isAdmin }
    );
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "User modified." });
    expect(response.statusCode).toBe(200);
  });

  it("should return 200 if successful with just accountType", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: {
        username: "username",
        email: "email@email.com",
        accountType: "pro"
      },
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ email: body.email }, { accountType: body.accountType });
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "User modified." });
    expect(response.statusCode).toBe(200);
  });

  it("should return 200 if successful with just isAdmin", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: {
        username: "username",
        email: "email@email.com",
        isAdmin: 1
      },
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ email: body.email }, { isAdmin: body.isAdmin });
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "User modified." });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminEditDatapackPriorities", () => {
  const url = "/admin/official/datapack/priority";
  const datapackPriorityTaskOne = {
    id: 1,
    priority: 1,
    uuid: "uuid1"
  };
  const datapackPriorityTaskTwo = {
    id: 2,
    priority: 2,
    uuid: "uuid2"
  };
  const payload = {
    tasks: [datapackPriorityTaskOne]
  };
  const assertDatapackPriorityChangeRequestArray = vi.spyOn(shared, "assertDatapackPriorityChangeRequestArray");
  const editAdminDatapackPriorities = vi.spyOn(adminHandler, "editAdminDatapackPriorities");
  const loggerError = vi.spyOn(logger.default, "error");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if body is not in the correct format", async () => {
    assertDatapackPriorityChangeRequestArray.mockImplementationOnce(() => {
      throw new Error("Not valid body");
    });
    const response = await app.inject({
      method: "PATCH",
      url,
      payload: { tasks: "not an array" },
      headers
    });
    expect(assertDatapackPriorityChangeRequestArray).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Invalid request" });
  });
  it("should return 500 if editAdminDatapackPriorities throws error for 1 task", async () => {
    editAdminDatapackPriorities.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "PATCH",
      url,
      payload,
      headers
    });
    expect(editAdminDatapackPriorities).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Unknown error, no priorities updated" });
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if editAdminDatapackPriorities throws error for 2 tasks", async () => {
    editAdminDatapackPriorities.mockRejectedValueOnce(new Error()).mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "PATCH",
      url,
      payload: { tasks: [datapackPriorityTaskOne, datapackPriorityTaskTwo] },
      headers
    });
    expect(editAdminDatapackPriorities).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({ error: "Unknown error, no priorities updated" });
    expect(loggerError).toHaveBeenCalledTimes(2);
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 for a partial error where one task completes but another throws an error", async () => {
    editAdminDatapackPriorities.mockResolvedValueOnce().mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "PATCH",
      url,
      payload: { tasks: [datapackPriorityTaskOne, datapackPriorityTaskTwo] },
      headers
    });
    expect(editAdminDatapackPriorities).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({
      error: "Some priorities updated",
      failedRequests: [datapackPriorityTaskTwo],
      completedRequests: [datapackPriorityTaskOne]
    });
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful for 1 task", async () => {
    const response = await app.inject({
      method: "PATCH",
      url,
      payload,
      headers
    });
    expect(editAdminDatapackPriorities).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      message: "Priorities updated",
      completedRequests: [datapackPriorityTaskOne]
    });
    expect(loggerError).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful for 2 tasks", async () => {
    const response = await app.inject({
      method: "PATCH",
      url,
      payload: { tasks: [datapackPriorityTaskOne, datapackPriorityTaskTwo] },
      headers
    });
    expect(editAdminDatapackPriorities).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({
      message: "Priorities updated",
      completedRequests: [datapackPriorityTaskOne, datapackPriorityTaskTwo]
    });
    expect(loggerError).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
  });
});

describe("adminAddOfficialDatapackToWorkshop", () => {
  const body = {
    workshopId: testWorkshop.workshopId,
    datapackTitle: "datapack-title"
  };
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const doesDatapackFolderExistInAllUUIDDirectories = vi.spyOn(
    userHandlers,
    "doesDatapackFolderExistInAllUUIDDirectories"
  );
  const setupNewDatapackDirectoryInUUIDDirectory = vi.spyOn(uploadHandlers, "setupNewDatapackDirectoryInUUIDDirectory");
  const fetchUserDatapack = vi.spyOn(userHandlers, "fetchUserDatapack");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });
  it("should return 400 if workshopId is null", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: { datapackTitle: body.datapackTitle, workshopId: null },
      headers
    });
    expect(await response.json()).toEqual({ error: "Missing workshopId or datapackTitle" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if datapackTitle is null", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: { workshopId: body.workshopId, datapackTitle: null },
      headers
    });
    expect(await response.json()).toEqual({ error: "Missing workshopId or datapackTitle" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 404 if workshop does not exist", async () => {
    vi.mocked(database.getWorkshopIfNotEnded).mockResolvedValueOnce(null);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: body,
      headers
    });
    expect(await response.json()).toEqual({ error: "Workshop not found or has ended" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 404 if datapack does not exist in official folder", async () => {
    vi.mocked(fetchUserFiles.fetchUserDatapackDirectory).mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: body,
      headers
    });
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
    expect(fetchUserDatapackDirectory).toHaveBeenCalledWith("official", body.datapackTitle);
    expect(await response.json()).toEqual({ error: "Datapack not found" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 409 if datapack already exists in workshop folder", async () => {
    doesDatapackFolderExistInAllUUIDDirectories.mockResolvedValueOnce(true);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: body,
      headers
    });
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
    expect(fetchUserDatapackDirectory).toHaveBeenCalledWith("official", body.datapackTitle);
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledTimes(1);
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledWith("workshop-1", body.datapackTitle);
    expect(await response.json()).toEqual({ error: "Datapack already exists" });
    expect(response.statusCode).toBe(409);
  });
  it("should return 500 if setupNewDatapackDirectoryInUUIDDirectory does not add datapck", async () => {
    setupNewDatapackDirectoryInUUIDDirectory.mockResolvedValueOnce({});
    vi.mocked(fsPromises.readFile).mockResolvedValueOnce(JSON.stringify(testDatapackDescription));
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: body,
      headers
    });
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
    expect(fetchUserDatapackDirectory).toHaveBeenCalledWith("official", body.datapackTitle);
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledTimes(1);
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledWith("workshop-1", body.datapackTitle);
    expect(await response.json()).toEqual({ error: "Error setting up datapack directory" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful", async () => {
    doesDatapackFolderExistInAllUUIDDirectories.mockResolvedValueOnce(false);
    fetchUserDatapack.mockResolvedValueOnce(testDatapackDescription as shared.Datapack);
    setupNewDatapackDirectoryInUUIDDirectory.mockResolvedValueOnce({
      [testDatapackDescription.title]: {} as shared.Datapack
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: body,
      headers
    });
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
    expect(fetchUserDatapackDirectory).toHaveBeenCalledWith("official", body.datapackTitle);
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledTimes(1);
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledWith("workshop-1", body.datapackTitle);
    expect(await response.json()).toEqual({ message: "Datapack added to workshop" });
    expect(response.statusCode).toBe(200);
  });
});

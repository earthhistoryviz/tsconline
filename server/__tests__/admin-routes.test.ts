import fastify, { FastifyInstance, HTTPMethods, InjectOptions } from "fastify";
import * as adminAuth from "../src/admin/admin-auth";
import * as database from "../src/database";
import * as verify from "../src/verify";
import * as fsPromises from "fs/promises";
import * as fileMetadataHandler from "../src/file-metadata-handler";
import * as path from "path";
import * as childProcess from "node:child_process";
import * as loadPacks from "../src/load-packs";
import * as util from "../src/util";
import * as streamPromises from "stream/promises";
import * as index from "../src/index";
import * as shared from "@tsconline/shared";
import { afterAll, beforeAll, describe, test, it, vi, expect, beforeEach } from "vitest";
import fastifySecureSession from "@fastify/secure-session";
import { join, normalize, resolve } from "path";
import fastifyMultipart from "@fastify/multipart";
import formAutoContent from "form-auto-content";
import { DatapackMetadata, ServerDatapackIndex } from "@tsconline/shared";
import * as uploadHandlers from "../src/upload-handlers";
import * as excel from "../src/parse-excel-file";
import * as adminConfig from "../src/admin/admin-config";
import { User, Workshop } from "../src/types";

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
    assertAdminSharedUser: vi.fn().mockImplementation(actual.assertAdminSharedUser),
    assertDatapackIndex: vi.fn().mockReturnValue(true),
    assertSharedWorkshop: vi.fn().mockImplementation(actual.assertSharedWorkshop),
    assertSharedWorkshopArray: vi.fn().mockImplementation(actual.assertSharedWorkshopArray)
  };
});

vi.mock("../src/upload-handlers", async () => {
  return {
    uploadUserDatapackHandler: vi.fn().mockResolvedValue({})
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
    join: vi.fn().mockImplementation((...args) => args.join("/"))
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
    realpath: vi.fn().mockImplementation(async (path) => path)
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

vi.mock("../src/index", async () => {
  return {
    serverDatapackIndex: { "admin-datapack": {}, "active-datapack": {}, "remove-datapack": {} },
    mapPackIndex: {}
  };
});

vi.mock("../src/admin/admin-config", async () => {
  return {
    getAdminConfigDatapacks: vi.fn(() => {
      return [];
    }),
    addAdminConfigDatapack: vi.fn(),
    removeAdminConfigDatapack: vi.fn()
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
    getAndHandleWorkshopEnd: vi.fn(() => Promise.resolve(testWorkshop)),
    updateWorkshop: vi.fn().mockResolvedValue({})
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
  workshopId: 1,
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
  { method: "DELETE", url: "/admin/server/datapack", body: { datapack: "test" } },
  { method: "POST", url: "/admin/server/datapack", body: { datapack: "test" } },
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
  }
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
    workshopId: 0,
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
  const realpath = vi.spyOn(fsPromises, "realpath");
  const deleteAllUserMetadata = vi.spyOn(fileMetadataHandler, "deleteAllUserMetadata");
  const rm = vi.spyOn(fsPromises, "rm");
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
  it("should return 403 if uuid attempts a directory traversal", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: { uuid: "../" },
      headers
    });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(findUser).toHaveBeenNthCalledWith(1, { uuid: headers["mock-uuid"] });
    expect(findUser).toHaveBeenNthCalledWith(2, { uuid: "../" });
    expect(deleteUser).toHaveBeenCalledOnce();
    expect(deleteUser).toHaveBeenCalledWith({ uuid: "../" });
    expect(realpath).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Directory traversal detected" });
    expect(response.statusCode).toBe(403);
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
    expect(deleteAllUserMetadata).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenNthCalledWith(2, { uuid: body.uuid });
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith({ uuid: body.uuid });
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledWith(resolve("testdir/uploadDirectory", body.uuid));
    expect(deleteAllUserMetadata).toHaveBeenCalledTimes(1);
    expect(deleteAllUserMetadata).toHaveBeenCalledWith("testdir/fileMetadata.json", body.uuid);
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve("testdir/uploadDirectory", body.uuid), { recursive: true, force: true });
    expect(await response.json()).toEqual({ message: "User deleted" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 even if no upload directory is found", async () => {
    realpath.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenNthCalledWith(2, { uuid: body.uuid });
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith({ uuid: body.uuid });
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledWith(resolve("testdir/uploadDirectory", body.uuid));
    expect(deleteAllUserMetadata).toHaveBeenCalledTimes(1);
    expect(deleteAllUserMetadata).toHaveBeenCalledWith("testdir/fileMetadata.json", body.uuid);
    expect(rm).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ message: "User deleted" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if removing user directory throws error", async () => {
    rm.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenNthCalledWith(2, { uuid: body.uuid });
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith({ uuid: body.uuid });
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledWith(resolve("testdir/uploadDirectory", body.uuid));
    expect(deleteAllUserMetadata).toHaveBeenCalledTimes(1);
    expect(deleteAllUserMetadata).toHaveBeenCalledWith("testdir/fileMetadata.json", body.uuid);
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve("testdir/uploadDirectory", body.uuid), { recursive: true, force: true });
    expect(await response.json()).toEqual({ message: "User deleted" });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminDeleteUserDatapack", () => {
  const body = {
    uuid: "test-uuid",
    datapack: "test-datapack"
  };
  const realpath = vi.spyOn(fsPromises, "realpath");
  const deleteDatapackFoundInMetadata = vi.spyOn(fileMetadataHandler, "deleteDatapackFoundInMetadata");
  const relativeDatapackDirectory = normalize(
    join("testdir", "uploadDirectory", body.uuid, "datapacks", body.datapack)
  );
  beforeEach(() => {
    vi.clearAllMocks();
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
  it("should return 403 if uuid attempts a traversal of directories", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: { ...body, uuid: "../" },
      headers
    });
    expect(await response.json()).toEqual({ error: "Directory traversal detected" });
    expect(response.statusCode).toEqual(403);
  });
  it("should return 500 if directory doesn't exist", async () => {
    realpath.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(deleteDatapackFoundInMetadata).not.toHaveBeenCalled();
    expect(realpath).toBeCalledTimes(1);
    expect(realpath).toBeCalledWith(resolve("testdir/uploadDirectory"));
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toEqual(500);
  });
  it("should return 500 if delete datapack throws error", async () => {
    deleteDatapackFoundInMetadata.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(deleteDatapackFoundInMetadata).toBeCalledTimes(1);
    expect(deleteDatapackFoundInMetadata).toBeCalledWith("testdir/fileMetadata.json", relativeDatapackDirectory);
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toEqual(500);
  });
  it("should return 200 if successful", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(deleteDatapackFoundInMetadata).toBeCalledTimes(1);
    expect(deleteDatapackFoundInMetadata).toBeCalledWith("testdir/fileMetadata.json", relativeDatapackDirectory);
    expect(await response.json()).toEqual({ message: "Datapack deleted" });
    expect(response.statusCode).toEqual(200);
  });
});

describe("adminUploadServerDatapack", () => {
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  const execFile = vi.spyOn(childProcess, "execFile");
  const rm = vi.spyOn(fsPromises, "rm");
  const realpath = vi.spyOn(fsPromises, "realpath");
  const loadIndexes = vi.spyOn(loadPacks, "loadDatapackIntoIndex");
  const pipeline = vi.spyOn(streamPromises, "pipeline");
  const checkFileExists = vi.spyOn(util, "checkFileExists");
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
    authoredBy: "test-author"
  };
  const filepath = resolve(join("testdir", "datapacksDirectory", "tempFilename"));
  const getAdminConfigDatapacks = vi.spyOn(adminConfig, "getAdminConfigDatapacks");
  const addAdminConfigDatapack = vi.spyOn(adminConfig, "addAdminConfigDatapack");
  const uploadUserDatapackHandler = vi
    .spyOn(uploadHandlers, "uploadUserDatapackHandler")
    .mockResolvedValue(testDatapackDescription);
  const checkErrorHandler = (statusCode: number) => {
    expect(rm).toHaveBeenNthCalledWith(1, expect.stringContaining(normalize("testdir/datapacksDirectory")), {
      force: true
    });
    expect(rm).toHaveBeenNthCalledWith(2, expect.stringContaining(normalize("testdir/decryptionDirectory")), {
      recursive: true,
      force: true
    });
    expect(statusCode).toBe(500);
  };
  const createForm = (json: Record<string, unknown> = {}) => {
    if (!("file" in json)) {
      json.file = {
        value: Buffer.from("test"),
        options: {
          filename: "test.dpk",
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
  afterAll(() => {
    uploadUserDatapackHandler.mockReset();
    uploadUserDatapackHandler.mockResolvedValue({} as DatapackMetadata);
  });
  it("should return 400 if missing file field", async () => {
    createForm({ file: "" });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(getAdminConfigDatapacks).toHaveBeenCalledOnce();
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing file" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 403 if file attempts directory traversal", async () => {
    vi.mocked(path.resolve)
      .mockImplementationOnce((...args) => resolve(...args))
      .mockReturnValueOnce("root");
    createForm({
      file: {
        value: Buffer.from("test"),
        options: {
          filename: "./../../../etc.dpk", // multipart form data doesn't allow ../ so this goes to etc.dpk
          contentType: "application/zip"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(getAdminConfigDatapacks).toHaveBeenCalledOnce();
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
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
            contentType: "plain/text"
          }
        }
      });
      const response = await app.inject({
        method: "POST",
        url: "/admin/server/datapack",
        payload: formData.body,
        headers: formHeaders
      });
      expect(getAdminConfigDatapacks).toHaveBeenCalledOnce();
      expect(addAdminConfigDatapack).not.toHaveBeenCalled();
      expect(pipeline).not.toHaveBeenCalled();
      expect(execFile).not.toHaveBeenCalled();
      expect(await response.json()).toEqual({ error: "Invalid file type" });
      expect(response.statusCode).toBe(400);
    }
  );
  it("should return 409 if file already exists and admin config states it exists", async () => {
    const adminConfig = {
      ...testDatapackDescription,
      title: "admin-datapack"
    };
    getAdminConfigDatapacks.mockReturnValueOnce([adminConfig]);
    uploadUserDatapackHandler.mockResolvedValueOnce(adminConfig);
    createForm({
      file: {
        value: Buffer.from("test"),
        options: {
          filename: "admin-datapack.dpk", // only in adminconfigs import
          contentType: "application/zip"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(getAdminConfigDatapacks).toHaveBeenCalledTimes(1);
    expect(getAdminConfigDatapacks).toHaveBeenCalledWith();
    expect(await response.json()).toEqual({ error: "Datapack already exists" });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(checkFileExists).toHaveBeenCalledTimes(2);
    expect(execFile).not.toHaveBeenCalled();
    expect(pipeline).toHaveBeenCalledOnce();
    expect(uploadUserDatapackHandler).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(409);
  });
  it("should return 500 if pipeline throws error", async () => {
    pipeline.mockRejectedValueOnce(new Error());
    createForm();
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(execFile).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/datapacksDirectory/tempFilename`), {
      force: true
    });
    expect(await response.json()).toEqual({ error: "Error saving file" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 500 if execFile throws error", async () => {
    execFile.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(realpath).not.toHaveBeenCalled();
    checkErrorHandler(response.statusCode);
    expect(await response.json()).toEqual({ error: "Error decrypting file" });
  });
  it("should return 400 if file is too big", async () => {
    createForm({
      file: {
        value: Buffer.from("t".repeat(60 * 1024 * 1024 + 1)), // 60MB + 1 byte
        options: {
          filename: "test.dpk",
          contentType: "application/zip"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/datapacksDirectory/tempFilename`), {
      force: true
    });
    expect(await response.json()).toEqual({ error: "File too large" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if uploadUserDatapackHandler throws error", async () => {
    uploadUserDatapackHandler.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/datapacksDirectory/tempFilename`), {
      force: true
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Unexpected error with request fields." });
  });
  it("should just return if uploadUserDataPackHandler returns void", async () => {
    uploadUserDatapackHandler.mockResolvedValueOnce();
    await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(uploadUserDatapackHandler).toHaveBeenCalledTimes(1);
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(execFile).not.toHaveBeenCalled();
    expect(rm).not.toHaveBeenCalled();
    expect(loadIndexes).not.toHaveBeenCalled();
  });
  it("should return 500 if realpath doesn't find a real path for the decrypted file", async () => {
    realpath.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "File was not decrypted properly" });
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledTimes(1);
    checkErrorHandler(response.statusCode);
  });
  it("should return 400 if bytesRead is 0", async () => {
    createForm({
      file: {
        value: Buffer.from(""),
        options: {
          filename: "test.dpk",
          contentType: "application/zip"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/datapacksDirectory/tempFilename`), {
      force: true
    });
    expect(execFile).not.toHaveBeenCalled();
    expect(realpath).not.toHaveBeenCalled();
    expect(loadIndexes).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Empty file cannot be uploaded" });
  });
  it("should return 500 if loadIndexes fails", async () => {
    loadIndexes.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(addAdminConfigDatapack).not.toHaveBeenCalled();
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    checkErrorHandler(response.statusCode);
    expect(await response.json()).toEqual({ error: "Error parsing the datapack for chart generation" });
  });
  it("should return 500 if adding admin config fails", async () => {
    addAdminConfigDatapack.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(getAdminConfigDatapacks).toHaveBeenCalledTimes(1);
    expect(addAdminConfigDatapack).toHaveBeenCalledTimes(1);
    expect(addAdminConfigDatapack).toHaveBeenCalledWith(testDatapackDescription);
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Error updating admin config" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if successful and add to adminconfig", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledWith("java", [
      "-jar",
      "testdir/decryptionJar.jar",
      "-d",
      filepath.replace(/\\/g, "/"),
      "-dest",
      "testdir/decryptionDirectory"
    ]);
    expect(addAdminConfigDatapack).toHaveBeenCalledTimes(1);
    expect(addAdminConfigDatapack).toHaveBeenCalledWith(testDatapackDescription);
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful where datapack is already a part of adminconfigs but isn't in serverDatapackIndex", async () => {
    vi.spyOn(index, "serverDatapackIndex", "get").mockReturnValueOnce({});
    getAdminConfigDatapacks.mockReturnValueOnce([testDatapackDescription]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(getAdminConfigDatapacks).toHaveBeenCalledTimes(1);
    expect(addAdminConfigDatapack).toHaveBeenCalledTimes(1);
    expect(addAdminConfigDatapack).toHaveBeenCalledWith(testDatapackDescription);
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledWith("java", [
      "-jar",
      "testdir/decryptionJar.jar",
      "-d",
      filepath.replace(/\\/g, "/"),
      "-dest",
      "testdir/decryptionDirectory"
    ]);
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });
});
describe("getUsers", () => {
  const findUser = vi.spyOn(database, "findUser");
  const findWorkshop = vi.spyOn(database, "findWorkshop");
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
  it("should return user with workshopTitle and one without", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([testAdminUser, testNonAdminUser]);
    findWorkshop.mockResolvedValueOnce([testWorkshop]).mockResolvedValueOnce([]);
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
          workshopTitle: testWorkshop.title
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
      isAdmin: true,
      isGoogleUser: false,
      invalidateSession: false,
      emailVerified: true
    });
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(404);
  });
});

describe("adminDeleteServerDatapack", () => {
  const rm = vi.spyOn(fsPromises, "rm");
  const testDatapackDescription: DatapackMetadata = {
    title: "test-title",
    description: "test-description",
    originalFileName: "active-datapack.dpk",
    storedFileName: "tempFilename",
    size: "30MB",
    date: "2021-01-01",
    tags: ["test-tag"],
    references: ["test-reference"],
    contact: "test-contact",
    notes: "test-notes",
    authoredBy: "test-author"
  };
  const removeAdminConfigDatapack = vi.spyOn(adminConfig, "removeAdminConfigDatapack");
  const getAdminConfigDatapacks = vi.spyOn(adminConfig, "getAdminConfigDatapacks");
  const body = {
    datapack: testDatapackDescription.title
  };
  const filepath = join("testdir", "datapacksDirectory", testDatapackDescription.storedFileName);
  const decryptedFilepath = join("testdir", "decryptionDirectory", testDatapackDescription.storedFileName);
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(index, "serverDatapackIndex", "get").mockReturnValue({
      [body.datapack]: {} as ServerDatapackIndex[string]
    });
  });
  it("should return 400 if incorrect body", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: {},
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'datapack'",
      statusCode: 400
    });
    expect(getAdminConfigDatapacks).not.toHaveBeenCalled();
    expect(removeAdminConfigDatapack).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if datapack is empty", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: { datapack: "" },
      headers
    });
    expect(getAdminConfigDatapacks).not.toHaveBeenCalled();
    expect(rm).not.toHaveBeenCalled();
    expect(removeAdminConfigDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing datapack id" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 404 if not in adminconfig", async () => {
    getAdminConfigDatapacks.mockReturnValueOnce([]);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: body,
      headers
    });
    expect(getAdminConfigDatapacks).toHaveBeenCalledOnce();
    expect(rm).not.toHaveBeenCalled();
    expect(removeAdminConfigDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Datapack not found" });
    expect(response.statusCode).toBe(404);
  });
  describe("admin datapack deletion where datapack is in adminconfig", async () => {
    it("should return 500 if remove filepaths fail", async () => {
      getAdminConfigDatapacks.mockReturnValueOnce([testDatapackDescription]);
      rm.mockRejectedValueOnce(new Error());
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: body,
        headers
      });
      expect(removeAdminConfigDatapack).not.toHaveBeenCalled();
      expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
      expect(await response.json()).toEqual({ error: "Deleted from indexes, but was not able to delete files" });
      expect(response.statusCode).toBe(500);
    });
    it(`should return 500 on partial success when admin datapacks contains the datapack to be deleted but removeAdminConfigDatapack fails`, async () => {
      getAdminConfigDatapacks.mockReturnValueOnce([testDatapackDescription]);
      removeAdminConfigDatapack.mockRejectedValueOnce(new Error());
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: body,
        headers
      });
      expect(removeAdminConfigDatapack).toHaveBeenCalledTimes(1);
      expect(removeAdminConfigDatapack).toHaveBeenCalledWith(testDatapackDescription);
      expect(index.serverDatapackIndex).toEqual({});
      expect(rm).toHaveBeenCalledTimes(2);
      expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
      expect(rm).toHaveBeenNthCalledWith(2, decryptedFilepath, { force: true, recursive: true });
      expect(await response.json()).toEqual({
        error: `Deleted and resolved configurations, but was not able to write to file. Check with server admin to make sure your configuration is still viable`
      });
      expect(response.statusCode).toBe(500);
    });
    it(`should return 200 on success when admin datapacks contains ${body.datapack}`, async () => {
      getAdminConfigDatapacks.mockReturnValueOnce([testDatapackDescription]);
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: body,
        headers
      });
      expect(await response.json()).toEqual({
        message: `Datapack ${body.datapack} deleted`
      });
      expect(removeAdminConfigDatapack).toHaveBeenCalledTimes(1);
      expect(removeAdminConfigDatapack).toHaveBeenCalledWith(testDatapackDescription);
      expect(index.serverDatapackIndex).toEqual({});
      expect(rm).toHaveBeenCalledTimes(2);
      expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
      expect(rm).toHaveBeenNthCalledWith(2, decryptedFilepath, { force: true, recursive: true });
      expect(response.statusCode).toBe(200);
    });
  });
});

describe("getAllUserDatapacks", () => {
  const readFile = vi.spyOn(fsPromises, "readFile");
  const assertDatapackIndex = vi.spyOn(shared, "assertDatapackIndex");
  const verifyFilepath = vi.spyOn(util, "verifyFilepath");
  const payload = {
    uuid: "test-uuid"
  };
  const testParsingPack = {
    "test-datapack.dpk": {
      mock: "test-datapack"
    }
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 200 and all datapacks for a user", async () => {
    readFile.mockResolvedValueOnce(JSON.stringify(testParsingPack));
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload,
      headers
    });
    expect(assertDatapackIndex).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual(testParsingPack);
    expect(response.statusCode).toBe(200);
  });
  it("should return 400 if incorrect body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
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
  it("should return 400 if uuid is empty", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload: { uuid: "" },
      headers
    });
    expect(readFile).toHaveBeenCalledTimes(0);
    expect(assertDatapackIndex).toHaveBeenCalledTimes(0);
    expect(await response.json()).toEqual({ error: "Missing uuid in body" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 when readFile fails", async () => {
    readFile.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload,
      headers
    });
    expect(assertDatapackIndex).toHaveBeenCalledTimes(0);
    expect(await response.json()).toEqual({ error: "Error reading user datapack index, possible corruption of file" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 200 if the filepath is bad/doesn't exist", async () => {
    verifyFilepath.mockResolvedValueOnce(false);
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload,
      headers
    });
    expect(readFile).toHaveBeenCalledTimes(0);
    expect(assertDatapackIndex).toHaveBeenCalledTimes(0);
    expect(await response.json()).toEqual({});
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
  const getAndHandleWorkshopEnd = vi.spyOn(database, "getAndHandleWorkshopEnd");
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
  it("should return 404 if getAndHandleWorkshopEnd returns empty", async () => {
    getAndHandleWorkshopEnd.mockResolvedValueOnce(null);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(getAndHandleWorkshopEnd).toHaveBeenCalledTimes(1);
    expect(getAndHandleWorkshopEnd).toHaveBeenCalledWith(testWorkshop.workshopId);
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
      workshopId: 1,
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
      workshopId: 1,
      accountType: "default"
    });
    expect(findUser).toHaveBeenCalledTimes(3); // 1st call is from the prehandler verifyAdmin
    expect(findUser).toHaveBeenNthCalledWith(2, { email: "test@gmail.com" });
    expect(findUser).toHaveBeenNthCalledWith(3, { email: "test2@gmail.com" });
    expect(updateUser).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ message: "Users added" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and update old users", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([testAdminUser]);
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
    expect(updateUser).toHaveBeenCalledTimes(2);
    expect(updateUser).toHaveBeenNthCalledWith(
      1,
      {
        email: "test@gmail.com"
      },
      { workshopId: 1 }
    );
    expect(updateUser).toHaveBeenNthCalledWith(
      2,
      {
        email: "test2@gmail.com"
      },
      { workshopId: 1 }
    );
    expect(createUser).not.toHaveBeenCalled();
    expect(findUser).toHaveBeenCalledTimes(1); // 1st call is from the prehandler verifyAdmin
    expect(await response.json()).toEqual({ message: "Users added" });
    expect(response.statusCode).toBe(200);
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
    findWorkshop.mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Workshop not found" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 400 if end is an invalid date", async () => {
    findWorkshop.mockResolvedValueOnce([testWorkshop]);
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
    findWorkshop.mockResolvedValueOnce([testWorkshop]);
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
    findWorkshop.mockResolvedValueOnce([testWorkshop]).mockResolvedValueOnce([{ ...body, end: testWorkshop.end }]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(findWorkshop).toHaveBeenCalledTimes(2);
    expect(findWorkshop).toHaveBeenNthCalledWith(2, { title: body.title, start: body.start, end: testWorkshop.end });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Workshop with same title and dates already exists" });
    expect(response.statusCode).toBe(409);
  });
  it("should return 500 if findWorkshop throws an error", async () => {
    findWorkshop.mockResolvedValueOnce([testWorkshop]).mockRejectedValueOnce(new Error());
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
    findWorkshop.mockResolvedValueOnce([testWorkshop]).mockResolvedValueOnce([]);
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

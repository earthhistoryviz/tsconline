import fastify, { FastifyInstance, HTTPMethods, InjectOptions } from "fastify";
import * as adminAuth from "../src/admin-auth";
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
import { join, normalize, parse, resolve } from "path";
import fastifyMultipart from "@fastify/multipart";
import formAutoContent from "form-auto-content";
import { DatapackParsingPack, MapPack } from "@tsconline/shared";
import { DatapackMetadata } from "../src/types";
import * as uploadHandlers from "../src/upload-handlers";

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
    assertDatapackIndex: vi.fn().mockReturnValue(true)
  };
});

vi.mock("../src/upload-handlers", async (importOriginal) => {
  const actual = await importOriginal<typeof uploadHandlers>();
  return {
    ...actual,
    userUploadDatapackHandler: vi.fn().mockResolvedValue({})
  };
});
vi.mock("../src/util", async () => {
  return {
    getBytes: vi.fn().mockReturnValue("30MB"),
    loadAssetConfigs: vi.fn().mockResolvedValue({}),
    assetconfigs: {
      uploadDirectory: "testdir/uploadDirectory",
      fileMetadata: "testdir/fileMetadata.json",
      datapacksDirectory: "testdir/datapacksDirectory",
      decryptionDirectory: "testdir/decryptionDirectory",
      decryptionJar: "testdir/decryptionJar.jar",
      adminConfigPath: "testdir/adminConfig.json",
      activeDatapacks: [
        {
          description: "test",
          title: "test",
          file: "active-datapack.dpk",
          size: "30MB"
        },
        {
          description: "test",
          title: "test",
          file: "remove-datapack.dpk",
          size: "30MB"
        }
      ]
    },
    adminconfig: {
      datapacks: [
        {
          description: "test",
          title: "test",
          file: "admin-datapack.dpk",
          size: "30MB"
        }
      ]
    },
    checkFileExists: vi.fn().mockResolvedValue(true),
    verifyFilepath: vi.fn().mockReturnValue(true)
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
    checkRecaptchaToken: vi.fn().mockResolvedValue(1)
  };
});

vi.mock("../src/index", async () => {
  return {
    datapackIndex: { "admin-datapack.dpk": {}, "active-datapack.dpk": {}, "remove-datapack.dpk": {} },
    mapPackIndex: {}
  };
});

vi.mock("../src/database", async (importOriginal) => {
  const actual = await importOriginal<typeof database>();
  return {
    ...actual,
    findUser: vi.fn(() => Promise.resolve([testAdminUser])), // just so we can verify the user is an admin for prehandlers
    checkForUsersWithUsernameOrEmail: vi.fn().mockResolvedValue([]),
    createUser: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue({})
  };
});

vi.mock("../src/load-packs", async () => {
  return {
    loadIndexes: vi.fn().mockResolvedValue(true)
  };
});

vi.mock("../src/file-metadata-handler", async () => {
  return {
    loadFileMetadata: vi.fn().mockResolvedValue({}),
    deleteDatapack: vi.fn().mockResolvedValue({})
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
});

afterAll(async () => {
  await app.close();
});

const testAdminUser = {
  userId: 123,
  uuid: "123e4567-e89b-12d3-a456-426614174000",
  email: "test@example.com",
  emailVerified: 1,
  invalidateSession: 0,
  username: "testuser",
  hashedPassword: "password123",
  pictureUrl: "https://example.com/picture.jpg",
  isAdmin: 1
};
const testNonAdminUser = {
  ...testAdminUser,
  isAdmin: 0
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
  { method: "POST", url: "/admin/user/datapacks", body: { uuid: "test" } }
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
    invalidateSession: 0
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
  const loadFileMetadata = vi.spyOn(fileMetadataHandler, "loadFileMetadata");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
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
  it("should return 500 if loadFileMetadata throws error", async () => {
    loadFileMetadata.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(findUser).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(loadFileMetadata).toHaveBeenCalledTimes(1);
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
    expect(loadFileMetadata).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenNthCalledWith(1, "testdir/fileMetadata.json", JSON.stringify({}));
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
    expect(loadFileMetadata).toHaveBeenCalledTimes(1);
    expect(loadFileMetadata).toHaveBeenCalledWith("testdir/fileMetadata.json");
    expect(writeFile).toHaveBeenNthCalledWith(1, "testdir/fileMetadata.json", JSON.stringify({}));
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
    expect(loadFileMetadata).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenNthCalledWith(1, "testdir/fileMetadata.json", JSON.stringify({}));
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve("testdir/uploadDirectory", body.uuid), { recursive: true, force: true });
    expect(await response.json()).toEqual({ message: "User deleted" });
    expect(response.statusCode).toBe(200);
  });
  it("should remove file metadata on success", async () => {
    const filepath = resolve("testdir/uploadDirectory", body.uuid);
    const metadata = {
      metadata: {
        fileName: "test",
        lastUpdated: new Date().toISOString(),
        decryptedFilepath: "test",
        mapPackIndexFilepath: "test",
        datapackIndexFilepath: "test"
      }
    };
    loadFileMetadata.mockResolvedValueOnce({
      [filepath]: {
        fileName: "test",
        lastUpdated: new Date().toISOString(),
        decryptedFilepath: "test",
        mapPackIndexFilepath: "test",
        datapackIndexFilepath: "test"
      },
      ...metadata
    });
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(writeFile).toHaveBeenNthCalledWith(1, "testdir/fileMetadata.json", JSON.stringify(metadata));
    expect(await response.json()).toEqual({ message: "User deleted" });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminDeleteUserDatapack", () => {
  const body = {
    uuid: "test-uuid",
    datapack: "test-datapack"
  };
  const loadFileMetadata = vi.spyOn(fileMetadataHandler, "loadFileMetadata");
  const realpath = vi.spyOn(fsPromises, "realpath");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const deleteDatapack = vi.spyOn(fileMetadataHandler, "deleteDatapack");
  const datapackDirectory = resolve("testdir/uploadDirectory", body.uuid, "datapacks", body.datapack);
  const relativeDatapackDirectory = normalize(
    join("testdir", "uploadDirectory", body.uuid, "datapacks", body.datapack)
  );
  const testMetadata = {
    [datapackDirectory]: {
      fileName: "test",
      lastUpdated: new Date().toISOString(),
      decryptedFilepath: "test",
      mapPackIndexFilepath: "test",
      datapackIndexFilepath: "test"
    }
  };
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
  it("should return 404 if datapack is not found", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(loadFileMetadata).toBeCalledTimes(1);
    expect(loadFileMetadata).toBeCalledWith("testdir/fileMetadata.json");
    expect(response.statusCode).toEqual(404);
    expect(await response.json()).toEqual({ error: "Datapack not found" });
  });
  it("should return 500 if directory doesn't exist", async () => {
    realpath.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(loadFileMetadata).not.toHaveBeenCalled();
    expect(realpath).toBeCalledTimes(1);
    expect(realpath).toBeCalledWith(resolve("testdir/uploadDirectory"));
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toEqual(500);
  });
  it("should return 500 if delete datapack throws error", async () => {
    deleteDatapack.mockRejectedValueOnce(new Error());
    loadFileMetadata.mockResolvedValueOnce(testMetadata);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(loadFileMetadata).toBeCalledTimes(1);
    expect(deleteDatapack).toBeCalledTimes(1);
    expect(deleteDatapack).toBeCalledWith(testMetadata, relativeDatapackDirectory);
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toEqual(500);
  });
  it("should return 500 if write file throws error", async () => {
    writeFile.mockRejectedValueOnce(new Error());
    loadFileMetadata.mockResolvedValueOnce(testMetadata);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(loadFileMetadata).toBeCalledTimes(1);
    expect(deleteDatapack).toBeCalledTimes(1);
    expect(deleteDatapack).toBeCalledWith(testMetadata, relativeDatapackDirectory);
    expect(writeFile).toBeCalledTimes(1);
    expect(writeFile).toBeCalledWith("testdir/fileMetadata.json", JSON.stringify(testMetadata));
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toEqual(500);
  });
  it("should return 200 if successful", async () => {
    loadFileMetadata.mockResolvedValueOnce(testMetadata);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/user/datapack",
      payload: body,
      headers
    });
    expect(loadFileMetadata).toBeCalledTimes(1);
    expect(deleteDatapack).toBeCalledTimes(1);
    expect(deleteDatapack).toBeCalledWith(testMetadata, relativeDatapackDirectory);
    expect(writeFile).toBeCalledTimes(1);
    expect(writeFile).toBeCalledWith("testdir/fileMetadata.json", JSON.stringify(testMetadata));
    expect(await response.json()).toEqual({ message: "Datapack deleted" });
    expect(response.statusCode).toEqual(200);
  });
});

describe("adminUploadServerDatapack", () => {
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  const execFile = vi.spyOn(childProcess, "execFile");
  const rm = vi.spyOn(fsPromises, "rm");
  const realpath = vi.spyOn(fsPromises, "realpath");
  const loadIndexes = vi.spyOn(loadPacks, "loadIndexes");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const pipeline = vi.spyOn(streamPromises, "pipeline");
  const uploadUserDatapackHandler = vi.spyOn(uploadHandlers, "uploadUserDatapackHandler");
  const testDatapackDescription: DatapackMetadata = {
    file: "test.dpk",
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
    uploadUserDatapackHandler.mockResolvedValueOnce(testDatapackDescription);
  });
  afterAll(() => {
    uploadUserDatapackHandler.mockReset();
  });
  it("should return 400 if missing file field", async () => {
    createForm({ file: "" });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
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
      expect(pipeline).not.toHaveBeenCalled();
      expect(execFile).not.toHaveBeenCalled();
      expect(await response.json()).toEqual({ error: "Invalid file type" });
      expect(response.statusCode).toBe(400);
    }
  );
  it("should return 409 if file already exists and assetconfig states it exists", async () => {
    createForm({
      file: {
        value: Buffer.from("test"),
        options: {
          filename: "active-datapack.dpk", // in assetconfigs import
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
    expect(pipeline).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "File already exists" });
    expect(response.statusCode).toBe(409);
  });
  it("should return 409 if file already exists and admin config states it exists", async () => {
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
    expect(execFile).not.toHaveBeenCalled();
    expect(pipeline).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "File already exists" });
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
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(execFile).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/datapacksDirectory/test.dpk`), { force: true });
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
    expect(execFile).not.toHaveBeenCalled();
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/datapacksDirectory/test.dpk`), { force: true });
    expect(await response.json()).toEqual({ error: "File too large" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if uploadUserDatapackHandler throws error", async () => {
    uploadUserDatapackHandler.mockReset();
    uploadUserDatapackHandler.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/datapacksDirectory/test.dpk`), { force: true });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Unexpected error with request fields." });
  });
  it("should just return if uploadUserDataPackHandler returns void", async () => {
    uploadUserDatapackHandler.mockReset();
    uploadUserDatapackHandler.mockResolvedValueOnce();
    await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
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
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledTimes(1);
    checkErrorHandler(response.statusCode);
    expect(await response.json()).toEqual({ error: "File was not decrypted properly" });
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
    expect(rm).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledWith(resolve(`testdir/datapacksDirectory/test.dpk`), { force: true });
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
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    checkErrorHandler(response.statusCode);
    expect(await response.json()).toEqual({ error: "Error parsing the datapack for chart generation" });
  });
  it("should return 500 if writeFile fails", async () => {
    writeFile.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledTimes(1);
    checkErrorHandler(response.statusCode);
    expect(await response.json()).toEqual({ error: "Error updating admin config" });
  });
  it("should return 200 if successful and add to adminconfig", async () => {
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [] });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledWith("java", [
      "-jar",
      "testdir/decryptionJar.jar",
      "-d",
      resolve("testdir/datapacksDirectory/test.dpk").replace(/\\/g, "/"),
      "-dest",
      "testdir/decryptionDirectory"
    ]);
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith(
      "testdir/adminConfig.json",
      JSON.stringify({ datapacks: [testDatapackDescription] }, null, 2)
    );
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful where datapack is already a part of assetconfigs but isn't in datapackIndex", async () => {
    const originalUtil = await import("../src/util");
    const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [testDatapackDescription] };
    vi.spyOn(index, "datapackIndex", "get").mockReturnValue({});
    vi.spyOn(util, "assetconfigs", "get").mockReturnValue(newUtil);
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [] });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile).toHaveBeenCalledWith("java", [
      "-jar",
      "testdir/decryptionJar.jar",
      "-d",
      resolve("testdir/datapacksDirectory/test.dpk").replace(/\\/g, "/"),
      "-dest",
      "testdir/decryptionDirectory"
    ]);
    expect(realpath).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith("testdir/adminConfig.json", JSON.stringify({ datapacks: [] }, null, 2));
    expect(util.assetconfigs).toEqual(expect.objectContaining({ activeDatapacks: [testDatapackDescription] }));
    expect(util.adminconfig).toEqual({ datapacks: [] });
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
  });
});
describe("getUsers", () => {
  const findUser = vi.spyOn(database, "findUser");
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
          ...testAdminUser,
          hashedPassword: undefined,
          isAdmin: true,
          isGoogleUser: false,
          invalidateSession: false,
          emailVerified: true
        },
        {
          ...testNonAdminUser,
          hashedPassword: undefined,
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
      ...testAdminUser,
      hashedPassword: undefined,
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
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const rm = vi.spyOn(fsPromises, "rm");
  const testDatapackDescription: DatapackMetadata = {
    title: "test-title",
    description: "test-description",
    file: "active-datapack.dpk",
    size: "30MB",
    date: "2021-01-01",
    tags: ["test-tag"],
    references: ["test-reference"],
    contact: "test-contact",
    notes: "test-notes",
    authoredBy: "test-author"
  };
  const body = {
    datapack: "active-datapack.dpk"
  };
  const realpath = vi.spyOn(fsPromises, "realpath");
  const filepath = resolve(`testdir/datapacksDirectory/${body.datapack}`);
  const decryptedFilepath = resolve(`testdir/decryptionDirectory/${parse(body.datapack).name}`);
  beforeEach(async () => {
    vi.clearAllMocks();
    const originalUtil = await import("../src/util");
    const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [testDatapackDescription] };
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [] });
    vi.spyOn(util, "assetconfigs", "get").mockReturnValue(newUtil);
    vi.spyOn(index, "datapackIndex", "get").mockReturnValue({ [body.datapack]: {} as DatapackParsingPack });
    vi.spyOn(index, "mapPackIndex", "get").mockReturnValue({ [body.datapack]: {} as MapPack });
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
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if datapack is empty", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: { datapack: "" },
      headers
    });
    expect(rm).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Missing datapack id" });
    expect(response.statusCode).toBe(400);
  });
  test.each(["test", "test.dp", "test.png", "test.ma", "test.zip"])(
    "should return 400 if invalid file extension",
    async (datapack: string) => {
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: { datapack },
        headers
      });
      expect(rm).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
      expect(await response.json()).toEqual({ error: "Invalid file extension" });
      expect(response.statusCode).toBe(400);
    }
  );
  it("should return 403 if in assetconfigs", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: body,
      headers
    });
    expect(rm).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Cannot delete a root datapack. See server administrator to change root dev packs."
    });
    expect(response.statusCode).toBe(403);
  });
  it("should return 403 if attempted directory traversal", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: { datapack: "../test.dpk" },
      headers
    });
    expect(rm).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Directory traversal detected" });
    expect(response.statusCode).toBe(403);
  });
  it("should return 404 if not in adminconfig or assetconfigs", async () => {
    const originalUtil = await import("../src/util");
    const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [] };
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [] });
    vi.spyOn(util, "assetconfigs", "get").mockReturnValue(newUtil);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: body,
      headers
    });
    expect(rm).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Datapack not found" });
    expect(response.statusCode).toBe(404);
  });
  describe("admin datapack deletion where datapack is in adminconfig, not in assetconfigs", async () => {
    const originalUtil = await import("../src/util");
    beforeEach(() => {
      const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [] };
      vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [testDatapackDescription] });
      vi.spyOn(util, "assetconfigs", "get").mockReturnValue(newUtil);
    });
    it("should return 500 if datapack does not exist", async () => {
      realpath.mockRejectedValueOnce(new Error());
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: body,
        headers
      });
      expect(await response.json()).toEqual({ error: "Datapack file does not exist" });
      expect(rm).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
      expect(realpath).toHaveBeenNthCalledWith(1, filepath);
      expect(response.statusCode).toBe(500);
    });
    it("should return 500 if remove filepaths fail", async () => {
      rm.mockRejectedValueOnce(new Error());
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: body,
        headers
      });

      expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
      expect(await response.json()).toEqual({ error: "Deleted from indexes, but was not able to delete files" });
      expect(response.statusCode).toBe(500);
    });
    it("should return 500 if writing to file fails", async () => {
      writeFile.mockRejectedValueOnce(new Error());
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: body,
        headers
      });
      expect(rm).toHaveBeenCalledTimes(2);
      expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
      expect(rm).toHaveBeenNthCalledWith(2, decryptedFilepath, { force: true, recursive: true });
      expect(writeFile).toHaveBeenCalledOnce();
      expect(await response.json()).toEqual({
        error: `Deleted and resolved configurations, but was not able to write to file. Check with server admin to make sure your configuration is still viable`
      });
      expect(response.statusCode).toBe(500);
    });
    it(`should return 500 on partial success when admin datapacks contains the datapack to be deleted but writeFile fails`, async () => {
      writeFile.mockRejectedValueOnce(new Error());
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: body,
        headers
      });
      expect(util.assetconfigs).toEqual({ ...originalUtil.assetconfigs, activeDatapacks: [] });
      expect(util.adminconfig).toEqual({ datapacks: [] });
      expect(index.datapackIndex).toEqual({});
      expect(index.mapPackIndex).toEqual({});
      expect(rm).toHaveBeenCalledTimes(2);
      expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
      expect(rm).toHaveBeenNthCalledWith(2, decryptedFilepath, { force: true, recursive: true });
      expect(writeFile).toHaveBeenCalledOnce();
      expect(writeFile).toHaveBeenNthCalledWith(
        1,
        "testdir/adminConfig.json",
        JSON.stringify({ datapacks: [] }, null, 2)
      );
      expect(await response.json()).toEqual({
        error: `Deleted and resolved configurations, but was not able to write to file. Check with server admin to make sure your configuration is still viable`
      });
      expect(response.statusCode).toBe(500);
    });
    it(`should return 200 on success when admin datapacks contains ${body.datapack}`, async () => {
      writeFile.mockRejectedValueOnce(new Error());
      const response = await app.inject({
        method: "DELETE",
        url: "/admin/server/datapack",
        payload: body,
        headers
      });
      expect(util.assetconfigs).toEqual({ ...originalUtil.assetconfigs, activeDatapacks: [] });
      expect(util.adminconfig).toEqual({ datapacks: [] });
      expect(index.datapackIndex).toEqual({});
      expect(index.mapPackIndex).toEqual({});
      expect(rm).toHaveBeenCalledTimes(2);
      expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
      expect(rm).toHaveBeenNthCalledWith(2, decryptedFilepath, { force: true, recursive: true });
      expect(writeFile).toHaveBeenNthCalledWith(
        1,
        "testdir/adminConfig.json",
        JSON.stringify({ datapacks: [] }, null, 2)
      );
      expect(await response.json()).toEqual({
        error: `Deleted and resolved configurations, but was not able to write to file. Check with server admin to make sure your configuration is still viable`
      });
      expect(response.statusCode).toBe(500);
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

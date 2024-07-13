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
import { afterAll, beforeAll, describe, test, it, vi, expect, beforeEach } from "vitest";
import fastifySecureSession from "@fastify/secure-session";
import { normalize, resolve } from "path";
import fastifyMultipart from "@fastify/multipart";
import formAutoContent from "form-auto-content";
import { DatapackParsingPack, MapPack } from "@tsconline/shared";

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
      ],
      removeDevDatapacks: ["remove-datapack.dpk"]
    },
    checkFileExists: vi.fn().mockResolvedValue(true)
  };
});

vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal<typeof path>();
  return {
    ...actual,
    resolve: vi.fn().mockImplementation(actual.resolve)
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
  { method: "GET", url: "/admin/users" },
  {
    method: "POST",
    url: "/admin/user",
    body: { username: "test", email: "test", password: "test", pictureUrl: "test", isAdmin: 1 }
  },
  { method: "DELETE", url: "/admin/user", body: { uuid: "test" } },
  { method: "DELETE", url: "/admin/user/datapack", body: { uuid: "test", datapack: "test" } },
  { method: "DELETE", url: "/admin/server/datapack", body: { datapack: "test" } },
  { method: "POST", url: "/admin/server/datapack", body: { datapack: "test" } }
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
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test.each([
    { ...body, email: "" },
    { ...body, username: "" },
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
    expect(findUser).toHaveBeenNthCalledWith(2, { username: body.username });
    expect(findUser).toHaveBeenCalledTimes(2);
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
    expect(findUser).toHaveBeenNthCalledWith(2, { username: body.username });
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
    expect(findUser).toHaveBeenNthCalledWith(2, { username: body.username });
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
  const datapackDirectory = resolve("testdir/uploadDirectory", body.uuid, "datapack", body.datapack);
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
    expect(await response.json()).toEqual({ error: "Datapack not found" });
    expect(response.statusCode).toEqual(404);
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
    expect(realpath).toBeCalledWith(datapackDirectory);
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
    expect(deleteDatapack).toBeCalledWith(testMetadata, datapackDirectory);
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
    expect(deleteDatapack).toBeCalledWith(testMetadata, datapackDirectory);
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
    expect(deleteDatapack).toBeCalledWith(testMetadata, datapackDirectory);
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
  const testDatapackDescription = {
    file: "test.dpk",
    description: "test-description",
    title: "test-title",
    size: "30MB"
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
    if (!("title" in json)) {
      json.title = testDatapackDescription.title;
    }
    if (!("description" in json)) {
      json.description = testDatapackDescription.description;
    }
    formData = formAutoContent({ ...json }, { payload: "body", forceMultiPart: true });
    formHeaders = { ...headers, ...(formData.headers as Record<string, string>) };
  };
  beforeEach(() => {
    createForm();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });
  test.each([{ title: "" }, { description: "" }, { file: "" }])("should return 400 if missing %p", async (json) => {
    createForm({ ...json });
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Missing required fields" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if no fields exist", async () => {
    const emptyForm = formAutoContent({});
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: emptyForm.payload,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Missing required fields" });
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
      expect(execFile).not.toHaveBeenCalled();
      expect(await response.json()).toEqual({ error: "Invalid file type" });
      expect(response.statusCode).toBe(400);
    }
  );
  it("should return 409 if file already exists and assetconfig states it exists (adminconfig removeDevDatapacks states it is not removed)", async () => {
    createForm({
      file: {
        value: Buffer.from("test"),
        options: {
          filename: "active-datapack.dpk", // only in assetconfigs import (not in adminconfigs removeDevDatapacks)
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
    expect(await response.json()).toEqual({ error: "File already exists" });
    expect(response.statusCode).toBe(409);
  });
  it("should return 200 if assetconfig has the file, but remove config also has the file", async () => {
    createForm({
      file: {
        value: Buffer.from("test"),
        options: {
          filename: "remove-datapack.dpk", // in both assetconfigs and adminconfigs (in removeDevDatapacks)
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
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(loadIndexes).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
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
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [], removeDevDatapacks: [] });
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
      JSON.stringify({ datapacks: [testDatapackDescription], removeDevDatapacks: [] }, null, 2)
    );
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful where datapack is already a part of assetconfigs but isn't in datapackIndex", async () => {
    const originalUtil = await import("../src/util");
    const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [testDatapackDescription] };
    vi.spyOn(index, "datapackIndex", "get").mockReturnValue({});
    vi.spyOn(util, "assetconfigs", "get").mockReturnValue(newUtil);
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [], removeDevDatapacks: [] });
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
    expect(writeFile).toHaveBeenCalledWith(
      "testdir/adminConfig.json",
      JSON.stringify({ datapacks: [], removeDevDatapacks: [] }, null, 2)
    );
    expect(util.assetconfigs).toEqual(expect.objectContaining({ activeDatapacks: [testDatapackDescription] }));
    expect(util.adminconfig).toEqual({ datapacks: [], removeDevDatapacks: [] });
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and remove from removeDevDatapacks", async () => {
    const originalUtil = await import("../src/util");
    const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [testDatapackDescription] };
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({
      datapacks: [],
      removeDevDatapacks: [testDatapackDescription.file]
    });
    vi.spyOn(util, "assetconfigs", "get").mockReturnValue(newUtil);
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(util.adminconfig).toEqual({ datapacks: [], removeDevDatapacks: [] });
    expect(util.assetconfigs).toEqual(expect.objectContaining({ activeDatapacks: [testDatapackDescription] }));
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and should push to assetconfigs if it doesn't exist when admin previously removed it", async () => {
    const originalUtil = await import("../src/util");
    const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [] };
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({
      datapacks: [],
      removeDevDatapacks: [testDatapackDescription.file]
    });
    vi.spyOn(util, "assetconfigs", "get").mockReturnValue(newUtil);
    const response = await app.inject({
      method: "POST",
      url: "/admin/server/datapack",
      payload: formData.body,
      headers: formHeaders
    });
    expect(util.adminconfig).toEqual({ datapacks: [], removeDevDatapacks: [] });
    expect(util.assetconfigs).toEqual(expect.objectContaining({ activeDatapacks: [testDatapackDescription] }));
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
  });
});
describe("getUsers", () => {
  const findUser = vi.spyOn(database, "findUser");
  it("should return any users without passwords", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([testAdminUser, testNonAdminUser]);
    const response = await app.inject({
      method: "GET",
      url: "/admin/users",
      headers
    });
    expect(await response.json()).toEqual({
      users: [
        { ...testAdminUser, hashedPassword: undefined },
        { ...testNonAdminUser, hashedPassword: undefined }
      ]
    });
    expect(response.statusCode).toBe(200);
  });
  it("should return 404 if unknown error occurs", async () => {
    findUser.mockResolvedValueOnce([testAdminUser]).mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "GET",
      url: "/admin/users",
      headers
    });
    expect(await response.json()).toEqual({ error: "Unknown error" });
    expect(response.statusCode).toBe(404);
  });
});

describe("adminDeleteServerDatapack", () => {
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const rm = vi.spyOn(fsPromises, "rm");
  const testDatapackDescription = {
    title: "test-title",
    description: "test-description",
    file: "active-datapack.dpk",
    size: "30MB"
  };
  const body = {
    datapack: "active-datapack.dpk"
  };
  const realpath = vi.spyOn(fsPromises, "realpath");
  const filepath = resolve(`testdir/datapacksDirectory/${body.datapack}`);
  const decryptedFilepath = resolve(`testdir/decryptionDirectory/${body.datapack}`);
  beforeEach(async () => {
    vi.clearAllMocks();
    const originalUtil = await import("../src/util");
    const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [testDatapackDescription] };
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [], removeDevDatapacks: [] });
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
  it("should return 500 if datapack does not exist", async () => {
    realpath.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: body,
      headers
    });
    expect(rm).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(realpath).toHaveBeenNthCalledWith(1, filepath);
    expect(await response.json()).toEqual({ error: "Datapack file does not exist" });
    expect(response.statusCode).toBe(500);
  });
  it("should return 404 if not in adminconfig or assetconfigs", async () => {
    const originalUtil = await import("../src/util");
    const newUtil = { ...originalUtil.assetconfigs, activeDatapacks: [] };
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({ datapacks: [], removeDevDatapacks: [] });
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
  it(`should return 200 on success when active datapacks contains ${body.datapack}`, async () => {
    const originalUtil = await import("../src/util");
    writeFile.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: body,
      headers
    });
    expect(util.assetconfigs).toEqual({ ...originalUtil.assetconfigs, activeDatapacks: [] });
    expect(util.adminconfig).toEqual({ datapacks: [], removeDevDatapacks: [body.datapack] });
    expect(index.datapackIndex).toEqual({});
    expect(index.mapPackIndex).toEqual({});
    expect(rm).toHaveBeenCalledTimes(2);
    expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
    expect(rm).toHaveBeenNthCalledWith(2, decryptedFilepath, { force: true, recursive: true });
    expect(writeFile).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      "testdir/adminConfig.json",
      JSON.stringify({ datapacks: [], removeDevDatapacks: [body.datapack] }, null, 2)
    );
    expect(await response.json()).toEqual({
      error: `Deleted and resolved configurations, but was not able to write to file. Check with server admin to make sure your configuration is still viable`
    });
    expect(response.statusCode).toBe(500);
  });
  it(`should return 200 on success when admin datapacks contains ${body.datapack}`, async () => {
    const originalUtil = await import("../src/util");
    const assetconfigs = { ...originalUtil.assetconfigs, activeDatapacks: [] };
    vi.spyOn(util, "adminconfig", "get").mockReturnValue({
      datapacks: [testDatapackDescription],
      removeDevDatapacks: []
    });
    vi.spyOn(util, "assetconfigs", "get").mockReturnValue(assetconfigs);
    writeFile.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/server/datapack",
      payload: body,
      headers
    });
    expect(util.assetconfigs).toEqual({ ...originalUtil.assetconfigs, activeDatapacks: [] });
    expect(util.adminconfig).toEqual({ datapacks: [], removeDevDatapacks: [] });
    expect(index.datapackIndex).toEqual({});
    expect(index.mapPackIndex).toEqual({});
    expect(rm).toHaveBeenCalledTimes(2);
    expect(rm).toHaveBeenNthCalledWith(1, filepath, { force: true });
    expect(rm).toHaveBeenNthCalledWith(2, decryptedFilepath, { force: true, recursive: true });
    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      "testdir/adminConfig.json",
      JSON.stringify({ datapacks: [], removeDevDatapacks: [] }, null, 2)
    );
    expect(await response.json()).toEqual({
      error: `Deleted and resolved configurations, but was not able to write to file. Check with server admin to make sure your configuration is still viable`
    });
    expect(response.statusCode).toBe(500);
  });
});

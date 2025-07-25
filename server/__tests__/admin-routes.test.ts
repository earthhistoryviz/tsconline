import fastify, { FastifyInstance, HTTPMethods, InjectOptions, RouteOptions } from "fastify";
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
import { DatapackMetadata, SharedWorkshop } from "@tsconline/shared";
import * as uploadHandlers from "../src/upload-handlers";
import * as excel from "../src/parse-excel-file";
import * as userHandlers from "../src/user/user-handler";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import * as adminHandler from "../src/admin/admin-handler";
import * as generalFileHandlerRequests from "../src/file-handlers/general-file-handler-requests";
import * as logger from "../src/error-logger";
import { User, Workshop } from "../src/types";
import { DATAPACK_PROFILE_PICTURE_FILENAME } from "../src/constants";
import * as uploadDatapack from "../src/upload-datapack";
import { adminFetchPrivateOfficialDatapacksMetadata } from "../src/admin/admin-routes";
import { RouteDefinition, initializeAppRoutes, oneToOneMatch } from "./util/route-checks";

vi.mock("validator", async () => {
  return {
    default: {
      isEmail: vi.fn((email) => email.includes("@") && email.includes(".")),
      isURL: vi.fn((url) => url.startsWith("http://") || url.startsWith("https://"))
    }
  };
});

vi.mock("../src/cloud/general-cloud-requests", async () => {
  return {
    editDatapackMetadataRequestHandler: vi.fn(async () => {})
  };
});

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
    assertDatapackIndex: vi.fn(),
    assertDatapack: vi.fn(),
    assertDatapackPriorityChangeRequestArray: vi.fn(),
    assertDatapackMetadata: vi.fn(),
    assertSharedWorkshop: vi.fn()
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
    uploadFileToFileSystem: vi.fn(async (file) => await consumeStream(file)),
    fetchWorkshopCoverPictureFilepath: vi.fn().mockResolvedValue(""),
    getWorkshopDatapacksNames: vi.fn().mockResolvedValue([]),
    getWorkshopFilesNames: vi.fn().mockResolvedValue([]),
    uploadFileToWorkshop: vi.fn(async (id, file) => await consumeStream(file)),
    uploadCoverPicToWorkshop: vi.fn(async (id, file) => await consumeStream(file))
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
    createUsersWorkshops: vi.fn().mockResolvedValue({}),
    deleteComment: vi.fn().mockResolvedValue({}),
    findDatapackComment: vi.fn(() => Promise.resolve([testComment]))
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
const appRoutes: RouteDefinition[] = [];
beforeAll(async () => {
  app = fastify({
    exposeHeadRoutes: false
  });
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
  app.get("/admin/official/private/metadata", adminFetchPrivateOfficialDatapacksMetadata);
  app.addHook("onRoute", (routeOptions: RouteOptions) => {
    appRoutes.push(
      ...initializeAppRoutes(routeOptions, {
        recaptchaHandlerName: "verifyRecaptchaPrehandler"
      })
    );
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
  priority: 0,
  hasFiles: false
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
  accountType: "default",
  historyEntries: []
};
const testNonSharedAdminUser = {
  ...testSharedAdminUser,
  isAdmin: 0
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
  regLink: "http://here.com",
  description: "test description"
};
const testUpdatedWorkshopDatabase: Workshop = {
  title: "new-title",
  start: start.toISOString(),
  end: end.toISOString(),
  workshopId: 1,
  regRestrict: 0,
  creatorUUID: "123",
  regLink: "",
  description: "test description"
};
const testUUID = "123e4567-e89b-12d3-a456-426614174000";
const testWorkshop: SharedWorkshop = {
  title: "test",
  start: start.toISOString(),
  end: end.toISOString(),
  workshopId: 1,
  regRestrict: false,
  creatorUUID: "123",
  regLink: "https://example.com/register",
  description: "test description",
  active: false
};
const testComment = {
  id: 1,
  username: "test@example.com",
  uuid: testUUID,
  dateCreated: mockDate.toISOString(),
  pictureUrl: null,
  commentText: "test",
  flagged: 0,
  datapackTitle: "test"
};

const routes: { method: HTTPMethods; url: string; body?: object; recaptchaAction: string }[] = [
  { method: "POST", url: "/admin/users", recaptchaAction: shared.AdminRecaptchaActions.ADMIN_FETCH_USERS },
  {
    method: "POST",
    url: "/admin/user",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_CREATE_USER,
    body: { username: "test", email: "test@gmail.com", password: "test", pictureUrl: "https://test.com", isAdmin: 1 }
  },
  {
    method: "DELETE",
    url: "/admin/user",
    body: { uuid: testUUID },
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_DELETE_USER
  },
  {
    method: "DELETE",
    url: "/admin/user/datapack",
    body: { uuid: testUUID, datapack: "test" },
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_DELETE_USER_DATAPACKS
  },
  {
    method: "DELETE",
    url: "/admin/official/datapack",
    body: { datapack: "test" },
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_DELETE_OFFICIAL_DATAPACK
  },
  {
    method: "POST",
    url: "/admin/official/datapack",
    body: { datapack: "test" },
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_UPLOAD_OFFICIAL_DATAPACK
  },
  {
    method: "POST",
    url: "/admin/user/datapacks",
    body: { uuid: testUUID },
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_FETCH_USER_DATAPACKS
  },
  {
    method: "POST",
    url: "/admin/workshop/users",
    body: { file: "test", emails: "test@gmail.com", workshopId: "1" },
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_ADD_USERS_TO_WORKSHOP
  },
  {
    method: "POST",
    url: "/admin/workshop",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_CREATE_WORKSHOP,
    body: {
      title: "test",
      start: "2024-08-29T04:00:00.000Z",
      end: "2024-08-30T04:00:00.000Z",
      regRestrict: 0,
      creatorUUID: testWorkshop.creatorUUID,
      regLink: testWorkshop.regLink
    }
  },
  {
    method: "PATCH",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_EDIT_WORKSHOP,
    url: "/admin/workshop",
    body: { workshopId: "1", title: "test", start: "2024-08-29T04:00:00.000Z" }
  },
  {
    method: "DELETE",
    url: "/admin/workshop",
    body: { workshopId: "1" },
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_DELETE_WORKSHOP
  },
  {
    method: "PATCH",
    url: "/admin/user",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_EDIT_USER,
    body: {
      username: "username",
      email: "email@email.com",
      accountType: "pro"
    }
  },
  {
    method: "PATCH",
    url: "/admin/official/datapack/priority",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_UPDATE_DATAPACK_PRIORITY,
    body: [{ uuid: "test", id: "test", priority: 1 }]
  },
  {
    method: "POST",
    url: "/admin/workshop/datapack",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_UPLOAD_DATAPACK_TO_WORKSHOP
  },
  {
    method: "POST",
    url: "/admin/workshop/official/datapack",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_ADD_OFFICIAL_DATAPACK_TO_WORKSHOP,
    body: { workshopId: "1", datapackTitle: "test" }
  },
  {
    method: "PATCH",
    url: "/admin/official/datapack/test",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_EDIT_OFFICIAL_DATAPACK
  },
  {
    method: "GET",
    url: "/admin/official/datapack/test",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_FETCH_OFFICIAL_DATAPACK
  },
  {
    method: "POST",
    url: "/admin/workshop/files/1",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_UPLOAD_FILES_TO_WORKSHOP
  },
  {
    method: "POST",
    url: "/admin/workshop/cover/1",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_UPLOAD_COVER_PICTURE_TO_WORKSHOP
  },
  {
    method: "GET",
    url: "/admin/official/datapacks/private",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_FETCH_ALL_PRIVATE_OFFICIAL_DATAPACKS
  },
  {
    method: "DELETE",
    url: "/admin/datapack/comments/1",
    recaptchaAction: shared.AdminRecaptchaActions.ADMIN_DELETE_DATAPACK_COMMENT
  }
];
const headers = { "mock-uuid": "uuid", "recaptcha-token": "recaptcha-token" };

// this test makes sure that all routes that are in auth have recaptcha enabled since they are now mroe of a manual addition
it("should have all routes registered with recaptcha", () => {
  const failedRoutes = appRoutes.filter((route) => !route.recaptchaAction);
  if (failedRoutes.length > 0) {
    console.table(failedRoutes);
  }
  expect(failedRoutes.length).toBe(0);
});
describe("Route Consistency Tests", () => {
  it("should have a 1:1 match between expected and actual routes", () => {
    const { missingInActual, unexpectedInActual } = oneToOneMatch(appRoutes, routes);
    expect(missingInActual.length).toBe(0);
    expect(unexpectedInActual.length).toBe(0);
  });
});

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
  describe.each(routes)(
    "should return 400 or 422 for route $url with method $method",
    ({ method, url, body, recaptchaAction }) => {
      const checkRecaptchaTokenMock = vi.spyOn(verify, "checkRecaptchaToken");
      beforeEach(() => {
        checkRecaptchaTokenMock.mockClear();
      });

      it("should return 400 if missing recaptcha token", async () => {
        const response = await app.inject({
          method: method as InjectOptions["method"],
          url: url,
          payload: body,
          headers: { ...headers, "recaptcha-token": "" }
        });
        expect(checkRecaptchaTokenMock).not.toHaveBeenCalled();
        expect(await response.json()).toEqual({ error: "Missing recaptcha token" });
        expect(response.statusCode).toBe(400);
      });

      it("should return 422 if recaptcha failed", async () => {
        checkRecaptchaTokenMock.mockResolvedValueOnce(0);
        const response = await app.inject({
          method: method as InjectOptions["method"],
          url: url,
          payload: body,
          headers
        });
        expect(checkRecaptchaTokenMock).toHaveBeenCalledWith(headers["recaptcha-token"], recaptchaAction);
        expect(checkRecaptchaTokenMock).toHaveBeenCalledTimes(1);
        expect(await response.json()).toEqual({ error: "Recaptcha failed" });
        expect(response.statusCode).toBe(422);
      });

      it("should return 500 if checkRecaptchaToken throws error", async () => {
        checkRecaptchaTokenMock.mockRejectedValueOnce(new Error());
        const response = await app.inject({
          method: method as InjectOptions["method"],
          url: url,
          payload: body,
          headers
        });
        expect(checkRecaptchaTokenMock).toHaveBeenCalledWith(headers["recaptcha-token"], recaptchaAction);
        expect(checkRecaptchaTokenMock).toHaveBeenCalledTimes(1);
        expect(await response.json()).toEqual({ error: "Recaptcha error" });
        expect(response.statusCode).toBe(500);
      });
    }
  );
});

describe("adminCreateUser tests", () => {
  const body = {
    username: "username",
    email: "email@email.com",
    password: "password",
    pictureUrl: "http://pictureUrl.com",
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
  it("should return 400 if username is blank", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: { ...body, username: "" },
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/username must NOT have fewer than 1 characters",
      statusCode: 400
    });
  });
  it("should return 400 if email is blank", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: { ...body, email: "" },
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/email must match format "email"',
      statusCode: 400
    });
  });
  it("should return 400 if password is blank", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: { ...body, password: "" },
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/password must NOT have fewer than 1 characters",
      statusCode: 400
    });
  });
  it("should return 400 if pictureUrl is blank", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: { ...body, pictureUrl: "" },
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/pictureUrl must match format "uri"',
      statusCode: 400
    });
  });
  it("should return 400 if isAdmin is not a number", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: { ...body, isAdmin: "not-a-number" },
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/isAdmin must be integer",
      statusCode: 400
    });
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
  it("should return 200 if successful if username is not provided and cover image null", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user",
      payload: { ...body, username: undefined, pictureUrl: null },
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.email, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
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
  const body = { uuid: testUUID };
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
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/uuid must match format "uuid"',
      statusCode: 400
    });
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
  describe.each(["/admin/official/datapack", "/admin/workshop/datapack"])(
    `should complete tests for route %s`,
    async (url) => {
      it("should return 500 if processAndUploadDatapack throws error", async () => {
        processAndUploadDatapack.mockRejectedValueOnce(new Error());
        const response = await app.inject({
          method: "POST",
          url,
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
          url,
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
          url,
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
    findWorkshop.mockResolvedValueOnce([testWorkshopDatabase]).mockResolvedValueOnce([]);
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
    uuid: testUUID
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
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/uuid must match format "uuid"',
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if string uuid is not a valid uuid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/user/datapacks",
      payload: { uuid: "not-a-uuid" },
      headers
    });
    expect(fetchAllUsersDatapacks).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/uuid must match format "uuid"',
      statusCode: 400
    });
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
  it("should return 200 if just file is provided but no emails", async () => {
    createForm({
      emails: ""
    });
    parseExcelFile.mockResolvedValueOnce([["emily@gmail.com"], ["emily2@gmail.com"]]);
    checkWorkshopHasUser.mockResolvedValueOnce([testUserWorkshop]).mockResolvedValueOnce([testUserWorkshop]);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/users",
      payload: formData.body,
      headers: formHeaders
    });
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(parseExcelFile).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ message: "Users added" });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(2);
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and update old users and still succeed cleaning up if rm fails for cleanup", async () => {
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([testAdminUser]).mockResolvedValueOnce([testAdminUser2]);
    checkWorkshopHasUser
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([testUserWorkshop])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([testUserWorkshop2]);
    rm.mockRejectedValueOnce(new Error("Failed to remove file"));
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

describe("adminCreateWorkshop", () => {
  const createWorkshop = vi.spyOn(database, "createWorkshop");
  const findWorkshop = vi.spyOn(database, "findWorkshop");
  const body = {
    title: testWorkshop.title,
    start: testWorkshop.start,
    end: testWorkshop.end,
    regRestrict: 0,
    creatorUUID: testWorkshop.creatorUUID,
    regLink: testWorkshop.regLink,
    description: testWorkshop.description
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
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/title must NOT have fewer than 1 characters",
      statusCode: 400
    });
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
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/start must match format "date-time"',
      statusCode: 400
    });
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
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/end must match format "date-time"',
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if start is not a valid date", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, start: "invalid" },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/start must match format "date-time"',
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if end is not a valid date", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, end: "invalid" },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/end must match format "date-time"',
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if regRestrict is not a number", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, regRestrict: "invalid" },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/regRestrict must be number",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if regLink is not a valid URL", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, regLink: "invalid" },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/regLink must match format "uri"',
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if regRestrict is not 0 or 1", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, regRestrict: 2 },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/regRestrict must be equal to one of the allowed values",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if creatorUUID is empty", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: { ...body, creatorUUID: "" },
      headers
    });
    expect(createWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/creatorUUID must NOT have fewer than 1 characters",
      statusCode: 400
    });
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
    findWorkshop.mockResolvedValueOnce([testWorkshopDatabase]);
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
  it("should return 200 if successful with no optionals", async () => {
    const bodyWithoutOptionals = {
      title: testWorkshop.title,
      start: testWorkshop.start,
      end: testWorkshop.end,
      creatorUUID: testWorkshop.creatorUUID,
      regRestrict: 0
    };
    createWorkshop.mockResolvedValueOnce(1);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop",
      payload: bodyWithoutOptionals,
      headers
    });
    expect(createWorkshop).toHaveBeenCalledTimes(1);
    expect(createWorkshop).toHaveBeenCalledWith({
      ...bodyWithoutOptionals,
      regLink: null,
      description: null
    });
    expect(await response.json()).toEqual({
      workshop: { ...testWorkshop, active: false, description: null, regLink: null }
    });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminEditWorkshop", () => {
  const updateWorkshop = vi.spyOn(database, "updateWorkshop");
  const getWorkshopDatapacksNames = vi.spyOn(uploadHandlers, "getWorkshopDatapacksNames");
  const findWorkshop = vi.spyOn(database, "findWorkshop");
  const getWorkshopFilesNames = vi.spyOn(uploadHandlers, "getWorkshopFilesNames");
  const getWorkshopIfNotEnded = vi.spyOn(database, "getWorkshopIfNotEnded");
  const body = {
    workshopId: testWorkshop.workshopId,
    title: "new-title",
    start: testWorkshop.start
  };
  const metadataBody = {
    workshopId: testWorkshop.workshopId,
    regLink: "http://here.com",
    regRestrict: 1,
    creatorUUID: "new-creatorUUID",
    description: "new-description",
    end: testWorkshop.end
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
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/workshopId must be >= 1",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if other editable fields are empty except workshopId", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { workshopId: body.workshopId },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must NOT be valid",
      statusCode: 400
    });
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
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/start must match format "date-time"',
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if regLink is not a valid URL", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { ...metadataBody, regLink: "invalid-url" },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/regLink must match format "uri"',
      statusCode: 400
    });
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
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { ...body, end: "invalid" },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'body/end must match format "date-time"',
      statusCode: 400
    });
    expect(getWorkshopIfNotEnded).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if start is after end", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshopDatabase);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: { ...body, start: testWorkshop.end, end: testWorkshop.start },
      headers
    });
    expect(updateWorkshop).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Invalid end date" });
    expect(getWorkshopIfNotEnded).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(400);
  });
  it("should return 409 if workshop with title and dates already exists", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshopDatabase);
    findWorkshop.mockResolvedValueOnce([
      {
        ...body,
        ...testWorkshop,
        regRestrict: testWorkshop.regRestrict === true ? 1 : 0
      }
    ]);
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

  it("should return 404 if updated workshop does not exist", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshopDatabase).mockResolvedValueOnce(null);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(updateWorkshop).toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Failed to update workshop: not found or already ended." });
    expect(response.statusCode).toBe(404);
  });

  it("should return 500 if findWorkshop throws an error", async () => {
    getWorkshopIfNotEnded.mockResolvedValueOnce(testWorkshopDatabase);
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
  it("should return 200 if fields included that are not title, start, or end", async () => {
    getWorkshopIfNotEnded
      .mockResolvedValueOnce(testWorkshopDatabase)
      .mockResolvedValueOnce(testUpdatedWorkshopDatabase);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: metadataBody,
      headers
    });
    expect(updateWorkshop).toHaveBeenCalledOnce();
    expect(updateWorkshop).toHaveBeenCalledWith(
      { workshopId: body.workshopId },
      { ...metadataBody, workshopId: undefined }
    );
    expect(await response.json()).toEqual({
      workshop: {
        ...testUpdatedWorkshopDatabase,
        active: false,
        regRestrict: testUpdatedWorkshopDatabase.regRestrict === 1,
        datapacks: [],
        files: []
      }
    });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and update workshop", async () => {
    getWorkshopIfNotEnded
      .mockResolvedValueOnce(testWorkshopDatabase)
      .mockResolvedValueOnce(testUpdatedWorkshopDatabase);
    getWorkshopDatapacksNames.mockResolvedValueOnce(["dp 1"]);
    getWorkshopFilesNames.mockResolvedValueOnce(["file 1"]);
    findWorkshop.mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: body,
      headers
    });
    expect(updateWorkshop).toHaveBeenCalledOnce();
    expect(updateWorkshop).toHaveBeenCalledWith(
      { workshopId: body.workshopId },
      { ...body, regRestrict: 0, workshopId: undefined }
    );
    expect(await response.json()).toEqual({
      workshop: {
        ...testUpdatedWorkshopDatabase,
        active: false,
        regRestrict: testUpdatedWorkshopDatabase.regRestrict === 1,
        datapacks: ["dp 1"],
        files: ["file 1"]
      }
    });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successful and update workshop with both start AND end", async () => {
    const start = new Date(testWorkshop.start);
    vi.setSystemTime(start.setDate(start.getDate() + 1)); // Mock current time to be after start
    getWorkshopIfNotEnded
      .mockResolvedValueOnce(testWorkshopDatabase)
      .mockResolvedValueOnce(testUpdatedWorkshopDatabase);
    getWorkshopDatapacksNames.mockResolvedValueOnce(["dp 1"]);
    getWorkshopFilesNames.mockResolvedValueOnce(["file 1"]);
    findWorkshop.mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/workshop",
      payload: {
        ...body,
        start: testWorkshop.start,
        end: testWorkshop.end
      },
      headers
    });
    expect(updateWorkshop).toHaveBeenCalledOnce();
    expect(updateWorkshop).toHaveBeenCalledWith(
      { workshopId: body.workshopId },
      { ...body, regRestrict: 0, workshopId: undefined, start: testWorkshop.start, end: testWorkshop.end }
    );
    expect(await response.json()).toEqual({
      workshop: {
        ...testUpdatedWorkshopDatabase,
        active: false,
        regRestrict: testUpdatedWorkshopDatabase.regRestrict === 1,
        datapacks: ["dp 1"],
        files: ["file 1"]
      }
    });
    expect(response.statusCode).toBe(200);
    vi.setSystemTime(mockDate); // Reset system time
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
    findWorkshop.mockResolvedValueOnce([testWorkshopDatabase]);
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
    findWorkshop.mockResolvedValueOnce([testWorkshopDatabase]);
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
  it("should return 403 if user modified is the root admin", async () => {
    process.env.ADMIN_EMAIL = "test_root@gmail.com";
    checkForUsersWithUsernameOrEmail.mockResolvedValueOnce([{ email: process.env.ADMIN_EMAIL } as User]);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/user",
      payload: body,
      headers
    });
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledWith(body.username, body.email);
    expect(checkForUsersWithUsernameOrEmail).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ error: "Cannot modify root admin user" });
    delete process.env.ADMIN_EMAIL;
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
  it("should return 400 if workshopId is not a number", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: { datapackTitle: body.datapackTitle, workshopId: "not-a-number" },
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/workshopId must be number",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if datapackTitle is empty", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/official/datapack",
      payload: { workshopId: body.workshopId, datapackTitle: "" },
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/datapackTitle must NOT have fewer than 1 characters",
      statusCode: 400
    });
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
describe("adminEditDatapackMetadata", () => {
  const editDatapackMetadataRequestHandler = vi.spyOn(generalFileHandlerRequests, "editDatapackMetadataRequestHandler");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if datapack is not provided", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/official/datapack/",
      headers
    });
    expect(response.statusCode).toBe(400);
    expect(await response.json().error).toBe("Bad Request");
  });
  it("should return 500 if an error occurred in editDatapackMetadataRequestHandler", async () => {
    editDatapackMetadataRequestHandler.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/official/datapack/test",
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(await response.json().error).toBe("Failed to edit metadata");
    expect(editDatapackMetadataRequestHandler).toHaveBeenCalledOnce();
  });
  it("should return operation result that editDatapackMetadataRequestHandler returns", async () => {
    editDatapackMetadataRequestHandler.mockResolvedValueOnce({ code: 200, message: "Success" });
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/official/datapack/test",
      headers
    });
    expect(await response.json()).toEqual({ message: "Success" });
    expect(editDatapackMetadataRequestHandler).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
  });
});
describe("adminFetchSingleOfficialDatapack", () => {
  const fetchUserDatapack = vi.spyOn(userHandlers, "fetchUserDatapack");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 404 if an error occurred in fetchUserDatapack", async () => {
    fetchUserDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: "/admin/official/datapack/test",
      headers
    });
    expect(response.statusCode).toBe(404);
    expect(await response.json().error).toBe("Datapack not found");
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
  });
  it("should return datapack", async () => {
    fetchUserDatapack.mockResolvedValueOnce({ title: "test" } as shared.Datapack);
    const response = await app.inject({
      method: "GET",
      url: "/admin/official/datapack/test",
      headers
    });
    expect(await response.json()).toEqual({ title: "test" });
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
  });
});
describe("adminFetchPrivateOfficialDatapacksMetadata", () => {
  const fetchAllPrivateOfficialDatapacks = vi.spyOn(userHandlers, "fetchAllPrivateOfficialDatapacks");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 500 if an error occurred in fetchAllPrivateOfficialDatapacks", async () => {
    fetchAllPrivateOfficialDatapacks.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: "/admin/official/private/metadata",
      headers
    });
    expect(response.statusCode).toBe(500);
    expect(await response.json().error).toBe("Unknown error fetching private official datapacks");
    expect(fetchAllPrivateOfficialDatapacks).toHaveBeenCalledOnce();
  });
  it("should return metadatas", async () => {
    fetchAllPrivateOfficialDatapacks.mockResolvedValueOnce([
      { title: "test", defaultChronostrat: "UNESCO" }
    ] as shared.Datapack[]);
    const response = await app.inject({
      method: "GET",
      url: "/admin/official/private/metadata",
      headers
    });
    expect(await response.json()).toEqual([{ title: "test" }]);
    expect(fetchAllPrivateOfficialDatapacks).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
  });
});

describe("adminUploadFilesToWorkshop", () => {
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  const createForm = (json: Record<string, unknown> = {}) => {
    if (!("otherFiles" in json)) {
      json.otherFiles = {
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
  it("should return 404 if workshop ended", async () => {
    vi.mocked(database.getWorkshopIfNotEnded).mockResolvedValueOnce(null);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Workshop not found or has ended" });
    expect(response.statusCode).toBe(404);
  });
  it("should return 415 if presentation file is not a pdf", async () => {
    createForm({
      presentationFile: {
        value: Buffer.from("test"),
        options: {
          filename: "test.txt",
          contentType: "text/plain"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Invalid file type for presentation file" });
    expect(response.statusCode).toBe(415);
  });
  it("should return 415 if instruction file is not a pdf", async () => {
    createForm({
      instructionsFile: {
        value: Buffer.from("test"),
        options: {
          filename: "test.txt",
          contentType: "text/plain"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Invalid file type for instruction file" });
    expect(response.statusCode).toBe(415);
  });
  it("asdf should return 400 if reserved file name is used", async () => {
    createForm({
      extraFile: "",
      otherFiles: {
        value: Buffer.from("test"),
        options: {
          filename: shared.RESERVED_INSTRUCTIONS_FILENAME,
          contentType: "application/pdf"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({
      error: `File name ${shared.RESERVED_INSTRUCTIONS_FILENAME} is reserved and cannot be used`
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if no files are provided", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: {},
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "No files were uploaded" });
    expect(response.statusCode).toBe(400);
  });
  it("should return error code if failed to upload file", async () => {
    vi.mocked(uploadHandlers.uploadFileToWorkshop).mockImplementationOnce(async (id, file) => {
      await consumeStream(file);
      return { code: 500, message: "Failed to save file" };
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({
      error: "Some files failed to upload",
      uploadResults: [
        {
          code: 500,
          filename: "test.txt",
          message: "Failed to save file"
        }
      ]
    });
    expect(response.statusCode).toBe(500);
  });
  it("should return 400 if unrecognized file type is uploaded", async () => {
    createForm({
      otherFiles: {
        value: Buffer.from("test"),
        options: {
          filename: "test.xyz",
          contentType: "application/octet-stream"
        }
      },
      test: {
        value: Buffer.from("test"),
        options: {
          filename: "test.txt",
          contentType: "text/plain"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({
      error: "Unexpected field: test"
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if an error occurred in uploadFileToWorkshop", async () => {
    vi.mocked(uploadHandlers.uploadFileToWorkshop).mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Error uploading files to workshop" });
    expect(response.statusCode).toBe(500);
    expect(uploadHandlers.uploadFileToWorkshop).toHaveBeenCalledOnce();
  });
  it("should return 200 if successfully uploaded file", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ message: "Files added to workshop" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 200 if successfully uploaded file with presentation and instructions", async () => {
    createForm({
      presentationFile: {
        value: Buffer.from("test"),
        options: {
          filename: "presentation.pdf",
          contentType: "application/pdf"
        }
      },
      instructionsFile: {
        value: Buffer.from("test"),
        options: {
          filename: "instructions.pdf",
          contentType: "application/pdf"
        }
      }
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/files/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ message: "Files added to workshop" });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminUploadCoverPicToWorkshop", () => {
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  const createForm = (json: Record<string, unknown> = {}) => {
    if (!("file" in json)) {
      json.file = {
        value: Buffer.from("test"),
        options: {
          filename: "coverpic.png",
          contentType: "image/png"
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
  it("should return 400 if workshopId is not a number", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/cover/not-a-number",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/workshopId must be integer",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 404 if workshop ended", async () => {
    vi.mocked(database.getWorkshopIfNotEnded).mockResolvedValueOnce(null);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/cover/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Workshop not found or has ended" });
    expect(response.statusCode).toBe(404);
  });

  it("should return error code if failed to upload cover picture", async () => {
    vi.mocked(uploadHandlers.uploadCoverPicToWorkshop).mockImplementationOnce(async (id, file) => {
      await consumeStream(file);
      return { code: 500, message: "Failed to save file" };
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/cover/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Failed to save file" });
    expect(response.statusCode).toBe(500);
  });

  it("should return error code 415 if the cover picture is in wrong type", async () => {
    vi.mocked(userHandlers.checkFileTypeIsDatapackImage).mockReturnValueOnce(false);
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/cover/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Invalid file type" });
    expect(response.statusCode).toBe(415);
  });
  it("should return 400 if no file is provided", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/cover/1",
      payload: {},
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "No cover picture was uploaded" });
    expect(response.statusCode).toBe(400);
  });
  it("should return 500 if an error occurred in uploadCoverPicToWorkshop", async () => {
    vi.mocked(uploadHandlers.uploadCoverPicToWorkshop).mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/cover/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ error: "Error uploading cover picture to workshop" });
    expect(response.statusCode).toBe(500);
    expect(uploadHandlers.uploadCoverPicToWorkshop).toHaveBeenCalledOnce();
  });
  it("should return 200 if successfully uploaded cover picture", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/admin/workshop/cover/1",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await response.json()).toEqual({ message: "Cover picture added to workshop" });
    expect(response.statusCode).toBe(200);
  });
});

describe("adminDeleteDatapackComment tests", () => {
  const deleteComment = vi.spyOn(database, "deleteComment");
  const findDatapackComment = vi.spyOn(database, "findDatapackComment");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if comment ID is missing", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/datapack/comments/",
      headers
    });
    expect(deleteComment).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/commentId must be integer",
      statusCode: 400
    });
  });
  it("should return 400 if comment ID is invalid", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/datapack/comments/a",
      headers
    });
    expect(deleteComment).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
  });
  it("should return 200 if comment is successfully deleted", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/datapack/comments/1",
      headers
    });
    expect(deleteComment).toHaveBeenCalled();
    expect(deleteComment).toHaveBeenCalledWith({ id: 1 });
    expect(await response.json()).toEqual({ message: "Datapack comment deleted" });
    expect(response.statusCode).toBe(200);
  });
  it("should return 404 if comment is not found", async () => {
    findDatapackComment.mockResolvedValue([]);
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/datapack/comments/2",
      headers
    });
    expect(deleteComment).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Requested comment not found." });
    expect(response.statusCode).toBe(404);
  });

  it("should reply 500 if an error occurred in updateComment", async () => {
    findDatapackComment.mockResolvedValue([{ ...testComment }]);
    deleteComment.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "DELETE",
      url: "/admin/datapack/comments/1",
      headers
    });
    expect(deleteComment).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Error deleting datapack comment" });
  });
});

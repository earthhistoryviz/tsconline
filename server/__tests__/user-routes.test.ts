import { vi, beforeAll, afterAll, describe, beforeEach, it, expect } from "vitest";
import fastify, { FastifyInstance, InjectOptions, RouteOptions } from "fastify";
import formAutoContent from "form-auto-content";
import fastifySecureSession from "@fastify/secure-session";
import * as runJavaEncryptModule from "../src/encryption";
import * as utilModule from "../src/util";
import * as fspModule from "fs/promises";
import * as database from "../src/database";
import * as verify from "../src/verify";
import { userRoutes } from "../src/routes/user-auth";
import * as pathModule from "path";
import * as userHandler from "../src/user/user-handler";
import * as uploadDatapack from "../src/upload-datapack";
import * as shared from "@tsconline/shared";
import { Workshop } from "../src/types";
import * as generalFileHandlerRequests from "../src/file-handlers/general-file-handler-requests";
import fastifyMultipart from "@fastify/multipart";
import * as chartHistory from "../src/user/chart-history";
import * as workshopUtil from "../src/workshop/workshop-util";
import { DATAPACK_PROFILE_PICTURE_FILENAME } from "../src/constants";
import { RouteDefinition, initializeAppRoutes, oneToOneMatch } from "./util/route-checks";
import { UserRecaptchaActions } from "@tsconline/shared";
import { uploadExternalDatapack } from "../src/routes/user-routes";

vi.mock("../src/workshop/workshop-util", async (importOriginal) => {
  const actual = await importOriginal<typeof workshopUtil>();
  return {
    verifyWorkshopValidity: vi.fn().mockImplementation(() => ({
      code: 200,
      message: "Success"
    })),
    getWorkshopIdFromUUID: vi.fn().mockReturnValue("workshop-123")
  };
});

vi.mock("../src/user/chart-history", async () => {
  return {
    getChartHistory: vi.fn(() => Promise.resolve(testHistory)),
    getChartHistoryMetadata: vi.fn(() => Promise.resolve([{ timestamp: "test" }])),
    deleteChartHistory: vi.fn().mockResolvedValue({})
  };
});
vi.mock("../src/file-handlers/general-file-handler-requests", async () => {
  return {
    editDatapackMetadataRequestHandler: vi.fn(async () => {})
  };
});

vi.mock("../src/upload-datapack", async () => {
  return {
    processAndUploadDatapack: vi.fn().mockResolvedValue({ code: 200, message: "success" })
  };
});
vi.mock("../src/types", async () => {
  return {
    isOperationResult: vi.fn().mockReturnValue(false),
    assertDatapackCommentWithProfilePicture: vi.fn().mockReturnValue(true)
  };
});

vi.mock("../src/upload-handlers", async () => {
  return {
    getFileNameFromCachedDatapack: vi.fn(() => Promise.resolve(filename))
  };
});

vi.mock("@tsconline/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof shared>();
  return {
    ...actual,
    isPartialDatapackMetadata: vi.fn().mockReturnValue(true),
    getWorkshopUUIDFromWorkshopId: vi.fn().mockReturnValue("workshop-uuid"),
    checkUserAllowedDownloadDatapack: vi.fn().mockReturnValue(true)
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
    findUser: vi.fn(() => Promise.resolve([testUser])),
    findCurrentDatapackComments: vi.fn(() => Promise.resolve([testComment])),
    createDatapackComment: vi.fn().mockResolvedValue({}),
    updateComment: vi.fn().mockResolvedValue({}),
    deleteComment: vi.fn().mockResolvedValue({}),
    findDatapackComment: vi.fn(() => Promise.resolve([testComment])),
    getActiveWorkshopsUserIsIn: vi.fn().mockResolvedValue([])
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
    loadAssetConfigs: vi.fn().mockImplementation(() => {}),
    deleteDirectory: vi.fn().mockImplementation(() => {}),
    resetUploadDirectory: vi.fn().mockImplementation(() => {}),
    checkHeader: vi.fn().mockReturnValue(true),
    extractMetadataFromDatapack: vi.fn().mockImplementation((obj) => obj)
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
    deleteUserDatapack: vi.fn().mockResolvedValue({}),
    fetchAllUsersDatapacks: vi.fn().mockResolvedValue([]),
    downloadDatapackFilesZip: vi.fn().mockResolvedValue(Buffer.from("test"))
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
const appRoutes: RouteDefinition[] = [];
beforeAll(async () => {
  app = fastify({
    exposeHeadRoutes: false
  });
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
  app.post("/external-chart", uploadExternalDatapack);
  app.addHook("onRoute", (routeOptions: RouteOptions) => {
    appRoutes.push(
      ...initializeAppRoutes(routeOptions, {
        recatpchaHandlerName: "verifyRecaptchaPrehandler",
        verifyAuthHandlerName: "verifySession"
      })
    );
  });
  await app.register(userRoutes, { prefix: "/user" });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
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
const testHistory = {
  settings: "test",
  datapacks: [{ title: "test" } as shared.Datapack],
  chartContent: "test",
  chartHash: "test"
};
const mockDate = new Date("2024-08-20T00:00:00Z");
const testComment = {
  id: 1,
  username: "test@example.com",
  uuid,
  dateCreated: mockDate.toISOString(),
  pictureUrl: null,
  commentText: "test",
  flagged: 0,
  datapackTitle: "test"
};

const routes: RouteDefinition[] = [
  {
    method: "GET",
    url: `/user/datapack/download/${filename}`,
    recaptchaAction: UserRecaptchaActions.USER_DOWNLOAD_DATAPACK,
    hasAuth: true
  },
  { method: "POST", url: "/user/datapack", recaptchaAction: UserRecaptchaActions.USER_UPLOAD_DATAPACK, hasAuth: true },
  {
    method: "DELETE",
    url: `/user/datapack/${filename}`,
    recaptchaAction: UserRecaptchaActions.USER_DELETE_DATAPACK,
    hasAuth: true
  },
  {
    method: "PATCH",
    url: `/user/datapack/${filename}`,
    body: { title: "new_title" },
    recaptchaAction: UserRecaptchaActions.USER_EDIT_DATAPACK_METADATA,
    hasAuth: true
  },
  {
    method: "GET",
    url: `/user/datapack/${filename}`,
    recaptchaAction: UserRecaptchaActions.USER_FETCH_SINGLE_DATAPACK,
    hasAuth: true
  },
  {
    method: "GET",
    url: "/user/workshop/workshop-1/datapack/test",
    recaptchaAction: UserRecaptchaActions.USER_FETCH_WORKSHOP_DATAPACK,
    hasAuth: true
  },
  {
    method: "GET",
    url: `/user/datapack/download/public/files/${filename}/${uuid}`,
    recaptchaAction: UserRecaptchaActions.USER_PUBLIC_DOWNLOAD_DATAPACK_FILES_ZIP,
    hasAuth: false
  },
  {
    method: "GET",
    url: `/user/datapack/download/private/files/${filename}/${uuid}`,
    recaptchaAction: UserRecaptchaActions.USER_PRIVATE_DOWNLOAD_DATAPACK_FILES_ZIP,
    hasAuth: true
  },
  {
    method: "POST",
    url: "/user/datapack/addComment/test",
    body: { commentText: "test comment" },
    recaptchaAction: UserRecaptchaActions.USER_UPLOAD_DATAPACK_COMMENT,
    hasAuth: true
  },
  {
    method: "POST",
    url: "/user/datapack/comments/report/1",
    body: { flagged: 1 },
    recaptchaAction: UserRecaptchaActions.USER_REPORT_COMMENT,
    hasAuth: true
  },
  {
    method: "DELETE",
    url: `/user/datapack/comments/${testComment.id}`,
    recaptchaAction: UserRecaptchaActions.USER_DELETE_COMMENT,
    hasAuth: true
  },
  {
    method: "GET",
    url: "/user/metadata",
    hasAuth: true
  },
  {
    method: "GET",
    url: "/user/uuid/123e4567-e89b-12d3-a456-426614174000/datapack/test_filename"
  },
  {
    method: "GET",
    url: "/user/history",
    hasAuth: true
  },
  {
    method: "GET",
    url: `/user/history/${mockDate.toISOString()}`,
    hasAuth: true
  },
  {
    method: "DELETE",
    url: `/user/history/${mockDate.toISOString()}`,
    hasAuth: true
  },
  {
    method: "GET",
    url: "/user/datapack/comments/test_filename"
  }
];
describe("Route Consistency Tests", () => {
  it("should have a 1:1 match between expected and actual routes", () => {
    const { missingInActual, unexpectedInActual } = oneToOneMatch(appRoutes, routes);
    expect(missingInActual.length).toBe(0);
    expect(unexpectedInActual.length).toBe(0);
  });
});

describe("fetchSingleUserDatapack", () => {
  const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 400 if datapack title is not provided", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/user/datapack/",
      headers
    });
    expect(response.statusCode).toBe(400);
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapack must NOT have fewer than 1 characters",
      statusCode: 400
    });
  });
  it("should reply 404 if an error occurred in fetchUserDatapack", async () => {
    fetchUserDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(404);
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ error: "Datapack does not exist or cannot be found" });
  });
  it("should reply 404 if no metadata is found", async () => {
    fetchUserDatapack.mockResolvedValueOnce("" as unknown as shared.Datapack);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(404);
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ error: "Datapack does not exist or cannot be found" });
  });
  it("should reply 200 if the datapack is successfully retrieved", async () => {
    fetchUserDatapack.mockResolvedValueOnce({ title: "test" } as shared.Datapack);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/${filename}`,
      headers
    });
    expect(response.statusCode).toBe(200);
    expect(fetchUserDatapack).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ title: "test" });
  });
});

describe("verifySession tests", () => {
  describe.each(routes.filter((r) => r.hasAuth))("when request is %s %s", ({ method, url, body }) => {
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
  describe.each(routes.filter((r) => r.recaptchaAction))("when request is %s %s", ({ method, url, body }) => {
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

describe("editDatapackMetadata", () => {
  const editDatapackMetadataRequestHandler = vi.spyOn(generalFileHandlerRequests, "editDatapackMetadataRequestHandler");
  it("should return 400 if datapack is not provided", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/",
      headers
    });
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapack must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(editDatapackMetadataRequestHandler).not.toHaveBeenCalled();
  });
  it("should return 500 if an error occurred in editDatapackMetadataRequestHandler", async () => {
    editDatapackMetadataRequestHandler.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers
    });
    expect(editDatapackMetadataRequestHandler).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json().error).toBe("Failed to edit metadata");
  });
  it("should return operation result that editDatapackMetadataRequestHandler returns", async () => {
    editDatapackMetadataRequestHandler.mockResolvedValueOnce({ code: 200, message: "Success" });
    const response = await app.inject({
      method: "PATCH",
      url: "/user/datapack/test",
      headers
    });
    expect(editDatapackMetadataRequestHandler).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual({ message: "Success" });
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
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapack must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(getEncryptionDatapackFileSystemDetails).not.toHaveBeenCalled();
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
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapack must NOT have fewer than 1 characters",
      statusCode: 400
    });
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

describe("uploadExternalDatapack", () => {
  const payload = {
    datapack: {
      value: Buffer.from("test"),
      options: {
        filename: "test.dpk",
        contentType: "text/plain"
      }
    }
  };
  const bearerToken = "auth token";
  const headers = {
    Authorization: bearerToken,
    datapacktitle: "test",
    datapackhash: "hash"
  };
  beforeAll(() => {
    process.env.BEARER_TOKEN = bearerToken.split(" ")[1];
  });
  it("should return 401 if authorization header is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      payload
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Token missing" });
  });

  it("should return 401 if token is missing in auth header", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers: { Authorization: "token" },
      payload
    });

    expect(response.json()).toEqual({ error: "Token missing" });
    expect(response.statusCode).toBe(401);
  });

  it("should return 500 if BEARER_TOKEN is missing in enviroment variables", async () => {
    delete process.env.BEARER_TOKEN;
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers: { Authorization: "Incorrect Token" },
      payload
    });

    expect(response.json()).toEqual({
      error: "Server misconfiguration: Missing BEARER_TOKEN on TSC Online. Contact admin"
    });
    expect(response.statusCode).toBe(500);
    process.env.BEARER_TOKEN = bearerToken.split(" ")[1]; // Restore for other tests
  });

  it("should return 403 if token is incorrect", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers: { Authorization: "Incorrect Token" },
      payload
    });

    expect(response.json()).toEqual({ error: "Token mismatch" });
    expect(response.statusCode).toBe(403);
  });
  it("should return 401 if datapacktitle header is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers: { Authorization: bearerToken },
      payload
    });
    expect(await response.json()).toEqual({
      error: "Datapack requires datapackTitle field in header"
    });
    expect(response.statusCode).toBe(401);
  });
  it("should return 401 if datapackhash header is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers: { ...headers, datapackhash: "" },
      payload
    });
    expect(await response.json()).toEqual({
      error: "DatapackHash missing"
    });
    expect(response.statusCode).toBe(401);
  });
  it("should return 200 if official datapack already exists and file is the same", async () => {
    const fetchAllUsersDatapacks = vi.spyOn(userHandler, "fetchAllUsersDatapacks");
    fetchAllUsersDatapacks.mockResolvedValueOnce([
      { title: headers.datapacktitle, originalFileName: headers.datapackhash + ".txt" } as shared.Datapack
    ]);
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers,
      payload
    });
    expect(await response.json()).toEqual({
      datapackTitle: headers.datapacktitle
    });
    expect(response.statusCode).toBe(200);
    expect(fetchAllUsersDatapacks).toHaveBeenCalledOnce();
  });
  it("should return custom operation code if processUploadDatpaack fails", async () => {
    const processAndUploadDatapack = vi.spyOn(uploadDatapack, "processAndUploadDatapack");
    const fetchAllUsersDatapacks = vi.spyOn(userHandler, "fetchAllUsersDatapacks");
    fetchAllUsersDatapacks.mockResolvedValueOnce([]);
    processAndUploadDatapack.mockResolvedValueOnce({
      code: 500,
      message: "Custom error message"
    });
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers,
      payload
    });
    expect(await response.json()).toEqual({
      error: "Custom error message"
    });
    expect(response.statusCode).toBe(500);
    expect(processAndUploadDatapack).toHaveBeenCalled();
  });
  it("should return 500 if processAndUploadDatapack throws an error", async () => {
    const processAndUploadDatapack = vi.spyOn(uploadDatapack, "processAndUploadDatapack");
    const fetchAllUsersDatapacks = vi.spyOn(userHandler, "fetchAllUsersDatapacks");
    fetchAllUsersDatapacks.mockResolvedValueOnce([]);
    processAndUploadDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers,
      payload
    });
    expect(await response.json()).toEqual({ error: "Internal server error" });
    expect(response.statusCode).toBe(500);
    expect(processAndUploadDatapack).toHaveBeenCalledOnce();
  });

  it("should return 200 if upload is successful", async () => {
    const processAndUploadDatapack = vi.spyOn(uploadDatapack, "processAndUploadDatapack");
    const fetchAllUsersDatapacks = vi.spyOn(userHandler, "fetchAllUsersDatapacks");
    fetchAllUsersDatapacks.mockResolvedValueOnce([]);
    processAndUploadDatapack.mockResolvedValueOnce({
      code: 200,
      message: "Datapack uploaded successfully"
    });
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers,
      payload
    });
    expect(await response.json()).toEqual({
      datapackTitle: headers.datapacktitle
    });
    expect(response.statusCode).toBe(200);
    expect(processAndUploadDatapack).toHaveBeenCalled();
  });

  it("should return 200 if upload is duplicated", async () => {
    process.env.BEARER_TOKEN = "correct_token";
    const fetchAllUsersDatapacks = vi.spyOn(userHandler, "fetchAllUsersDatapacks");
    fetchAllUsersDatapacks.mockResolvedValueOnce([{ title: "test" } as shared.Datapack]);
    const response = await app.inject({
      method: "POST",
      url: "/external-chart",
      headers: { Authorization: "Bearer correct_token", datapacktitle: "test", datapackHash: "test" },
      payload: {
        datapack: {
          value: Buffer.from("test"),
          options: {
            filename: "test.dpk",
            contentType: "text/plain"
          }
        }
      }
    });
    expect(response.statusCode).toBe(200);
  });
});

describe("fetchWorkshopDatapack tests", () => {
  const findUser = vi.spyOn(database, "findUser");
  const verifyWorkshopValidity = vi.spyOn(workshopUtil, "verifyWorkshopValidity");
  const getWorkshopIdFromUUID = vi.spyOn(workshopUtil, "getWorkshopIdFromUUID");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 400 if workshopUUID is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/workshop//datapack/test`,
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/workshopUUID must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
    expect(findUser).not.toHaveBeenCalled();
  });
  it("should reply 400 if datapackTitle is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/workshop/workshop-1/datapack/`,
      headers
    });
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapackTitle must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
    expect(findUser).not.toHaveBeenCalled();
  });
  it("should reply 400 if workshopUUID is invalid", async () => {
    getWorkshopIdFromUUID.mockReturnValueOnce(null);
    const response = await app.inject({
      method: "GET",
      url: `/user/workshop/1/datapack/test`,
      headers
    });
    expect(await response.json()).toEqual({ error: "Invalid workshop UUID" });
    expect(response.statusCode).toBe(400);
  });
  it("should reply 403 if workshop is not active", async () => {
    verifyWorkshopValidity.mockResolvedValueOnce({
      code: 403,
      message: "User does not have access to this workshop"
    });
    const response = await app.inject({
      method: "GET",
      url: `/user/workshop/workshop-1/datapack/test`,
      headers
    });
    expect(await response.json()).toEqual({ error: "User does not have access to this workshop" });
    expect(response.statusCode).toBe(403);
  });
  it("should reply 404 if the datapack is not found", async () => {
    const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
    fetchUserDatapack.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "GET",
      url: `/user/workshop/workshop-1/datapack/test`,
      headers
    });
    expect(await response.json()).toEqual({ error: "Datapack not found" });
    expect(response.statusCode).toBe(404);
  });
  it("should reply 500 if verifyWorkshop fails", async () => {
    verifyWorkshopValidity.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/workshop/workshop-1/datapack/test`,
      headers
    });
    expect(await response.json()).toEqual({ error: "Unknown Error" });
    expect(response.statusCode).toBe(500);
    expect(findUser).toHaveBeenCalledOnce();
    expect(verifyWorkshopValidity).toHaveBeenCalledOnce();
  });

  it("should reply 200 when the datapack is successfully fetched", async () => {
    const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
    fetchUserDatapack.mockResolvedValueOnce({ title: "test" } as shared.Datapack);
    const response = await app.inject({
      method: "GET",
      url: `/user/workshop/workshop-1/datapack/test`,
      headers
    });
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual({ title: "test" });
  });
});

describe("fetchPublicUserDatapack tests", () => {
  const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 400 if uuid is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/uuid//datapack/${filename}`,
      headers
    });
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/uuid must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should reply 400 if filename is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/uuid/${testUser.uuid}/datapack/`,
      headers
    });
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapackTitle must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should reply 404 if the datapack is not found", async () => {
    fetchUserDatapack.mockRejectedValueOnce(new Error());
    const response = await app.inject({
      method: "GET",
      url: `/user/uuid/${testUser.uuid}/datapack/${filename}`,
      headers
    });
    expect(fetchUserDatapack).toHaveBeenCalledWith(testUser.uuid, filename);
    expect(await response.json()).toEqual({ error: "Datapack or user does not exist or cannot be found" });
    expect(response.statusCode).toBe(404);
  });
  it("should reply 401 if datapack is private", async () => {
    fetchUserDatapack.mockResolvedValueOnce({ isPublic: false } as shared.Datapack);
    const response = await app.inject({
      method: "GET",
      url: `/user/uuid/${testUser.uuid}/datapack/${filename}`,
      headers
    });
    expect(fetchUserDatapack).toHaveBeenCalledWith(testUser.uuid, filename);
    expect(await response.json()).toEqual({ error: "Datapack is not public" });
    expect(response.statusCode).toBe(401);
  });
  it("should reply 200 when the datapack is successfully fetched", async () => {
    fetchUserDatapack.mockResolvedValueOnce({ title: "test", isPublic: true } as shared.Datapack);
    const response = await app.inject({
      method: "GET",
      url: `/user/uuid/${testUser.uuid}/datapack/${filename}`,
      headers
    });
    expect(fetchUserDatapack).toHaveBeenCalledWith(testUser.uuid, filename);
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual({ title: "test", isPublic: true });
  });
});

describe("fetchUserHistory tests", () => {
  const getChartHistory = vi.spyOn(chartHistory, "getChartHistory");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const timestamp = new Date().toISOString();
  it("should reply 400 if timestamp is invalid", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/history/invalid-timestamp`,
      headers
    });
    expect(getChartHistory).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'params/timestamp must match format "date-time"',
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should reply 400 if timestamp is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/history/`,
      headers
    });
    expect(getChartHistory).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/timestamp must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should reply 404 if symlinks are invalid", async () => {
    getChartHistory.mockRejectedValueOnce(new Error("Invalid datapack symlink"));
    const response = await app.inject({
      method: "GET",
      url: `/user/history/${timestamp}`,
      headers
    });
    expect(getChartHistory).toHaveBeenCalledOnce();
    expect(getChartHistory).toHaveBeenCalledWith(testUser.uuid, timestamp);
    expect(response.statusCode).toBe(404);
    expect(await response.json()).toEqual({ error: "Datapacks not found" });
  });
  it("should reply 500 if an error occurred in getChartHistory", async () => {
    getChartHistory.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/history/${timestamp}`,
      headers
    });
    expect(getChartHistory).toHaveBeenCalledOnce();
    expect(getChartHistory).toHaveBeenCalledWith(testUser.uuid, timestamp);
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch history" });
  });
  it("should reply 200 when the history is successfully fetched", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/history/${timestamp}`,
      headers
    });
    expect(getChartHistory).toHaveBeenCalledOnce();
    expect(getChartHistory).toHaveBeenCalledWith(testUser.uuid, timestamp);
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual(testHistory);
  });
});

describe("fetchUserHistoryMetadata tests", () => {
  const getChartHistoryMetadata = vi.spyOn(chartHistory, "getChartHistoryMetadata");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 500 if an error occurred in getChartHistoryMetadata", async () => {
    getChartHistoryMetadata.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: "/user/history",
      headers
    });
    expect(getChartHistoryMetadata).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch history metadata" });
  });
  it("should reply 200 when the history metadata is successfully fetched", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/user/history",
      headers
    });
    expect(getChartHistoryMetadata).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual([{ timestamp: "test" }]);
  });
});

describe("deleteUserHistory tests", () => {
  const deleteChartHistory = vi.spyOn(chartHistory, "deleteChartHistory");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const timestamp = new Date().toISOString();
  it("should reply 400 if timestamp is invalid", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/user/history/invalid-timestamp`,
      headers
    });
    expect(deleteChartHistory).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: 'params/timestamp must match format "date-time"',
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should reply 400 if timestamp is empty", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/user/history/`,
      headers
    });
    expect(deleteChartHistory).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/timestamp must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should reply 500 if an error occurred in deleteChartHistory", async () => {
    deleteChartHistory.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "DELETE",
      url: `/user/history/${timestamp}`,
      headers
    });
    expect(deleteChartHistory).toHaveBeenCalledOnce();
    expect(deleteChartHistory).toHaveBeenCalledWith(testUser.uuid, timestamp);
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to delete history" });
  });
  it("should reply 200 when the history is successfully deleted", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/user/history/${timestamp}`,
      headers
    });
    expect(deleteChartHistory).toHaveBeenCalledOnce();
    expect(deleteChartHistory).toHaveBeenCalledWith(testUser.uuid, timestamp);
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual({ message: "History deleted" });
  });
});

describe("downloadPrivateDatapackFilesZip tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const fetchUserDatapack = vi.spyOn(userHandler, "fetchUserDatapack");
  const checkUserAllowedDownloadDatapack = vi.spyOn(shared, "checkUserAllowedDownloadDatapack");
  const downloadDatapackFilesZip = vi.spyOn(userHandler, "downloadDatapackFilesZip");
  it("should return 400 if title is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/private/files//`,
      headers
    });
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(checkUserAllowedDownloadDatapack).not.toHaveBeenCalled();
    expect(downloadDatapackFilesZip).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapackTitle must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if uuid is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/private/files/title/`,
      headers
    });
    expect(fetchUserDatapack).not.toHaveBeenCalled();
    expect(checkUserAllowedDownloadDatapack).not.toHaveBeenCalled();
    expect(downloadDatapackFilesZip).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/uuid must NOT have fewer than 1 characters",
      statusCode: 400
    });
  });
  it("should return 404 if the datapack is not found", async () => {
    fetchUserDatapack.mockRejectedValueOnce(new Error("Datapack not found"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/private/files/title/${testUser.uuid}`,
      headers
    });
    expect(fetchUserDatapack).toHaveBeenCalledWith(testUser.uuid, "title");
    expect(checkUserAllowedDownloadDatapack).not.toHaveBeenCalled();
    expect(downloadDatapackFilesZip).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(await response.json()).toEqual({ error: "Datapack not found" });
  });
  it("should return 403 if the user is not allowed to download the datapack", async () => {
    fetchUserDatapack.mockResolvedValueOnce({ isPublic: false } as shared.Datapack);
    checkUserAllowedDownloadDatapack.mockReturnValueOnce(false);
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/private/files/title/${testUser.uuid}`,
      headers
    });
    expect(fetchUserDatapack).toHaveBeenCalledWith(testUser.uuid, "title");
    expect(downloadDatapackFilesZip).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    expect(await response.json()).toEqual({ error: "Unauthorized to download this datapack" });
  });
  it("should return 500 if an error occurred in downloadDatapackFilesZip", async () => {
    fetchUserDatapack.mockResolvedValueOnce({ isPublic: false } as shared.Datapack);
    checkUserAllowedDownloadDatapack.mockReturnValueOnce(true);
    downloadDatapackFilesZip.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/private/files/title/${testUser.uuid}`,
      headers
    });
    expect(fetchUserDatapack).toHaveBeenCalledWith(testUser.uuid, "title");
    expect(await response.json()).toEqual({ error: "Error downloading datapack files zip" });
    expect(response.statusCode).toBe(500);
    expect(checkUserAllowedDownloadDatapack).toHaveBeenCalledOnce();
    expect(downloadDatapackFilesZip).toHaveBeenCalledOnce();
  });
  it("should return 200 and download the datapack files zip", async () => {
    fetchUserDatapack.mockResolvedValueOnce({ isPublic: false } as shared.Datapack);
    checkUserAllowedDownloadDatapack.mockReturnValueOnce(true);
    downloadDatapackFilesZip.mockResolvedValueOnce(Buffer.from("zip content"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/private/files/title/${testUser.uuid}`,
      headers
    });
    expect(fetchUserDatapack).toHaveBeenCalledWith(testUser.uuid, "title");
    expect(checkUserAllowedDownloadDatapack).toHaveBeenCalledOnce();
    expect(downloadDatapackFilesZip).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(response.rawPayload).toEqual(Buffer.from("zip content"));
  });
});
describe("downloadPublicDatapackFilesZip tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const downloadDatapackFilesZip = vi.spyOn(userHandler, "downloadDatapackFilesZip");
  it("should return 400 if title is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/public/files//`,
      headers
    });
    expect(downloadDatapackFilesZip).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapackTitle must NOT have fewer than 1 characters",
      statusCode: 400
    });
  });
  it("should return 400 if uuid is empty", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/public/files/title/`,
      headers
    });
    expect(downloadDatapackFilesZip).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/uuid must NOT have fewer than 1 characters",
      statusCode: 400
    });
  });
  it("should return 500 if downloadDatapackFilesZip throws an error", async () => {
    downloadDatapackFilesZip.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/public/files/${filename}/${testUser.uuid}`,
      headers
    });
    expect(downloadDatapackFilesZip).toHaveBeenCalledWith(testUser.uuid, filename);
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Error downloading datapack files zip" });
  });
  it("should return 200 and download the datapack files zip", async () => {
    const downloadDatapackFilesZip = vi.spyOn(userHandler, "downloadDatapackFilesZip");
    downloadDatapackFilesZip.mockResolvedValueOnce(Buffer.from("zip content"));
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/download/public/files/${filename}/${testUser.uuid}`,
      headers
    });
    expect(downloadDatapackFilesZip).toHaveBeenCalledWith(testUser.uuid, filename);
    expect(response.statusCode).toBe(200);
    expect(response.rawPayload).toEqual(Buffer.from("zip content"));
  });
});

describe("fetchDatapackComments tests", () => {
  const findCurrentDatapackComments = vi.spyOn(database, "findCurrentDatapackComments");
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if datapack title is missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/user/datapack/comments/`
    });
    expect(findCurrentDatapackComments).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapackTitle must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should reply 500 if an error occurred in findCurrentDatapackComments", async () => {
    findCurrentDatapackComments.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: "/user/datapack/comments/test"
    });
    expect(findCurrentDatapackComments).toHaveBeenCalledOnce();
    expect(findCurrentDatapackComments).toHaveBeenCalledWith({ datapackTitle: "test" });
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Error fetching datapack comments" });
  });
  it("should return 200 and the comments if successful", async () => {
    findCurrentDatapackComments.mockResolvedValueOnce([testComment]);
    const response = await app.inject({
      method: "GET",
      url: "/user/datapack/comments/test"
    });
    expect(findCurrentDatapackComments).toHaveBeenCalledOnce();
    expect(findCurrentDatapackComments).toHaveBeenCalledWith({ datapackTitle: "test" });
    expect(await response.json()).toEqual([testComment]);
    expect(response.statusCode).toBe(200);
  });
});

describe("uploadDatapackComment tests", () => {
  const createDatapackComment = vi.spyOn(database, "createDatapackComment");
  const findDatapackComment = vi.spyOn(database, "findDatapackComment");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if datapack title is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/addComment/",
      headers,
      payload: {
        commentText: "test"
      }
    });
    expect(createDatapackComment).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/datapackTitle must NOT have fewer than 1 characters",
      statusCode: 400
    });
  });
  it("should return 400 if comment text is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/addComment/test",
      headers,
      payload: {
        commentText: ""
      }
    });
    expect(createDatapackComment).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/commentText must NOT have fewer than 1 characters",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 200 if successful", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/addComment/test",
      headers,
      payload: {
        commentText: "test"
      }
    });
    expect(createDatapackComment).toHaveBeenCalled();
    expect(findDatapackComment).toHaveBeenCalled();
    expect(await response.json()).toEqual({ message: "Datapack comment creation successful", id: testComment.id });
    expect(response.statusCode).toBe(200);
  });
  it("should reply 500 if an error occurred in createDatapackComment", async () => {
    createDatapackComment.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/addComment/test",
      headers,
      payload: {
        commentText: "test"
      }
    });
    expect(createDatapackComment).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Error uploading datapack comment" });
  });
  it("should return 500 if findDatapackComment does not find the comment", async () => {
    findDatapackComment.mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/addComment/test",
      headers,
      payload: {
        commentText: "test"
      }
    });
    expect(createDatapackComment).toHaveBeenCalledOnce();
    expect(findDatapackComment).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Error uploading datapack comment" });
  });
});

describe("updateDatapackComment tests", () => {
  const updateComment = vi.spyOn(database, "updateComment");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if comment ID is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/comments/report/",
      headers,
      payload: {
        flagged: 1
      }
    });
    expect(updateComment).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/commentId must be number",
      statusCode: 400
    });
  });
  it("should return 400 if comment ID is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/comments/report/a",
      headers,
      payload: {
        flagged: 1
      }
    });
    expect(updateComment).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/commentId must be number",
      statusCode: 400
    });
  });
  it("should return 400 if comment ID is less than 1", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/comments/report/0",
      headers,
      payload: {
        flagged: 1
      }
    });
    expect(updateComment).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/commentId must be >= 1",
      statusCode: 400
    });
  });
  it("should return 400 if body is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/comments/report/1",
      headers,
      payload: {
        flagged: undefined
      }
    });
    expect(updateComment).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must have required property 'flagged'",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if body.flagged is not a number", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/comments/report/1",
      headers,
      payload: {
        flagged: "not-a-number"
      }
    });
    expect(updateComment).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body/flagged must be number",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 404 if comment is not found", async () => {
    updateComment.mockResolvedValue([]);
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/comments/report/2",
      headers,
      payload: {
        flagged: 1
      }
    });
    expect(updateComment).toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Datapack comment not found." });
    expect(response.statusCode).toBe(404);
  });
  it("should return 200 if comment is successfully updated", async () => {
    updateComment.mockResolvedValue([{ numUpdatedRows: 1n }]);
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/comments/report/1",
      headers,
      payload: {
        flagged: 1
      }
    });
    expect(updateComment).toHaveBeenCalled();
    expect(updateComment).toHaveBeenCalledWith({ id: 1 }, { flagged: 1 });
    expect(await response.json()).toEqual({ message: "Datapack comment modified." });
    expect(response.statusCode).toBe(200);
  });
  it("should reply 500 if an error occurred in updateComment", async () => {
    updateComment.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "POST",
      url: "/user/datapack/comments/report/1",
      headers,
      payload: {
        flagged: 1
      }
    });
    expect(updateComment).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Error updating datapack comment" });
  });
});

describe("deleteDatapackComment tests", () => {
  const deleteComment = vi.spyOn(database, "deleteComment");
  const findDatapackComment = vi.spyOn(database, "findDatapackComment");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if comment ID is missing", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/user/datapack/comments/",
      headers
    });
    expect(deleteComment).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/commentId must be number",
      statusCode: 400
    });
  });
  it("should return 400 if comment ID is invalid", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/user/datapack/comments/a",
      headers
    });
    expect(deleteComment).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/commentId must be number",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 400 if comment ID is less than 1", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/user/datapack/comments/0",
      headers
    });
    expect(deleteComment).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "params/commentId must be >= 1",
      statusCode: 400
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return 200 if comment is successfully deleted", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/user/datapack/comments/1",
      headers
    });
    expect(deleteComment).toHaveBeenCalled();
    expect(deleteComment).toHaveBeenCalledWith({ id: 1 });
    expect(await response.json()).toEqual({ message: "Datapack comment deleted." });
    expect(response.statusCode).toBe(200);
  });
  it("should return 404 if comment is not found", async () => {
    findDatapackComment.mockResolvedValue([]);
    const response = await app.inject({
      method: "DELETE",
      url: "/user/datapack/comments/2",
      headers
    });
    expect(deleteComment).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Requested comment not found." });
    expect(response.statusCode).toBe(404);
  });
  it("should return 403 if user requesting deletion is not user who created comment", async () => {
    findDatapackComment.mockResolvedValue([{ ...testComment, uuid: "" }]);
    const response = await app.inject({
      method: "DELETE",
      url: "/user/datapack/comments/2",
      headers
    });
    expect(deleteComment).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Cannot delete other's comments." });
    expect(response.statusCode).toBe(403);
  });

  it("should reply 500 if an error occurred in updateComment", async () => {
    findDatapackComment.mockResolvedValue([{ ...testComment }]);
    deleteComment.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "DELETE",
      url: "/user/datapack/comments/1",
      headers
    });
    expect(deleteComment).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Error deleting datapack comment" });
  });
});

describe("fetchUserDatapacksMetadata", async () => {
  const fetchAllUsersDatapacks = vi.spyOn(userHandler, "fetchAllUsersDatapacks");
  const getActiveWorkshopsUserIsIn = vi.spyOn(database, "getActiveWorkshopsUserIsIn");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should reply 500 if an error occurred in fetchAllUsersDatapacks", async () => {
    fetchAllUsersDatapacks.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "GET",
      url: "user/metadata",
      headers
    });
    expect(fetchAllUsersDatapacks).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch metadatas" });
  });
  it("should reply 200 and empty if user has no datapacks", async () => {
    fetchAllUsersDatapacks.mockResolvedValueOnce([]);
    getActiveWorkshopsUserIsIn.mockResolvedValueOnce([]);
    const response = await app.inject({
      method: "GET",
      url: "user/metadata",
      headers
    });
    expect(fetchAllUsersDatapacks).toHaveBeenCalledOnce();
    expect(getActiveWorkshopsUserIsIn).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual([]);
  });
  it("should reply 200 with metadata when user has datapacks", async () => {
    fetchAllUsersDatapacks
      .mockResolvedValueOnce([{ title: "test", isPublic: true } as unknown as shared.Datapack])
      .mockResolvedValueOnce([{ title: "test2", isPublic: false } as unknown as shared.Datapack]);
    getActiveWorkshopsUserIsIn.mockResolvedValueOnce([{ workshopId: "workshop-1" } as unknown as Workshop]);
    const response = await app.inject({
      method: "GET",
      url: "user/metadata",
      headers
    });
    expect(fetchAllUsersDatapacks).toHaveBeenCalledTimes(2);
    expect(getActiveWorkshopsUserIsIn).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(await response.json()).toEqual([
      {
        title: "test",
        isPublic: true
      },
      {
        title: "test2",
        isPublic: false
      }
    ]);
  });
});

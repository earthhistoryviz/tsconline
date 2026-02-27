import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import fastify from "fastify";
import fastifyMultipart from "@fastify/multipart";
import formAutoContent from "form-auto-content";
import type { FastifyRequest, FastifyReply } from "fastify";
import { DATAPACK_PROFILE_PICTURE_FILENAME } from "../src/constants.js";

const ORIGINAL_ENV = { ...process.env };

// Mock the module dependencies used by mcp-routes
vi.mock("../src/public-datapack-handler.js", () => ({ loadPublicUserDatapacks: vi.fn() }));
vi.mock("../src/user/user-handler.js", () => ({
  fetchAllPrivateOfficialDatapacks: vi.fn(),
  fetchAllUsersDatapacks: vi.fn()
}));
vi.mock("../src/util.js", () => ({ extractMetadataFromDatapack: vi.fn() }));
vi.mock("../src/chart-generation/generate-chart.js", () => ({ generateChart: vi.fn() }));
vi.mock("../src/settings-generation/build-settings.js", () => ({
  generateChartWithEdits: vi.fn(),
  listColumns: vi.fn()
}));
<<<<<<< HEAD
vi.mock("../src/database.js", () => ({ findUser: vi.fn() }));
=======
>>>>>>> cf3a56aa7d372e24ea23c0a7017197283bef51ba
vi.mock("../src/upload-datapack.js", () => ({
  processAndUploadDatapack: vi.fn().mockResolvedValue({ code: 200, message: "success" })
}));

import {
  mcpListDatapacks,
  mcpListColumns,
  mcpRenderChartWithEdits,
  mcpUserInfoProxy,
  mcpUploadDatapack
} from "../src/routes/mcp-routes.js";
import * as uploadDatapack from "../src/upload-datapack.js";
import { loadPublicUserDatapacks } from "../src/public-datapack-handler.js";
import { fetchAllPrivateOfficialDatapacks, fetchAllUsersDatapacks } from "../src/user/user-handler.js";
import { extractMetadataFromDatapack } from "../src/util.js";
import { generateChart } from "../src/chart-generation/generate-chart.js";
import { generateChartWithEdits, listColumns } from "../src/settings-generation/build-settings.js";
import { findUser } from "../src/database.js";

beforeEach(() => {
  vi.resetAllMocks();
  // Reset .env to original state after every test
  process.env = { ...ORIGINAL_ENV };
});

describe("mcpListDatapacks", () => {
  it("combines public and official datapacks and returns metadata", async () => {
    const publicDp = { id: "p1", name: "pub" };
    const officialDp = { id: "o1", name: "off" };

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([publicDp]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([officialDp]);
    (extractMetadataFromDatapack as unknown as ReturnType<typeof vi.fn>).mockImplementation((dp: unknown) => ({
      id: (dp as { id?: string }).id,
      title: (dp as { name?: string }).name
    }));

    const req = {} as unknown as FastifyRequest;
    const reply = { send: vi.fn() } as unknown as FastifyReply;

    await mcpListDatapacks(req, reply);

    expect(loadPublicUserDatapacks).toHaveBeenCalled();
    expect(fetchAllPrivateOfficialDatapacks).toHaveBeenCalled();
    expect(extractMetadataFromDatapack).toHaveBeenCalledTimes(2);

    expect(reply.send).toHaveBeenCalledWith([
      { id: "p1", title: "pub" },
      { id: "o1", title: "off" }
    ]);
  });

  it("handles empty lists", async () => {
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (extractMetadataFromDatapack as unknown as ReturnType<typeof vi.fn>).mockImplementation((dp: unknown) => ({
      id: (dp as { id?: string }).id,
      title: (dp as { name?: string }).name
    }));

    const req = {} as unknown as FastifyRequest;
    const reply = { send: vi.fn() } as unknown as FastifyReply;

    await mcpListDatapacks(req, reply);

    expect(loadPublicUserDatapacks).toHaveBeenCalled();
    expect(fetchAllPrivateOfficialDatapacks).toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith([]);
  });

  it("propagates if extractMetadataFromDatapack throws", async () => {
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ id: "p1" }]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (extractMetadataFromDatapack as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("bad metadata");
    });

    const req = {} as unknown as FastifyRequest;
    const reply = {
      send: vi.fn(),
      status: vi.fn().mockReturnThis()
    } as unknown as FastifyReply;

    await mcpListDatapacks(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: expect.stringContaining("bad metadata") });
  });

  it("includes user datapacks when uuid is provided", async () => {
    const publicDp = { id: "p1", name: "pub" };
    const officialDp = { id: "o1", name: "off" };
    const userDp = { id: "u1", name: "user" };

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([publicDp]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([officialDp]);
    (fetchAllUsersDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([userDp]);
    (extractMetadataFromDatapack as unknown as ReturnType<typeof vi.fn>).mockImplementation((dp: unknown) => ({
      id: (dp as { id?: string }).id,
      title: (dp as { name?: string }).name
    }));

    const req = { body: { uuid: "user-123" } } as unknown as FastifyRequest;
    const reply = { send: vi.fn() } as unknown as FastifyReply;

    await mcpListDatapacks(req, reply);

    expect(fetchAllUsersDatapacks).toHaveBeenCalledWith("user-123");
    expect(extractMetadataFromDatapack).toHaveBeenCalledTimes(3);
    expect(reply.send).toHaveBeenCalledWith([
      { id: "p1", title: "pub" },
      { id: "o1", title: "off" },
      { id: "u1", title: "user" }
    ]);
  });
});

describe("mcpListColumns", () => {
  it("returns flattened columns for valid datapacks", async () => {
    const mockDatapacks = [{ title: "GTS2020", storedFileName: "gts2020.zip" }];
    const mockColumns = [{ id: "c1", name: "Col", path: "Col", on: true, enableTitle: true, type: "zone" }];

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (listColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockColumns);

    const req = { body: { datapackTitles: ["GTS2020"] } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpListColumns(req, reply);

    expect(listColumns).toHaveBeenCalledWith(mockDatapacks);
    expect(reply.send).toHaveBeenCalledWith(mockColumns);
  });

  it("returns 400 when datapackTitles is missing", async () => {
    const req = { body: {} } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpListColumns(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 400 when datapackTitles is not an array", async () => {
    const req = { body: { datapackTitles: "GTS2020" } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpListColumns(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 400 when datapackTitles is an empty array", async () => {
    const req = { body: { datapackTitles: [] } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpListColumns(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 404 when no matching datapacks found", async () => {
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const req = { body: { datapackTitles: ["none"] } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpListColumns(req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: "No matching datapacks found" });
  });

  it("returns 500 when listColumns throws", async () => {
    const mockDatapacks = [{ title: "GTS2020", storedFileName: "gts2020.zip" }];
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (listColumns as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("fail");
    });

    const req = { body: { datapackTitles: ["GTS2020"] } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpListColumns(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Error: fail" });
  });

  it("includes user datapacks when uuid is provided", async () => {
    const mockPublicDp = [{ title: "Public", storedFileName: "public.zip" }];
    const mockUserDp = [{ title: "UserDP", storedFileName: "user.zip" }];
    const mockColumns = [{ id: "c1", name: "Col", path: "Col", on: true, enableTitle: true, type: "zone" }];

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockPublicDp);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (fetchAllUsersDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUserDp);
    (listColumns as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockColumns);

    const req = { body: { datapackTitles: ["UserDP"], uuid: "user-456" } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpListColumns(req, reply);

    expect(fetchAllUsersDatapacks).toHaveBeenCalledWith("user-456");
    expect(listColumns).toHaveBeenCalledWith(mockUserDp);
    expect(reply.send).toHaveBeenCalledWith(mockColumns);
  });
});

describe("mcpRenderChartWithEdits", () => {
  it("generates chart with overrides and column toggles", async () => {
    const mockDatapacks = [{ title: "GTS2020", storedFileName: "gts2020.zip", isPublic: true, type: "datapack" }];
    const mockSettingsXml = "<settings/>";
    const mockResult = { chartpath: "public/charts/abc/chart.svg" };

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (generateChartWithEdits as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSettingsXml);
    (generateChart as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async (_chartRequest: unknown, onProgress?: (p: unknown) => void) => {
        if (onProgress) onProgress({ percentage: 50 });
        return mockResult;
      }
    );

    const req = {
      body: {
        datapackTitles: ["GTS2020"],
        overrides: { topAge: 0, baseAge: 10 },
        columnToggles: { off: ["stage-id"] }
      }
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpRenderChartWithEdits(req, reply);

    expect(generateChartWithEdits).toHaveBeenCalledWith(
      mockDatapacks,
      { topAge: 0, baseAge: 10 },
      { off: ["stage-id"] }
    );
    expect(generateChart).toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith(mockResult);
  });

  it("returns 400 when datapackTitles is missing", async () => {
    const req = { body: { overrides: {}, columnToggles: {} } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpRenderChartWithEdits(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 400 when datapackTitles is not an array", async () => {
    const req = { body: { datapackTitles: "GTS2020", overrides: {}, columnToggles: {} } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpRenderChartWithEdits(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 400 when datapackTitles is an empty array", async () => {
    const req = { body: { datapackTitles: [], overrides: {}, columnToggles: {} } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpRenderChartWithEdits(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 404 when no matching datapacks found", async () => {
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const req = { body: { datapackTitles: ["none"], overrides: {}, columnToggles: {} } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpRenderChartWithEdits(req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: "No matching datapacks found for titles: none" });
  });

  it("returns 500 when generateChartWithEdits throws", async () => {
    const mockDatapacks = [{ title: "GTS2020", storedFileName: "gts2020.zip" }];
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (generateChartWithEdits as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail edits"));

    const req = {
      body: { datapackTitles: ["GTS2020"], overrides: {}, columnToggles: {} }
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpRenderChartWithEdits(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Error: fail edits" });
  });

  it("returns 500 when generateChart throws", async () => {
    const mockDatapacks = [{ title: "GTS2020", storedFileName: "gts2020.zip", isPublic: true, type: "datapack" }];
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (generateChartWithEdits as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce("<settings/>");
    (generateChart as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail chart"));

    const req = {
      body: { datapackTitles: ["GTS2020"], overrides: {}, columnToggles: {} }
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpRenderChartWithEdits(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Error: fail chart" });
  });

  it("includes user datapacks with uuid field when uuid is provided", async () => {
    const mockUserDp = {
      title: "UserData",
      storedFileName: "user.zip",
      uuid: "dp-uuid-123",
      type: "user",
      isPublic: false
    };
    const mockSettingsXml = "<settings/>";
    const mockResult = { chartpath: "public/charts/xyz/chart.svg" };

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (fetchAllUsersDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([mockUserDp]);
    (generateChartWithEdits as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSettingsXml);
    (generateChart as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResult);

    const req = {
      body: { datapackTitles: ["UserData"], uuid: "user-789", overrides: {}, columnToggles: {} }
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpRenderChartWithEdits(req, reply);

    expect(fetchAllUsersDatapacks).toHaveBeenCalledWith("user-789");

    const generateChartMock = (generateChart as unknown as ReturnType<typeof vi.fn>).mock;
    expect(generateChartMock.calls.length).toBeGreaterThan(0);
    const callArgs = generateChartMock.calls[0]?.[0];
    expect(callArgs.datapacks).toContainEqual({
      storedFileName: "user.zip",
      title: "UserData",
      isPublic: false,
      type: "user",
      uuid: "dp-uuid-123"
    });
    expect(reply.send).toHaveBeenCalledWith(mockResult);
  });
});

describe("mcpUserInfoProxy", () => {
  // Test for when no sessionID is passed in to request
  it("returns 400 when sessionId is missing", async () => {
    const req = {
      body: { userInfo: { uuid: "u123", a: 1 } }
    } as unknown as FastifyRequest;

    const reply = { send: vi.fn(), code: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpUserInfoProxy(req, reply);

    // Expect error 400 with exact error text
    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Missing sessionId" });
  });

  // Test for when server has no expected auth token to compare any request to
  it("returns 500 when MCP_AUTH_TOKEN is missing", async () => {
    // Delete token to simulate a test without it
    delete process.env.MCP_AUTH_TOKEN;

    const req = {
      body: { sessionId: "sid123" },
      session: { get: vi.fn().mockReturnValue("u123") }
    } as unknown as FastifyRequest;

    const reply = { send: vi.fn(), code: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    (findUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        uuid: "u123",
        username: "user",
        email: "user@example.com",
        pictureUrl: null,
        accountType: "pro",
        isAdmin: 0
      }
    ]);

    await mcpUserInfoProxy(req, reply);

    // Expect error 500 with exact error text
    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Missing MCP_AUTH_TOKEN" });
  });

  it("returns 401 when session uuid is missing", async () => {
    process.env.MCP_AUTH_TOKEN = "token123";

    const req = {
      body: { sessionId: "sid123", userInfo: { uuid: "u123" } },
      session: { get: vi.fn().mockReturnValue(undefined) }
    } as unknown as FastifyRequest;

    const reply = { send: vi.fn(), code: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpUserInfoProxy(req, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: "Not logged in" });
  });

  // Test for actual call when everything is present
  it("forwards to MCP /messages/user-info with Bearer token", async () => {
    // Use a dummy expected token for test
    process.env.MCP_AUTH_TOKEN = "token123";

    // Test request for mcp server on base url of local host
    delete process.env.DOMAIN;

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true, sessionId: "sid123" })
    }) as unknown as typeof fetch;

    const req = {
      body: { sessionId: "sid123" },
      session: { get: vi.fn().mockReturnValue("u123") }
    } as unknown as FastifyRequest;

    const reply = { send: vi.fn(), code: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    (findUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        uuid: "u123",
        username: "user",
        email: "user@example.com",
        pictureUrl: "pic",
        accountType: "pro",
        isAdmin: 1
      }
    ]);

    await mcpUserInfoProxy(req, reply);

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/messages/user-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token123"
      },
      body: JSON.stringify({
        sessionId: "sid123",
        userInfo: {
          uuid: "u123",
          username: "user",
          email: "user@example.com",
          pictureUrl: "pic",
          accountType: "pro",
          isAdmin: true
        }
      })
    });

    // Expect code 200 for success
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ ok: true, sessionId: "sid123" });
  });
});

describe("mcpUploadDatapack (route)", () => {
  let app: FastifyInstance;
  let formData: ReturnType<typeof formAutoContent>;
  let formHeaders: Record<string, string>;
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  const processAndUploadDatapack = vi.mocked(uploadDatapack.processAndUploadDatapack);

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
    formHeaders = { "user-id": uuid, ...(formData.headers as Record<string, string>) };
  };

  beforeAll(async () => {
    app = fastify({ exposeHeadRoutes: false });
    await app.register(fastifyMultipart, {
      limits: { fieldNameSize: 100, fileSize: 1024 * 1024 * 60 }
    });
    app.post("/mcp/upload-datapack", mcpUploadDatapack);
    await app.listen({ host: "127.0.0.1", port: 0 });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createForm();
    processAndUploadDatapack.mockResolvedValue({ code: 200, message: "success" });
  });

  it("returns 401 if user-id header is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mcp/upload-datapack",
      headers: formData.headers as Record<string, string>,
      payload: formData.body
    });
    expect(response.statusCode).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(processAndUploadDatapack).not.toHaveBeenCalled();
  });

  it("returns 401 if user-id header is empty", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mcp/upload-datapack",
      headers: { "user-id": "  ", ...(formData.headers as Record<string, string>) },
      payload: formData.body
    });
    expect(response.statusCode).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(processAndUploadDatapack).not.toHaveBeenCalled();
  });

  it("returns 200 if the datapack is successfully uploaded", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mcp/upload-datapack",
      headers: formHeaders,
      payload: formData.body
    });
    expect(await response.json()).toEqual({ message: "Datapack uploaded" });
    expect(response.statusCode).toBe(200);
    expect(processAndUploadDatapack).toHaveBeenCalledOnce();
  });

  it("replies with non-200 if processAndUploadDatapack returns an operation result", async () => {
    const operationResult = { code: 500, message: "Error" };
    processAndUploadDatapack.mockResolvedValueOnce(operationResult);
    const response = await app.inject({
      method: "POST",
      url: "/mcp/upload-datapack",
      headers: formHeaders,
      payload: formData.body
    });
    expect((await response.json()).error).toBe(operationResult.message);
    expect(response.statusCode).toBe(operationResult.code);
    expect(processAndUploadDatapack).toHaveBeenCalledOnce();
  });

  it("returns 500 if processAndUploadDatapack throws", async () => {
    processAndUploadDatapack.mockRejectedValueOnce(new Error("Unknown error"));
    const response = await app.inject({
      method: "POST",
      url: "/mcp/upload-datapack",
      headers: formHeaders,
      payload: formData.body
    });
    expect((await response.json()).error).toBe("Error uploading datapack");
    expect(response.statusCode).toBe(500);
    expect(processAndUploadDatapack).toHaveBeenCalledOnce();
  });
});

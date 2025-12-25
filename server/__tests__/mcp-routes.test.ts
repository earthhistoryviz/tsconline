import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

// Mock the module dependencies used by mcp-routes
vi.mock("../src/public-datapack-handler.js", () => ({ loadPublicUserDatapacks: vi.fn() }));
vi.mock("../src/user/user-handler.js", () => ({ fetchAllPrivateOfficialDatapacks: vi.fn() }));
vi.mock("../src/util.js", () => ({ extractMetadataFromDatapack: vi.fn() }));
vi.mock("../src/chart-generation/generate-chart.js", () => ({ generateChart: vi.fn() }));
vi.mock("../src/settings-generation/unified-chart-generation.js", () => ({
  getDatapackSettingsSchema: vi.fn(),
  generateChartWithSchema: vi.fn()
}));

import {
  mcpListDatapacks,
  mcpGetDatapackSettingsSchema,
  mcpGenerateChartWithSchema
} from "../src/routes/mcp-routes.js";
import { loadPublicUserDatapacks } from "../src/public-datapack-handler.js";
import { fetchAllPrivateOfficialDatapacks } from "../src/user/user-handler.js";
import { extractMetadataFromDatapack } from "../src/util.js";
import { generateChart } from "../src/chart-generation/generate-chart.js";
import {
  getDatapackSettingsSchema,
  generateChartWithSchema
} from "../src/settings-generation/unified-chart-generation.js";

beforeEach(() => {
  vi.resetAllMocks();
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
    const reply = { send: vi.fn() } as unknown as FastifyReply;

    await expect(mcpListDatapacks(req, reply)).rejects.toThrow("bad metadata");
  });
});

describe("mcpGetDatapackSettingsSchema", () => {
  it("returns schema for valid datapack titles", async () => {
    const mockSchema = {
      columns: [
        { title: "Column 1", enabled: true },
        { title: "Column 2", enabled: false }
      ],
      settings: {
        baseAge: 0,
        topAge: 10,
        unitsPerMY: 2,
        orientation: "horizontal"
      }
    };

    const mockDatapacks = [
      { title: "GTS2020", storedFileName: "gts2020.zip" },
      { title: "Paleobiology", storedFileName: "paleo.zip" }
    ];

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (getDatapackSettingsSchema as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSchema);

    const req = {
      body: {
        datapackTitles: ["GTS2020", "Paleobiology"]
      }
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGetDatapackSettingsSchema(req, reply);

    expect(getDatapackSettingsSchema).toHaveBeenCalledWith(mockDatapacks);
    expect(reply.send).toHaveBeenCalledWith(mockSchema);
  });

  it("returns 400 when datapackTitles is missing", async () => {
    const req = {
      body: {}
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGetDatapackSettingsSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 400 when datapackTitles is not an array", async () => {
    const req = {
      body: { datapackTitles: "not-an-array" }
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGetDatapackSettingsSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 404 when no matching datapacks found", async () => {
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { title: "Other", storedFileName: "other.zip" }
    ]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const req = {
      body: { datapackTitles: ["InvalidDatapack"] }
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGetDatapackSettingsSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: "No matching datapacks found" });
  });

  it("returns 500 when getDatapackSettingsSchema throws an error", async () => {
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { title: "Test", storedFileName: "test.zip" }
    ]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (getDatapackSettingsSchema as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Failed to load datapack")
    );

    const req = {
      body: { datapackTitles: ["Test"] }
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGetDatapackSettingsSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Error: Failed to load datapack" });
  });
});

describe("mcpGenerateChartWithSchema", () => {
  it("generates chart successfully with valid schema and datapack titles", async () => {
    const mockSettingsXml = "<settings>test</settings>";
    const mockResult = {
      chartpath: "public/charts/test123/chart.svg"
    };

    const mockDatapacks = [{ title: "GTS2020", storedFileName: "gts2020.zip", isPublic: true, type: "datapack" }];

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (generateChartWithSchema as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSettingsXml);

    // Mock generateChart to call the onProgress callback to improve coverage
    (generateChart as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async (_chartRequest: unknown, onProgress?: (p: unknown) => void) => {
        if (onProgress) onProgress({ percentage: 50 });
        return mockResult;
      }
    );

    const req = {
      body: {
        datapackTitles: ["GTS2020"],
        settingsSchema: {
          columns: [{ title: "Column 1", enabled: true }],
          settings: { baseAge: 0, topAge: 10, unitsPerMY: 2 }
        }
      },
      query: {}
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChartWithSchema(req, reply);

    expect(generateChartWithSchema).toHaveBeenCalledWith(mockDatapacks, {
      columns: [{ title: "Column 1", enabled: true }],
      settings: { baseAge: 0, topAge: 10, unitsPerMY: 2 }
    });
    expect(generateChart).toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith(mockResult);
  });

  it("returns 400 when datapackTitles is missing", async () => {
    const req = {
      body: {
        settingsSchema: { columns: [], settings: {} }
      },
      query: {}
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChartWithSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 400 when schema is missing", async () => {
    const req = {
      body: {
        datapackTitles: ["GTS2020"]
      },
      query: {}
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChartWithSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "settingsSchema object is required" });
  });

  it("returns 400 when datapackTitles is not an array", async () => {
    const req = {
      body: {
        datapackTitles: "not-an-array",
        settingsSchema: { columns: [], settings: {} }
      },
      query: {}
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChartWithSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "datapackTitles array is required" });
  });

  it("returns 404 when no matching datapacks found", async () => {
    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { title: "Other", storedFileName: "other.zip" }
    ]);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const req = {
      body: {
        datapackTitles: ["InvalidDatapack"],
        settingsSchema: { columns: [], settings: { baseAge: 0, topAge: 10 } }
      },
      query: {}
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChartWithSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: "No matching datapacks found" });
  });

  it("returns 500 when generateChartWithSchema throws an error", async () => {
    const mockDatapacks = [{ title: "GTS2020", storedFileName: "gts2020.zip" }];

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (generateChartWithSchema as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Schema processing failed")
    );

    const req = {
      body: {
        datapackTitles: ["GTS2020"],
        settingsSchema: { columns: [], settings: { baseAge: 0, topAge: 10 } }
      },
      query: {}
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChartWithSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Error: Schema processing failed" });
  });

  it("returns 500 when generateChart throws an error", async () => {
    const mockDatapacks = [{ title: "GTS2020", storedFileName: "gts2020.zip" }];
    const mockSettingsXml = "<settings>test</settings>";

    (loadPublicUserDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDatapacks);
    (fetchAllPrivateOfficialDatapacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (generateChartWithSchema as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSettingsXml);
    (generateChart as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Chart generation failed"));

    const req = {
      body: {
        datapackTitles: ["GTS2020"],
        settingsSchema: { columns: [], settings: { baseAge: 0, topAge: 10 } }
      },
      query: {}
    } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChartWithSchema(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Error: Chart generation failed" });
  });
});

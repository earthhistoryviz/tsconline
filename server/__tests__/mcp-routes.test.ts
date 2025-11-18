import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

// Mock the module dependencies used by mcp-routes (use paths as resolved at runtime)
vi.mock("../src/public-datapack-handler.js", () => ({ loadPublicUserDatapacks: vi.fn() }));
vi.mock("../src/public-datapack-handler.ts", () => ({ loadPublicUserDatapacks: vi.fn() }));
vi.mock("../src/public-datapack-handler", () => ({ loadPublicUserDatapacks: vi.fn() }));

vi.mock("../src/user/user-handler.js", () => ({ fetchAllPrivateOfficialDatapacks: vi.fn() }));
vi.mock("../src/user/user-handler.ts", () => ({ fetchAllPrivateOfficialDatapacks: vi.fn() }));
vi.mock("../src/user/user-handler", () => ({ fetchAllPrivateOfficialDatapacks: vi.fn() }));

vi.mock("../src/util.js", () => ({ extractMetadataFromDatapack: vi.fn() }));
vi.mock("../src/util.ts", () => ({ extractMetadataFromDatapack: vi.fn() }));
vi.mock("../src/util", () => ({ extractMetadataFromDatapack: vi.fn() }));

vi.mock("../src/chart-generation/generate-chart.js", () => ({ generateChart: vi.fn() }));
vi.mock("../src/chart-generation/generate-chart.ts", () => ({ generateChart: vi.fn() }));
vi.mock("../src/chart-generation/generate-chart", () => ({ generateChart: vi.fn() }));

import { mcpGenerateChart, mcpListDatapacks } from "../src/routes/mcp-routes.js";
import { loadPublicUserDatapacks } from "../src/public-datapack-handler.js";
import { fetchAllPrivateOfficialDatapacks } from "../src/user/user-handler.js";
import { extractMetadataFromDatapack } from "../src/util.js";
import { generateChart } from "../src/chart-generation/generate-chart.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("mcpGenerateChart", () => {
  it("forwards a successful generateChart result to reply.send", async () => {
    const fakeResult = { chartpath: "public/charts/abc/chart.svg" };
    // mock generateChart to call the onProgress callback so that the
    // inline onProgress function inside mcpGenerateChart is executed (improves coverage)
    (generateChart as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async (_chartRequest: unknown, onProgress?: (p: unknown) => void) => {
        if (onProgress) onProgress({ percentage: 50 } as unknown);
        return fakeResult;
      }
    );

    const req = { body: { settings: "<s>" }, query: { uuid: "u123" } } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChart(req, reply);

    expect(generateChart).toHaveBeenCalled();
    // ensure reply.send called with the exact result
    expect(reply.send).toHaveBeenCalledWith(fakeResult);
  });

  it("returns 500 when generateChart throws", async () => {
    (generateChart as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));

    const req = { body: { settings: "<s>" }, query: {} } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChart(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    // Error is now stringified via String(err) -> "Error: boom"
    expect(reply.send).toHaveBeenCalledWith({ error: "Error: boom" });
  });

  it("returns 500 when generateChart rejects with a non-Error value", async () => {
    // reject with a plain string to exercise the fallback String(err) path
    (generateChart as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce("uh-oh");

    const req = { body: { settings: "<s>" }, query: {} } as unknown as FastifyRequest;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as FastifyReply;

    await mcpGenerateChart(req, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "uh-oh" });
  });
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

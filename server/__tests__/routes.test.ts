import fastifyMultipart from "@fastify/multipart";
import fastifyWebsocket from "@fastify/websocket";
import fastify, { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { handleChartGeneration, submitBugReport } from "../src/routes/routes";
import fastifySecureSession from "@fastify/secure-session";
import formAutoContent from "form-auto-content";
import * as util from "../src/util";
import { ChartProgressUpdate, ChartRequest } from "@tsconline/shared";
import { WebSocket } from "ws";
import * as generateChartHelpers from "../src/chart-generation/generate-chart-helpers";
import * as generateChart from "../src/chart-generation/generate-chart";

vi.mock("../src/index", () => {
  return {
    queue: [],
    maxConcurrencySize: 1
  };
});
vi.mock("../src/error-logger", async () => {
  return {
    default: {
      error: vi.fn().mockReturnValue({})
    }
  };
});
vi.mock("../src/util", async (importOriginal) => {
  const original = await importOriginal<typeof util>();
  return {
    ...original,
    assetconfigs: {
      chartsDirectory: "test/charts"
    }
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
  await app.register(fastifyWebsocket);
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
  app.post("/bug-report", submitBugReport);
  app.get("/chart", { websocket: true }, handleChartGeneration);
  await app.listen({ host: "localhost", port: 4650 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(async () => {
  await app.close();
});

describe("submitBugReport tests", () => {
  let formData: ReturnType<typeof formAutoContent>, formHeaders: Record<string, string>;
  const createForm = (json: Record<string, unknown> = {}) => {
    if (!("file" in json)) {
      json.file = {
        value: Buffer.from("test"),
        options: {
          filename: "test.txt",
          contentType: "text/plain"
        }
      };
    }
    formData = formAutoContent({ ...json }, { payload: "body", forceMultiPart: true });
    formHeaders = formData.headers as Record<string, string>;
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const mockUploadFileToGitHub = vi.spyOn(util, "uploadFileToGitHub");

  it("returns 400 if title is missing", async () => {
    createForm({ description: "Test description" });
    const res = await app.inject({
      method: "POST",
      url: "/bug-report",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await res.json()).toEqual({ error: "Title and description are required" });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 if description is missing", async () => {
    createForm({ title: "Test bug" });
    const res = await app.inject({
      method: "POST",
      url: "/bug-report",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await res.json()).toEqual({ error: "Title and description are required" });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid file type", async () => {
    createForm({
      title: "Bug",
      description: "Invalid file test",
      file: {
        value: Buffer.from("malicious"),
        options: {
          filename: "virus.exe",
          contentType: "application/octet-stream"
        }
      }
    });
    const res = await app.inject({
      method: "POST",
      url: "/bug-report",
      payload: formData.body,
      headers: formHeaders
    });
    expect(await res.json()).toEqual({ error: "Invalid file type" });
    expect(res.statusCode).toBe(400);
  });

  it("returns 500 if GitHub upload fails", async () => {
    createForm({
      title: "Upload failure",
      description: "GitHub upload failure test"
    });
    mockUploadFileToGitHub.mockResolvedValueOnce("mock-link");
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      text: async () => "GitHub error"
    } as Response);

    const res = await app.inject({
      method: "POST",
      url: "/bug-report",
      payload: formData.body,
      headers: formHeaders
    });

    expect(res.statusCode).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to submit bug report" });
  });

  it("returns 200 for valid bug report with file and email", async () => {
    createForm({
      title: "Valid bug",
      description: "Works fine",
      email: "test@example.com",
      file: {
        value: Buffer.from("test file content"),
        options: {
          filename: "log.txt",
          contentType: "text/plain"
        }
      }
    });
    mockUploadFileToGitHub.mockResolvedValueOnce("mock-file-link");
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Bug report submitted successfully" })
    } as Response);

    const res = await app.inject({
      method: "POST",
      url: "/bug-report",
      payload: formData.body,
      headers: formHeaders
    });

    expect(res.statusCode).toBe(200);
    expect(await res.json()).toEqual({ message: "Bug report submitted successfully" });
    expect(mockUploadFileToGitHub).toHaveBeenCalledTimes(1);
  });

  it("returns 200 and uploads multiple files", async () => {
    const files = [
      {
        value: Buffer.from("file one"),
        options: { filename: "one.txt", contentType: "text/plain" }
      },
      {
        value: Buffer.from("file two"),
        options: { filename: "two.json", contentType: "application/json" }
      },
      {
        value: Buffer.from("file three"),
        options: { filename: "three.csv", contentType: "text/csv" }
      }
    ];

    createForm({
      title: "Multiple files",
      description: "Check multiple file uploads",
      email: "test@example.com",
      file: files
    });

    mockUploadFileToGitHub
      .mockResolvedValueOnce("link-one")
      .mockResolvedValueOnce("link-two")
      .mockResolvedValueOnce("link-three");

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Bug report submitted successfully" })
    } as Response);

    const res = await app.inject({
      method: "POST",
      url: "/bug-report",
      payload: formData.body,
      headers: formHeaders
    });

    expect(res.statusCode).toBe(200);
    expect(await res.json()).toEqual({ message: "Bug report submitted successfully" });

    expect(mockUploadFileToGitHub).toHaveBeenCalledTimes(3);
    expect(mockUploadFileToGitHub).toHaveBeenNthCalledWith(
      1,
      "earthhistoryviz",
      "tsconline-bug-reports",
      expect.stringMatching(/^bug-reports\//),
      "one.txt",
      Buffer.from("file one")
    );
    expect(mockUploadFileToGitHub).toHaveBeenNthCalledWith(
      2,
      "earthhistoryviz",
      "tsconline-bug-reports",
      expect.stringMatching(/^bug-reports\//),
      "two.json",
      Buffer.from("file two")
    );
    expect(mockUploadFileToGitHub).toHaveBeenNthCalledWith(
      3,
      "earthhistoryviz",
      "tsconline-bug-reports",
      expect.stringMatching(/^bug-reports\//),
      "three.csv",
      Buffer.from("file three")
    );
  });

  it("formats GitHub markdown body correctly", async () => {
    let githubRequestBody: any;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (url, options: any) => {
      githubRequestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ id: 42 })
      } as Response;
    });
    createForm({
      title: "Bug markdown test",
      description: "Something went wrong",
      email: "user@example.com",
      file: {
        value: Buffer.from("test file content"),
        options: {
          filename: "log.txt",
          contentType: "text/plain"
        }
      }
    });
    mockUploadFileToGitHub.mockResolvedValueOnce("https://example.com/log.txt");

    const res = await app.inject({
      method: "POST",
      url: "/bug-report",
      payload: formData.body,
      headers: formHeaders
    });

    expect(res.statusCode).toBe(200);
    expect(githubRequestBody).toBeDefined();
    expect(githubRequestBody.title).toBe("Bug Report: Bug markdown test");
    const expectedMarkdown = [
      "## Description",
      "Something went wrong",
      "## Attachments",
      "- [log.txt](https://example.com/log.txt)",
      "## Contact Email",
      "user@example.com"
    ].join("\n\n");
    expect(githubRequestBody.body).toBe(expectedMarkdown);
  });
});

describe("handleChartGeneration", () => {
  const validChartRequest: ChartRequest = {
    settings: "<xml></xml>",
    datapacks: [],
    useCache: true,
    isCrossPlot: false
  };
  const generateChartSpy = vi.spyOn(generateChart, "generateChart");
  vi.spyOn(generateChartHelpers, "waitForSVGReady").mockResolvedValue();

  it("sends progress and completes successfully", async () => {
    generateChartSpy.mockResolvedValueOnce({ chartpath: "/charts/test/chart.svg", hash: "test" });

    const ws = new WebSocket("ws://localhost:4650/chart");
    const messages: ChartProgressUpdate[] = [];

    ws.on("message", (msg) => {
      messages.push(JSON.parse(msg.toString()));
    });

    await new Promise((resolve) => ws.once("open", resolve));

    ws.send(JSON.stringify(validChartRequest));

    await new Promise((resolve) => {
      ws.on("close", resolve);
    });

    expect(messages).toContainEqual({ stage: "Initializing", percent: 0 });
    expect(messages).toContainEqual({ stage: "Waiting for file", percent: 90 });
    expect(messages).toContainEqual({
      stage: "Complete",
      percent: 100,
      chartpath: "/charts/test/chart.svg",
      hash: "test"
    });
  });

  it("handles ChartGenerationError properly", async () => {
    generateChartSpy.mockRejectedValueOnce(new generateChart.ChartGenerationError("Chart failed", 1234));
    const ws = new WebSocket("ws://localhost:4650/chart");
    const messages: any[] = [];

    ws.on("message", (msg) => {
      messages.push(JSON.parse(msg.toString()));
    });

    await new Promise((resolve) => ws.once("open", resolve));

    ws.send(JSON.stringify(validChartRequest));

    await new Promise((resolve) => ws.on("close", resolve));

    expect(messages).toContainEqual({
      stage: "Error",
      percent: 0,
      error: "Chart failed",
      errorCode: 1234
    });
  });

  it("handles generic error properly", async () => {
    generateChartSpy.mockImplementation(() => {
      throw new Error("Unexpected failure");
    });

    const ws = new WebSocket(`ws://localhost:4650/chart`);
    const messages: any[] = [];

    ws.on("message", (msg) => {
      messages.push(JSON.parse(msg.toString()));
    });

    await new Promise((resolve) => ws.once("open", resolve));

    ws.send(JSON.stringify(validChartRequest));

    await new Promise((resolve) => {
      ws.on("close", resolve);
    });

    expect(messages).toContainEqual({
      stage: "Error",
      percent: 0,
      error: "Unexpected failure",
      errorCode: 5000
    });
  });
});

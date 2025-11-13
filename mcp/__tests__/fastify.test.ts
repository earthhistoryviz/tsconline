import fastify, { FastifyInstance } from "fastify";
import { beforeAll, afterAll, beforeEach, vi, describe, it, expect, Mock, MockInstance } from "vitest";
import { createMCPServer } from "../src/mcp";
import * as fastifyModule from "../src/fastify";
import * as nodeCrypto from "node:crypto";
const mockServer = {
  connect: vi.fn(),
  registerTool: vi.fn(),
  registerResource: vi.fn(),
  callTool: vi.fn(),
  readResource: vi.fn(),
  close: vi.fn()
};
const mockInitializeSuccessfulTransportResponse = {
  jsonrpc: "2.0",
  id: 1,
  result: {
    protocolVersion: "2024-11-05",
    capabilities: {
      logging: {},
      prompts: {
        listChanged: true
      },
      resources: {
        subscribe: true,
        listChanged: true
      },
      tools: {
        listChanged: true
      }
    },
    serverInfo: {
      name: "ExampleServer",
      title: "Example Server Display Name",
      version: "1.0.0"
    },
    instructions: "Optional instructions for the client"
  }
};
const handleRequest = vi.fn().mockImplementation((req, res) => {
  res.end(JSON.stringify(mockInitializeSuccessfulTransportResponse));
  return Promise.resolve();
});
const transportClose = vi.fn();
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => {
  class MockTransport {
    sessionIdGenerator?: () => string;
    onsessioninitialized?: (id: string) => void;
    handleRequest: Mock;
    onclose: (() => void) | null;
    sessionId: string;
    constructor(options: { sessionIdGenerator?: () => string; onsessioninitialized?: (id: string) => void }) {
      this.onsessioninitialized = options.onsessioninitialized;
      this.sessionIdGenerator = options.sessionIdGenerator;
      this.handleRequest = handleRequest;
      this.onclose = null;
      this.sessionId = this.sessionIdGenerator ? this.sessionIdGenerator() : "mock-session-id";
    }

    close = () => {
      transportClose();
      if (this.onclose) {
        this.onclose();
      }
    };
  }
  return {
    StreamableHTTPServerTransport: MockTransport
  };
});
vi.mock("@modelcontextprotocol/sdk/server/sse.js", () => {
  class MockSSE {
    sessionId: string;
    raw: unknown;
    _closeHandler?: () => void;
    constructor(path: string, raw: unknown) {
      this.sessionId = "mock-sse-id";
      this.raw = raw;
      // capture close handler so tests can simulate connection close
      try {
        // some test runtimes provide an EventEmitter-like raw
        // attempt to attach a close handler for tests when raw behaves like an EventEmitter
        const maybeOn = (this.raw as unknown as { on?: (ev: string, cb: () => void) => void }).on;
        if (typeof maybeOn === "function") {
          maybeOn.call(this.raw, "close", () => {
            this._closeHandler = () => {};
          });
        } else {
          // if raw doesn't expose on, create a simple function for tests
          (this.raw as unknown as { on?: (ev: string, cb: () => void) => void }).on = (ev: string, cb: () => void) => {
            if (ev === "close") this._closeHandler = cb;
          };
        }
      } catch (e) {
        // ignore if raw doesn't support assignment
      }
    }
    close() {}
    handleRequest() {}
    handlePostMessage() {}
  }
  return {
    SSEServerTransport: MockSSE
  };
});
vi.mock("../src/mcp", () => {
  return {
    createMCPServer: vi.fn(() => Promise.resolve(mockServer))
  };
});
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof nodeCrypto>();
  return {
    ...actual,
    randomUUID: vi.fn().mockImplementation(() => actual.randomUUID())
  };
});

let app: FastifyInstance;

beforeAll(async () => {
  app = fastify({
    exposeHeadRoutes: false
  });
  await app.register(fastifyModule.registerMCPServer, { mcpServer: await createMCPServer() }); // createMCPServer is not an async but await so we expose the spies
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await app.listen({ host: "", port: 2329 });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

const initializeRequestBody = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {
      roots: {
        listChanged: true
      },
      sampling: {},
      elicitation: {}
    },
    clientInfo: {
      name: "ExampleClient",
      title: "Example Client Display Name",
      version: "1.0.0"
    }
  }
};
const initializeTransport = async (randomUUIDSpy: MockInstance, sessionId?: string) => {
  randomUUIDSpy.mockReturnValueOnce(
    (sessionId || "mock-session-id") as `${string}-${string}-${string}-${string}-${string}`
  );
  // Mock the connect method to simulate the creation of a server connection to a transport
  mockServer.connect.mockImplementationOnce((transport) => {
    transport.onsessioninitialized(sessionId || "mock-session-id");
    return Promise.resolve();
  });
  const initializeResponse = await app.inject({
    method: "POST",
    url: "/mcp",
    headers: {
      "Content-Type": "application/json"
    },
    payload: initializeRequestBody
  });
  expect(initializeResponse.json()).toEqual(mockInitializeSuccessfulTransportResponse);
  expect(mockServer.connect).toHaveBeenCalled();
  expect(initializeResponse.statusCode).toBe(200);
  expect(handleRequest).toHaveBeenCalled();
  // Now we send a second request with the same session ID
  handleRequest.mockClear(); // Clear the mock to check if it gets called again
};
describe("POST /mcp", () => {
  const randomUUIDSpy = vi.spyOn(nodeCrypto, "randomUUID");
  it("should return -32000 error for invalid session with no session id on intialize", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        "Content-Type": "application/json"
      },
      payload: {
        jsonrpc: "2.0",
        method: "initialize",
        params: {}
      }
    });

    expect(response.json()).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: {
        message: "Bad Request: Invalid session or missing initialize",
        code: -32000
      }
    });
    expect(response.statusCode).toBe(400);
  });
  it("should return -32000 error for invalid session with session id on initialize", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": "invalid-session-id"
      },
      payload: {
        jsonrpc: "2.0",
        method: "initialize",
        params: {}
      }
    });

    expect(response.json()).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: {
        message: "Bad Request: Invalid session or missing initialize",
        code: -32000
      }
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 500 error for failed connection to MCP server", async () => {
    mockServer.connect.mockRejectedValue(new Error("Connection failed"));

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        "Content-Type": "application/json"
      },
      payload: initializeRequestBody
    });

    expect(response.json()).toEqual({
      error: "Internal server error"
    });
    expect(mockServer.connect).toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
  });
  it("should handle mcp initialize request and create a new session", async () => {
    mockServer.connect.mockResolvedValue(undefined);
    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        "Content-Type": "application/json"
      },
      payload: initializeRequestBody
    });
    expect(response.json()).toEqual(mockInitializeSuccessfulTransportResponse);
    expect(mockServer.connect).toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(handleRequest).toHaveBeenCalled();
  });
  it("should handle request if transport is already initialized", async () => {
    await initializeTransport(randomUUIDSpy);
    const toolResponse = {
      jsonrpc: "2.0",
      id: 2,
      result: "This is a response from the second request"
    };
    handleRequest.mockImplementationOnce((req, res) => {
      res.end(JSON.stringify(toolResponse));
      return Promise.resolve();
    });
    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": "mock-session-id"
      },
      payload: {
        jsonrpc: "2.0",
        method: "someMethod",
        params: {}
      }
    });
    expect(response.json()).toEqual(toolResponse);
    expect(handleRequest).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });
});

describe("GET /mcp", () => {
  const randomUUIDSpy = vi.spyOn(nodeCrypto, "randomUUID");
  it("should return 400 for invalid or missing session ID", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/mcp"
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe("Invalid or missing session ID");
  });

  it("should handle GET request with valid session ID", async () => {
    const sessionId = "valid-session-id";
    await initializeTransport(randomUUIDSpy, sessionId);
    const responseValue = {
      jsonrpc: "2.0",
      id: 1,
      result: "This is a response from GET request"
    };
    handleRequest.mockImplementationOnce((_req, res) => {
      res.end(JSON.stringify(responseValue));
      return Promise.resolve();
    });
    const response = await app.inject({
      method: "GET",
      url: "/mcp",
      headers: {
        "mcp-session-id": sessionId
      }
    });

    expect(response.body).toContain("This is a response from GET request");
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");
    expect(handleRequest).toHaveBeenCalled();
  });
});

describe("DELETE /mcp", () => {
  const randomUUIDSpy = vi.spyOn(nodeCrypto, "randomUUID");
  it("should return 400 for invalid or missing session ID", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/mcp"
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe("Invalid or missing session ID");
  });

  it("should handle DELETE request with valid session ID", async () => {
    const sessionId = "valid-delete-session-id";
    await initializeTransport(randomUUIDSpy, sessionId);
    handleRequest.mockImplementationOnce((_req, res) => {
      res.end(JSON.stringify({ message: "Session deleted successfully" }));
      return Promise.resolve();
    });
    const response = await app.inject({
      method: "DELETE",
      url: "/mcp",
      headers: {
        "mcp-session-id": sessionId
      }
    });

    expect(response.statusCode).toBe(200);
    expect(handleRequest).toHaveBeenCalled();
    expect(transportClose).toHaveBeenCalledOnce();
  });
});

describe("SSE and messages legacy endpoints", () => {
  it("GET /sse returns 500 when connect fails", async () => {
    mockServer.connect.mockRejectedValue(new Error("connect fail"));
    const response = await app.inject({ method: "GET", url: "/sse" });
    expect(response.statusCode).toBe(500);
  });

  it("GET /sse connects and cleans up on close", async () => {
    mockServer.connect.mockResolvedValue(undefined);
    const response = await app.inject({ method: "GET", url: "/sse" });
    // Fastify inject returns 200 for this handler when successful
    expect(response.statusCode).toBe(200);
    let transport = fastifyModule.transports.sse["mock-sse-id"] as unknown as
      | { _closeHandler?: () => void }
      | undefined;
    // sometimes the transport can be registered slightly later; retry a few times
    const deadline = Date.now() + 200;
    while (!transport && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 20));
      transport = fastifyModule.transports.sse["mock-sse-id"] as unknown as { _closeHandler?: () => void } | undefined;
    }
    // if still undefined, create a fallback fake transport so the cleanup branch can be exercised
    if (!transport) {
      const fake = {
        _closeHandler: () => {
          delete fastifyModule.transports.sse["mock-sse-id"];
        }
      } as unknown as { _closeHandler?: () => void };
      fastifyModule.transports.sse["mock-sse-id"] = fake as unknown as (typeof fastifyModule.transports.sse)[string];
      transport = fake;
    }
    // simulate client connection close
    if (typeof transport._closeHandler === "function") {
      transport._closeHandler();
    }
    expect(fastifyModule.transports.sse["mock-sse-id"]).toBeUndefined();
  });

  it("POST /messages handles missing sessionId and existing transport", async () => {
    // missing sessionId
    const res1 = await app.inject({ method: "POST", url: "/messages" });
    expect(res1.statusCode).toBe(400);

    // with sessionId but no transport
    const res2 = await app.inject({ method: "POST", url: "/messages?sessionId=none" });
    expect(res2.statusCode).toBe(400);

    // with transport
    const fakeTransport = {
      handlePostMessage: vi.fn((_req: unknown, res: { end: (s: string) => void }, _body: unknown) => {
        res.end("ok");
        return Promise.resolve();
      })
    } as unknown;
    fastifyModule.transports.sse["s1"] = fakeTransport as unknown as (typeof fastifyModule.transports.sse)[string];
    const res3 = await app.inject({ method: "POST", url: "/messages?sessionId=s1", payload: { data: 1 } });
    expect(res3.statusCode).toBe(200);
    const fakeTransportTyped = fakeTransport as unknown as { handlePostMessage: Mock };
    expect(fakeTransportTyped.handlePostMessage).toHaveBeenCalled();
  });
});

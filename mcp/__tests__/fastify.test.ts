import fastify, { FastifyInstance } from "fastify";
import { beforeAll, afterAll, beforeEach, vi, describe, it, expect, Mock, MockInstance } from "vitest";
import { createMCPServer } from "../src/mcp";
import { registerMCPServer } from "../src/fastify";
import * as nodeCrypto from "node:crypto";
const __mockServer = {
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
    }
  }
  return {
    StreamableHTTPServerTransport: MockTransport
  };
});
vi.mock("../src/mcp", () => {
  return {
    createMCPServer: vi.fn(() => Promise.resolve(__mockServer))
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
  await app.register(registerMCPServer, { mcpServer: await createMCPServer() }); // createMCPServer is not an async but await so we expose the spies
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
  __mockServer.connect.mockImplementationOnce((transport) => {
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
  expect(__mockServer.connect).toHaveBeenCalled();
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
    __mockServer.connect.mockRejectedValue(new Error("Connection failed"));

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
    expect(__mockServer.connect).toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
  });
  it("should handle mcp initialize request and create a new session", async () => {
    __mockServer.connect.mockResolvedValue(undefined);
    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        "Content-Type": "application/json"
      },
      payload: initializeRequestBody
    });
    expect(response.json()).toEqual(mockInitializeSuccessfulTransportResponse);
    expect(__mockServer.connect).toHaveBeenCalled();
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

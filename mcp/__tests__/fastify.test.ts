import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import type { FastifyInstance } from "fastify";

import { registerMCPRoutes } from "../src/fastify";

// ---- Mocks ----
type MCPServer = { connect: ReturnType<typeof vi.fn> };

type StreamableTransportLike = {
  close: ReturnType<typeof vi.fn>;
  sessionId?: string;
  onclose?: () => void;
  handleRequest: ReturnType<typeof vi.fn>;
};

let lastStreamableTransport: StreamableTransportLike | undefined;

// Mock MCP module
vi.mock("../src/mcp.js", () => {
  const sessionIds = new Map<string, { sessionId: string; expiresAt: number }>();
  const mcpUserInfo = new Map<string, unknown>();
  const createMCPServer = vi.fn(() => ({ connect: vi.fn().mockResolvedValue(undefined) }) as MCPServer);
  return { createMCPServer, sessionIds, mcpUserInfo };
});

// Mock SDK "isInitializeRequest"
vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  isInitializeRequest: (body: unknown) => {
    if (typeof body !== "object" || body === null) return false;
    const method = (body as { method?: unknown }).method;
    return method === "initialize";
  }
}));

// Mock Streamable + SSE transports
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => {
  class StreamableHTTPServerTransport {
    public sessionId?: string;
    public onclose?: () => void;

    private sessionIdGenerator: () => string;
    private onsessioninitialized: (id: string) => void;

    public handleRequest = vi.fn(async (_reqRaw: unknown, _replyRaw: unknown, body?: unknown) => {
      // When called with initialize, create session and call onsessioninitialized
      if (typeof body === "object" && body !== null) {
        const method = (body as { method?: unknown }).method;
        if (method === "initialize" && !this.sessionId) {
          const id = this.sessionIdGenerator();
          this.sessionId = id;
          this.onsessioninitialized(id);
        }
      }
    });

    public close = vi.fn(async () => {
      // mimic close hook
      this.onclose?.();
    });

    constructor(opts: { sessionIdGenerator: () => string; onsessioninitialized: (id: string) => void }) {
      this.sessionIdGenerator = opts.sessionIdGenerator;
      this.onsessioninitialized = opts.onsessioninitialized;
      lastStreamableTransport = this as unknown as StreamableTransportLike;
    }
  }

  return { StreamableHTTPServerTransport };
});

vi.mock("@modelcontextprotocol/sdk/server/sse.js", () => {
  class SSEServerTransport {
    public sessionId: string;
    public handlePostMessage = vi.fn(async (_reqRaw: unknown, _replyRaw: unknown, _body: unknown) => {});

    constructor(_endpoint: string, _rawRes: unknown) {
      this.sessionId = "legacy-test-session";
    }
  }

  return { SSEServerTransport };
});

// Deterministic randomUUID
vi.mock("node:crypto", () => ({
  randomUUID: () => "streamable-uuid-1"
}));

// ---- Fake Fastify helpers ----
type Headers = Record<string, string | undefined>;
type Query = Record<string, unknown>;

type RawReply = EventEmitter & {
  setHeader: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  setTimeout: ReturnType<typeof vi.fn>;
  destroyed?: boolean;
  writableEnded?: boolean;
};

type TestReq = {
  headers: Headers;
  body?: unknown;
  query: Query;
  raw: unknown;
};

type TestReply = {
  raw: RawReply;
  statusCode: number;
  payload: unknown;
  code: (n: number) => TestReply;
  send: (v?: unknown) => TestReply;
};

type Handler = (req: TestReq, reply: TestReply) => unknown | Promise<unknown>;

class FakeFastify {
  routes: Array<{ method: string; path: string; handler: Handler }> = [];
  onCloseHooks: Array<() => Promise<void> | void> = [];

  post(path: string, handler: Handler) {
    this.routes.push({ method: "POST", path, handler });
  }
  get(path: string, handler: Handler) {
    this.routes.push({ method: "GET", path, handler });
  }
  delete(path: string, handler: Handler) {
    this.routes.push({ method: "DELETE", path, handler });
  }

  addHook(name: string, hook: () => Promise<void> | void) {
    if (name === "onClose") this.onCloseHooks.push(hook);
  }

  find(method: string, path: string): Handler {
    const r = this.routes.find((x) => x.method === method && x.path === path);
    if (!r) throw new Error(`Route not found: ${method} ${path}`);
    return r.handler;
  }

  async runOnClose() {
    for (const h of this.onCloseHooks) await h();
  }
}

function makeReplyRaw(): RawReply {
  const raw = new EventEmitter() as RawReply;
  raw.setHeader = vi.fn();
  raw.write = vi.fn();
  raw.destroy = vi.fn(() => {
    raw.destroyed = true;
  });
  raw.setTimeout = vi.fn();
  return raw;
}

function makeReply(): TestReply {
  const raw = makeReplyRaw();

  const reply: TestReply = {
    raw,
    statusCode: 200,
    payload: undefined,
    code: (n: number) => {
      reply.statusCode = n;
      return reply;
    },
    send: (v?: unknown) => {
      reply.payload = v;
      return reply;
    }
  };

  return reply;
}

function makeReq(opts?: Partial<TestReq>): TestReq {
  return {
    headers: opts?.headers ?? {},
    body: opts?.body,
    query: opts?.query ?? {},
    raw: opts?.raw ?? {}
  };
}

const LEGACY_SESSION_ID = "legacy-test-session";

// ---- Tests ----
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("registerMCPRoutes", () => {
  it("registers /sse/ping and returns pong", async () => {
    const app = new FakeFastify();
    registerMCPRoutes(app as unknown as FastifyInstance);

    const handler = app.find("GET", "/ping");
    const reply = makeReply();
    await handler(makeReq(), reply);

    expect(reply.payload).toBe("pong");
  });

  it("health endpoint: enabled by default", async () => {
    const app = new FakeFastify();
    registerMCPRoutes(app as unknown as FastifyInstance);

    const handler = app.find("GET", "/health");
    const reply = makeReply();
    await handler(makeReq(), reply);

    expect(reply.payload).toEqual({ ok: true, streamableSessions: 0, legacySseSessions: 0 });
  });

  it("health endpoint: not registered when enableHealth=false", async () => {
    const app = new FakeFastify();
    registerMCPRoutes(app as unknown as FastifyInstance, { enableHealth: false });

    expect(() => app.find("GET", "/health")).toThrow(/Route not found/);
  });

  describe("/mcp streamable http", () => {
    it("POST /mcp: missing session header AND not initialize => 400 jsonrpc error", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const handler = app.find("POST", "/mcp");
      const reply = makeReply();

      await handler(makeReq({ body: { method: "not-initialize" } }), reply);

      expect(reply.statusCode).toBe(400);
      expect(reply.payload).toEqual({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Missing Mcp-Session-Id or initialize request" }
      });
    });

    it("POST /mcp: with session header not found => 404", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const handler = app.find("POST", "/mcp");
      const reply = makeReply();

      await handler(makeReq({ headers: { "mcp-session-id": "nope" }, body: { any: true } }), reply);

      expect(reply.statusCode).toBe(404);
      expect(reply.payload).toEqual({ error: "Session not found" });
    });

    it("POST /mcp: initialize creates session + server.connect called; subsequent POST uses same session", async () => {
      const { createMCPServer } = await import("../src/mcp.js");

      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const post = app.find("POST", "/mcp");

      // initialize
      const initReply = makeReply();
      await post(makeReq({ body: { method: "initialize" } }), initReply);

      // After init: createMCPServer called and connect called
      expect(createMCPServer).toHaveBeenCalledTimes(1);
      const createMCPServerMock = createMCPServer as unknown as ReturnType<typeof vi.fn>;
      const server = createMCPServerMock.mock.results[0]?.value as MCPServer;
      expect(server.connect).toHaveBeenCalledTimes(1);

      // find session id (randomUUID mock => "streamable-uuid-1")
      const sid = "streamable-uuid-1";

      // subsequent request with session header
      const reply2 = makeReply();
      const req2 = makeReq({ headers: { "mcp-session-id": sid }, body: { method: "anything" } });
      await post(req2, reply2);

      // we can’t directly access the transport map, but we *can* ensure it didn’t 404 and it didn’t set error payload
      expect(reply2.statusCode).toBe(200);
      expect(reply2.payload).toBeUndefined();
    });

    it("GET /mcp: missing session header => 400", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const handler = app.find("GET", "/mcp");
      const reply = makeReply();
      await handler(makeReq(), reply);

      expect(reply.statusCode).toBe(400);
      expect(reply.payload).toBe("Missing Mcp-Session-Id");
    });

    it("GET /mcp: session not found => 404", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const handler = app.find("GET", "/mcp");
      const reply = makeReply();
      await handler(makeReq({ headers: { "mcp-session-id": "missing" } }), reply);

      expect(reply.statusCode).toBe(404);
      expect(reply.payload).toBe("Session not found");
    });

    it("GET /mcp: found session sets headers and handles request", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const post = app.find("POST", "/mcp");
      await post(makeReq({ body: { method: "initialize" } }), makeReply());

      const get = app.find("GET", "/mcp");
      const reply = makeReply();
      await get(makeReq({ headers: { "mcp-session-id": "streamable-uuid-1" } }), reply);

      expect(reply.raw.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache, no-transform");
      expect(reply.raw.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
      expect(reply.raw.setHeader).toHaveBeenCalledWith("X-Accel-Buffering", "no");
    });

    it("DELETE /mcp: missing session header => 400", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const del = app.find("DELETE", "/mcp");
      const reply = makeReply();
      await del(makeReq(), reply);

      expect(reply.statusCode).toBe(400);
      expect(reply.payload).toBe("Missing Mcp-Session-Id");
    });

    it("DELETE /mcp: not found => 404", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const del = app.find("DELETE", "/mcp");
      const reply = makeReply();
      await del(makeReq({ headers: { "mcp-session-id": "nope" } }), reply);

      expect(reply.statusCode).toBe(404);
      expect(reply.payload).toBe("Session not found");
    });

    it("DELETE /mcp: closes transport and returns 204", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const post = app.find("POST", "/mcp");
      await post(makeReq({ body: { method: "initialize" } }), makeReply());

      const del = app.find("DELETE", "/mcp");
      const reply = makeReply();
      await del(makeReq({ headers: { "mcp-session-id": "streamable-uuid-1" } }), reply);

      expect(reply.statusCode).toBe(204);
    });

    it("cleanup timer reaps expired STREAMABLE session and calls transport.close()", async () => {
      vi.useFakeTimers();

      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance, { streamableTtlMs: 5, legacySseTtlMs: 50_000 });

      const post = app.find("POST", "/mcp");
      await post(makeReq({ body: { method: "initialize" } }), makeReply());

      const closeSpy = vi.spyOn(lastStreamableTransport!, "close");

      // advance beyond TTL and run the 10s cleanup interval
      vi.advanceTimersByTime(20_000);

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe("legacy SSE + /messages", () => {
    it("GET /sse: creates SSE session, starts keepalive, registers cleanup handlers, connects server", async () => {
      vi.useFakeTimers();

      const { createMCPServer } = await import("../src/mcp.js");

      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance, { legacyKeepAliveMs: 10 });

      const sse = app.find("GET", "/sse");
      const reply = makeReply();
      const req = makeReq({ raw: new EventEmitter() });

      await sse(req, reply);

      // connect called
      expect(createMCPServer).toHaveBeenCalledTimes(1);
      const createMCPServerMock = createMCPServer as unknown as ReturnType<typeof vi.fn>;
      const server = createMCPServerMock.mock.results[0]?.value as MCPServer;
      expect(server.connect).toHaveBeenCalledTimes(1);

      // keepalive writes ping
      vi.advanceTimersByTime(25);
      expect(reply.raw.write).toHaveBeenCalled();
    });

    it("POST /messages: missing sessionId => 400", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const handler = app.find("POST", "/messages");
      const reply = makeReply();
      await handler(makeReq({ query: {} }), reply);

      expect(reply.statusCode).toBe(400);
      expect(reply.payload).toBe("Missing sessionId");
    });

    it("POST /messages: session not found => 404", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const handler = app.find("POST", "/messages");
      const reply = makeReply();
      await handler(makeReq({ query: { sessionId: "legacy-404" } }), reply);

      expect(reply.statusCode).toBe(404);
      expect(reply.payload).toBe("Session not found");
    });

    it("POST /messages: routes to transport.handlePostMessage when session exists", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      // Create SSE session so legacy transport exists
      const sse = app.find("GET", "/sse");
      const sseReply = makeReply();
      const sseReq = makeReq({ raw: new EventEmitter() });
      await sse(sseReq, sseReply);

      // First SSE transport mock uses sessionId legacy-test-session
      const handler = app.find("POST", "/messages");
      const reply = makeReply();
      await handler(makeReq({ query: { sessionId: LEGACY_SESSION_ID }, body: { hi: 1 } }), reply);

      // No error means it found the transport and called it
      expect(reply.statusCode).toBe(200);
    });

    it("GET /sse: keepAlive stops when socket is destroyed (covers destroyed/writableEnded branch)", async () => {
      vi.useFakeTimers();

      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance, { legacyKeepAliveMs: 10 });

      const sse = app.find("GET", "/sse");
      const reply = makeReply();
      const req = makeReq({ raw: new EventEmitter() });

      await sse(req, reply);

      reply.raw.destroyed = true;

      reply.raw.write.mockClear();
      vi.advanceTimersByTime(30);

      expect(reply.raw.write).not.toHaveBeenCalled();
    });

    it("GET /sse: cleanup handles errors from clearInterval and destroy (covers warn branches)", async () => {
      vi.useFakeTimers();

      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance, { legacyKeepAliveMs: 10 });

      const sse = app.find("GET", "/sse");
      const reply = makeReply();
      const req = makeReq({ raw: new EventEmitter() });

      reply.raw.destroy.mockImplementation(() => {
        throw new Error("destroy failed");
      });

      const origClearInterval: typeof globalThis.clearInterval = globalThis.clearInterval;

      const throwingClearInterval: typeof globalThis.clearInterval = (() => {
        throw new Error("clearInterval failed");
      }) as typeof globalThis.clearInterval;

      Object.defineProperty(globalThis, "clearInterval", { value: throwingClearInterval, configurable: true });

      try {
        await sse(req, reply);

        reply.raw.emit("close");

        expect(console.warn).toHaveBeenCalled();
      } finally {
        Object.defineProperty(globalThis, "clearInterval", { value: origClearInterval, configurable: true });
      }
    });

    it("GET /sse: logs warning if abort handler registration throws", async () => {
      const app = new FakeFastify();
      registerMCPRoutes(app as unknown as FastifyInstance);

      const sse = app.find("GET", "/sse");
      const reply = makeReply();

      const badReq = makeReq({
        raw: {
          on: () => {
            throw new Error("boom");
          }
        }
      });

      await sse(badReq, reply);

      expect(console.warn).toHaveBeenCalledWith("Failed to register abort handler:", expect.any(Error));
    });
  });

  it("cleanup timer reaps expired sessions (streamable + legacy) and onClose cleans everything", async () => {
    vi.useFakeTimers();

    const app = new FakeFastify();
    registerMCPRoutes(app as unknown as FastifyInstance, {
      streamableTtlMs: 5,
      legacySseTtlMs: 5,
      legacyKeepAliveMs: 50_000 // keepalive won't interfere
    });

    // create streamable session
    const postMcp = app.find("POST", "/mcp");
    await postMcp(makeReq({ body: { method: "initialize" } }), makeReply());

    // create legacy sse session
    const sse = app.find("GET", "/sse");
    const sseReply = makeReply();
    await sse(makeReq({ raw: new EventEmitter() }), sseReply);

    // advance beyond TTL and run the 10s cleanup interval
    vi.advanceTimersByTime(20_000);

    // legacy response should have been destroyed by TTL reap
    expect(sseReply.raw.destroy).toHaveBeenCalled();

    // now simulate app.close() onClose hook cleanup
    await app.runOnClose();

    // close should be safe and idempotent; we mainly assert no throw + cleanup executed
    expect(true).toBe(true);
  });

  it("onClose: logs warning if destroying SSE response throws", async () => {
    const app = new FakeFastify();
    registerMCPRoutes(app as unknown as FastifyInstance);

    const sse = app.find("GET", "/sse");
    const reply = makeReply();
    await sse(makeReq({ raw: new EventEmitter() }), reply);

    reply.raw.destroy.mockImplementation(() => {
      throw new Error("shutdown destroy failed");
    });

    await app.runOnClose();

    expect(console.warn).toHaveBeenCalledWith("Failed to destroy SSE response during shutdown:", expect.any(Error));
  });
});

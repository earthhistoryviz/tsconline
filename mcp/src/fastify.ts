// fastify.ts
import type { FastifyInstance } from "fastify";
import type { ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { createMCPServer, sessions } from "./mcp.js";

import { SharedUser } from "@tsconline/shared";

export interface MCPRoutesOptions {
  streamableTtlMs?: number; // default 15m
  legacySseTtlMs?: number; // default 10m
  legacyKeepAliveMs?: number; // default 15s
  enableHealth?: boolean; // default true
}

/**
 * Registers MCP routes + in-memory session handling on an existing FastifyInstance.
 */
export function registerMCPRoutes(app: FastifyInstance, opts: MCPRoutesOptions = {}) {
  const {
    streamableTtlMs = 15 * 60 * 1000, // 15 minutes for streamable HTTP
    legacySseTtlMs = 10 * 60 * 1000, // 10 minutes for legacy SSE
    legacyKeepAliveMs = 15_000, // 15 seconds between keep-alives for legacy SSE
    enableHealth = true
  } = opts;

  // Session stores - one MCP server instance per transport/session
  const streamableSessions = new Map<string, StreamableHTTPServerTransport>();
  const streamableServers = new Map<string, ReturnType<typeof createMCPServer>>();
  const legacySSESessions = new Map<string, SSEServerTransport>();
  const legacyServers = new Map<string, ReturnType<typeof createMCPServer>>();

  // Make SSE sessions accessible to the auth hook in index.ts
  (app as unknown as { legacySSESessions: Map<string, SSEServerTransport> }).legacySSESessions = legacySSESessions;
  // Track raw SSE responses so TTL can hard-close sockets
  const legacySSEResponses = new Map<string, ServerResponse>();

  // Activity tracking for TTL
  const streamableLastSeen = new Map<string, number>();
  const legacyLastActivity = new Map<string, number>();

  const touchStreamable = (sid: string) => streamableLastSeen.set(sid, Date.now());
  const touchLegacy = (sid: string) => legacyLastActivity.set(sid, Date.now());

  const cleanupTimer = setInterval(() => {
    const now = Date.now();

    for (const [sid, ts] of streamableLastSeen) {
      if (now - ts > streamableTtlMs) {
        streamableLastSeen.delete(sid);
        const t = streamableSessions.get(sid);
        streamableSessions.delete(sid);
        streamableServers.delete(sid);
        t?.close().catch(() => {});
      }
    }

    for (const [sid, ts] of legacyLastActivity) {
      if (now - ts > legacySseTtlMs) {
        legacyLastActivity.delete(sid);
        legacySSESessions.delete(sid);
        legacyServers.delete(sid);
        // Clean up associated session when MCP session expires
        sessions.delete(sid);

        const res = legacySSEResponses.get(sid);
        legacySSEResponses.delete(sid);

        try {
          res?.destroy();
        } catch (err) {
          console.warn(`Failed to destroy SSE response for expired session ${sid}:`, err);
        }
      }
    }
  }, 10_000);
  cleanupTimer.unref();

  // STREAMABLE HTTP
  app.post("/mcp", async (req, reply) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const body = req.body as unknown;

    if (sessionId) {
      const transport = streamableSessions.get(sessionId);
      if (!transport) {
        reply.code(404).send({ error: "Session not found" });
        return;
      }
      touchStreamable(sessionId);
      await transport.handleRequest(req.raw, reply.raw, body);
      return;
    }

    if (!isInitializeRequest(body)) {
      reply.code(400).send({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Missing Mcp-Session-Id or initialize request" }
      });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        streamableSessions.set(id, transport);
        touchStreamable(id);

        const server = createMCPServer();
        streamableServers.set(id, server);
        void server.connect(transport);
      }
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        touchStreamable(sid);
        streamableServers.delete(sid);
      }
    };

    await transport.handleRequest(req.raw, reply.raw, body);
  });

  app.get("/mcp", async (req, reply) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      reply.code(400).send("Missing Mcp-Session-Id");
      return;
    }

    const transport = streamableSessions.get(sessionId);
    if (!transport) {
      reply.code(404).send("Session not found");
      return;
    }

    touchStreamable(sessionId);

    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");

    await transport.handleRequest(req.raw, reply.raw);
  });

  app.delete("/mcp", async (req, reply) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      reply.code(400).send("Missing Mcp-Session-Id");
      return;
    }

    const transport = streamableSessions.get(sessionId);
    if (!transport) {
      reply.code(404).send("Session not found");
      return;
    }

    streamableSessions.delete(sessionId);
    streamableLastSeen.delete(sessionId);
    streamableServers.delete(sessionId);

    await transport.close().catch(() => {});
    reply.code(204).send();
  });

  // SSE
  app.get("/sse", async (_req, reply) => {
    reply.raw.setTimeout(0);

    const transport = new SSEServerTransport("/messages", reply.raw);

    const server = createMCPServer();
    legacyServers.set(transport.sessionId, server);

    legacySSESessions.set(transport.sessionId, transport);
    legacySSEResponses.set(transport.sessionId, reply.raw);
    touchLegacy(transport.sessionId);

    // Sends keep alives bc sse is outdated :D
    const keepAlive = setInterval(() => {
      try {
        const rawReply = reply.raw as unknown as { destroyed?: boolean; writableEnded?: boolean };
        if (rawReply.destroyed || rawReply.writableEnded) {
          clearInterval(keepAlive);
          return;
        }
        reply.raw.write(`: ping ${Date.now()}\n\n`);
      } catch {
        clearInterval(keepAlive);
      }
    }, legacyKeepAliveMs);

    const cleanup = () => {
      try {
        clearInterval(keepAlive);
      } catch (err) {
        console.warn("Failed to clear keep-alive interval:", err);
      }
      try {
        reply.raw.destroy();
      } catch (err) {
        console.warn("Failed to destroy raw reply:", err);
      }
      legacySSESessions.delete(transport.sessionId);
      legacySSEResponses.delete(transport.sessionId);
      legacyLastActivity.delete(transport.sessionId);
      legacyServers.delete(transport.sessionId);
    };

    // Clean up on socket close/error or client abort (this can mess up when deving w wsl so keep this)
    reply.raw.on("close", cleanup);
    reply.raw.on("error", cleanup);
    try {
      const rawReq = _req as unknown as { raw?: { on?: (event: string, handler: () => void) => void } };
      rawReq.raw?.on?.("aborted", cleanup);
    } catch (err) {
      console.warn("Failed to register abort handler:", err);
    }

    await server.connect(transport);
  });

  app.post("/messages", async (req, reply) => {
    const q = req.query as Record<string, unknown>;
    const sessionId = typeof q.sessionId === "string" ? q.sessionId : undefined;

    if (!sessionId) {
      reply.code(400).send("Missing sessionId");
      return;
    }

    const transport = legacySSESessions.get(sessionId);
    if (!transport) {
      reply.code(404).send("Session not found");
      return;
    }

    touchLegacy(sessionId);
    await transport.handlePostMessage(req.raw, reply.raw, req.body as unknown);
  });

  app.post("/messages/user-info", async (req, reply) => {
    // Verify Bearer token from server (never accept requests without token)
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.MCP_AUTH_TOKEN;
    
    if (!expectedToken || !authHeader?.startsWith("Bearer ")) {
      reply.code(401).send({ error: "Missing or invalid Bearer token" });
      return;
    }
    
    const token = authHeader.slice(7); // Remove "Bearer " prefix
    if (token !== expectedToken) {
      reply.code(401).send({ error: "Invalid Bearer token" });
      return;
    }

    const { sessionId, userInfo } = req.body as { sessionId: string; userInfo: SharedUser };
    const entry = sessions.get(sessionId);
    console.log("Received user-info for sessionId:", sessionId, "from authenticated server");
    if (!entry) {
      reply.code(400).send({ error: "Invalid or expired session" });
      console.log("No session entry found for sessionId:", sessionId);
      return;
    }

    // Verify session is in pre-login state (no userInfo yet)
    if (entry.userInfo) {
      reply.code(400).send({ error: "Session already authenticated" });
      console.log("Session already has userInfo for sessionId:", sessionId, entry.userInfo);
      return;
    }

    // Transition session from pre-login to authenticated
    entry.userInfo = userInfo;
    entry.lastActivity = Date.now();
    reply.code(200).send({ ok: true, sessionId });
  });

  if (enableHealth) {
    app.get("/messages/health", async (_req, reply) => {
      reply.send({
        ok: true,
        streamableSessions: streamableSessions.size,
        legacySseSessions: legacySSESessions.size
      });
    });
  }

  app.get("/messages/ping", async (_req, reply) => {
    reply.send("pong");
  });

  app.addHook("onClose", async () => {
    clearInterval(cleanupTimer);

    await Promise.allSettled([...streamableSessions.values()].map((t) => t.close().catch(() => {})));

    for (const res of legacySSEResponses.values()) {
      try {
        res.destroy();
      } catch (err) {
        console.warn("Failed to destroy SSE response during shutdown:", err);
      }
    }

    streamableSessions.clear();
    streamableServers.clear();
    legacySSESessions.clear();
    legacyServers.clear();
    legacySSEResponses.clear();
    streamableLastSeen.clear();
    legacyLastActivity.clear();
  });
}

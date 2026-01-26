// fastify.ts
import type { FastifyInstance } from "fastify";
import type { ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { createMCPServer, sessionIds, mcpUserInfo } from "./mcp.js";

import { SharedUser } from "@tsconline/shared";

export interface MCPRoutesOptions {
  streamableTtlMs?: number;   // default 15m
  legacySseTtlMs?: number;    // default 10m
  legacyKeepAliveMs?: number; // default 15s
  enableHealth?: boolean;     // default true
}

/**
 * Registers MCP routes + in-memory session handling on an existing FastifyInstance.
 */
export function registerMCPRoutes(app: FastifyInstance, opts: MCPRoutesOptions = {}) {
  const {
    streamableTtlMs = 15 * 60 * 1000,
    legacySseTtlMs = 10 * 60 * 1000,
    legacyKeepAliveMs = 15_000,
    enableHealth = true,
  } = opts;


  // Session stores - one MCP server instance per transport/session
  const streamableSessions = new Map<string, StreamableHTTPServerTransport>();
  const streamableServers = new Map<string, ReturnType<typeof createMCPServer>>();
  const legacySSESessions = new Map<string, SSEServerTransport>();
  const legacyServers = new Map<string, ReturnType<typeof createMCPServer>>();

  // Track raw SSE responses so TTL can hard-close sockets
  const legacySSEResponses = new Map<string, ServerResponse>();

  // Activity tracking for TTL
  const streamableLastSeen = new Map<string, number>();
  const legacyLastActivity = new Map<string, number>();

  const touchStreamable = (sid: string) => streamableLastSeen.set(sid, Date.now());
  const touchLegacy = (sid: string) => legacyLastActivity.set(sid, Date.now());

  // Cleanup timer (unref so it doesn't keep process alive)
  const cleanupTimer = setInterval(() => {
    const now = Date.now();

    // Log active sessions
    console.log(`\n=== Active Sessions ===`);
    console.log(`Streamable HTTP: ${streamableSessions.size} session(s)`);
    for (const [sid] of streamableLastSeen) {
      const lastSeen = streamableLastSeen.get(sid);
      const age = lastSeen ? ((now - lastSeen) / 1000).toFixed(1) : '?';
      console.log(`  - ${sid} (idle: ${age}s)`);
    }
    console.log(`Legacy SSE: ${legacySSESessions.size} session(s)`);
    for (const [sid] of legacyLastActivity) {
      const lastActivity = legacyLastActivity.get(sid);
      const age = lastActivity ? ((now - lastActivity) / 1000).toFixed(1) : '?';
      console.log(`  - ${sid} (idle: ${age}s)`);
    }
    console.log(`=======================\n`);

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
        // Clean up associated user info when session expires (see mcp tools)
        mcpUserInfo.delete(sid);

        const res = legacySSEResponses.get(sid);
        legacySSEResponses.delete(sid);

        try {
          res?.destroy();
        } catch {}
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
        error: { code: -32000, message: "Missing Mcp-Session-Id or initialize request" },
      });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        streamableSessions.set(id, transport);
        touchStreamable(id);
        
        // Create a dedicated MCP server instance for this session
        const server = createMCPServer();
        streamableServers.set(id, server);
        void server.connect(transport);
      },
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
    // TTL governs lifecycle; keep socket open unless TTL reaps it
    reply.raw.setTimeout(0);

    const transport = new SSEServerTransport("/messages", reply.raw);
    
    // Create a dedicated MCP server instance for this SSE session
    const server = createMCPServer();
    legacyServers.set(transport.sessionId, server);
    
    legacySSESessions.set(transport.sessionId, transport);
    legacySSEResponses.set(transport.sessionId, reply.raw);
    touchLegacy(transport.sessionId);

    // Sends keep alives bc sse is outdated :D
    const keepAlive = setInterval(() => {
      try {
        // Stop pinging if socket is closed or ended
        if ((reply.raw as any).destroyed || (reply.raw as any).writableEnded) {
          clearInterval(keepAlive);
          return;
        }
        reply.raw.write(`: ping ${Date.now()}\n\n`);
      } catch {
        clearInterval(keepAlive);
      }
    }, legacyKeepAliveMs);

    const cleanup = () => {
      try { clearInterval(keepAlive); } catch {}
      try { reply.raw.destroy(); } catch {}
      legacySSESessions.delete(transport.sessionId);
      legacySSEResponses.delete(transport.sessionId);
      legacyLastActivity.delete(transport.sessionId);
      legacyServers.delete(transport.sessionId);
    };

    // Clean up on socket close/error or client abort (this can mess up when deving w wsl so keep this)
    reply.raw.on("close", cleanup);
    reply.raw.on("error", cleanup);
    try {
      (_req as any).raw?.on?.("aborted", cleanup);
    } catch {}

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
    await transport.handlePostMessage(req.raw, reply.raw, req.body as any);
  });

  app.post("/mcp/user-info", async (req, reply) => {
    const {token, userInfo} = req.body as {token: string; userInfo: SharedUser};
    const entry = sessionIds.get(token);
    
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) sessionIds.delete(token);
      reply.code(400).send({ error: "Invalid or expired token" });
      return;
    }

    mcpUserInfo.set(entry.sessionId, userInfo);
    // Token is single-use; safe to delete after successful mapping
    sessionIds.delete(token);
    reply.code(200).send({ ok: true });
  });

  if (enableHealth) {
    app.get("/health", async (_req, reply) => {
      reply.send({
        ok: true,
        streamableSessions: streamableSessions.size,
        legacySseSessions: legacySSESessions.size,
      });
    });
  }

  app.get("/ping", async (_req, reply) => {
    reply.send("pong");
  });

  // Ensure everything is cleaned up on app.close()
  app.addHook("onClose", async () => {
    clearInterval(cleanupTimer);

    await Promise.allSettled(
      [...streamableSessions.values()].map((t) => t.close().catch(() => {}))
    );

    for (const res of legacySSEResponses.values()) {
      try {
        res.destroy();
      } catch {}
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

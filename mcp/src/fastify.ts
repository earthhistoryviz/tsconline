import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import chalk from "chalk";
import { createMCPServer } from "./mcp.js";
import { shutdown } from "./shutdown.js";
export const transports: {
  streamable: Record<string, StreamableHTTPServerTransport>;
  sse: Record<string, SSEServerTransport>;
} = {
  streamable: {},
  sse: {}
};
// Export a thin alias so tests can spy/mock the initialize check if needed.
export const isInitialize = isInitializeRequest;
interface MCPServerOptions {
  mcpServer: typeof createMCPServer.prototype.return;
}
export const registerMCPServer: FastifyPluginAsync<MCPServerOptions> = async (
  fastify: FastifyInstance,
  opts: MCPServerOptions
) => {
  fastify.post("/mcp", async (request, reply) => {
    const { mcpServer } = opts;
    const sessionId = request.headers["mcp-session-id"] as string | undefined;

    const body = request.body;

    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.streamable[sessionId]) {
      transport = transports.streamable[sessionId]!;
    } else if (!sessionId && isInitializeRequest(body)) {
      // Create new session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.streamable[id] = transport;
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) delete transports.streamable[transport.sessionId];
      };

      try {
        console.log("Connecting MCP server for new session:", transport.sessionId);
        await mcpServer.connect(transport);
      } catch (err) {
        request.log.error("Failed to connect MCP server:", err);
        reply.status(500).send({ error: "Internal server error" });
        return;
      }
    } else {
      reply.status(400).send({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32000,
          message: "Bad Request: Invalid session or missing initialize"
        }
      });
      return;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    await transport.handleRequest(request.raw, reply.raw, body);
  });

  fastify.get("/mcp", async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId && transports.streamable[sessionId];

    if (!transport) {
      reply.status(400).send("Invalid or missing session ID");
      return;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    await transport.handleRequest(request.raw, reply.raw);
  });

  fastify.delete("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId && transports.streamable[sessionId];

    if (!transport) {
      reply.status(400).send("Invalid or missing session ID");
      return;
    }

    await transport.handleRequest(request.raw, reply.raw);
    await transport.close();
    console.log(chalk.yellow("Session closed:", sessionId));
  });

  // Legacy SSE endpoint for older clients
  fastify.get("/sse", async (request, reply) => {
    const { mcpServer } = opts;

    // Create SSE transport for legacy clients
    const transport = new SSEServerTransport("/messages", reply.raw);
    transports.sse[transport.sessionId] = transport;

    reply.raw.on("close", () => {
      delete transports.sse[transport.sessionId];
    });

    try {
      await mcpServer.connect(transport);
    } catch (err) {
      request.log.error("Failed to connect MCP server for SSE transport:", err);
      reply.status(500).send({ error: "Internal server error" });
      return;
    }
  });

  // Legacy message endpoint for older clients to POST messages
  fastify.post("/messages", async (request, reply) => {
    const q = request.query;
    let sessionId: string | undefined;
    if (typeof q === "object" && q !== null) {
      const s = (q as Record<string, unknown>)["sessionId"];
      if (typeof s === "string") sessionId = s;
    }
    if (!sessionId) {
      reply.status(400).send("Missing sessionId");
      return;
    }
    const transport = transports.sse[sessionId];
    if (transport) {
      await transport.handlePostMessage(request.raw, reply.raw, request.body);
    } else {
      reply.status(400).send("No transport found for sessionId");
    }
  });
  // make sure to handle server shutdown
  await shutdown(fastify, transports);
};

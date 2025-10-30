import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import chalk from "chalk";
import { createMCPServer } from "./mcp.js";
import { shutdown } from "./shutdown.js";
const transports: Record<string, StreamableHTTPServerTransport> = {};
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
    console.log("Received POST /mcp request, sessionId:", sessionId);

    const body = request.body;

    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId]!;
    } else if (!sessionId && isInitializeRequest(body)) {
      // Create new session
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports[id] = transport;
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
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
    const transport = sessionId && transports[sessionId];

    if (!transport) {
      reply.status(400).send("Invalid or missing session ID");
      return;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    await transport.handleRequest(request.raw, reply.raw);
  });

  fastify.delete("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId && transports[sessionId];

    if (!transport) {
      reply.status(400).send("Invalid or missing session ID");
      return;
    }

    await transport.handleRequest(request.raw, reply.raw);
    await transport.close();
    console.log(chalk.yellow("Session closed:", sessionId));
  });
  // make sure to handle server shutdown
  await shutdown(fastify, transports);
};

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import fastify, { FastifyReply, FastifyRequest } from "fastify";

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0"
});
const fastifyServer = fastify({ logger: true });

server.registerTool("add",
  {
    title: "Addition Tool",
    description: "Add two numbers",
    inputSchema: { a: z.number(), b: z.number() }
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

server.registerResource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  { 
    title: "Greeting Resource",      // Display name for UI
    description: "Dynamic greeting generator"
  },
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);
const transports: Record<string, StreamableHTTPServerTransport> = {};
fastifyServer.post("/mcp", async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
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
        await server.connect(transport);
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
  
    await transport.handleRequest(request.raw, reply.raw, body);
  });
  fastifyServer.get("/mcp", async (request, reply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId && transports[sessionId];
  
    if (!transport) {
      reply.status(400).send("Invalid or missing session ID");
      return;
    }
  
    reply.raw.setHeader("Content-Type", "text/event-stream");
    await transport.handleRequest(request.raw, reply.raw);
  });
  
  fastifyServer.delete("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    const transport = sessionId && transports[sessionId];
  
    if (!transport) {
      reply.status(400).send("Invalid or missing session ID");
      return;
    }
  
    await transport.handleRequest(request.raw, reply.raw);
  });
  fastifyServer.listen({ port: 3000 }, (err, address) => {
    if (err) {
      console.error("Failed to start Fastify:", err);
      process.exit(1);
    }
    console.log(`🚀 MCP Fastify server listening at ${address}`);
  });

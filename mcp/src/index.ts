// index.ts
import fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

import { registerMCPRoutes } from "./fastify.js";
import { shutdown } from "./shutdown.js";

const mcpServer = fastify({ logger: false, trustProxy: true });

// Your preferred plugin setup lives here
await mcpServer.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
  keyGenerator: (req) => (req.headers["mcp-session-id"] as string | undefined) ?? req.ip,
});

await mcpServer.register(cors, {
  origin: true,
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["content-type", "mcp-session-id"],
  exposedHeaders: ["Mcp-Session-Id"]
});

mcpServer.addHook("onRequest", async (req, reply) => {
  reply.header("X-Server-Signature", "mcp-fastify-3001");
});

// MCP routes + SSE keepalive + TTL
registerMCPRoutes(mcpServer, {
  streamableTtlMs: 15 * 60 * 1000,
  legacySseTtlMs: 10 * 60 * 1000,
  legacyKeepAliveMs: 15_000,
  enableHealth: true
});

const host = "0.0.0.0";
const port = 3001;

try {
  await mcpServer.listen({ host, port });
  mcpServer.log.info(`MCP server listening on http://localhost:${port}`);
} catch (err) {
  mcpServer.log.error(err);
  process.exit(1);
}

// Graceful shutdown
process.once("SIGINT", () => shutdown(mcpServer, "SIGINT"));
process.once("SIGTERM", () => shutdown(mcpServer, "SIGTERM"));

// nodemon restart support
process.once("SIGUSR2", async () => {
  await shutdown(mcpServer, "SIGUSR2", { exitOnComplete: false });
  process.kill(process.pid, "SIGUSR2");
});

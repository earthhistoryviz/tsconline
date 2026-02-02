// index.ts
import fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

import { registerMCPRoutes } from "./fastify.js";
import { shutdown } from "./shutdown.js";
import crypto from "node:crypto";

const mcpServer = fastify({ logger: false, trustProxy: true });

const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN; // token that the mcp server is expecting 

if (!MCP_AUTH_TOKEN) { // error handling for when server is missing the expected token it checks for 
  throw new Error("Missing MCP_AUTH_TOKEN in environment"); 
}

await mcpServer.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
  keyGenerator: (req) => (req.headers["mcp-session-id"] as string | undefined) ?? req.ip
});

await mcpServer.register(cors, {
  origin: true,
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["content-type", "mcp-session-id", "Authorization"],
  exposedHeaders: ["Mcp-Session-Id"]
});

// compares two strings in roughly constant time for security purposes 
// returns true only if both strings have the same byte length and content.
function timingSafeEqualStr(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

mcpServer.addHook("onRequest", async (req, reply) => {
  reply.header("X-Server-Signature", "mcp-fastify-3001");

  const auth = req.headers.authorization; // Expects : Bearer <token>

  let token: string | undefined;

  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) { // search for token that client has passed in after "bearer " text
    token = auth.slice("bearer ".length).trim(); // assign it to token
  }

  // for native EventSource (no headers): /sse?token=... 
  if (!token && typeof (req.query as { token?: string })?.token === "string") {
    token = (req.query as { token?: string }).token;
  }
  
  if (!token || !timingSafeEqualStr(token, MCP_AUTH_TOKEN)) { // see if token matches the one the server expects
    return reply.code(401).send({ error: "Unauthorized" }); // if no token or token doesn't match - return a 401 to client
  }
  
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

process.once("SIGINT", () => shutdown(mcpServer, "SIGINT"));
process.once("SIGTERM", () => shutdown(mcpServer, "SIGTERM"));

process.once("SIGUSR2", async () => {
  await shutdown(mcpServer, "SIGUSR2", { exitOnComplete: false });
  process.kill(process.pid, "SIGUSR2");
});

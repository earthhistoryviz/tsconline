import fastify from "fastify";
import { createMCPServer } from "./mcp.js";
import cors from "@fastify/cors";
import { registerMCPServer } from "./fastify.js";
import rateLimit from "@fastify/rate-limit";

const fastifyServer = fastify({ logger: false });
await fastifyServer.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  keyGenerator: (req) => {
    return (req.headers["mcp-session-id"] as string | undefined) ?? req.ip;
  },
  errorResponseBuilder: () => ({
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32001,
      message: "Rate limit exceeded. Please try again later."
    }
  })
});
fastifyServer.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "DELETE"],
  exposedHeaders: ["Mcp-Session-Id"],
  allowedHeaders: ["Content-Type", "mcp-session-id"]
});
fastifyServer.register(registerMCPServer, {
  mcpServer: createMCPServer()
});

try {
  fastifyServer.listen({ host: "0.0.0.0", port: 3001 }, (err, address) => {
    if (err) {
      console.error("Failed to start Fastify:", err);
      process.exit(1);
    }
    console.log(`🚀 MCP Fastify server listening at ${address}`);
  });
  const address = fastifyServer.server.address();
  if (typeof address === "string") {
    console.log(`Server is running at ${address}`);
  } else if (address && typeof address === "object") {
    console.log(`Server is running at http://${address.address}:${address.port}`);
  }
} catch (err) {
  console.error("Error starting Fastify server:", err);
  process.exit(1);
}

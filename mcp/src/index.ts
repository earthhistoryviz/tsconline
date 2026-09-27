// index.ts
import fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import crypto from "node:crypto";

import { registerMCPRoutes } from "./fastify.js";
import { shutdown } from "./shutdown.js";
import {
  createAuthorizationRequest,
  exchangeAuthorizationCode,
  getOAuthMetadata,
  getOAuthUser,
  getProtectedResourceMetadata,
  registerOAuthClient,
  revokeAccessToken
} from "./oauth.js";

const mcpServer = fastify({ logger: false, trustProxy: true });

const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN; // token that the mcp server is expecting

const publicMcpUrl = process.env.MCP_PUBLIC_URL
  ? process.env.MCP_PUBLIC_URL.replace(/\/$/, "")
  : process.env.DOMAIN
    ? `https://${process.env.DOMAIN}`
    : "http://localhost:3001";

const publicAppUrl = process.env.TSCONLINE_PUBLIC_URL
  ? process.env.TSCONLINE_PUBLIC_URL.replace(/\/$/, "")
  : process.env.DOMAIN
    ? `https://${process.env.DOMAIN}`
    : "http://localhost:5173";

if (!MCP_AUTH_TOKEN) {
  // error handling for when server is missing the expected token it checks for
  throw new Error("Missing MCP_AUTH_TOKEN in environment");
}

mcpServer.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_req, body, done) => {
  try {
    const parsed = Object.fromEntries(new URLSearchParams(body as string));
    done(null, parsed);
  } catch (err) {
    done(err as Error, undefined);
  }
});

await mcpServer.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
  keyGenerator: (req) => {
    if (req.url.startsWith("/oauth/") || req.url.startsWith("/.well-known/")) {
      return req.ip;
    }
    return (req.headers["mcp-session-id"] as string | undefined) ?? req.ip;
  }
});

await mcpServer.register(cors, {
  origin: true,
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["content-type", "mcp-session-id", "Authorization"],
  exposedHeaders: ["Mcp-Session-Id", "WWW-Authenticate"]
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

  // Allow public OAuth discovery, registration, authorize, and token exchange
  if (
    req.url.startsWith("/.well-known/") ||
    req.url.startsWith("/oauth/register") ||
    req.url.startsWith("/oauth/authorize") ||
    req.url.startsWith("/oauth/token") ||
    req.url.startsWith("/oauth/revoke")
  ) {
    return;
  }

  // First check if auth header exists
  const auth = req.headers.authorization; // Expects : Bearer <token>

  let token: string | undefined;

  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    // search for token that client has passed in after "bearer " text
    token = auth.slice("bearer ".length).trim(); // assign it to token
  }

  // for native EventSource (no headers): /sse?token=...
  if (!token && typeof (req.query as { token?: string })?.token === "string") {
    token = (req.query as { token?: string }).token;
  }

  // If system token is present and valid, allow EVERYTHING
  if (token && timingSafeEqualStr(token, MCP_AUTH_TOKEN)) {
    return;
  }

  // If valid OAuth user access token is present, bind user and allow request
  if (token) {
    const oauthUser = getOAuthUser(token);
    if (oauthUser) {
      (req as typeof req & { mcpUser?: typeof oauthUser }).mcpUser = oauthUser;
      return;
    }
  }

  // If no token - we still allow /messages if sessionId is one we created to pass
  if (req.url.startsWith("/messages")) {
    const q = req.query as unknown as { sessionId?: unknown };
    const sessionId = typeof q.sessionId === "string" ? q.sessionId : undefined;
    const sessions = (mcpServer as unknown as { legacySSESessions?: Map<string, unknown> }).legacySSESessions;

    if (typeof sessionId === "string" && sessions?.has(sessionId)) {
      return; // valid session -> skip bearer token check
    }
    return reply.code(401).send({ error: "Invalid or missing sessionId" });
  }

  // Everything else requires token - return 401 with RFC 9728 resource_metadata
  reply.header("WWW-Authenticate", `Bearer resource_metadata="${publicMcpUrl}/.well-known/oauth-protected-resource"`);
  return reply.code(401).send({ error: "Unauthorized" });
});

mcpServer.get("/.well-known/oauth-protected-resource", async (_req, reply) => {
  return reply.send(getProtectedResourceMetadata(publicMcpUrl));
});

mcpServer.get("/.well-known/oauth-authorization-server", async (_req, reply) => {
  return reply.send(getOAuthMetadata(publicMcpUrl));
});

mcpServer.post("/oauth/register", async (req, reply) => {
  try {
    const body = (req.body ?? {}) as {
      client_name?: string;
      clientName?: string;
      redirect_uris?: string[];
      redirectUris?: string[];
      redirect_uri?: string;
      redirectUri?: string;
    };
    const client = registerOAuthClient({
      clientName: body.client_name ?? body.clientName,
      redirectUris: body.redirect_uris ?? body.redirectUris,
      redirectUri: body.redirect_uri ?? body.redirectUri
    });
    return reply.code(201).send({
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: Array.from(client.redirectUris),
      token_endpoint_auth_method: "none",
      client_id_issued_at: Math.floor(client.createdAt / 1000)
    });
  } catch (error) {
    return reply.code(400).send({
      error: "invalid_client_metadata",
      error_description: error instanceof Error ? error.message : String(error)
    });
  }
});

mcpServer.get("/oauth/authorize", async (req, reply) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const requestId = createAuthorizationRequest({
      clientId: query.client_id ?? query.clientId ?? "",
      redirectUri: query.redirect_uri ?? query.redirectUri ?? "",
      responseType: query.response_type ?? query.responseType ?? "",
      state: query.state ?? "",
      codeChallenge: query.code_challenge ?? query.codeChallenge ?? "",
      codeChallengeMethod: query.code_challenge_method ?? query.codeChallengeMethod ?? ""
    });
    return reply.redirect(`${publicAppUrl}/login?mcp_session=${encodeURIComponent(requestId)}`);
  } catch (error) {
    return reply.code(400).send({
      error: "invalid_request",
      error_description: error instanceof Error ? error.message : String(error)
    });
  }
});

mcpServer.post("/oauth/token", async (req, reply) => {
  try {
    const body = (req.body ?? {}) as Record<string, string | undefined>;
    const grantType = body.grant_type ?? body.grantType;
    if (grantType !== "authorization_code") {
      return reply.code(400).send({
        error: "unsupported_grant_type",
        error_description: "Only 'authorization_code' grant type is supported"
      });
    }

    const result = exchangeAuthorizationCode({
      code: body.code ?? "",
      clientId: body.client_id ?? body.clientId ?? "",
      redirectUri: body.redirect_uri ?? body.redirectUri ?? "",
      codeVerifier: body.code_verifier ?? body.codeVerifier ?? ""
    });

    return reply.send({
      token_type: "Bearer",
      access_token: result.accessToken,
      expires_in: result.expiresIn,
      scope: ""
    });
  } catch (error) {
    return reply.code(400).send({
      error: "invalid_grant",
      error_description: error instanceof Error ? error.message : String(error)
    });
  }
});

mcpServer.post("/oauth/revoke", async (req, reply) => {
  const body = (req.body ?? {}) as Record<string, string | undefined>;
  const token = body.token;
  if (token) {
    revokeAccessToken(token);
  }
  return reply.code(200).send();
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

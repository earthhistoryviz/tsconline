import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { SharedUser } from "@tsconline/shared";

type RegisteredClient = {
  clientId: string;
  clientName: string;
  redirectUris: Set<string>;
  createdAt: number;
};

export type OAuthAuthorizationRequest = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  createdAt: number;
};

type AuthorizationCode = OAuthAuthorizationRequest & {
  code: string;
  userInfo: SharedUser;
};

type AccessToken = {
  userInfo: SharedUser;
  clientId: string;
  expiresAt: number;
};

const clients = new Map<string, RegisteredClient>();
const authorizationRequests = new Map<string, OAuthAuthorizationRequest>();
const authorizationCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, AccessToken>();

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const AUTHORIZATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REGISTERED_CLIENTS = 1000;

const randomToken = () => randomBytes(32).toString("base64url");

export function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    // Reject URIs with fragments per OAuth 2.1
    if (parsed.hash) return false;

    // Allowed scheme 1: https
    if (parsed.protocol === "https:") return true;

    // Allowed scheme 2: http strictly for loopback interface (RFC 8252)
    if (parsed.protocol === "http:") {
      const hostname = parsed.hostname.toLowerCase();
      return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    }

    // Reject dangerous schemes
    const dangerous = ["javascript:", "data:", "vbscript:", "file:", "about:", "blob:"];
    if (dangerous.includes(parsed.protocol.toLowerCase())) {
      return false;
    }

    // Allowed scheme 3: valid custom native schemes (e.g. claude://)
    return /^[a-z][a-z0-9+.-]*:$/i.test(parsed.protocol);
  } catch {
    return false;
  }
}

export function isRedirectUriAllowed(client: RegisteredClient, requestedUri: string): boolean {
  if (client.redirectUris.has(requestedUri)) return true;

  try {
    const requested = new URL(requestedUri);
    const host = requested.hostname.toLowerCase();

    // RFC 8252 Section 7.3: For loopback URIs, any port MUST be allowed
    if (requested.protocol === "http:" && (host === "localhost" || host === "127.0.0.1" || host === "[::1]")) {
      for (const registered of client.redirectUris) {
        const regUrl = new URL(registered);
        const regHost = regUrl.hostname.toLowerCase();
        if (
          regUrl.protocol === "http:" &&
          (regHost === "localhost" || regHost === "127.0.0.1" || regHost === "[::1]") &&
          regUrl.pathname === requested.pathname
        ) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }

  return false;
}

export function registerOAuthClient(input: {
  redirectUris?: string[];
  redirectUri?: string;
  clientName?: string;
  redirect_uris?: string[];
  redirect_uri?: string;
  client_name?: string;
}) {
  const rawUris =
    input.redirect_uris ??
    input.redirectUris ??
    (input.redirect_uri ? [input.redirect_uri] : input.redirectUri ? [input.redirectUri] : []);
  if (!Array.isArray(rawUris) || rawUris.length === 0) {
    throw new Error("redirect_uris is required and must not be empty");
  }

  const validUris: string[] = [];
  for (const uri of rawUris) {
    if (typeof uri !== "string" || !isValidRedirectUri(uri)) {
      throw new Error(
        `Invalid redirect_uri: "${uri}". Must use https, loopback http, or a custom app scheme, and cannot have fragments.`
      );
    }
    validUris.push(uri);
  }

  // Bound memory usage
  if (clients.size >= MAX_REGISTERED_CLIENTS) {
    const oldestKey = clients.keys().next().value;
    if (oldestKey) clients.delete(oldestKey);
  }

  const clientId = randomUUID();
  const createdAt = Date.now();
  const rawName = input.client_name ?? input.clientName;
  const clientName = typeof rawName === "string" && rawName.trim() ? rawName.trim().slice(0, 100) : "Claude Client";

  clients.set(clientId, {
    clientId,
    clientName,
    redirectUris: new Set(validUris),
    createdAt
  });

  return {
    client_id: clientId,
    clientId,
    client_name: clientName,
    clientName,
    redirect_uris: validUris,
    redirectUris: validUris,
    token_endpoint_auth_method: "none",
    client_id_issued_at: Math.floor(createdAt / 1000),
    createdAt
  };
}

export function createAuthorizationRequest(input: {
  clientId?: string;
  client_id?: string;
  redirectUri?: string;
  redirect_uri?: string;
  responseType?: string;
  response_type?: string;
  state?: string;
  codeChallenge?: string;
  code_challenge?: string;
  codeChallengeMethod?: string;
  code_challenge_method?: string;
}) {
  const clientId = input.client_id ?? input.clientId ?? "";
  const redirectUri = input.redirect_uri ?? input.redirectUri ?? "";
  const responseType = input.response_type ?? input.responseType ?? "";
  const state = input.state ?? "";
  const codeChallenge = input.code_challenge ?? input.codeChallenge ?? "";
  const codeChallengeMethod = input.code_challenge_method ?? input.codeChallengeMethod ?? "";

  if (responseType !== "code") {
    throw new Error("unsupported_response_type: response_type must be 'code'");
  }

  const client = clients.get(clientId);
  if (!client || !isRedirectUriAllowed(client, redirectUri)) {
    throw new Error("invalid_request: Invalid client_id or redirect_uri");
  }

  if (!codeChallenge || codeChallenge.trim().length === 0) {
    throw new Error("invalid_request: code_challenge is required");
  }

  if (codeChallengeMethod !== "S256") {
    throw new Error("invalid_request: Only S256 code_challenge_method is supported");
  }

  const requestId = randomToken();
  authorizationRequests.set(requestId, {
    clientId,
    clientName: client.clientName,
    redirectUri,
    state,
    codeChallenge: codeChallenge.trim(),
    codeChallengeMethod: "S256",
    createdAt: Date.now()
  });

  return requestId;
}

export function getAuthorizationRequest(requestId: string): OAuthAuthorizationRequest | undefined {
  const request = authorizationRequests.get(requestId);
  if (!request) return undefined;
  if (Date.now() - request.createdAt > AUTHORIZATION_CODE_TTL_MS) {
    authorizationRequests.delete(requestId);
    return undefined;
  }
  return request;
}

export function completeAuthorization(requestId: string, userInfo: SharedUser) {
  const request = getAuthorizationRequest(requestId);
  if (!request) throw new Error("Authorization request expired or invalid");

  authorizationRequests.delete(requestId);
  const code = randomToken();
  authorizationCodes.set(code, {
    ...request,
    code,
    userInfo,
    createdAt: Date.now()
  });

  const redirect = new URL(request.redirectUri);
  redirect.searchParams.set("code", code);
  if (request.state) {
    redirect.searchParams.set("state", request.state);
  }

  return {
    code,
    state: request.state,
    redirectUri: request.redirectUri,
    redirectUrl: redirect.toString()
  };
}

export function exchangeAuthorizationCode(input: {
  code: string;
  clientId?: string;
  client_id?: string;
  redirectUri?: string;
  redirect_uri?: string;
  codeVerifier?: string;
  code_verifier?: string;
}) {
  const clientId = input.client_id ?? input.clientId ?? "";
  const redirectUri = input.redirect_uri ?? input.redirectUri ?? "";
  const codeVerifier = input.code_verifier ?? input.codeVerifier ?? "";

  const stored = authorizationCodes.get(input.code);
  // Single-use: delete immediately upon first exchange attempt
  if (input.code) {
    authorizationCodes.delete(input.code);
  }

  if (!stored || Date.now() - stored.createdAt > AUTHORIZATION_CODE_TTL_MS) {
    throw new Error("Invalid or expired authorization code");
  }

  if (clientId && stored.clientId !== clientId) {
    throw new Error("client_id mismatch");
  }

  const client = clients.get(stored.clientId);
  const uriMatches =
    !redirectUri || stored.redirectUri === redirectUri || (client && isRedirectUriAllowed(client, redirectUri));
  if (!uriMatches) {
    throw new Error("redirect_uri mismatch");
  }

  if (!codeVerifier) {
    throw new Error("code_verifier is required");
  }

  const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const aBuf = Buffer.from(challenge);
  const bBuf = Buffer.from(stored.codeChallenge);
  if (aBuf.length !== bBuf.length || !timingSafeEqual(aBuf, bBuf)) {
    throw new Error("Invalid PKCE code_verifier");
  }

  const accessToken = randomToken();
  accessTokens.set(accessToken, {
    userInfo: stored.userInfo,
    clientId: stored.clientId,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS
  });

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
    userInfo: stored.userInfo
  };
}

export function getOAuthUser(accessToken: string | undefined): SharedUser | undefined {
  if (!accessToken) return undefined;
  const stored = accessTokens.get(accessToken);
  if (!stored) return undefined;
  if (stored.expiresAt <= Date.now()) {
    accessTokens.delete(accessToken);
    return undefined;
  }
  return stored.userInfo;
}

export function revokeAccessToken(token: string) {
  if (token) {
    accessTokens.delete(token);
  }
}

export function getProtectedResourceMetadata(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  return {
    resource: `${cleanBase}/streamable-http`,
    authorization_servers: [cleanBase],
    bearer_methods_supported: ["header"]
  };
}

export function getOAuthMetadata(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  return {
    issuer: cleanBase,
    authorization_endpoint: `${cleanBase}/oauth/authorize`,
    token_endpoint: `${cleanBase}/oauth/token`,
    registration_endpoint: `${cleanBase}/oauth/register`,
    revocation_endpoint: `${cleanBase}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    response_modes_supported: ["query"]
  };
}

// Active periodic cleanup to prevent memory leaks
export const oauthCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, req] of authorizationRequests.entries()) {
    if (now - req.createdAt > AUTHORIZATION_CODE_TTL_MS) {
      authorizationRequests.delete(id);
    }
  }
  for (const [code, entry] of authorizationCodes.entries()) {
    if (now - entry.createdAt > AUTHORIZATION_CODE_TTL_MS) {
      authorizationCodes.delete(code);
    }
  }
  for (const [token, entry] of accessTokens.entries()) {
    if (entry.expiresAt <= now) {
      accessTokens.delete(token);
    }
  }
}, 60 * 1000).unref?.();

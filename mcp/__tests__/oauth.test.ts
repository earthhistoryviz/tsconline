import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  isValidRedirectUri,
  isRedirectUriAllowed,
  registerOAuthClient,
  createAuthorizationRequest,
  getAuthorizationRequest,
  completeAuthorization,
  exchangeAuthorizationCode,
  getOAuthUser,
  revokeAccessToken,
  getOAuthMetadata,
  getProtectedResourceMetadata
} from "../src/oauth.js";
import type { SharedUser } from "@tsconline/shared";

const mockUser: SharedUser = {
  uuid: "test-user-uuid-123",
  username: "testgeologist",
  email: "geologist@example.com",
  pictureUrl: "",
  accountType: "default",
  isAdmin: false
};

describe("OAuth 2.1 Service", () => {
  describe("isValidRedirectUri", () => {
    it("accepts valid HTTPS URIs", () => {
      expect(isValidRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
      expect(isValidRedirectUri("https://example.com/oauth/callback?app=mcp")).toBe(true);
    });

    it("accepts loopback HTTP URIs per RFC 8252", () => {
      expect(isValidRedirectUri("http://localhost/callback")).toBe(true);
      expect(isValidRedirectUri("http://localhost:54321/callback")).toBe(true);
      expect(isValidRedirectUri("http://127.0.0.1/callback")).toBe(true);
      expect(isValidRedirectUri("http://127.0.0.1:9090/callback")).toBe(true);
      expect(isValidRedirectUri("http://[::1]:8000/callback")).toBe(true);
    });

    it("rejects non-loopback HTTP URIs", () => {
      expect(isValidRedirectUri("http://example.com/callback")).toBe(false);
      expect(isValidRedirectUri("http://evil.com/steal")).toBe(false);
    });

    it("rejects dangerous URI schemes (XSS prevention)", () => {
      expect(isValidRedirectUri("javascript:alert(document.cookie)")).toBe(false);
      expect(isValidRedirectUri("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isValidRedirectUri("vbscript:msgbox(1)")).toBe(false);
      expect(isValidRedirectUri("file:///etc/passwd")).toBe(false);
      expect(isValidRedirectUri("about:blank")).toBe(false);
      expect(isValidRedirectUri("blob:https://example.com/uuid")).toBe(false);
    });

    it("rejects URIs with URL fragments per OAuth 2.1", () => {
      expect(isValidRedirectUri("https://claude.ai/callback#token=123")).toBe(false);
    });

    it("accepts custom native application schemes", () => {
      expect(isValidRedirectUri("claude://oauth/callback")).toBe(true);
      expect(isValidRedirectUri("my-app.custom:/redirect")).toBe(true);
    });

    it("rejects invalid or malformed strings", () => {
      expect(isValidRedirectUri("not-a-valid-url")).toBe(false);
      expect(isValidRedirectUri("")).toBe(false);
    });
  });

  describe("isRedirectUriAllowed", () => {
    const client = {
      clientId: "client-1",
      clientName: "Claude",
      redirectUris: new Set(["https://claude.ai/api/mcp/auth_callback", "http://localhost:8080/callback"]),
      createdAt: Date.now()
    };

    it("allows exact match for registered redirect URIs", () => {
      expect(isRedirectUriAllowed(client, "https://claude.ai/api/mcp/auth_callback")).toBe(true);
    });

    it("allows any port on loopback URIs per RFC 8252", () => {
      expect(isRedirectUriAllowed(client, "http://localhost:9999/callback")).toBe(true);
      expect(isRedirectUriAllowed(client, "http://127.0.0.1:12345/callback")).toBe(true);
    });

    it("rejects loopback URI when pathname differs", () => {
      expect(isRedirectUriAllowed(client, "http://localhost:9999/other-path")).toBe(false);
    });

    it("rejects unregistered non-loopback URIs", () => {
      expect(isRedirectUriAllowed(client, "https://evil.com/callback")).toBe(false);
    });
  });

  describe("Dynamic Client Registration (RFC 7591)", () => {
    it("registers a client with valid redirect_uris and name", () => {
      const client = registerOAuthClient({
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
        client_name: "Claude Desktop"
      });

      expect(client.client_id).toBeDefined();
      expect(client.client_name).toBe("Claude Desktop");
      expect(client.redirect_uris).toEqual(["https://claude.ai/api/mcp/auth_callback"]);
      expect(client.token_endpoint_auth_method).toBe("none");
      expect(client.client_id_issued_at).toBeGreaterThan(0);
    });

    it("throws error for empty or invalid redirect_uris", () => {
      expect(() => registerOAuthClient({ redirect_uris: [] })).toThrow(/redirect_uris is required/);
      expect(() => registerOAuthClient({ redirect_uris: ["javascript:alert(1)"] })).toThrow(/Invalid redirect_uri/);
    });
  });

  describe("Full Authorization Code & PKCE Flow", () => {
    const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

    it("completes full OAuth 2.1 flow: authorize -> complete -> exchange -> use", () => {
      const client = registerOAuthClient({
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
        client_name: "Claude Test"
      });

      // 1. Authorization request
      const requestId = createAuthorizationRequest({
        client_id: client.client_id,
        redirect_uri: "https://claude.ai/api/mcp/auth_callback",
        response_type: "code",
        state: "test-state-abc",
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
      });

      const pendingReq = getAuthorizationRequest(requestId);
      expect(pendingReq).toBeDefined();
      expect(pendingReq?.state).toBe("test-state-abc");

      // 2. Complete authorization after user sign in
      const completion = completeAuthorization(requestId, mockUser);
      expect(completion.code).toBeDefined();
      expect(completion.redirectUrl).toContain("https://claude.ai/api/mcp/auth_callback");
      expect(completion.redirectUrl).toContain(`code=${encodeURIComponent(completion.code)}`);
      expect(completion.redirectUrl).toContain("state=test-state-abc");

      // Request should no longer be pending
      expect(getAuthorizationRequest(requestId)).toBeUndefined();

      // 3. Token exchange (single-use)
      const tokenResult = exchangeAuthorizationCode({
        code: completion.code,
        client_id: client.client_id,
        redirect_uri: "https://claude.ai/api/mcp/auth_callback",
        code_verifier: codeVerifier
      });

      expect(tokenResult.accessToken).toBeDefined();
      expect(tokenResult.expiresIn).toBe(3600);
      expect(tokenResult.userInfo.username).toBe(mockUser.username);

      // 4. Verification that code cannot be reused (single-use)
      expect(() =>
        exchangeAuthorizationCode({
          code: completion.code,
          client_id: client.client_id,
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          code_verifier: codeVerifier
        })
      ).toThrow(/Invalid or expired authorization code/);

      // 5. Look up user by access token
      const user = getOAuthUser(tokenResult.accessToken);
      expect(user?.uuid).toBe(mockUser.uuid);

      // 6. Revoke access token
      revokeAccessToken(tokenResult.accessToken);
      expect(getOAuthUser(tokenResult.accessToken)).toBeUndefined();
    });

    it("rejects authorization request for unsupported response_type", () => {
      const client = registerOAuthClient({
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"]
      });

      expect(() =>
        createAuthorizationRequest({
          client_id: client.client_id,
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          response_type: "token", // disallowed
          code_challenge: codeChallenge,
          code_challenge_method: "S256"
        })
      ).toThrow(/unsupported_response_type/);
    });

    it("rejects token exchange with invalid PKCE verifier", () => {
      const client = registerOAuthClient({
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"]
      });

      const requestId = createAuthorizationRequest({
        client_id: client.client_id,
        redirect_uri: "https://claude.ai/api/mcp/auth_callback",
        response_type: "code",
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
      });

      const completion = completeAuthorization(requestId, mockUser);

      expect(() =>
        exchangeAuthorizationCode({
          code: completion.code,
          client_id: client.client_id,
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          code_verifier: "wrong-verifier"
        })
      ).toThrow(/Invalid PKCE code_verifier/);
    });

    it("rejects token exchange with client_id mismatch", () => {
      const client = registerOAuthClient({
        redirect_uris: ["https://claude.ai/api/mcp/auth_callback"]
      });

      const requestId = createAuthorizationRequest({
        client_id: client.client_id,
        redirect_uri: "https://claude.ai/api/mcp/auth_callback",
        response_type: "code",
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
      });

      const completion = completeAuthorization(requestId, mockUser);

      expect(() =>
        exchangeAuthorizationCode({
          code: completion.code,
          client_id: "other-client-id",
          redirect_uri: "https://claude.ai/api/mcp/auth_callback",
          code_verifier: codeVerifier
        })
      ).toThrow(/client_id mismatch/);
    });
  });

  describe("Metadata Generation", () => {
    it("returns compliant RFC 8414 metadata", () => {
      const metadata = getOAuthMetadata("https://dev.timescalecreator.org/");
      expect(metadata.issuer).toBe("https://dev.timescalecreator.org");
      expect(metadata.authorization_endpoint).toBe("https://dev.timescalecreator.org/oauth/authorize");
      expect(metadata.token_endpoint).toBe("https://dev.timescalecreator.org/oauth/token");
      expect(metadata.registration_endpoint).toBe("https://dev.timescalecreator.org/oauth/register");
      expect(metadata.revocation_endpoint).toBe("https://dev.timescalecreator.org/oauth/revoke");
      expect(metadata.code_challenge_methods_supported).toEqual(["S256"]);
    });

    it("returns compliant RFC 9728 protected resource metadata", () => {
      const metadata = getProtectedResourceMetadata("https://dev.timescalecreator.org/");
      expect(metadata.resource).toBe("https://dev.timescalecreator.org/streamable-http");
      expect(metadata.authorization_servers).toEqual(["https://dev.timescalecreator.org"]);
      expect(metadata.bearer_methods_supported).toEqual(["header"]);
    });
  });
});

import { vi, beforeAll, afterAll, describe, beforeEach, it, expect } from "vitest";
import fastify, { FastifyInstance } from "fastify";
import fastifySecureSession from "@fastify/secure-session";
import { OAuth2Client } from "google-auth-library";
import { compare } from "bcrypt-ts";
import * as cryptoModule from "crypto";
import * as loginRoutes from "../src/login-routes";
import * as verifyModule from "../src/verify";
import * as databaseModule from "../src/database";
import * as emailModule from "../src/send-email";

vi.mock("../src/database", async (importOriginal) => {
  const actual = await importOriginal<typeof databaseModule>();
  return {
    ...actual,
    db: {
      selectFrom: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([])
    },
    createUser: vi.fn().mockResolvedValue({}),
    findUser: vi.fn().mockResolvedValue([]),
    createVerification: vi.fn().mockResolvedValue({}),
    checkForUsersWithUsernameOrEmail: vi.fn().mockResolvedValue([])
  };
});
vi.mock("../src/send-email", async (importOriginal) => {
  const actual = await importOriginal<typeof emailModule>();
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue({})
  };
});
vi.mock("google-auth-library", () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: vi.fn().mockResolvedValue({
        getPayload: vi.fn().mockReturnValue({ email: "test@email.com" })
      })
    }))
  };
});
vi.mock("bcrypt-ts", () => {
  return {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue("hashedPassword")
  };
});
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof cryptoModule>();
  return {
    ...actual,
    randomUUID: vi.fn(() => testUser.uuid)
  };
});

let app: FastifyInstance;
const testUser = {
  userId: 123,
  uuid: "123e4567-e89b-12d3-a456-426614174000",
  email: "test@example.com",
  emailVerified: 1,
  invalidateSession: 0,
  username: "testuser",
  hashedPassword: "password123",
  pictureUrl: null
};
function checkSession(cookieHeader: string) {
  const cookie = decodeURIComponent(cookieHeader).split(" ")[0];
  const session = cookie?.split("loginSession=")[1];
  expect(app.decodeSecureSession(session ?? "")?.get("uuid")).toBe(testUser.uuid);
}

beforeAll(async () => {
  app = fastify();
  app.register(fastifySecureSession, {
    cookieName: "loginSession",
    key: Buffer.from("d30a7eae1e37a08d6d5c65ac91dfbc75b54ce34dd29153439979364046cc06ae", "hex"),
    cookie: {
      path: "/",
      httpOnly: true,
      domain: "localhost",
      secure: false,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  });
  app.post("/signup", loginRoutes.signup);
  app.post("/oauth", loginRoutes.googleLogin);
  app.post("/login", loginRoutes.login);
  await app.listen({ host: "", port: 8000 });
});

afterAll(async () => {
  await app.close();
});

describe("login-routes tests", () => {
  const originalEnv = { EMAIL_USER: "testuser", EMAIL_PASS: "testpass" };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe("/signup", () => {
    const payload = {
      username: "testuser",
      password: "password123",
      email: "test@example.com",
      recaptchaToken: "valid_token"
    };
    it("should return 500 if email service is not configured", async () => {
      process.env.EMAIL_USER = "";
      process.env.EMAIL_PASS = "";

      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Email service not configured");
    });

    it("should return 400 if form is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: { ...payload, username: "" }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid form");
    });

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValue(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      spy.mockRestore();

      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 409 if username is taken", async () => {
      const spy = vi.spyOn(databaseModule, "checkForUsersWithUsernameOrEmail").mockResolvedValue([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      spy.mockRestore();

      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("User with this email or username already exists");
    });

    it("should return 200 if successful", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });
  });

  describe("/oauth", () => {
    const payload = {
      credential: "test",
      recaptchaToken: "test"
    };
    it("should return 400 if form is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: {
          credential: "",
          recaptchaToken: "test"
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid form");
    });

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValue(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      spy.mockRestore();

      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 400 if google token is invalid", async () => {
      // @ts-expect-error partial mock not working for ts but works for vitest
      vi.mocked(OAuth2Client, { partial: true }).mockImplementationOnce(() => ({
        verifyIdToken: vi.fn().mockResolvedValue({
          getPayload: vi.fn().mockReturnValue({ email: "" })
        })
      }));

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 409 is user/pass user exists", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      expect(response.statusCode).toBe(409);
    });

    it("should return 200 if successful is google users exists", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, hashedPassword: null }]);

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      checkSession(response.headers["set-cookie"] as string);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Login successful");
    });

    it("should return 200 if successful if no user exists", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      checkSession(response.headers["set-cookie"] as string);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Login successful");
    });
  });

  describe("/login", () => {
    const payload = {
      username: "testuser",
      password: "password123",
      recaptchaToken: "test"
    };
    it("should return 400 if form is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: {
          username: "",
          password: "password123",
          recaptchaToken: "test"
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid form");
    });

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValue(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      spy.mockRestore();

      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 401 if user does not exist", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Incorrect username or password");
    });

    it("should return 401 if password is incorrect", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(compare).mockResolvedValueOnce(false);

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Incorrect username or password");
    });

    it("should return 403 if email is not verified", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe("Email not verified");
    });

    it("should return 423 if session is invalidated", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, invalidateSession: 1 }]);

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      expect(response.statusCode).toBe(423);
      expect(response.json().error).toBe("Account locked");
    });

    it("should return 200 if successful", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      checkSession(response.headers["set-cookie"] as string);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Login successful");
    });
  });
});

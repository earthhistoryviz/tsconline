import { vi, beforeAll, afterAll, describe, beforeEach, it, expect } from "vitest";
import fastify, { FastifyInstance } from "fastify";
import * as loginRoutes from "../src/login-routes";
import * as verifyModule from "../src/verify";
import * as indexModule from "../src/index";
import * as databaseModule from "../src/database";
import * as emailModule from "../src/send-email";

vi.mock("../src/util", async(importOriginal) => {
  const actual = await importOriginal<typeof indexModule>();
  return {
    ...actual,
    assetconfigs: { decryptionDirectory: "decryptionDirectory", imagesDirectory: "imagesDirectory" },
  };
});
vi.mock("../src/database", async(importOriginal) => {
  const actual = await importOriginal<typeof databaseModule>();
  return {
    ...actual,
    db: {
      selectFrom: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
    },
    createUser: vi.fn().mockResolvedValue({}),
    findUser: vi.fn().mockResolvedValue([{ userId: 123, uuid: "uuid" }]),
    createVerification: vi.fn().mockResolvedValue({}),
  };
});
vi.mock("../src/send-email", async(importOriginal) => {
  const actual = await importOriginal<typeof emailModule>();
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue({})
  };
});
vi.mock("../src/login-routes", async(importOriginal) => {
  const actual = await importOriginal<typeof loginRoutes>();
  return {
    ...actual,
    checkForUsersWithUsernameOrEmail: vi.fn().mockResolvedValue([{
      userId: 123,
      uuid: "uuid",
      email: "test@example.com",
      emailVerified: 1,
      invalidateSession: 0,
      username: "testuser",
      hashedPassword: "password123",
      pictureUrl: null
    }])
  };
});

let app: FastifyInstance;

beforeAll(async () => {
  app = fastify();
  app.post("/signup", loginRoutes.signup);
  await app.listen({ host: "", port: 8000 });
});

afterAll(async () => {
  await app.close();
});

describe("Auth Controller", () => {
  const originalEnv = { EMAIL_USER: "testuser", EMAIL_PASS: "testpass" };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe("POST /signup", () => {
    it("should return 500 if email service is not configured", async () => {
      process.env.EMAIL_USER = "";
      process.env.EMAIL_PASS = "";
      
      const response = await app.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com',
          recaptchaToken: 'valid_token',
        }
      });

      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Email service not configured");
    });

    it("should return 400 if form is invalid", async () => {

      const response = await app.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          username: '',
          password: 'password123',
          email: 'invalid_email',
          recaptchaToken: 'valid_token',
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid form");
    });

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValue(0.0);

      const response = await app.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com',
          recaptchaToken: 'valid_token',
        }
      });

      spy.mockRestore();

      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 409 if username is taken", async () => {
      const spy = vi.spyOn(loginRoutes, "checkForUsersWithUsernameOrEmail").mockResolvedValue([{
        userId: 123,
        uuid: "uuid",
        email: "test@example.com",
        emailVerified: 1,
        invalidateSession: 0,
        username: "testuser",
        hashedPassword: "password123",
        pictureUrl: null
      }]);

      const response = await app.inject({
        method: 'POST',
        url: '/signup',
        payload: {
          username: 'testuser',
          password: 'password123',
          email: 'test@example.com',
          recaptchaToken: 'valid_token',
        }
      });

      spy.mockRestore();

      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("Username taken");
    });
  });
});

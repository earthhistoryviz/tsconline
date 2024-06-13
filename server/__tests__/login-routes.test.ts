import fastify, { FastifyInstance } from "fastify";
import * as loginRoutes from "../src/login-routes";
import * as verifyModule from "../src/verify";

jest.mock("./verify.js", () => {
  const originalModule = jest.requireActual("../src/verify");
  return {
    ...originalModule,
    checkRecaptchaToken: jest.fn().mockResolvedValue(1.0)
  };
});
jest.mock("bcrypt-ts", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword"),
}));
jest.mock("./send-email.js", () => ({
  sendEmail: jest.fn().mockResolvedValue({}),
}));
jest.mock("./index.js", () => {});
jest.mock("@tsconline/shared", () => {});
jest.mock("./file-metadata-handler.js", () => {});
jest.mock("better-sqlite3", () => {});
jest.mock("md5", () => ({ default: jest.fn().mockReturnValue("uuid") }));
jest.mock("./database.js", () => ({
  db: {
    selectFrom: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
  },
  createUser: jest.fn().mockResolvedValue({}),
  findUser: jest.fn().mockResolvedValue([{ userId: "123", uuid: "uuid" }]),
  createVerification: jest.fn().mockResolvedValue({}),
}));

let app: FastifyInstance;

beforeAll(async () => {
  app = fastify();
  app.post("/signup", loginRoutes.signup);
  app.listen({ host: "", port: 25565 });
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
      const spy = jest.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValue(0.0);

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
      
      console.log(response.json());
      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    // Add more tests for the /signup route as needed
  });
});

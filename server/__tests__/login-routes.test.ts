import { vi, beforeAll, afterAll, describe, beforeEach, it, expect, test, MockInstance } from "vitest";
import fastify, { FastifyInstance } from "fastify";
import fastifySecureSession from "@fastify/secure-session";
import { OAuth2Client } from "google-auth-library";
import { compare } from "bcrypt-ts";
import { Verification } from "../src/types";
import * as cryptoModule from "crypto";
import * as loginRoutes from "../src/login-routes";
import * as verifyModule from "../src/verify";
import * as databaseModule from "../src/database";
import * as emailModule from "../src/send-email";
import * as bcryptModule from "bcrypt-ts";

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
    checkForUsersWithUsernameOrEmail: vi.fn().mockResolvedValue([]),
    findVerification: vi.fn(() => Promise.resolve([testToken])),
    deleteVerification: vi.fn().mockResolvedValue({}),
    updateUser: vi.fn().mockResolvedValue({})
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
        getPayload: vi.fn(() => ({ email: testUser.email, picture: testUser.pictureUrl }))
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
vi.mock("../src/verify", async (importOriginal) => {
  const actual = await importOriginal<typeof verifyModule>();
  return {
    ...actual,
    generateToken: vi.fn().mockReturnValue("test")
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
  pictureUrl: "https://example.com/picture.jpg"
};
const mockDate = new Date("2022-01-01T00:00:00Z");
const testToken: Verification = {
  userId: 123,
  token: "test",
  expiresAt: mockDate.toISOString(),
  reason: "verify"
};

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
  app.post("/verify", loginRoutes.verifyEmail);
  app.post("/resend", loginRoutes.resendVerificationEmail);
  app.post("/send-forgot-password-email", loginRoutes.sendForgotPasswordEmail);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.setSystemTime(mockDate);
  await app.listen({ host: "", port: 8000 });
});

afterAll(async () => {
  await app.close();
});

describe("login-routes tests", () => {
  const originalEnv = { EMAIL_USER: "testuser", EMAIL_PASS: "testpass" };
  let emailSpy: MockInstance;
  let createVerificationSpy: MockInstance;
  let deleteVerificationSpy: MockInstance;
  let createUserSpy: MockInstance;
  let findUserSpy: MockInstance;
  function checkSession(cookieHeader: string): boolean {
    const cookie = decodeURIComponent(cookieHeader).split(" ")[0];
    const session = cookie?.split("loginSession=")[1];
    return app.decodeSecureSession(session ?? "")?.get("uuid") == testUser.uuid;
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    emailSpy = vi.spyOn(emailModule, "sendEmail");
    createVerificationSpy = vi.spyOn(databaseModule, "createVerification");
    deleteVerificationSpy = vi.spyOn(databaseModule, "deleteVerification");
    createUserSpy = vi.spyOn(databaseModule, "createUser");
    findUserSpy = vi.spyOn(databaseModule, "findUser");
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

    test.each([
      [{ ...payload, username: "" }],
      [{ ...payload, password: "" }],
      [{ ...payload, email: "" }],
      [{ ...payload, email: "test" }],
      [{ ...payload, email: "test@email" }],
      [{ ...payload, recaptchaToken: "" }]
    ])("should return 400 if form is invalid", async (invalidPayload) => {
      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: invalidPayload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid form");
    });

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValueOnce(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 409 if username is taken", async () => {
      const spy = vi.spyOn(databaseModule, "checkForUsersWithUsernameOrEmail").mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      expect(spy).toHaveBeenCalledWith(payload.username, payload.email);
      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("User with this email or username already exists");
    });

    it("should return 500 if user creation fails", async () => {
      vi.mocked(databaseModule.createUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if user find fails", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 if successful", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: payload
      });

      const expiresAt = new Date(mockDate);
      expiresAt.setHours(expiresAt.getHours() + 1);
      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ...testToken,
          expiresAt: expiresAt.toISOString()
        })
      );
      expect(createUserSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testUser.email,
          emailVerified: 0,
          hashedPassword: "hashedPassword",
          username: testUser.username,
          pictureUrl: null,
          uuid: testUser.uuid,
          invalidateSession: 0
        })
      );
      expect(emailSpy).toHaveBeenCalledOnce();
      expect(findUserSpy).toHaveBeenCalledWith({ email: payload.email });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });
  });

  describe("/oauth", () => {
    const payload = {
      credential: "test",
      recaptchaToken: "test"
    };
    test.each([[{ ...payload, credential: "" }], [{ ...payload, recaptchaToken: "" }]])(
      "should return 400 if form is invalid",
      async (invalidPayload) => {
        const response = await app.inject({
          method: "POST",
          url: "/oauth",
          payload: invalidPayload
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(400);
        expect(response.json().error).toBe("Invalid form");
      }
    );

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValue(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
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

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid Google Credential");
    });

    it("should return 409 if user/pass user exists", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("User already exists");
    });

    it("should return 500 if user creation fails", async () => {
      vi.mocked(databaseModule.createUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if user find fails", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 if successful for already signed up google user", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, hashedPassword: null }]);

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(true);
      expect(findUserSpy).toHaveBeenCalledWith({ email: testUser.email });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Login successful");
    });

    it("should return 200 if successful for new google user", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/oauth",
        payload: payload
      });

      expect(createUserSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: testUser.email,
          emailVerified: 1,
          hashedPassword: null,
          username: testUser.email,
          pictureUrl: testUser.pictureUrl,
          uuid: testUser.uuid,
          invalidateSession: 0
        })
      );
      expect(findUserSpy).toHaveBeenCalledWith({ email: testUser.email });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(true);
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
    test.each([[{ ...payload, username: "" }], [{ ...payload, password: "" }], [{ ...payload, recaptchaToken: "" }]])(
      "should return 400 if form is invalid",
      async (invalidPayload) => {
        const response = await app.inject({
          method: "POST",
          url: "/login",
          payload: invalidPayload
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(400);
        expect(response.json().error).toBe("Invalid form");
      }
    );

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValueOnce(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
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

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
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

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Incorrect username or password");
    });

    it("should return 403 if email is not verified", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);
      const compareSpy = vi.spyOn(bcryptModule, "compare");

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(compareSpy).toHaveBeenCalledOnce();
      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe("Email not verified");
    });

    it("should return 423 if session is invalidated", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, invalidateSession: 1 }]);
      const compareSpy = vi.spyOn(bcryptModule, "compare");

      const response = await app.inject({
        method: "POST",
        url: "/login",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(compareSpy).toHaveBeenCalledOnce();
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

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(true);
      checkSession(response.headers["set-cookie"] as string);
      expect(findUserSpy).toHaveBeenCalledWith({ username: testUser.username });
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Login successful");
    });
  });

  describe("/verify", () => {
    const payload = {
      token: "test"
    };
    it("should return 404 if token is not found", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe("Verification token not found");
    });

    it("should return 404 if user is not found", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe("User not found");
    });

    it("should return 400 if email is already verified", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(deleteVerificationSpy).not.toHaveBeenCalled();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(409);
      expect(response.json().error).toBe("Email already verified");
    });

    it("should return 401 if token is expired", async () => {
      const currentDate = new Date();
      const expiresAt = new Date(currentDate.setHours(currentDate.getHours() - 2));
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([
        { ...testToken, expiresAt: expiresAt.toISOString() }
      ]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);
      const deleteVerificationSpy = vi.spyOn(databaseModule, "deleteVerification");

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ token: payload.token, reason: "verify" });
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Verification token expired or invalid");
    });

    it("should return 500 if find user fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([testToken]);
      vi.mocked(databaseModule.findUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if find verification fails", async () => {
      vi.mocked(databaseModule.findVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if verification delete fails", async () => {
      const currentDate = new Date();
      const expiresAt = new Date(currentDate.setHours(currentDate.getHours() - 2));
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([
        { ...testToken, expiresAt: expiresAt.toISOString() }
      ]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);
      vi.mocked(databaseModule.deleteVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if user update fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([testToken]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);
      vi.mocked(databaseModule.updateUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 if successful", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([testToken]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);
      const updateUserSpy = vi.spyOn(databaseModule, "updateUser");

      const response = await app.inject({
        method: "POST",
        url: "/verify",
        payload: payload
      });

      expect(updateUserSpy).toHaveBeenCalledWith({ userId: testUser.userId }, { emailVerified: 1 });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email verified");
    });
  });

  describe("/resend", () => {
    const payload = {
      email: testUser.email,
      recaptchaToken: "test"
    };

    it("should return 500 if email service is not configured", async () => {
      process.env.EMAIL_USER = "";
      process.env.EMAIL_PASS = "";

      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Email service not configured");
    });

    test.each([
      [{ ...payload, email: "" }],
      [{ ...payload, recaptchaToken: "" }],
      [{ ...payload, email: "test" }],
      [{ ...payload, email: "test@email" }]
    ])("should return 400 if form is invalid", async (invalidPayload) => {
      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: invalidPayload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid form");
    });

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValueOnce(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: payload
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 500 if user find fails", async () => {
      vi.mocked(databaseModule.findUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if delete verification fails", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);
      vi.mocked(databaseModule.deleteVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if create verification fails", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);
      vi.mocked(databaseModule.createVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 if user is not found", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: payload
      });

      expect(emailSpy).not.toHaveBeenCalled();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });

    it("should return 200 if user is already verified", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: payload
      });

      expect(deleteVerificationSpy).not.toHaveBeenCalled();
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          link: undefined,
          buttonText: undefined,
          message: expect.stringContaining("already been verified")
        })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });

    it("should return 200 if user is not verified", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);

      const response = await app.inject({
        method: "POST",
        url: "/resend",
        payload: payload
      });

      const expiresAt = new Date(mockDate);
      expiresAt.setHours(expiresAt.getHours() + 1);
      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expiresAt.toISOString(),
          token: "test",
          userId: testUser.userId,
          reason: "verify"
        })
      );
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "verify" });
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          link: expect.stringContaining("/verify?token=test"),
          message: expect.stringContaining("verify your email")
        })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });
  });

  describe("/send-forgot-password-email", () => {
    const payload = {
      email: testUser.email,
      recaptchaToken: "test"
    };

    it("should return 500 if email service is not configured", async () => {
      process.env.EMAIL_USER = "";
      process.env.EMAIL_PASS = "";

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Email service not configured");
    });

    test.each([
      [{ ...payload, email: "" }],
      [{ ...payload, email: "test" }],
      [{ ...payload, email: "test@email" }],
      [{ ...payload, recaptchaToken: "" }]
    ])("should return 400 if form is invalid", async (invalidPayload) => {
      const response = await app.inject({
        method: "POST",
        url: "/signup",
        payload: invalidPayload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid form");
    });

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValueOnce(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 500 if user find fails", async () => {
      vi.mocked(databaseModule.findUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if verification delete fails", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(databaseModule.deleteVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if verification create fails", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(databaseModule.createVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 if user is not found", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      expect(deleteVerificationSpy).not.toHaveBeenCalled();
      expect(createVerificationSpy).not.toHaveBeenCalled();
      expect(emailSpy).not.toHaveBeenCalled();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });

    it("should return 200 if email is not verified", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, emailVerified: 0 }]);

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      expect(deleteVerificationSpy).not.toHaveBeenCalled();
      expect(createVerificationSpy).not.toHaveBeenCalled();
      expect(emailSpy).not.toHaveBeenCalled();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });

    it("should return 200 if google user", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, hashedPassword: null }]);

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          link: undefined,
          message: expect.stringContaining("Google authentication")
        })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });

    it("should return 200 if user/pass user", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/send-forgot-password-email",
        payload: payload
      });

      const expiresAt = new Date(mockDate);
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "password" });
      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expiresAt.toISOString(),
          token: "test",
          userId: testUser.userId,
          reason: "password"
        })
      );
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          link: expect.stringContaining("/forgot-password?token=test"),
          message: expect.stringContaining("You have requested to reset your password")
        })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });
  });
});

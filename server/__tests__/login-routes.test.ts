import { vi, beforeAll, afterAll, describe, beforeEach, it, expect, test, MockInstance } from "vitest";
import fastify, { FastifyInstance } from "fastify";
import fastifySecureSession from "@fastify/secure-session";
import fastifyMultipart from "@fastify/multipart";
import { OAuth2Client } from "google-auth-library";
import { compare } from "bcrypt-ts";
import { Verification } from "../src/types";
import formAutoContent from "form-auto-content";
import * as cryptoModule from "crypto";
import * as loginRoutes from "../src/login-routes";
import * as verifyModule from "../src/verify";
import * as databaseModule from "../src/database";
import * as emailModule from "../src/send-email";
import * as bcryptModule from "bcrypt-ts";
import * as utilModule from "../src/util";
import * as fsPromisesModule from "fs/promises";
import * as streamPromisesModule from "stream/promises";
import * as fsModule from "fs";
import * as metadataModule from "../src/file-metadata-handler";
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
    updateUser: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue({})
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
vi.mock("../src/util", async (importOriginal) => {
  const actual = await importOriginal<typeof utilModule>();
  return {
    ...actual,
    assetconfigs: { uploadDirectory: "uploads", fileMetadata: "file-metadata.json" }
  };
});
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromisesModule>();
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue([]),
    readdir: vi.fn().mockResolvedValue([]),
    rm: vi.fn().mockResolvedValue([])
  };
});
vi.mock("stream/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof streamPromisesModule>();
  return {
    ...actual,
    pipeline: vi.fn().mockResolvedValue({})
  };
});
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof fsModule>();
  return {
    ...actual,
    createWriteStream: vi.fn().mockReturnValue({})
  };
});
vi.mock("../src/file-metadata-handler", async (importOriginal) => {
  const actual = await importOriginal<typeof metadataModule>();
  return {
    ...actual,
    loadFileMetadata: vi.fn().mockReturnValue({
      "assets/uploads/123e4567-e89b-12d3-a456-426614174000/datapacks/AfricaBight1.map": {
        fileName: "AfricaBight1.map",
        lastUpdated: "2024-05-26T18:25:31.800Z",
        decryptedFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/decrypted/AfricaBight1",
        mapPackIndexFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/MapPackIndex.json",
        datapackIndexFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/DatapackIndex.json"
      },
      "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/datapacks/AfricaBight.map": {
        fileName: "AfricaBight.map",
        lastUpdated: "2024-05-27T14:11:46.280Z",
        decryptedFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/decrypted/AfricaBight",
        mapPackIndexFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/MapPackIndex.json",
        datapackIndexFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/DatapackIndex.json"
      }
    })
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
let cookieHeader: Record<string, string>;
let deleteSessionSpy: MockInstance;

beforeAll(async () => {
  app = fastify();
  await app.register(fastifySecureSession, {
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
  await app.register(fastifyMultipart);
  app.addHook("onRequest", async (request) => {
    deleteSessionSpy = vi.spyOn(request.session, "delete");
  });
  app.post("/signup", loginRoutes.signup);
  app.post("/oauth", loginRoutes.googleLogin);
  app.post("/login", loginRoutes.login);
  app.post("/verify", loginRoutes.verifyEmail);
  app.post("/resend", loginRoutes.resendVerificationEmail);
  app.post("/send-forgot-password-email", loginRoutes.sendForgotPasswordEmail);
  app.post("/forgot-password", loginRoutes.forgotPassword);
  app.post("/change-email", loginRoutes.changeEmail);
  app.post("/account-recovery", loginRoutes.accountRecovery);
  app.post("/session-check", loginRoutes.sessionCheck);
  app.post("/upload-profile-picture", loginRoutes.uploadProfilePicture);
  app.post("/change-username", loginRoutes.changeUsername);
  app.post("/change-password", loginRoutes.changePassword);
  app.post("/delete-profile", loginRoutes.deleteProfile);
  app.post("/logout", loginRoutes.logout);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.setSystemTime(mockDate);
  const session = app.createSecureSession({ uuid: testUser.uuid });
  const cookie = encodeURIComponent(app.encodeSecureSession(session));
  cookieHeader = { cookie: `loginSession=${cookie}` };
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
  let updateUserSpy: MockInstance;
  let findVerificationSpy: MockInstance;
  let deleteUserSpy: MockInstance;
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
    updateUserSpy = vi.spyOn(databaseModule, "updateUser");
    findVerificationSpy = vi.spyOn(databaseModule, "findVerification");
    deleteUserSpy = vi.spyOn(databaseModule, "deleteUser");
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

    it("should return 500 if find user fails", async () => {
      vi.mocked(databaseModule.findUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/login",
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

    it("should return 404 if token reason is not verify", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "password" }]);

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
        url: "/send-forgot-password-email",
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

  describe("/forgot-password", () => {
    const payload = {
      token: "test",
      password: "password123",
      recaptchaToken: "test"
    };

    test.each([[{ ...payload, token: "" }], [{ ...payload, password: "" }], [{ ...payload, recaptchaToken: "" }]])(
      "should return 400 if form is invalid",
      async (invalidPayload) => {
        const response = await app.inject({
          method: "POST",
          url: "/forgot-password",
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
        url: "/forgot-password",
        payload: payload
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 404 if token is not found", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/forgot-password",
        payload: payload
      });

      expect(findVerificationSpy).toHaveBeenCalledWith({ token: payload.token });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe("Password reset token not found");
    });

    it("should return 404 if token reason is not password", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "verify" }]);

      const response = await app.inject({
        method: "POST",
        url: "/forgot-password",
        payload: payload
      });

      expect(findVerificationSpy).toHaveBeenCalledWith({ token: payload.token });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe("Password reset token not found");
    });

    it("should return 401 if token is expired", async () => {
      const expiresAt = new Date(mockDate);
      expiresAt.setMinutes(expiresAt.getMinutes() - 16);
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([
        { ...testToken, expiresAt: expiresAt.toISOString(), reason: "password" }
      ]);

      const response = await app.inject({
        method: "POST",
        url: "/forgot-password",
        payload: payload
      });

      expect(deleteVerificationSpy).toHaveBeenCalledWith({ token: payload.token, reason: "password" });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Password reset token expired or invalid");
    });

    it("should return 500 if find verification fails", async () => {
      vi.mocked(databaseModule.findVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/forgot-password",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if delete verification fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "password" }]);
      vi.mocked(databaseModule.deleteVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/forgot-password",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if user update fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "password" }]);
      vi.mocked(databaseModule.updateUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/forgot-password",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if user find fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "password" }]);
      const response = await app.inject({
        method: "POST",
        url: "/forgot-password",
        payload: payload
      });

      expect(findUserSpy).toHaveBeenCalledWith({ userId: testUser.userId });
      expect(updateUserSpy).toHaveBeenCalledWith(
        { userId: testUser.userId },
        { hashedPassword: "hashedPassword", invalidateSession: 0 }
      );
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ token: payload.token, reason: "password" });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 if successful", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "password" }]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/forgot-password",
        payload: payload
      });

      expect(findUserSpy).toHaveBeenCalledWith({ userId: testUser.userId });
      expect(updateUserSpy).toHaveBeenCalledWith(
        { userId: testUser.userId },
        { hashedPassword: "hashedPassword", invalidateSession: 0 }
      );
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ token: payload.token, reason: "password" });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(true);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Password reset");
    });
  });

  describe("/change-email", () => {
    const payload = {
      newEmail: "newtest@email.com",
      recaptchaToken: "test"
    };

    it("should return 500 if email service is not configured", async () => {
      process.env.EMAIL_USER = "";
      process.env.EMAIL_PASS = "";

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Email service not configured");
    });

    test.each([
      [{ ...payload, newEmail: "" }],
      [{ ...payload, newEmail: "test" }],
      [{ ...payload, newEmail: "test@email" }],
      [{ ...payload, recaptchaToken: "" }]
    ])("should return 400 if form is invalid", async (invalidPayload) => {
      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: invalidPayload,
        headers: cookieHeader
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("Invalid form");
    });

    it("should return 401 if user is not logged in", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Not logged in");
    });

    it("should return 422 if recaptcha fails", async () => {
      const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValueOnce(0.0);

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload,
        headers: cookieHeader
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(422);
      expect(response.json().error).toBe("Recaptcha failed");
    });

    it("should return 500 if user doesn't exist", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload,
        headers: cookieHeader
      });

      expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if user update fails", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(databaseModule.updateUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload,
        headers: cookieHeader
      });

      expect(updateUserSpy).toHaveBeenCalledWith(
        { userId: testUser.userId },
        { email: payload.newEmail, emailVerified: 0 }
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if create verification fails", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(databaseModule.createVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload,
        headers: cookieHeader
      });

      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({ userId: testUser.userId, token: "test", reason: "verify" })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if delete verification fails", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(databaseModule.deleteVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload,
        headers: cookieHeader
      });

      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "verify" });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 if new email is the same as old email", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([
        { ...testUser, email: "newtest@email.com", hashedPassword: null }
      ]);

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload,
        headers: cookieHeader
      });

      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: payload.newEmail, title: "Email Change Alert" })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email changed");
    });

    it("should return 200 if user is google user", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, hashedPassword: null }]);

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload,
        headers: cookieHeader
      });

      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: payload.newEmail, link: expect.stringContaining("/verify?token=test") })
      );
      expect(updateUserSpy).toHaveBeenCalledWith(
        { userId: testUser.userId },
        { username: payload.newEmail, email: payload.newEmail, hashedPassword: "hashedPassword", emailVerified: 0 }
      );
      const expiresAt = new Date(mockDate);
      expiresAt.setHours(expiresAt.getHours() + 1);
      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.userId,
          token: "test",
          expiresAt: expiresAt.toISOString(),
          reason: "verify"
        })
      );
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          link: expect.stringContaining(`/account-recovery?token=test&email=${testUser.email}`)
        })
      );
      expiresAt.setHours(expiresAt.getHours() + 23);
      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.userId,
          token: "test",
          expiresAt: expiresAt.toISOString(),
          reason: "invalidate"
        })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email changed");
    });

    it("should return 200 if user is user/pass user", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/change-email",
        payload: payload,
        headers: cookieHeader
      });

      expect(updateUserSpy).toHaveBeenCalledWith(
        { userId: testUser.userId },
        { email: payload.newEmail, emailVerified: 0 }
      );
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "verify" });
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "password" });
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: payload.newEmail, link: expect.stringContaining("/verify?token=test") })
      );
      const expiresAt = new Date(mockDate);
      expiresAt.setHours(expiresAt.getHours() + 1);
      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.userId,
          token: "test",
          expiresAt: expiresAt.toISOString(),
          reason: "verify"
        })
      );
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testUser.email,
          link: expect.stringContaining(`/account-recovery?token=test&email=${testUser.email}`)
        })
      );
      expiresAt.setHours(expiresAt.getHours() + 23);
      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.userId,
          token: "test",
          expiresAt: expiresAt.toISOString(),
          reason: "invalidate"
        })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email changed");
    });
  });

  describe("/account-recovery", () => {
    const payload = {
      token: "test",
      email: testUser.email
    };
    it("should return 500 if email service is not configured", async () => {
      process.env.EMAIL_USER = "";
      process.env.EMAIL_PASS = "";

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Email service not configured");
    });

    test.each([
      [{ ...payload, token: "" }],
      [{ ...payload, email: "" }],
      [{ ...payload, email: "test" }],
      [{ ...payload, email: "test@email" }]
    ])("should return 400 if form is invalid", async (invalidPayload) => {
      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: invalidPayload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe("No token or email");
    });

    it("should return 404 if token is not found", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe("Token not found");
    });

    it("should return 404 if reason is not invalidate", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "password" }]);

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe("Token not found");
    });

    it("should return 500 if find user fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "invalidate" }]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(findUserSpy).toHaveBeenCalledWith({ userId: testUser.userId });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 401 if token is expired", async () => {
      const expiresAt = new Date(mockDate);
      expiresAt.setMinutes(expiresAt.getMinutes() - 16);
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([
        { ...testToken, expiresAt: expiresAt.toISOString(), reason: "invalidate" }
      ]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(deleteVerificationSpy).toHaveBeenCalledWith({ token: payload.token, reason: "invalidate" });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Token expired");
    });

    it("should return 500 if delete verification fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "invalidate" }]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(databaseModule.deleteVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "password" });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if user update fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "invalidate" }]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(databaseModule.updateUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(updateUserSpy).toHaveBeenCalledWith(
        { userId: testUser.userId },
        { email: testUser.email, emailVerified: 1, hashedPassword: "hashedPassword", invalidateSession: 1 }
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 500 if create verification fails", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "invalidate" }]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
      vi.mocked(databaseModule.createVerification).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.userId,
          token: "test",
          expiresAt: expect.any(String),
          reason: "password"
        })
      );
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 if successful", async () => {
      vi.mocked(databaseModule.findVerification).mockResolvedValueOnce([{ ...testToken, reason: "invalidate" }]);
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/account-recovery",
        payload: payload
      });

      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "password" });
      const expiresAt = new Date(mockDate);
      expiresAt.setHours(expiresAt.getHours() + 1);
      expect(createVerificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.userId,
          token: "test",
          expiresAt: expiresAt.toISOString(),
          reason: "password"
        })
      );
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: testUser.email, link: expect.stringContaining("/reset-password?token=test") })
      );
      expect(updateUserSpy).toHaveBeenCalledWith(
        { userId: testUser.userId },
        { email: testUser.email, emailVerified: 1, hashedPassword: "hashedPassword", invalidateSession: 1 }
      );
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "verify" });
      expect(deleteVerificationSpy).toHaveBeenCalledWith({ userId: testUser.userId, reason: "invalidate" });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Email sent");
    });
  });

  describe("/session-check", () => {
    it("should return 200 and authenticated false if not logged in", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/session-check"
      });

      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().authenticated).toBe(false);
    });

    it("should return 500 if find user fails", async () => {
      vi.mocked(databaseModule.findUser).mockRejectedValueOnce(new Error("Database Error"));

      const response = await app.inject({
        method: "POST",
        url: "/session-check",
        headers: cookieHeader
      });

      expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe("Unknown Error");
    });

    it("should return 200 and authenticated false if user doesn't exist", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

      const response = await app.inject({
        method: "POST",
        url: "/session-check",
        headers: cookieHeader
      });

      expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().authenticated).toBe(false);
    });

    it("should return 200 and authenticated false if invalid session", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, invalidateSession: 1 }]);

      const response = await app.inject({
        method: "POST",
        url: "/session-check",
        headers: cookieHeader
      });

      expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().authenticated).toBe(false);
    });

    it("should return 200 and authenticated true if valid session", async () => {
      vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

      const response = await app.inject({
        method: "POST",
        url: "/session-check",
        headers: cookieHeader
      });

      expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
      expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
      expect(response.statusCode).toBe(200);
      expect(response.json().authenticated).toBe(true);
      expect(response.json().user).toEqual({
        email: testUser.email,
        username: testUser.username,
        pictureUrl: testUser.pictureUrl,
        isGoogleUser: false,
        isAdmin: false
      });
    });

    describe("/upload-profile-picture", () => {
      type FormType = ReturnType<typeof formAutoContent>;
      let formWithCookieHeader: FormType;

      const createFormWithCookieHeader = (fileOptions: Record<string, Buffer | Record<string, string>>) => {
        const form: FormType = formAutoContent({ file: fileOptions });
        form.headers = form.headers as Record<string, string>;
        formWithCookieHeader = {
          ...form,
          headers: { ...cookieHeader, ...form.headers }
        };
      };

      beforeEach(() => {
        createFormWithCookieHeader({
          value: Buffer.from("aditya"),
          options: {
            filename: "test.png",
            contentType: "image/png"
          }
        });
      });

      it("should return 401 if not logged in", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/upload-profile-picture"
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(401);
        expect(response.json().error).toBe("Not logged in");
      });

      it("should return 500 if user does not exist", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);
        const response = await app.inject({
          method: "POST",
          url: "/upload-profile-picture",
          ...formWithCookieHeader
        });

        expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(500);
        expect(response.json().error).toBe("User not found");
      });

      it("should return 404 if no file", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

        const response = await app.inject({
          method: "POST",
          url: "/upload-profile-picture",
          headers: formWithCookieHeader.headers as Record<string, string>
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(404);
        expect(response.json().error).toBe("No file uploaded");
      });

      const testCases = [
        {
          filename: "test.txt",
          contentType: "text/plain"
        },
        {
          filename: "test",
          contentType: "image/png"
        },
        {
          filename: "test.png",
          contentType: "text/plain"
        }
      ];

      test.each(testCases)("should return 400 for invalid file", async ({ filename, contentType }) => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
        createFormWithCookieHeader({
          value: Buffer.from("aditya"),
          options: {
            filename,
            contentType
          }
        });

        const response = await app.inject({
          method: "POST",
          url: "/upload-profile-picture",
          ...formWithCookieHeader
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(400);
        expect(response.json().error).toBe("Invalid file");
      });

      it("should return 500 if file is too large", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
        createFormWithCookieHeader({
          value: Buffer.from("a".repeat(1024 * 1024 * 2)),
          options: {
            filename: "test.png",
            contentType: "image/png"
          }
        });

        const response = await app.inject({
          method: "POST",
          url: "/upload-profile-picture",
          ...formWithCookieHeader
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(500);
        expect(response.json().error).toBe("File too large");
      });

      it("should return 200 if successful", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
        // @ts-expect-error ts does not infer that readdir will be called with { withFileTypes: true } so expects Dirent
        vi.mocked(fsPromisesModule.readdir).mockResolvedValueOnce([`profile-${testUser.uuid}.png`]);
        const mkdirSpy = vi.spyOn(fsPromisesModule, "mkdir");
        const readdirSpy = vi.spyOn(fsPromisesModule, "readdir");
        const rmSpy = vi.spyOn(fsPromisesModule, "rm");
        const createWriteStreamSpy = vi.spyOn(fsModule, "createWriteStream");
        const pipelineSpy = vi.spyOn(streamPromisesModule, "pipeline");

        const response = await app.inject({
          method: "POST",
          url: "/upload-profile-picture",
          ...formWithCookieHeader
        });

        const profilePath = `uploads/${testUser.uuid}/profile`;
        const profileImagePath = `${profilePath}/profile-${testUser.uuid}.png`;
        const profileImageUrl = `http://localhost:3000/profile-images/${testUser.uuid}/profile/profile-${testUser.uuid}.png`;
        expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
        expect(mkdirSpy).toHaveBeenCalledWith(profilePath, { recursive: true });
        expect(readdirSpy).toHaveBeenCalledWith(profilePath, { withFileTypes: false });
        expect(rmSpy).toHaveBeenCalledWith(profileImagePath);
        expect(createWriteStreamSpy).toHaveBeenCalledWith(profileImagePath);
        expect(pipelineSpy).toHaveBeenCalled();
        expect(updateUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid }, { pictureUrl: profileImageUrl });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(200);
        expect(response.json().pictureUrl).toBe(profileImageUrl);
      });
    });

    describe("/change-username", () => {
      const payload = {
        newUsername: "newtest",
        recaptchaToken: "test"
      };

      it("should return 401 if not logged in", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/change-username",
          payload: payload
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(401);
        expect(response.json().error).toBe("Not logged in");
      });

      test.each([[{ ...payload, newUsername: "" }], [{ ...payload, recaptchaToken: "" }]])(
        "should return 400 if form is invalid",
        async (invalidPayload) => {
          const response = await app.inject({
            method: "POST",
            url: "/change-username",
            payload: invalidPayload,
            headers: cookieHeader
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
          url: "/change-username",
          payload: payload,
          headers: cookieHeader
        });

        expect(spy).toHaveBeenCalledOnce();
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(422);
        expect(response.json().error).toBe("Recaptcha failed");
      });

      it("should return 500 if user does not exist", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

        const response = await app.inject({
          method: "POST",
          url: "/change-username",
          payload: payload,
          headers: cookieHeader
        });

        expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(500);
        expect(response.json().error).toBe("Unknown Error");
      });

      it("should return 409 if username is taken", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]).mockResolvedValueOnce([testUser]);

        const response = await app.inject({
          method: "POST",
          url: "/change-username",
          payload: payload,
          headers: cookieHeader
        });

        expect(findUserSpy).toHaveBeenCalledWith({ username: payload.newUsername });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(409);
        expect(response.json().error).toBe("Username already taken");
      });

      it("should return 200 if successful", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]).mockResolvedValueOnce([]);

        const response = await app.inject({
          method: "POST",
          url: "/change-username",
          payload: payload,
          headers: cookieHeader
        });

        expect(findUserSpy).toHaveBeenCalledWith({ username: payload.newUsername });
        expect(updateUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid }, { username: payload.newUsername });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(deleteSessionSpy).toHaveBeenCalled();
        expect(response.statusCode).toBe(200);
        expect(response.json().message).toBe("Username changed");
      });
    });

    describe("/change-password", () => {
      const payload = {
        currentPassword: "password",
        newPassword: "newpassword",
        recaptchaToken: "test"
      };

      it("should return 401 if not logged in", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/change-password",
          payload: payload
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(401);
        expect(response.json().error).toBe("Not logged in");
      });

      test.each([
        [{ ...payload, currentPassword: "" }],
        [{ ...payload, newPassword: "" }],
        [{ ...payload, recaptchaToken: "" }]
      ])("should return 400 if form is invalid", async (invalidPayload) => {
        const response = await app.inject({
          method: "POST",
          url: "/change-password",
          payload: invalidPayload,
          headers: cookieHeader
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(400);
        expect(response.json().error).toBe("Invalid form");
      });

      it("should return 422 if recaptcha fails", async () => {
        const spy = vi.spyOn(verifyModule, "checkRecaptchaToken").mockResolvedValueOnce(0.0);

        const response = await app.inject({
          method: "POST",
          url: "/change-password",
          payload: payload,
          headers: cookieHeader
        });

        expect(spy).toHaveBeenCalledOnce();
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(422);
        expect(response.json().error).toBe("Recaptcha failed");
      });

      it("should return 500 if user does not exist", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([]);

        const response = await app.inject({
          method: "POST",
          url: "/change-password",
          payload: payload,
          headers: cookieHeader
        });

        expect(findUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(500);
        expect(response.json().error).toBe("Unknown Error");
      });

      it("should return 403 if user is google user", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([{ ...testUser, hashedPassword: null }]);

        const response = await app.inject({
          method: "POST",
          url: "/change-password",
          payload: payload,
          headers: cookieHeader
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(403);
        expect(response.json().error).toBe("Account authenticated via Google");
      });

      it("should return 409 if password is incorrect", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
        vi.mocked(bcryptModule.compare).mockResolvedValueOnce(false);

        const response = await app.inject({
          method: "POST",
          url: "/change-password",
          payload: payload,
          headers: cookieHeader
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(409);
        expect(response.json().error).toBe("Incorrect password");
      });

      it("should return 500 if password update fails", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
        vi.mocked(databaseModule.updateUser).mockRejectedValueOnce(new Error("Database Error"));

        const response = await app.inject({
          method: "POST",
          url: "/change-password",
          payload: payload,
          headers: cookieHeader
        });

        expect(updateUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid }, { hashedPassword: "hashedPassword" });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(500);
        expect(response.json().error).toBe("Unknown Error");
      });

      it("should return 200 if successful", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);

        const response = await app.inject({
          method: "POST",
          url: "/change-password",
          payload: payload,
          headers: cookieHeader
        });

        expect(updateUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid }, { hashedPassword: "hashedPassword" });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(deleteSessionSpy).toHaveBeenCalled();
        expect(response.statusCode).toBe(200);
        expect(response.json().message).toBe("Password changed");
      });
    });

    describe("/delete-profile", () => {
      it("should return 401 if not logged in", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/delete-profile"
        });

        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(401);
        expect(response.json().error).toBe("Not logged in");
      });

      it("should return 500 if delete user fails", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
        vi.mocked(databaseModule.deleteUser).mockRejectedValueOnce(new Error("Database Error"));

        const response = await app.inject({
          method: "POST",
          url: "/delete-profile",
          headers: cookieHeader
        });

        expect(deleteUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(deleteSessionSpy).toHaveBeenCalled();
        expect(response.statusCode).toBe(500);
        expect(response.json().error).toBe("Unknown Error");
      });

      it("should return 200 if rm fails", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
        vi.mocked(fsPromisesModule.rm).mockRejectedValueOnce(new Error("Filesystem Error"));
        const loadFileMetadataSpy = vi.spyOn(metadataModule, "loadFileMetadata");
        const writeFileSpy = vi.spyOn(fsPromisesModule, "writeFile");

        const response = await app.inject({
          method: "POST",
          url: "/delete-profile",
          headers: cookieHeader
        });

        expect(deleteUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
        expect(loadFileMetadataSpy).toHaveBeenCalledWith("file-metadata.json");
        expect(writeFileSpy).toHaveBeenCalledWith(
          "file-metadata.json",
          JSON.stringify({
            "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/datapacks/AfricaBight.map": {
              fileName: "AfricaBight.map",
              lastUpdated: "2024-05-27T14:11:46.280Z",
              decryptedFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/decrypted/AfricaBight",
              mapPackIndexFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/MapPackIndex.json",
              datapackIndexFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/DatapackIndex.json"
            }
          })
        );
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(deleteSessionSpy).toHaveBeenCalled();
        expect(response.statusCode).toBe(200);
        expect(response.json().message).toBe("Profile deleted");
      });

      it("should return 200 if successful", async () => {
        vi.mocked(databaseModule.findUser).mockResolvedValueOnce([testUser]);
        const rmSpy = vi.spyOn(fsPromisesModule, "rm");
        const loadFileMetadataSpy = vi.spyOn(metadataModule, "loadFileMetadata");
        const writeFileSpy = vi.spyOn(fsPromisesModule, "writeFile");

        const response = await app.inject({
          method: "POST",
          url: "/delete-profile",
          headers: cookieHeader
        });

        expect(deleteUserSpy).toHaveBeenCalledWith({ uuid: testUser.uuid });
        expect(rmSpy).toHaveBeenCalledWith(`uploads/${testUser.uuid}`, { recursive: true, force: true });
        expect(loadFileMetadataSpy).toHaveBeenCalledWith("file-metadata.json");
        expect(writeFileSpy).toHaveBeenCalledWith(
          "file-metadata.json",
          JSON.stringify({
            "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/datapacks/AfricaBight.map": {
              fileName: "AfricaBight.map",
              lastUpdated: "2024-05-27T14:11:46.280Z",
              decryptedFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/decrypted/AfricaBight",
              mapPackIndexFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/MapPackIndex.json",
              datapackIndexFilepath: "assets/uploads/0c981a54-18d9-4aad-ba14-6f644aa9eec6/DatapackIndex.json"
            }
          })
        );
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(deleteSessionSpy).toHaveBeenCalled();
        expect(response.statusCode).toBe(200);
        expect(response.json().message).toBe("Profile deleted");
      });
    });

    describe("/logout", () => {
      it("should return 200", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/logout",
          headers: cookieHeader
        });

        expect(deleteSessionSpy).toHaveBeenCalled();
        expect(checkSession(response.headers["set-cookie"] as string)).toBe(false);
        expect(response.statusCode).toBe(200);
        expect(response.json().message).toBe("Logged out");
      });
    });
  });
});

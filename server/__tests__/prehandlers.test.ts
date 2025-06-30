import { describe, it, expect, vi, beforeEach } from "vitest";
import * as verify from "../src/verify.ts";
import { FastifyReply, FastifyRequest } from "fastify";
import { genericRecaptchaMiddlewarePrehandler, verifyRecaptcha } from "../src/routes/prehandlers.ts";

vi.mock("../src/verify", () => ({
  checkRecaptchaToken: vi.fn().mockResolvedValue(0.9)
}));

vi.mock("../src/routes/login-routes", () => ({
  googleRecaptchaBotThreshold: 0.5
}));

describe("verifyRecaptcha", () => {
  const checkRecaptchaTokenMock = vi.spyOn(verify, "checkRecaptchaToken");
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn()
  } as unknown as FastifyReply;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 400 if recaptcha token is missing", async () => {
    const request = { headers: {} } as FastifyRequest;
    await verifyRecaptcha(request, reply, "testAction");
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Missing recaptcha token" });
    expect(checkRecaptchaTokenMock).not.toHaveBeenCalled();
  });
  it("should return 422 if recaptcha score is below threshold", async () => {
    const request = { headers: { "recaptcha-token": "testToken" } } as unknown as FastifyRequest;
    checkRecaptchaTokenMock.mockResolvedValue(0.4);
    await verifyRecaptcha(request, reply, "testAction");
    expect(reply.status).toHaveBeenCalledWith(422);
    expect(reply.send).toHaveBeenCalledWith({ error: "Recaptcha failed" });
  });
  it("should return 500 if recaptcha check fails", async () => {
    const request = { headers: { "recaptcha-token": "testToken" } } as unknown as FastifyRequest;
    checkRecaptchaTokenMock.mockRejectedValue(new Error("Recaptcha error"));
    await verifyRecaptcha(request, reply, "testAction");
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Recaptcha error" });
  });
  it("should complete successfully if recaptcha check passes", async () => {
    const request = { headers: { "recaptcha-token": "testToken" } } as unknown as FastifyRequest;
    checkRecaptchaTokenMock.mockResolvedValue(0.9);
    await verifyRecaptcha(request, reply, "testAction");
    expect(checkRecaptchaTokenMock).toHaveBeenCalledWith("testToken", "testAction");
    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });
});
describe("genericRecaptchaMiddlewarePrehandler", () => {
  it("should return the verifyRecaptcha function with the correct action", () => {
    const action = "testAction";
    const prehandler = genericRecaptchaMiddlewarePrehandler(action);
    expect(prehandler).toBeDefined();
    expect(prehandler.recaptchaAction).toBe(action);
    expect(typeof prehandler).toBe("function");
  });
});

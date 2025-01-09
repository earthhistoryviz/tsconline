import fastifyMultipart from "@fastify/multipart";
import fastifySecureSession from "@fastify/secure-session";
import fastify, { FastifyInstance, HTTPMethods, InjectOptions } from "fastify";
import { beforeAll, vi, afterAll, expect, describe, it, beforeEach } from "vitest";
import * as workshopAuth from "../src/workshop/workshop-auth";
import * as database from "../src/database";
import * as verify from "../src/verify";
import { User } from "../src/types";

vi.mock("../src/verify", async () => {
    return {
        checkRecaptchaToken: vi.fn().mockResolvedValue(1)
    };
});

vi.mock("../src/database", async () => {
    return {
        findUser: vi.fn(() => Promise.resolve([testAdminUser])), // just so we can verify the user is an admin for prehandlers
    };
});

let app: FastifyInstance;
beforeAll(async () => {
    app = fastify();
    await app.register(fastifySecureSession, {
        cookieName: "adminSession",
        key: Buffer.from("c30a7eae1e37a08d6d5c65ac91dfbc75b54ce34dd29153439979364046cc06ae", "hex"),
        cookie: {
            path: "/",
            httpOnly: true,
            domain: "localhostadmin",
            secure: false,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
        }
    });
    app.register(fastifyMultipart, {
        limits: {
            fieldNameSize: 100,
            fileSize: 1024 * 1024 * 60
        }
    });
    app.addHook("onRequest", async (request, _reply) => {
        request.session = {
            ...request.session,
            get: (key: string) => {
                if (key === "uuid") {
                    return request.headers["mock-uuid"];
                }
                return null;
            }
        };
    });
    await app.register(workshopAuth.workshopRoutes, { prefix: "/workshop" });
    await app.listen({ host: "localhost", port: 1250 });
    vi.spyOn(console, "error").mockImplementation(() => { });
});
afterAll(async () => {
    await app.close();
});
const headers = { "mock-uuid": "uuid", "recaptcha-token": "recaptcha-token" };
const testNonAdminUser = { userId: 1, isAdmin: 0 } as User;
const testAdminUser = { userId: 1, isAdmin: 1 } as User;
const routes: { method: HTTPMethods; url: string; body?: object }[] = [
    { method: "PATCH", url: "/workshop/workshop-1/datapack/datpack" }
];
describe("verifyAuthority", () => {
    describe.each(routes)("should return 401 for route $url with method $method", ({ method, url, body }) => {
        const findUser = vi.spyOn(database, "findUser");
        beforeEach(() => {
            findUser.mockClear();
        });
        it("should return 401 if not logged in", async () => {
            const response = await app.inject({
                method: method as InjectOptions["method"],
                url: url,
                payload: body
            });
            expect(findUser).not.toHaveBeenCalled();
            expect(await response.json()).toEqual({ error: "Unauthorized access" });
            expect(response.statusCode).toBe(401);
        });
        it("should return 401 if not found in database", async () => {
            findUser.mockResolvedValueOnce([]);
            const response = await app.inject({
                method: method as InjectOptions["method"],
                url: url,
                payload: body,
                headers
            });
            expect(findUser).toHaveBeenCalledWith({ uuid: headers["mock-uuid"] });
            expect(findUser).toHaveBeenCalledTimes(1);
            expect(await response.json()).toEqual({ error: "Unauthorized access" });
            expect(response.statusCode).toBe(401);
        });
        it("should return 401 if not admin", async () => {
            findUser.mockResolvedValueOnce([testNonAdminUser]);
            const response = await app.inject({
                method: method as InjectOptions["method"],
                url: url,
                payload: body,
                headers
            });
            expect(findUser).toHaveBeenCalledWith({ uuid: headers["mock-uuid"] });
            expect(findUser).toHaveBeenCalledTimes(1);
            expect(await response.json()).toEqual({ error: "Unauthorized access" });
            expect(response.statusCode).toBe(401);
        });
        it("should return 500 if findUser throws error", async () => {
            findUser.mockRejectedValueOnce(new Error());
            const response = await app.inject({
                method: method as InjectOptions["method"],
                url: url,
                payload: body,
                headers
            });
            expect(findUser).toHaveBeenCalledWith({ uuid: headers["mock-uuid"] });
            expect(findUser).toHaveBeenCalledTimes(1);
            expect(await response.json()).toEqual({ error: "Database error" });
            expect(response.statusCode).toBe(500);
        });
    });
});
describe("verifyRecaptcha tests", () => {
    describe.each(routes)("should return 400 or 422 for route $url with method $method", ({ method, url, body }) => {
        const checkRecaptchaToken = vi.spyOn(verify, "checkRecaptchaToken");
        beforeEach(() => {
            checkRecaptchaToken.mockClear();
        });
        it("should return 400 if missing recaptcha token", async () => {
            const response = await app.inject({
                method: method as InjectOptions["method"],
                url: url,
                payload: body,
                headers: { ...headers, "recaptcha-token": "" }
            });
            expect(checkRecaptchaToken).not.toHaveBeenCalled();
            expect(await response.json()).toEqual({ error: "Missing recaptcha token" });
            expect(response.statusCode).toBe(400);
        });
        it("should return 422 if recaptcha failed", async () => {
            checkRecaptchaToken.mockResolvedValueOnce(0);
            const response = await app.inject({
                method: method as InjectOptions["method"],
                url: url,
                payload: body,
                headers: headers
            });
            expect(checkRecaptchaToken).toHaveBeenCalledWith(headers["recaptcha-token"]);
            expect(checkRecaptchaToken).toHaveBeenCalledTimes(1);
            expect(await response.json()).toEqual({ error: "Recaptcha failed" });
            expect(response.statusCode).toBe(422);
        });
        it("should return 500 if checkRecaptchaToken throws error", async () => {
            checkRecaptchaToken.mockRejectedValueOnce(new Error());
            const response = await app.inject({
                method: method as InjectOptions["method"],
                url: url,
                payload: body,
                headers: headers
            });
            expect(checkRecaptchaToken).toHaveBeenCalledWith(headers["recaptcha-token"]);
            expect(checkRecaptchaToken).toHaveBeenCalledTimes(1);
            expect(await response.json()).toEqual({ error: "Recaptcha error" });
            expect(response.statusCode).toBe(500);
        });
    });
});


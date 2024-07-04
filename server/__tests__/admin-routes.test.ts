import fastify, { FastifyInstance, HTTPMethods, InjectOptions } from "fastify"
import * as adminAuth from "../src/admin-auth"
import * as adminRoutes from "../src/admin-routes"
import * as database from "../src/database"
import { afterAll, beforeAll, describe, test, it, vi, expect } from "vitest";
import fastifySecureSession from "@fastify/secure-session";
import fastifyAuth from "@fastify/auth";
import { before } from "lodash";

vi.mock("../src/util", async () => {
    return {
        loadAssetConfigs: vi.fn().mockResolvedValue({}),
        assetconfigs: {},
        adminconfig: {}
    }
})

vi.mock("../src/index", async () => {
    return {
        datapackIndex: vi.fn().mockResolvedValue({}),
        mapPackIndex: vi.fn().mockResolvedValue({})
    }
})

vi.mock("../src/database", async (importOriginal) => {
    const actual = await importOriginal<typeof database>();
    return {
        ...actual,
        findUser: vi.fn().mockResolvedValue({})
    }
})

vi.mock("../src/admin-routes", async (importOriginal) => {
    const actual = await importOriginal<typeof adminRoutes>();
    return {
        ...actual
    }
})

vi.mock("../src/load-packs", async () => {
    return {
        loadIndexes: vi.fn().mockResolvedValue({})
    }
})

vi.mock("../src/file-metadata-handler", async () => {
    return {
        loadFileMetadata: vi.fn().mockResolvedValue({}),
        deleteDatapack: vi.fn().mockResolvedValue({})
    }
})



let app: FastifyInstance;
let routes: { method: HTTPMethods, url: string}[] = [];
beforeAll(async () => {
    app = fastify();
    app.addHook("onRoute", (routeOptions) => {
        if (Array.isArray(routeOptions.method)) {
            for (const method of routeOptions.method) {
              routes.push({ method, url: routeOptions.url });
            }
          } else {
            routes.push({ method: routeOptions.method, url: routeOptions.url });
          }
    });
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
    await app.register(fastifyAuth)
    await app.register(adminAuth.adminRoutes, { prefix: "/admin" })
    await app.listen({ host: "localhost", port: 1239 })
})

afterAll( async () => {
    await app.close();
})

describe("verifyAdmin tests", () => {
    it("should return 401 if not signed in for each admin route", async () => {
        const promises = routes.map(async ({ method, url }) => {
            const response = await app.inject({
                method: method as InjectOptions["method"],
                url
            });
            expect(response.statusCode).toBe(401)
            expect(await response.json()).toEqual({ message: "Unauthorized access" });
        })
        await Promise.all(promises);
    })
})
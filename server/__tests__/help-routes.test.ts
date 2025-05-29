import { vi, describe, expect, it, beforeAll, afterAll } from "vitest";

import { fetchMarkdownFiles } from "../src/help/help-routes";
import fastify, { FastifyInstance } from "fastify";
import * as processMarkdownTree from "../src/help/process-markdown-tree";
import { MarkdownTree } from "@tsconline/shared";
vi.mock("../src/help/process-markdown-tree", () => ({
  processMarkdownTree: vi.fn().mockResolvedValue({
    title: "Test Title"
  })
}));

let app: FastifyInstance;
beforeAll(async () => {
  app = fastify();
  app.get("/fetch-markdown-files", fetchMarkdownFiles);
  await app.listen({ host: "", port: 1839 });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(async () => {
  await app.close();
});

describe("fetch markdown files", () => {
  const processMarkdownTreeSpy = vi.spyOn(processMarkdownTree, "processMarkdownTree");
  it("should return 500 if error occurs", async () => {
    processMarkdownTreeSpy.mockRejectedValue(new Error("Test error"));
    const response = await app.inject({
      method: "GET",
      url: "/fetch-markdown-files"
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Failed to fetch markdown files" });
  });
  it("should return 200 and the markdown tree", async () => {
    processMarkdownTreeSpy.mockResolvedValue({
      title: "Test Title",
      content: "Test Content"
    } as unknown as MarkdownTree);
    const response = await app.inject({
      method: "GET",
      url: "/fetch-markdown-files"
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      title: "Test Title",
      content: "Test Content"
    });
  });
});

import { vi, describe, expect, it, beforeEach } from "vitest";

import { processMarkdownTree } from "../src/help/process-markdown-tree";
import * as util from "../src/util";
import * as fs from "fs/promises";
import { Dirent } from "fs";
vi.mock("gray-matter", async () => {
  return {
    default: vi.fn().mockImplementation((content) => {
      return {
        data: {
          pathname: "test-pathname",
          title: "Test Title",
          description: "Test Description",
          tags: ["tag1", "tag2"]
        },
        content
      };
    })
  };
});
vi.mock("../src/util", async () => {
  return {
    assetconfigs: {
      helpDirectory: "test-directory"
    },
    loadAssetConfigs: vi.fn().mockResolvedValue({}),
    verifyFilepath: vi.fn().mockResolvedValue(true),
    convertTitleToUrlPath: vi.fn().mockImplementation((title) => title.toLowerCase().replace(/\s+/g, "-"))
  };
});
vi.mock("@tsconline/shared", async () => {
  return {
    assertMarkdownFileMetadata: vi.fn()
  };
});
vi.mock("fs/promises", async () => {
  return {
    readFile: vi.fn().mockResolvedValue("Test content"),
    readdir: vi.fn().mockResolvedValue([
      { name: "file1.md", isFile: () => true, isDirectory: () => false },
      { name: "file2.md", isFile: () => true, isDirectory: () => false },
      { name: "dir1", isFile: () => false, isDirectory: () => true }
    ])
  };
});

describe("processMarkdownTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const verifyFilepathSpy = vi.spyOn(util, "verifyFilepath");
  const readdirSpy = vi.spyOn(fs, "readdir");
  it("should throw error if markdown directory is not a valid path", async () => {
    verifyFilepathSpy.mockResolvedValueOnce(false);
    await expect(processMarkdownTree()).rejects.toThrow("Markdown directory is not a valid path");
  });
  it("should process markdown files and return a tree", async () => {
    readdirSpy
      .mockResolvedValueOnce([
        { name: "file1.md", isFile: () => true, isDirectory: () => false },
        { name: "file2.md", isFile: () => true, isDirectory: () => false },
        { name: "dir1", isFile: () => false, isDirectory: () => true }
      ] as unknown as Dirent[])
      .mockResolvedValueOnce([
        { name: "file1.md", isFile: () => true, isDirectory: () => false }
      ] as unknown as Dirent[]);
    const tree = await processMarkdownTree();
    expect(tree).toEqual({
      title: "All Categories",
      pathname: "all-categories",
      children: {
        file1: {
          pathname: "file1",
          markdown: "Test content",
          title: "file1"
        },
        file2: {
          pathname: "file2",
          title: "file2",
          markdown: "Test content"
        },
        dir1: {
          title: "dir1",
          pathname: "dir1",
          children: {
            file1: {
              pathname: "file1",
              title: "file1",
              markdown: "Test content"
            }
          }
        }
      }
    });
  });
});

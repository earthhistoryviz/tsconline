import { readFile, readdir } from "fs/promises";
import { assetconfigs, convertTitleToUrlPath, loadAssetConfigs, verifyFilepath } from "../util.js";
import { MarkdownParent } from "@tsconline/shared";
export const processMarkdownTree = async () => {
  await loadAssetConfigs();
  const markdownDirectory = assetconfigs.helpDirectory;
  if (!(await verifyFilepath(markdownDirectory))) {
    throw new Error("Markdown directory is not a valid path");
  }
  const tree: MarkdownParent = {
    children: {},
    title: "All Categories",
    pathname: "all-categories"
  };
  const addToTree = async (path: string, tree: MarkdownParent) => {
    const files = await readdir(path, { withFileTypes: true });
    for (const file of files) {
      const filePath = `${path}/${file.name}`;
      if (file.isDirectory() && file.name !== ".git") {
        const pathname = convertTitleToUrlPath(file.name);
        const fileName = file.name.replace(/\.md$/, "");
        const child: MarkdownParent = {
          children: {},
          title: fileName,
          pathname
        };
        tree.children[pathname] = child;
        await addToTree(filePath, child);
      } else if (file.isFile() && file.name.endsWith(".md")) {
        const content = await readFile(filePath, "utf-8");
        if (file.name === "index.md") {
          tree.markdown = content;
        } else {
          const fileName = file.name.replace(/\.md$/, "");
          const pathname = convertTitleToUrlPath(fileName);
          tree.children[pathname] = {
            title: fileName,
            pathname,
            markdown: content
          };
        }
      }
    }
  };
  await addToTree(markdownDirectory, tree);
  return tree;
};

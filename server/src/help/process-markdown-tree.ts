import { readFile, readdir } from "fs/promises";
import { assetconfigs, convertTitleToUrlPath, loadAssetConfigs, verifyFilepath } from "../util.js";
import { MarkdownTree} from "@tsconline/shared";
export const processMarkdownTree = async () => {
  await loadAssetConfigs();
  const markdownDirectory = assetconfigs.helpDirectory;
  if (!(await verifyFilepath(markdownDirectory))) {
    throw new Error("Markdown directory is not a valid path");
  }
  const tree: MarkdownTree = {};
  const addToTree = async (path: string, tree: MarkdownTree) => {
    const files = await readdir(path, { withFileTypes: true });
    for (const file of files) {
      const filePath = `${path}/${file.name}`;
      if (file.isDirectory() && file.name !== ".git") {
        const child: MarkdownTree = {};
        tree[file.name] = child;
        await addToTree(filePath, child);
      } else if (file.isFile() && file.name.endsWith(".md")) {
        const content = await readFile(filePath, "utf-8");
        const fileName = file.name.replace(/\.md$/, "");
        const pathname = convertTitleToUrlPath(fileName);
        tree[pathname] = {
          title: fileName,
          pathname,
          markdown: content
        };
      }
    }
  };
  await addToTree(markdownDirectory, tree);
  return tree;
};

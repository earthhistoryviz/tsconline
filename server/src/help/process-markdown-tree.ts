import { readFile, readdir } from "fs/promises";
import { assetconfigs, loadAssetConfigs, verifyFilepath } from "../util.js"
import matter from "gray-matter";
import { MarkdownTree, assertMarkdownFileMetadata } from "@tsconline/shared";
export const processMarkdownTree = async () => {
    await loadAssetConfigs();
    const markdownDirectory = assetconfigs.helpDirectory;
    if (!await verifyFilepath(markdownDirectory)) {
        throw new Error("Markdown directory is not a valid path");
    }
    const tree: MarkdownTree = {};
    const addToTree = async (path: string, tree: MarkdownTree) => {
        const files = await readdir(path, { withFileTypes: true });
        for (const file of files) {
            const filePath = `${path}/${file.name}`;
            if (file.isDirectory()) {
                const child: MarkdownTree = {};
                tree[file.name] = child;
                await addToTree(filePath, child);
            } else if (file.isFile() && file.name.endsWith(".md")) {
                const content = await readFile(filePath, "utf-8");
                const parsed = matter(content);
                const { data, content: body} = parsed;
                assertMarkdownFileMetadata(data);
                tree[data.pathname] = {
                    ...data,
                    markdown: body
                };
            } else {
                throw new Error(`File ${filePath} is not a markdown file or directory`);
            }
        }
    }
    await addToTree(markdownDirectory, tree);
    return tree;
}
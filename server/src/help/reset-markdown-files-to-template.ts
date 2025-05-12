import { mkdir, rm } from "fs/promises";
import { assetconfigs, copyDirectory, loadAssetConfigs } from "../util.js";
try {
    await loadAssetConfigs();
    // copy template markdown files to the markdown directory
    const templateMarkdownDirectory = assetconfigs.templateMarkdownDirectory;
    const markdownDirectory = assetconfigs.helpDirectory;
    await rm(markdownDirectory, { recursive: true, force: true });
    await mkdir(markdownDirectory, { recursive: true });
    await copyDirectory(templateMarkdownDirectory, markdownDirectory);
} catch (e) {
    console.error("Failed to reset markdown files to template. Error: ", e);
}
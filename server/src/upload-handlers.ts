import { assertDatapack, assertPrivateUserDatapack, isDateValid } from "@tsconline/shared";
import { FastifyReply } from "fastify";
import { readFile, rm } from "fs/promises";
import { DatapackMetadata } from "@tsconline/shared";
import { checkFileExists, getBytes } from "./util.js";

async function userUploadHandler(reply: FastifyReply, code: number, message: string, filepath?: string) {
  filepath && (await rm(filepath, { force: true }));
  reply.status(code).send({ error: message });
}
export async function getFileNameFromCachedDatapack(cachedFilepath: string) {
  if (!(await checkFileExists(cachedFilepath))) {
    throw new Error("File does not exist");
  }
  const datapack = JSON.parse(await readFile(cachedFilepath, "utf-8"));
  if (!datapack) {
    throw new Error("File is empty");
  }
  assertPrivateUserDatapack(datapack);
  assertDatapack(datapack);
  return datapack.storedFileName;
}

export async function uploadUserDatapackHandler(
  reply: FastifyReply,
  fields: Record<string, string>,
  bytes: number
): Promise<DatapackMetadata | void> {
  const { title, description, authoredBy, contact, notes, date, filepath, originalFileName, storedFileName } = fields;
  let { references, tags } = fields;
  if (
    !tags ||
    !references ||
    !authoredBy ||
    !title ||
    !description ||
    !filepath ||
    !originalFileName ||
    !storedFileName
  ) {
    await userUploadHandler(
      reply,
      400,
      "Missing required fields [title, description, authoredBy, references, tags, filepath, originalFileName, storedFileName]",
      filepath
    );
    return;
  }
  if (title === "__proto__" || title === "constructor" || title === "prototype") {
    await userUploadHandler(reply, 400, "Invalid title", filepath);
    return;
  }
  if (!bytes) {
    await userUploadHandler(reply, 400, "File is empty", filepath);
    return;
  }
  try {
    references = JSON.parse(references);
    tags = JSON.parse(tags);
  } catch {
    await userUploadHandler(reply, 400, "References and tags must be valid arrays", filepath);
    return;
  }
  if (!Array.isArray(references) || !references.every((ref) => typeof ref === "string")) {
    await userUploadHandler(reply, 400, "References must be an array of strings", filepath);
    return;
  }
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    await userUploadHandler(reply, 400, "Tags must be an array of strings", filepath);
    return;
  }
  if (date && !isDateValid(date)) {
    await userUploadHandler(reply, 400, "Date must be a valid date string", filepath);
    return;
  }
  return {
    originalFileName,
    storedFileName,
    description,
    title,
    authoredBy,
    references,
    tags,
    size: getBytes(bytes),
    ...(contact && { contact }),
    ...(notes && { notes }),
    ...(date && { date })
  };
}

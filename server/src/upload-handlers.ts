import { isDateValid } from "@tsconline/shared";
import { FastifyReply } from "fastify";
import { rm } from "fs/promises";
import { DatapackMetadata } from "./types.js";
import { getBytes } from "./util.js";

async function userUploadHandler(reply: FastifyReply, code: number, message: string, filepath?: string) {
  filepath && (await rm(filepath, { force: true }));
  reply.status(code).send({ error: message });
}

export async function uploadUserDatapackHandler(
  reply: FastifyReply,
  fields: Record<string, string>,
  bytes: number
): Promise<DatapackMetadata | void> {
  const { title, description, authoredBy, contact, notes, date, filepath, filename } = fields;
  let { references, tags } = fields;
  if (!tags || !references || !authoredBy || !title || !description || !filepath || !filename) {
    await userUploadHandler(
      reply,
      400,
      "Missing required fields [title, description, authoredBy, references, tags, filepath, filename]",
      filepath
    );
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
    file: filename,
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

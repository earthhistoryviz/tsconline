import { describe, it, expect, beforeEach, vi, test } from "vitest";
import { uploadUserDatapackHandler } from "../src/upload-handlers";
import { FastifyReply } from "fastify";
import * as fsPromises from "fs/promises";
import * as shared from "@tsconline/shared";
vi.mock("@tsconline/shared", () => ({
  isDateValid: vi.fn().mockReturnValue(true),
  isDatapackTypeString: vi.fn().mockReturnValue(true),
  MAX_DATAPACK_TAG_LENGTH: 20,
  MAX_DATAPACK_TITLE_LENGTH: 100,
  MAX_AUTHORED_BY_LENGTH: 200,
  MAX_DATAPACK_TAGS_ALLOWED: 30
}));
vi.mock("fs/promises", () => ({
  rm: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../src/util", () => ({
  getBytes: vi.fn().mockReturnValue("1 B")
}));
describe("uploadUserDatapackHandler", () => {
  let reply: FastifyReply;
  const rm = vi.spyOn(fsPromises, "rm");
  const isDateValid = vi.spyOn(shared, "isDateValid");
  const fields = {
    title: "title",
    description: "description",
    authoredBy: "authoredBy",
    references: JSON.stringify(["reference"]),
    tags: JSON.stringify(["tag"]),
    filepath: "filepath",
    originalFileName: "originalFileName",
    storedFileName: "storedFileName",
    date: "12-12-2000",
    uuid: "user",
    isPublic: "true",
    type: "type"
  };
  beforeEach(async () => {
    reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    } as Partial<FastifyReply> as FastifyReply;
    vi.clearAllMocks();
  });
  it("should return a 400 error if bytes are 0", async () => {
    const bytes = 0;
    const val = await uploadUserDatapackHandler(reply, fields, bytes);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "File is empty" });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  test.each([
    { tags: "" },
    { references: "" },
    { authoredBy: "" },
    { title: "" },
    { description: "" },
    { originalFileName: "" },
    { storedFileName: "" },
    { isPublic: "" },
    { type: "" },
    { type: "user", uuid: "" }
  ])(`should return a 400 error if %p is missing`, async (field) => {
    const val = await uploadUserDatapackHandler(reply, { ...fields, ...field }, 1);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error:
        "Missing required fields [title, description, authoredBy, references, tags, filepath, originalFileName, storedFileName, isPublic]"
    });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return a 400 error if title is a reserved word", async () => {
    const val = await uploadUserDatapackHandler(reply, { ...fields, title: "__proto__" }, 1);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Invalid title" });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return a 400 error but not call rm if filepath is missing", async () => {
    const val = await uploadUserDatapackHandler(reply, { ...fields, filepath: "" }, 1);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error:
        "Missing required fields [title, description, authoredBy, references, tags, filepath, originalFileName, storedFileName, isPublic]"
    });
    expect(rm).not.toHaveBeenCalled();
    expect(val).toBeUndefined();
  });
  it("should return 400 if bytes is 0", async () => {
    const val = await uploadUserDatapackHandler(reply, fields, 0);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "File is empty" });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return 400 if incorrect datapack type", async () => {
    const isDatapackTypeString = vi.spyOn(shared, "isDatapackTypeString");
    isDatapackTypeString.mockReturnValueOnce(false);
    const val = await uploadUserDatapackHandler(reply, fields, 1);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Invalid datapack type" });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  test.each([{ references: "[hi]" }, { tags: "[hi" }, { references: "{3" }, { tags: '[3"]' }])(
    `should return a 400 error if %p is not a valid JSON string`,
    async (field) => {
      const val = await uploadUserDatapackHandler(reply, { ...fields, ...field }, 1);
      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: "References and tags must be valid arrays" });
      expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
      expect(val).toBeUndefined();
    }
  );
  it("should return a 400 error if references is not a valid array", async () => {
    const val = await uploadUserDatapackHandler(reply, { ...fields, references: '{"ref": "hi"}' }, 1);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "References must be an array of strings" });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return a 400 error if tags is not a valid array", async () => {
    const val = await uploadUserDatapackHandler(reply, { ...fields, tags: '{"tag": "hi"}' }, 1);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Tags must be an array of strings" });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return a 400 error if date is not a valid date string", async () => {
    isDateValid.mockReturnValueOnce(false);
    const val = await uploadUserDatapackHandler(reply, fields, 1);
    expect(isDateValid).toHaveBeenCalledWith(fields.date);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Date must be a valid date string" });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return a DatapackMetadata object on success", async () => {
    const val = await uploadUserDatapackHandler(reply, { ...fields, notes: "notes", contact: "contact" }, 1);
    expect(reply.send).not.toHaveBeenCalled();
    expect(reply.status).not.toHaveBeenCalled();
    expect(val).toEqual({
      originalFileName: fields.originalFileName,
      storedFileName: fields.storedFileName,
      description: fields.description,
      title: fields.title,
      authoredBy: fields.authoredBy,
      references: JSON.parse(fields.references),
      tags: JSON.parse(fields.tags),
      size: "1 B",
      date: fields.date,
      contact: "contact",
      notes: "notes",
      type: fields.type,
      uuid: fields.uuid,
      isPublic: Boolean(fields.isPublic)
    });
  });
  it("should return a 400 error if title is too long", async () => {
    const val = await uploadUserDatapackHandler(
      reply,
      {
        ...fields,
        title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque rutrum ex nisi, at consequat ligula."
      },
      1
    );
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Invalid title" });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return a 400 error if tags is too long", async () => {
    const val = await uploadUserDatapackHandler(
      reply,
      {
        ...fields,
        tags: '["tag", "hi", "test3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15", "tag16", "tag17", "tag18", "tag19", "tag20", "tag21", "tag22", "tag23", "tag24", "tag25", "tag26", "tag27", "tag28", "tag29", "tag30", "tag31"]'
      },
      1
    );
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: `Max tags allowed is ${shared.MAX_DATAPACK_TAGS_ALLOWED}` });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return a 400 error if a tag is too long", async () => {
    const val = await uploadUserDatapackHandler(reply, { ...fields, tags: '["tag", "Lorem ipsum dolor at. "]' }, 1);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: `Max tag length is ${shared.MAX_DATAPACK_TAG_LENGTH}` });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
  it("should return a 400 error if a authored by length is too long", async () => {
    const val = await uploadUserDatapackHandler(
      reply,
      {
        ...fields,
        authoredBy:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam a turpis rutrum, pretium nisi vitae, consectetur diam. Integer tristique pretium nunc sit amet finibus. Suspendisse interdum, orci ut in."
      },
      1
    );
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: `Max authored by length is ${shared.MAX_AUTHORED_BY_LENGTH}` });
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    expect(val).toBeUndefined();
  });
});

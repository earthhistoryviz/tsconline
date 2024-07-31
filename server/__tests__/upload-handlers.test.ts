import { describe, it, expect, beforeEach, vi, test } from "vitest";
import { uploadUserDatapackHandler } from "../src/upload-handlers";
import { FastifyReply } from "fastify";
import * as fsPromises from "fs/promises";
import * as shared from "@tsconline/shared";
vi.mock("@tsconline/shared", () => ({
    isDateValid: vi.fn().mockReturnValue(true),
}));
vi.mock("fs/promises", () => ({
    rm: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/util", () => ({
    getBytes: vi.fn().mockReturnValue("1 B"),
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
        filename: "filename",
        date: "12-12-2000"
    };
    beforeEach(async () => {
        reply = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
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
        { filename: "" },
    ])(`should return a 400 error if %p is missing`, async (field) => {
        const val = await uploadUserDatapackHandler(reply, { ...fields, ...field }, 1);
        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith({
            error: "Missing required fields [title, description, authoredBy, references, tags, filepath, filename]",
        });
        expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
        expect(val).toBeUndefined();
    });
    it("should return a 400 error but not call rm if filepath is missing", async () => {
        const val = await uploadUserDatapackHandler(reply, { ...fields, filepath: "" }, 1);
        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith({
            error: "Missing required fields [title, description, authoredBy, references, tags, filepath, filename]",
        });
        expect(rm).not.toHaveBeenCalled();
        expect(val).toBeUndefined();
    });
    test.each([
        { references: "[hi]" },
        { tags: "[hi" },
        { references: "{3" },
        { tags: "[3\"]" },
    ])(`should return a 400 error if %p is not a valid JSON string`, async (field) => {
        const val = await uploadUserDatapackHandler(reply, { ...fields, ...field }, 1);
        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith({ error: "References and tags must be valid arrays" });
        expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
        expect(val).toBeUndefined();
    });
    it("should return a 400 error if references is not a valid array", async () => {
        const val = await uploadUserDatapackHandler(reply, { ...fields, references: "{\"ref\": \"hi\"}" }, 1);
        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith({ error: "References must be an array of strings" });
        expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
        expect(val).toBeUndefined();
    });
    it("should return a 400 error if tags is not a valid array", async () => {
        const val = await uploadUserDatapackHandler(reply, { ...fields, tags: "{\"tag\": \"hi\"}" }, 1);
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
        const val = await uploadUserDatapackHandler(reply, fields, 1);
        expect(reply.send).not.toHaveBeenCalled();
        expect(reply.status).not.toHaveBeenCalled();
        expect(val).toEqual({
            file: fields.filename,
            description: fields.description,
            title: fields.title,
            authoredBy: fields.authoredBy,
            references: JSON.parse(fields.references),
            tags: JSON.parse(fields.tags),
            size: "1 B",
            date: fields.date,
        });
    });
})
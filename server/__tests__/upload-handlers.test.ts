import { describe, it, expect, beforeEach, vi, test } from "vitest";
import {
  changeProfilePicture,
  fetchMapPackImageFilepath,
  getFileNameFromCachedDatapack,
  getTemporaryFilepath,
  processMultipartPartsForDatapackUpload,
  replaceDatapackFile,
  setupNewDatapackDirectoryInUUIDDirectory,
  uploadFileToFileSystem,
  uploadUserDatapackHandler,
  uploadFilesToWorkshop,
  uploadCoverPicToWorkshop,
  getWorkshopDatapacksNames,
  getWorkshopFilesNames,
  fetchWorkshopCoverPictureFilepath
} from "../src/upload-handlers";
import * as fsPromises from "fs/promises";
import * as shared from "@tsconline/shared";
import * as streamPromises from "stream/promises";
import * as fetchUserFiles from "../src/user/fetch-user-files";
import * as util from "../src/util";
import * as userHandlers from "../src/user/user-handler";
import * as uploadHandlers from "../src/upload-handlers";
import * as loadPacks from "../src/load-packs";
import { Multipart, MultipartFile } from "@fastify/multipart";
import * as fileMetadataHandler from "../src/file-metadata-handler";
import * as database from "../src/database";
import { User, assertOperationResult, isOperationResult } from "../src/types";
import * as workshopUtil from "../src/workshop/workshop-util";
import { Dirent } from "fs";

import path from "path";
import { DATAPACK_PROFILE_PICTURE_FILENAME } from "../src/constants";

vi.mock("os", () => ({
  tmpdir: () => "tmpdir"
}));
vi.mock("../src/database", () => ({
  findUser: vi.fn().mockResolvedValue([{ isAdmin: 1 }])
}));
vi.mock("../src/user/fetch-user-files", () => ({
  fetchUserDatapackDirectory: vi.fn().mockResolvedValue("directory"),
  getUserUUIDDirectory: vi.fn().mockResolvedValue("uuid-directory"),
  getUsersDatapacksDirectoryFromUUIDDirectory: vi.fn().mockReturnValue("datapacks-directory"),
  getUnsafeCachedDatapackFilePath: vi.fn().mockReturnValue("cached-datapack-filepath"),
  getPDFFilesDirectoryFromDatapackDirectory: vi.fn().mockReturnValue("files-directory"),
  getDecryptedDirectory: vi.fn().mockReturnValue("decrypted-directory"),
  getDirectories: vi.fn().mockResolvedValue(["directory1", "directory2"])
}));
vi.mock("stream/promises", () => ({
  pipeline: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../src/constants", () => ({
  DATAPACK_PROFILE_PICTURE_FILENAME: "datapack-image",
  CACHED_USER_DATAPACK_FILENAME: "Datapack.json",
  DECRYPTED_DIRECTORY_NAME: "decrypted",
  MAPPACK_DIRECTORY_NAME: "MapImages",
  WORKSHOP_COVER_PICTURE: "coverPicture"
}));
vi.mock("@tsconline/shared", () => ({
  isDateValid: vi.fn().mockReturnValue(true),
  isDatapackTypeString: vi.fn().mockReturnValue(true),
  isUserDatapack: vi.fn().mockReturnValue(true),
  assertDatapack: vi.fn().mockReturnValue(undefined),
  assertDatapackMetadata: vi.fn().mockReturnValue(true),
  assertUserDatapack: vi.fn().mockReturnValue(undefined),
  MAX_DATAPACK_TAG_LENGTH: 20,
  MAX_DATAPACK_TITLE_LENGTH: 100,
  MAX_AUTHORED_BY_LENGTH: 200,
  MAX_DATAPACK_TAGS_ALLOWED: 30,
  MAX_DATAPACK_CONTACT_LENGTH: 100,
  MAX_DATAPACK_DESC_LENGTH: 400,
  MAX_DATAPACK_NOTES_LENGTH: 200,
  MAX_DATAPACK_REFERENCES_ALLOWED: 30,
  MAX_DATAPACK_REFERENCE_LENGTH: 100
}));
vi.mock("../src/file-metadata-handler", () => ({
  writeFileMetadata: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../src/load-packs", () => ({
  loadDatapackIntoIndex: vi.fn().mockResolvedValue(true)
}));
vi.mock("../src/user/user-handler", () => ({
  checkFileTypeIsDatapack: vi.fn().mockReturnValue(true),
  checkFileTypeIsPDF: vi.fn().mockReturnValue(true),
  checkFileTypeIsDatapackImage: vi.fn().mockReturnValue(true),
  decryptDatapack: vi.fn().mockResolvedValue(undefined),
  deleteDatapackFileAndDecryptedCounterpart: vi.fn().mockResolvedValue(undefined),
  doesDatapackFolderExistInAllUUIDDirectories: vi.fn().mockResolvedValue(false)
}));
vi.mock("fs/promises", () => ({
  rm: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(JSON.stringify({ storedFileName: "storedFileName" })),
  readdir: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("../src/util", () => ({
  getBytes: vi.fn().mockReturnValue("1 B"),
  checkFileExists: vi.fn().mockResolvedValue(true),
  makeTempFilename: vi.fn().mockReturnValue("filename"),
  verifyNonExistentFilepath: vi.fn().mockResolvedValue(true),
  assetconfigs: {
    fileMetadata: "fileMetadata",
    privateDatapacksDirectory: "/absolute/path/to/private/datapacks"
  },
  verifyFilepath: vi.fn().mockResolvedValue(true)
}));
vi.mock("../src/workshop/workshop-util", () => ({
  getWorkshopUUIDFromWorkshopId: vi.fn().mockReturnValue("workshop-uuid"),
  getWorkshopCoverPath: vi.fn().mockImplementation(() => {
    throw new Error("Invalid Workshop Cover Directory.");
  }),
  getWorkshopFilesPath: vi.fn().mockImplementation(() => {
    throw new Error("Invalid Workshop Files Directory.");
  })
}));
vi.mock("fs", async () => {
  return {
    createWriteStream: vi.fn().mockReturnValue({})
  };
});
vi.spyOn(console, "error").mockImplementation(() => undefined);
vi.spyOn(console, "log").mockImplementation(() => undefined);

describe("uploadUserDatapackHandler", () => {
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
    type: "type",
    priority: "1"
  };
  beforeEach(async () => {
    vi.clearAllMocks();
  });
  it("should return a 400 error if bytes are 0", async () => {
    const bytes = 0;
    const val = await uploadUserDatapackHandler(fields, bytes);

    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("File is empty");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
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
    { type: "" }
  ])(`should return a 400 error if %p is missing`, async (field) => {
    const val = await uploadUserDatapackHandler({ ...fields, ...field }, 1);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("Missing required fields");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if title is a reserved word", async () => {
    const val = await uploadUserDatapackHandler({ ...fields, title: "__proto__" }, 1);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("Invalid title");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error but not call rm if filepath is missing", async () => {
    const val = await uploadUserDatapackHandler({ ...fields, filepath: "" }, 1);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("Missing required fields");
    expect(rm).not.toHaveBeenCalled();
  });
  it("should return 400 if bytes is 0", async () => {
    const val = await uploadUserDatapackHandler(fields, 0);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("File is empty");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return 400 if incorrect datapack type", async () => {
    const isDatapackTypeString = vi.spyOn(shared, "isDatapackTypeString");
    isDatapackTypeString.mockReturnValueOnce(false);
    const val = await uploadUserDatapackHandler(fields, 1);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("Invalid datapack type");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  test.each([{ references: "[hi]" }, { tags: "[hi" }, { references: "{3" }, { tags: '[3"]' }])(
    `should return a 400 error if %p is not a valid JSON string`,
    async (field) => {
      const val = await uploadUserDatapackHandler({ ...fields, ...field }, 1);
      expect(isOperationResult(val)).toBe(true);
      assertOperationResult(val);
      expect(val.code).toBe(400);
      expect(val.message).toBe("References and tags must be valid arrays");
      expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
    }
  );
  it("should return a 400 error if references is not a valid array", async () => {
    const val = await uploadUserDatapackHandler({ ...fields, references: '{"ref": "hi"}' }, 1);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("References must be an array of strings");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if tags is not a valid array", async () => {
    const val = await uploadUserDatapackHandler({ ...fields, tags: '{"tag": "hi"}' }, 1);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("Tags must be an array of strings");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if date is not a valid date string", async () => {
    isDateValid.mockReturnValueOnce(false);
    const val = await uploadUserDatapackHandler(fields, 1);
    expect(isDateValid).toHaveBeenCalledWith(fields.date);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("Date must be a valid date string");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if assertDatapackMetadata fails", async () => {
    const assertDatapackMetadata = vi.spyOn(shared, "assertDatapackMetadata");
    assertDatapackMetadata.mockImplementationOnce(() => {
      throw new Error("error");
    });
    const val = await uploadUserDatapackHandler(fields, 1);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe("Invalid metadata received/processed");
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a DatapackMetadata object on success", async () => {
    const val = await uploadUserDatapackHandler(
      { ...fields, notes: "notes", contact: "contact", datapackImage: "datapackImage" },
      1
    );
    expect(isOperationResult(val)).toBe(false);
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
      datapackImage: "datapackImage",
      type: fields.type,
      uuid: fields.uuid,
      isPublic: Boolean(fields.isPublic),
      priority: parseInt(fields.priority)
    });
  });
  it("should return a 400 error if title is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque rutrum ex nisi, at consequat ligula."
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max title length is ${shared.MAX_DATAPACK_TITLE_LENGTH}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if tags array is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        tags: '["tag", "hi", "test3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15", "tag16", "tag17", "tag18", "tag19", "tag20", "tag21", "tag22", "tag23", "tag24", "tag25", "tag26", "tag27", "tag28", "tag29", "tag30", "tag31"]'
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max tags allowed is ${shared.MAX_DATAPACK_TAGS_ALLOWED}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if a tag is too long", async () => {
    const val = await uploadUserDatapackHandler({ ...fields, tags: '["tag", "Lorem ipsum dolor at. "]' }, 1);
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max tag length is ${shared.MAX_DATAPACK_TAG_LENGTH}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if authored by length is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        authoredBy:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam a turpis rutrum, pretium nisi vitae, consectetur diam. Integer tristique pretium nunc sit amet finibus. Suspendisse interdum, orci ut in."
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max authored by length is ${shared.MAX_AUTHORED_BY_LENGTH}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if description length is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus vulputate turpis in consectetur fermentum. Maecenas bibendum dignissim nisl et dictum. Nulla imperdiet sapien non massa dignissim, ac tincidunt magna consequat. Fusce vehicula congue sagittis. Praesent in placerat diam. Praesent varius mauris id sapien posuere, eu viverra purus sodales. Maecenas dignissim mattis bibendum cras amett."
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max description length is ${shared.MAX_DATAPACK_DESC_LENGTH}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if notes length is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        notes:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus vehicula, enim non condimentum vestibulum, ligula nibh suscipit tortor, at dignissim leo elit in diam. Vestibulum mattis aliquet leo ex."
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max notes length is ${shared.MAX_DATAPACK_NOTES_LENGTH}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if notes length is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        notes:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus vehicula, enim non condimentum vestibulum, ligula nibh suscipit tortor, at dignissim leo elit in diam. Vestibulum mattis aliquet leo ex."
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max notes length is ${shared.MAX_DATAPACK_NOTES_LENGTH}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if references array is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        references:
          '["reference", "hi", "test3", "reference4", "reference5", "reference6", "reference7", "reference8", "reference9", "reference10", "reference11", "reference12", "reference13", "reference14", "reference15", "reference16", "reference17", "reference18", "reference19", "reference20", "reference21", "reference22", "reference23", "reference24", "reference25", "reference26", "reference27", "reference28", "reference29", "reference30", "reference31"]'
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max references allowed is ${shared.MAX_DATAPACK_REFERENCES_ALLOWED}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if a reference is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        references:
          '["reference", "hi", "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed et metus maximus, venenatis velit a leo."]'
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max references length is ${shared.MAX_DATAPACK_REFERENCE_LENGTH}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
  it("should return a 400 error if contact length is too long", async () => {
    const val = await uploadUserDatapackHandler(
      {
        ...fields,
        contact: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed et metus maximus, venenatis velit a leo."
      },
      1
    );
    expect(isOperationResult(val)).toBe(true);
    assertOperationResult(val);
    expect(val.code).toBe(400);
    expect(val.message).toBe(`Max contact length is ${shared.MAX_DATAPACK_CONTACT_LENGTH}`);
    expect(rm).toHaveBeenCalledWith(fields.filepath, { force: true });
  });
});

describe("uploadFileToFileSystem tests", () => {
  const pipeline = vi.spyOn(streamPromises, "pipeline");
  const rm = vi.spyOn(fsPromises, "rm");
  const multipartFile = {
    name: "file",
    type: "file",
    mimetype: "mimetype",
    filename: "filename",
    fieldname: "fieldname",
    bytesRead: 1,
    file: {
      truncated: false,
      bytesRead: 1
    }
  } as unknown as MultipartFile;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return a 500 error if pipeline fails", async () => {
    pipeline.mockRejectedValueOnce(new Error("error"));
    expect(await uploadFileToFileSystem(multipartFile, "filepath")).toEqual({
      code: 500,
      message: "Failed to save file"
    });
    expect(pipeline).toHaveBeenCalledOnce();
  });
  it("should return a 500 error if the file is truncated", async () => {
    const truncated = { ...multipartFile, file: { truncated: true } } as unknown as MultipartFile;
    expect(await uploadFileToFileSystem(truncated, "filepath")).toEqual({ code: 413, message: "File is too large" });
    expect(rm).toHaveBeenCalledOnce();
  });
  it("should return a 400 if the file is empty", async () => {
    const empty = { ...multipartFile, file: { bytesRead: 0 } } as unknown as MultipartFile;
    expect(await uploadFileToFileSystem(empty, "filepath")).toEqual({ code: 400, message: "File is empty" });
    expect(rm).toHaveBeenCalledOnce();
  });
  it("should return 200 on success", async () => {
    expect(await uploadFileToFileSystem(multipartFile, "filepath")).toEqual({ code: 200, message: "File uploaded" });
  });
});

describe("changeProfilePicture tests", () => {
  const rename = vi.spyOn(fsPromises, "rename");
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const checkFileExists = vi.spyOn(util, "checkFileExists");
  const rm = vi.spyOn(fsPromises, "rm");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should move the file to the correct location if previous profile picture doesn't exists", async () => {
    checkFileExists.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    await changeProfilePicture("user", "datapack", "sourceFile");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(2);
    const expectedRenamePath = path.join("directory", "datapack-image");
    expect(rename).toHaveBeenCalledWith("sourceFile", expectedRenamePath);
  });
  it("should move the file to the correct location if previous profile picture exists", async () => {
    checkFileExists.mockResolvedValueOnce(true);
    await changeProfilePicture("user", "datapack", "sourceFile");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
    const expectedPath = path.join("directory", "datapack-image.png");
    expect(rm).toHaveBeenCalledWith(expectedPath, { force: true });
    const expectedRenamePath = path.join("directory", "datapack-image");
    expect(rename).toHaveBeenCalledWith("sourceFile", expectedRenamePath);
  });
});

describe("replaceDatapackFile", () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const copyFile = vi.spyOn(fsPromises, "copyFile");
  const decryptDatapack = vi.spyOn(userHandlers, "decryptDatapack");
  const deleteDatapackFileAndDecryptedCounterpart = vi.spyOn(userHandlers, "deleteDatapackFileAndDecryptedCounterpart");
  const loadDatapackIntoIndex = vi.spyOn(loadPacks, "loadDatapackIntoIndex");
  const rm = vi.spyOn(fsPromises, "rm");
  const metadata = {
    title: "title"
  } as shared.Datapack;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw error if failed to load datapack", async () => {
    await expect(() => replaceDatapackFile("user", "sourceFile", metadata)).rejects.toThrow();
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledTimes(2);
    expect(decryptDatapack).toHaveBeenCalledOnce();
    expect(copyFile).toHaveBeenCalledOnce();
  });
  it("should return the successfully loaded datapack and rm the temp file", async () => {
    loadDatapackIntoIndex.mockImplementationOnce(async (index, decryptionFilepath, metadata) => {
      index[metadata.title] = metadata as shared.Datapack;
      return true;
    });
    await expect(replaceDatapackFile("user", "sourceFile", metadata)).resolves.toEqual(metadata);
    expect(fetchUserDatapackDirectory).toHaveBeenCalledTimes(1);
    expect(rm).toHaveBeenCalledTimes(1);
    expect(decryptDatapack).toHaveBeenCalledOnce();
    expect(copyFile).toHaveBeenCalledOnce();
    expect(deleteDatapackFileAndDecryptedCounterpart).toHaveBeenCalledOnce();
  });
});

describe("setupNewDatapackDirectoryInUUIDDirectory", () => {
  const doesDatapackFolderExistInAllUUIDDirectories = vi.spyOn(
    userHandlers,
    "doesDatapackFolderExistInAllUUIDDirectories"
  );
  const mkdir = vi.spyOn(fsPromises, "mkdir");
  const copyFile = vi.spyOn(fsPromises, "copyFile");
  const decryptDatapack = vi.spyOn(userHandlers, "decryptDatapack");
  const loadDatapackIntoIndex = vi.spyOn(loadPacks, "loadDatapackIntoIndex");
  const writeFile = vi.spyOn(fsPromises, "writeFile");
  const writeFileMetadata = vi.spyOn(fileMetadataHandler, "writeFileMetadata");
  const rm = vi.spyOn(fsPromises, "rm");
  const isUserDatapack = vi.spyOn(shared, "isUserDatapack");
  const metadata = {
    title: "title",
    storedFileName: "storedFileName",
    isPublic: true
  } as shared.Datapack;
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw error if already exists in uuid directory", async () => {
    doesDatapackFolderExistInAllUUIDDirectories.mockResolvedValueOnce(true);
    await expect(() =>
      setupNewDatapackDirectoryInUUIDDirectory("uuid", "sourceFilePath", metadata, false)
    ).rejects.toThrow();
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledOnce();
  });
  it("should remove source path if sourceFilePath is different from sourceFileDestination and not manual", async () => {
    loadDatapackIntoIndex.mockImplementationOnce(async (index, decryptionFilepath, metadata) => {
      index[metadata.title] = metadata as shared.Datapack;
      return true;
    });
    await setupNewDatapackDirectoryInUUIDDirectory("uuid", "sourceFilePath", metadata, false);
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledOnce();
    expect(mkdir).toHaveBeenCalledOnce();
    expect(copyFile).toHaveBeenCalledOnce();
    expect(decryptDatapack).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
  });
  it("should throw error if failed to load datapack into index", async () => {
    loadDatapackIntoIndex.mockResolvedValueOnce(false);
    await expect(() =>
      setupNewDatapackDirectoryInUUIDDirectory("uuid", "sourceFilePath", metadata, true)
    ).rejects.toThrow();
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledOnce();
    expect(mkdir).toHaveBeenCalledOnce();
    expect(copyFile).toHaveBeenCalledOnce();
    expect(decryptDatapack).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
  });
  it("should copyFile and rm if datapackImageFilepath is provided and manual is false", async () => {
    loadDatapackIntoIndex.mockImplementationOnce(async (index, decryptionFilepath, metadata) => {
      index[metadata.title] = metadata as shared.Datapack;
      return true;
    });
    await setupNewDatapackDirectoryInUUIDDirectory("uuid", "sourceFilePath", metadata, false, "datapackImageFilepath");
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledOnce();
    expect(mkdir).toHaveBeenCalledOnce();
    expect(copyFile).toHaveBeenCalledTimes(2);
    expect(decryptDatapack).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledOnce();
    expect(writeFileMetadata).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledTimes(2);
  });
  it("should return the datapack index on success", async () => {
    loadDatapackIntoIndex.mockImplementationOnce(async (index, decryptionFilepath, metadata) => {
      index[metadata.title] = metadata as shared.Datapack;
      return true;
    });
    await expect(setupNewDatapackDirectoryInUUIDDirectory("uuid", "sourceFilePath", metadata, true)).resolves.toEqual({
      [metadata.title]: metadata
    });
    expect(doesDatapackFolderExistInAllUUIDDirectories).toHaveBeenCalledOnce();
    expect(mkdir).toHaveBeenCalledOnce();
    expect(copyFile).toHaveBeenCalledOnce();
    expect(decryptDatapack).toHaveBeenCalledOnce();
    expect(rm).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledOnce();
    expect(writeFileMetadata).toHaveBeenCalledOnce();
  });
  it("should skip writing to file metadat if not a user datapack", async () => {
    isUserDatapack.mockReturnValueOnce(false);
    loadDatapackIntoIndex.mockImplementationOnce(async (index, decryptionFilepath, metadata) => {
      index[metadata.title] = metadata as shared.Datapack;
      return true;
    });
    await setupNewDatapackDirectoryInUUIDDirectory("uuid", "sourceFilePath", metadata, true);
    expect(writeFileMetadata).not.toHaveBeenCalled();
  });
  it("should handle pdfFields and remove original PDF files when not manual", async () => {
    const pdfFields = { "file1.pdf": "tempPath1", "file2.pdf": "tempPath2" };
    loadDatapackIntoIndex.mockImplementationOnce(async (index, decryptionFilepath, metadata) => {
      index[metadata.title] = metadata as shared.Datapack;
      return true;
    });
    const datapackFolder = path.normalize("datapacks-directory/title");
    const expectedPdfFilesDir = path.resolve(datapackFolder, "files");
    const verifyNonExistentFilepathMock = vi.spyOn(util, "verifyNonExistentFilepath").mockResolvedValue(true);
    const fetchPDFFileDirectory = vi
      .spyOn(fetchUserFiles, "getPDFFilesDirectoryFromDatapackDirectory")
      .mockResolvedValue(expectedPdfFilesDir);
    const pathJoinSpy = vi.spyOn(path, "join").mockImplementation((...args) => args.join(path.sep));
    await setupNewDatapackDirectoryInUUIDDirectory("uuid", "sourceFilePath", metadata, false, undefined, pdfFields);
    expect(fetchPDFFileDirectory).toHaveBeenCalledTimes(1);
    expect(fetchPDFFileDirectory).toHaveBeenCalledWith(datapackFolder);
    expect(verifyNonExistentFilepathMock).toHaveBeenCalledTimes(2);
    expect(verifyNonExistentFilepathMock).toHaveBeenCalledWith(path.resolve(expectedPdfFilesDir, "file1.pdf"));
    expect(verifyNonExistentFilepathMock).toHaveBeenCalledWith(path.resolve(expectedPdfFilesDir, "file2.pdf"));
    expect(rm).toHaveBeenCalledTimes(3);
    expect(rm).toHaveBeenCalledWith("tempPath1", { force: true });
    expect(rm).toHaveBeenCalledWith("tempPath2", { force: true });
    expect(pathJoinSpy).toHaveBeenCalledWith(datapackFolder, "storedFileName");
    fetchPDFFileDirectory.mockRestore();
    verifyNonExistentFilepathMock.mockRestore();
    pathJoinSpy.mockRestore();
  });
});

describe("getFileNameFromCachedDatapack tests", () => {
  const checkFileExists = vi.spyOn(util, "checkFileExists");
  const readFile = vi.spyOn(fsPromises, "readFile");
  const assertUserDatapack = vi.spyOn(shared, "assertUserDatapack");
  const assertDatapack = vi.spyOn(shared, "assertDatapack");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw error if file doesn't exist", async () => {
    checkFileExists.mockResolvedValueOnce(false);
    await expect(() => getFileNameFromCachedDatapack("filepath")).rejects.toThrow();
    expect(checkFileExists).toHaveBeenCalledOnce();
  });
  it("should throw error if file is empty", async () => {
    readFile.mockResolvedValueOnce("");
    await expect(() => getFileNameFromCachedDatapack("filepath")).rejects.toThrow();
    expect(checkFileExists).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledOnce();
  });
  it("should return the storedFileName", async () => {
    readFile.mockResolvedValueOnce(JSON.stringify({ storedFileName: "storedFileName" }));
    await expect(getFileNameFromCachedDatapack("filepath")).resolves.toEqual("storedFileName");
    expect(checkFileExists).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledOnce();
    expect(assertUserDatapack).toHaveBeenCalledOnce();
    expect(assertDatapack).toHaveBeenCalledOnce();
  });
});
it("should return the directory and filename", async () => {
  const getUserUUIDDirectory = vi.spyOn(fetchUserFiles, "getUserUUIDDirectory");
  getUserUUIDDirectory.mockResolvedValueOnce("uuid-directory");
  const result = await getTemporaryFilepath("uuid", "filename");
  expect(path.normalize(result)).toEqual(path.normalize("uuid-directory/filename"));
  expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
});
describe("processMultipartPartsForDatapackUpload tests", () => {
  const findUser = vi.spyOn(database, "findUser");
  const checkFileTypeIsDatapack = vi.spyOn(userHandlers, "checkFileTypeIsDatapack");
  const checkFileTypeIsPDF = vi.spyOn(userHandlers, "checkFileTypeIsPDF");
  const checkFileTypeIsDatapackImage = vi.spyOn(userHandlers, "checkFileTypeIsDatapackImage");
  const pipeline = vi.spyOn(streamPromises, "pipeline");
  const rm = vi.spyOn(fsPromises, "rm");
  let formData: AsyncIterableIterator<Multipart>;
  function createFormData(
    json: Record<string, string | { mimetype: string; filename: string; fieldname: string; bytesRead?: number }> = {}
  ) {
    formData = {
      async *[Symbol.asyncIterator]() {
        yield* Object.entries(json).map(([name, value]) => {
          if (typeof value === "object") {
            return {
              name,
              type: "file",
              mimetype: value.mimetype,
              filename: value.filename,
              fieldname: value.fieldname,
              bytesRead: value.bytesRead,
              file: {
                truncated: false,
                bytesRead: value.bytesRead ?? 0,
                pipe: vi.fn(),
                on: vi.fn(),
                resume: vi.fn(),
                pause: vi.fn(),
                destroy: vi.fn(),
                destroySoon: vi.fn(),
                unpipe: vi.fn(),
                unshift: vi.fn(),
                wrap: vi.fn(),
                [Symbol.asyncIterator]: vi.fn()
              }
            };
          }
          return {
            name,
            type: "field",
            data: Buffer.from(value.toString())
          };
        });
      }
    } as AsyncIterableIterator<Multipart>;
  }
  beforeEach(() => {
    createFormData();
    vi.clearAllMocks();
  });
  it("should return a 404 if user is not found", async () => {
    findUser.mockResolvedValueOnce([]);
    const data = await processMultipartPartsForDatapackUpload("user", formData);
    expect(findUser).toHaveBeenCalledOnce();
    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(data.code).toBe(404);
    expect(data.message).toBe("User not found");
  });
  it("should return 404 if findUser throws an error", async () => {
    findUser.mockRejectedValueOnce(new Error("error"));
    const data = await processMultipartPartsForDatapackUpload("user", formData);
    expect(findUser).toHaveBeenCalledOnce();
    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(data.code).toBe(404);
    expect(data.message).toBe("User not found");
  });
  it("should return a 400 error if no parts are found", async () => {
    const data = await processMultipartPartsForDatapackUpload("user", formData);
    expect(findUser).toHaveBeenCalledOnce();
    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(data.code).toBe(400);
    expect(data.message).toBe("Missing file");
  });
  it("should return a 415 error if invalid file type for datapack", async () => {
    checkFileTypeIsDatapack.mockReturnValueOnce(false);
    createFormData({
      datapack: {
        mimetype: "text/plain",
        filename: "filename",
        fieldname: "datapack"
      }
    });
    const data = await processMultipartPartsForDatapackUpload("user", formData);
    expect(findUser).toHaveBeenCalledOnce();
    expect(checkFileTypeIsDatapack).toHaveBeenCalledOnce();
    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(data.code).toBe(415);
    expect(data.message).toBe("Invalid file type for datapack file");
  });
  it("should return a 400 error if bytesRead > 3000 and is not pro or admin", async () => {
    findUser.mockResolvedValueOnce([{ isAdmin: 0 } as User]);
    createFormData({
      datapack: {
        mimetype: "application/zip",
        filename: "filename",
        fieldname: "datapack",
        bytesRead: 3001
      }
    });
    const data = await processMultipartPartsForDatapackUpload("user", formData);
    expect(findUser).toHaveBeenCalledOnce();
    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(rm).toHaveBeenCalledOnce();
    expect(data.code).toBe(413);
    expect(data.message).toBe("File is too large");
  });
  it("should return a non-200 error if uploadFileToFileSystem fails", async () => {
    pipeline.mockRejectedValueOnce(new Error("error"));
    createFormData({
      datapack: {
        mimetype: "application/zip",
        filename: "filename",
        fieldname: "datapack"
      }
    });
    const data = await processMultipartPartsForDatapackUpload("user", formData);
    expect(findUser).toHaveBeenCalledOnce();
    expect(pipeline).toHaveBeenCalledOnce();
    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(rm).toHaveBeenCalledOnce();
    expect(data.code).toBe(500);
    expect(data.message).toBe("Failed to save file");
  });
  it("should return a 415 error if invalid file type for datapack pdf file", async () => {
    checkFileTypeIsPDF.mockReturnValueOnce(false);
    createFormData({
      "pdfFiles[]": {
        mimetype: "text/plain",
        filename: "file1.txt",
        fieldname: "pdfFiles[]"
      }
    });

    const data = await processMultipartPartsForDatapackUpload("user", formData);
    expect(findUser).toHaveBeenCalledOnce();
    expect(checkFileTypeIsPDF).toHaveBeenCalledOnce();
    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(data.code).toBe(415);
    expect(data.message).toBe("Invalid file type for datapack pdf file");
  });
  it("should return pdfFields with correct file paths and names", async () => {
    createFormData({
      "pdfFiles[]": {
        mimetype: "application/pdf",
        filename: "file1.pdf",
        fieldname: "pdfFiles[]"
      }
    });

    findUser.mockResolvedValueOnce([{ isAdmin: 1 } as User]);
    checkFileTypeIsPDF.mockReturnValueOnce(true);
    pipeline.mockResolvedValueOnce(undefined);

    const data = await processMultipartPartsForDatapackUpload("user", formData);

    if ("pdfFields" in data) {
      expect(data.pdfFields).toEqual({
        tempPDFFilePaths: expect.arrayContaining([expect.any(String)]),
        pdfFileNames: ["file1.pdf"]
      });
    }
  });
  it("should clean up temporary files if upload fails for pdf file", async () => {
    createFormData({
      "pdfFiles[]": {
        mimetype: "application/pdf",
        filename: "file1.pdf",
        fieldname: "pdfFiles[]"
      }
    });

    findUser.mockResolvedValueOnce([{ isAdmin: 1 } as User]);
    checkFileTypeIsPDF.mockReturnValueOnce(true);
    pipeline.mockRejectedValueOnce(new Error("upload failed"));

    const data = await processMultipartPartsForDatapackUpload("user", formData);

    expect(findUser).toHaveBeenCalledOnce();
    expect(checkFileTypeIsPDF).toHaveBeenCalledOnce();
    expect(pipeline).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();

    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(data.code).toBe(500);
    expect(data.message).toBe("Failed to save file");
  });
  it("should return a 415 error if invalid file type for datapack image", async () => {
    checkFileTypeIsDatapackImage.mockReturnValueOnce(false);

    createFormData({
      [DATAPACK_PROFILE_PICTURE_FILENAME]: {
        mimetype: "text/plain",
        filename: "invalid.txt",
        fieldname: DATAPACK_PROFILE_PICTURE_FILENAME
      }
    });

    const data = await processMultipartPartsForDatapackUpload("user", formData);

    expect(findUser).toHaveBeenCalledOnce();
    expect(checkFileTypeIsDatapackImage).toHaveBeenCalledOnce();
    expect(isOperationResult(data)).toBe(true);
    assertOperationResult(data);
    expect(data.code).toBe(415);
    expect(data.message).toBe("Invalid file type for datapack image");
  });
  it("should process datapack image upload correctly", async () => {
    checkFileTypeIsDatapackImage.mockReturnValueOnce(true);
    findUser.mockResolvedValueOnce([{ isAdmin: 0 } as User]);

    createFormData({
      [DATAPACK_PROFILE_PICTURE_FILENAME]: {
        mimetype: "image/jpeg",
        filename: "profile_picture.jpg",
        fieldname: DATAPACK_PROFILE_PICTURE_FILENAME
      }
    });

    const uploadFileMock = vi.fn().mockResolvedValueOnce({ code: 200, message: "Success" });
    vi.spyOn(uploadHandlers, "uploadFileToFileSystem").mockImplementation(uploadFileMock);

    const data = await processMultipartPartsForDatapackUpload("user", formData);

    expect(findUser).toHaveBeenCalledOnce();
    expect(checkFileTypeIsDatapackImage).toHaveBeenCalledOnce();

    expect(isOperationResult(data)).toBe(true);
    if ("fields" in data) {
      expect(data.fields).toHaveProperty("datapackImage");
      expect(data.fields).toHaveProperty("tempProfilePictureFilepath");
      expect(data.fields.datapackImage).toBe(DATAPACK_PROFILE_PICTURE_FILENAME + ".jpg");
    }
  });
});
describe("fetchMapPackImageFilepath", () => {
  const fetchUserDatapackDirectory = vi.spyOn(fetchUserFiles, "fetchUserDatapackDirectory");
  const getDecryptedDirectory = vi.spyOn(fetchUserFiles, "getDecryptedDirectory");
  const checkFileExists = vi.spyOn(util, "checkFileExists");
  const getDirectories = vi.spyOn(fetchUserFiles, "getDirectories");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should throw error if datapack directory doesn't exist", async () => {
    getDirectories.mockRejectedValueOnce(new Error("error"));
    await expect(() => fetchMapPackImageFilepath("user", "datapack", "img")).rejects.toThrow();
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
  });
  it("should return null if no image found", async () => {
    fetchUserDatapackDirectory.mockResolvedValueOnce("datapacks-directory");
    getDirectories.mockResolvedValueOnce(["decrypted-directory"]);
    checkFileExists.mockResolvedValueOnce(false);
    const result = await fetchMapPackImageFilepath("user", "datapack", "img");
    expect(result).toBeNull();
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
    expect(checkFileExists).toHaveBeenCalledOnce();
  });
  it("should return the image filepath if found", async () => {
    fetchUserDatapackDirectory.mockResolvedValueOnce("datapacks-directory");
    checkFileExists.mockResolvedValueOnce(true);
    getDirectories.mockResolvedValueOnce(["decrypted-directory"]);
    getDecryptedDirectory.mockReturnValue("decrypted-directory");
    const result = await fetchMapPackImageFilepath("user", "datapack", "img");
    expect(result).toEqual("decrypted-directory/decrypted-directory/MapImages/img");
    expect(fetchUserDatapackDirectory).toHaveBeenCalledOnce();
    expect(checkFileExists).toHaveBeenCalledOnce();
    expect(getDecryptedDirectory).toHaveBeenCalledOnce();
  });
});

describe("uploadFilesToWorkshop tests", () => {
  const multipartFile = {
    name: "file",
    type: "file",
    mimetype: "mimetype",
    filename: "filename",
    fieldname: "fieldname",
    bytesRead: 1,
    file: {
      truncated: false,
      bytesRead: 1
    }
  } as unknown as MultipartFile;
  const getWorkshopUUIDFromWorkshopId = vi.spyOn(workshopUtil, "getWorkshopUUIDFromWorkshopId");
  const getUserUUIDDirectory = vi.spyOn(fetchUserFiles, "getUserUUIDDirectory");
  const getWorkshopFilesPath = vi.spyOn(workshopUtil, "getWorkshopFilesPath");
  const rm = vi.spyOn(fsPromises, "rm");
  const pipeline = vi.spyOn(streamPromises, "pipeline");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 500 if path is invalid", async () => {
    expect(await uploadFilesToWorkshop(1, multipartFile)).toEqual({
      code: 500,
      message: "Invalid Workshop Files Directory."
    });
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopFilesPath).toHaveBeenCalledOnce();
  });
  it("should return 200 if uploaded successfully", async () => {
    pipeline.mockResolvedValueOnce();
    getWorkshopFilesPath.mockResolvedValueOnce("workshop-uuid/files");
    expect(await uploadFilesToWorkshop(1, multipartFile)).toEqual({ code: 200, message: "File uploaded" });
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopFilesPath).toHaveBeenCalledOnce();
    expect(rm).not.toHaveBeenCalled();
  });
  it("should return clean the file path and return the error code if failed to upload", async () => {
    pipeline.mockRejectedValueOnce(new Error("error"));
    getWorkshopFilesPath.mockResolvedValueOnce("workshop-uuid/files");
    expect(await uploadFilesToWorkshop(1, multipartFile)).toEqual({ code: 500, message: "Failed to save file" });
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopFilesPath).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
  });
});

describe("uploadCoverToWorkshop tests", () => {
  const multipartFile = {
    name: "file",
    type: "file",
    mimetype: "mimetype",
    filename: "filename",
    fieldname: "fieldname",
    bytesRead: 1,
    file: {
      truncated: false,
      bytesRead: 1
    }
  } as unknown as MultipartFile;
  const getWorkshopUUIDFromWorkshopId = vi.spyOn(workshopUtil, "getWorkshopUUIDFromWorkshopId");
  const getUserUUIDDirectory = vi.spyOn(fetchUserFiles, "getUserUUIDDirectory");
  const getWorkshopCoverPath = vi.spyOn(workshopUtil, "getWorkshopCoverPath");
  const rm = vi.spyOn(fsPromises, "rm");
  const pipeline = vi.spyOn(streamPromises, "pipeline");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return 500 if path is invalid", async () => {
    expect(await uploadCoverPicToWorkshop(1, multipartFile)).toEqual({
      code: 500,
      message: "Invalid Workshop Cover Directory."
    });
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopCoverPath).toHaveBeenCalledOnce();
  });
  it("should return 200 if uploaded successfully", async () => {
    pipeline.mockResolvedValueOnce();
    getWorkshopCoverPath.mockResolvedValueOnce("workshop-uuid/cover");
    expect(await uploadCoverPicToWorkshop(1, multipartFile)).toEqual({ code: 200, message: "File uploaded" });
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopCoverPath).toHaveBeenCalledOnce();
    expect(rm).not.toHaveBeenCalled();
  });
  it("should clean the file path and return the error code if failed to upload", async () => {
    pipeline.mockRejectedValueOnce(new Error("error"));
    getWorkshopCoverPath.mockResolvedValueOnce("workshop-uuid/cover");
    expect(await uploadCoverPicToWorkshop(1, multipartFile)).toEqual({ code: 500, message: "Failed to save file" });
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopCoverPath).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
  });
});

describe("fetchWorkshopCoverPictureFilepath tests", () => {
  const getWorkshopUUIDFromWorkshopId = vi.spyOn(workshopUtil, "getWorkshopUUIDFromWorkshopId");
  const getUserUUIDDirectory = vi.spyOn(fetchUserFiles, "getUserUUIDDirectory");
  const checkFileExists = vi.spyOn(util, "checkFileExists");
  const getWorkshopCoverPath = vi.spyOn(workshopUtil, "getWorkshopCoverPath");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return null if path is invalid", async () => {
    expect(await fetchWorkshopCoverPictureFilepath(1)).toEqual(null);
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopCoverPath).toHaveBeenCalledOnce();
  });
  it("should return null if there's no cover picture", async () => {
    getWorkshopCoverPath.mockResolvedValueOnce("workshop-uuid/cover");
    checkFileExists.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    expect(await fetchWorkshopCoverPictureFilepath(1)).toEqual(null);
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopCoverPath).toHaveBeenCalledOnce();
    expect(checkFileExists).toHaveBeenCalledTimes(3);
  });
  it("should return the file path if successfully found", async () => {
    getWorkshopCoverPath.mockResolvedValueOnce("workshop-uuid/cover");
    expect(await fetchWorkshopCoverPictureFilepath(1)).toEqual("workshop-uuid/cover/coverPicture.png");
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(checkFileExists).toHaveBeenCalled();
  });
});

describe("getWorkshopDatapacksNames tests", () => {
  const mockDirentArray: Dirent[] = [
    { name: "datapack1", isFile: () => false, isDirectory: () => true } as Dirent,
    { name: "datapack2", isFile: () => false, isDirectory: () => true } as Dirent,
    { name: "datapack3", isFile: () => false, isDirectory: () => true } as Dirent
  ];
  const getWorkshopUUIDFromWorkshopId = vi.spyOn(workshopUtil, "getWorkshopUUIDFromWorkshopId");
  const getUserUUIDDirectory = vi.spyOn(fetchUserFiles, "getUserUUIDDirectory");
  const readdir = vi.spyOn(fsPromises, "readdir");
  const getUsersDatapacksDirectoryFromUUIDDirectory = vi.spyOn(
    fetchUserFiles,
    "getUsersDatapacksDirectoryFromUUIDDirectory"
  );
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return empty array if path is invalid", async () => {
    getUsersDatapacksDirectoryFromUUIDDirectory.mockImplementationOnce(() => {
      throw new Error("error");
    });
    expect(await getWorkshopDatapacksNames(1)).toEqual([]);
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(readdir).not.toHaveBeenCalled();
  });
  it("should return empty array if fail to read dir", async () => {
    readdir.mockRejectedValueOnce(new Error("error"));
    expect(await getWorkshopDatapacksNames(1)).toEqual([]);
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
  });
  it("should return the string array of datapacks names if successfully found", async () => {
    readdir.mockResolvedValueOnce(mockDirentArray);
    expect(await getWorkshopDatapacksNames(1)).toEqual(["datapack1", "datapack2", "datapack3"]);
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
  });
});
describe("getWorkshopFilesNames tests", () => {
  const mockDirentArray: Dirent[] = [
    { name: "file1", isFile: () => true, isDirectory: () => false } as Dirent,
    { name: "file2", isFile: () => true, isDirectory: () => false } as Dirent,
    { name: "file3", isFile: () => true, isDirectory: () => false } as Dirent
  ];
  const getWorkshopUUIDFromWorkshopId = vi.spyOn(workshopUtil, "getWorkshopUUIDFromWorkshopId");
  const getUserUUIDDirectory = vi.spyOn(fetchUserFiles, "getUserUUIDDirectory");
  const readdir = vi.spyOn(fsPromises, "readdir");
  const getWorkshopFilesPath = vi.spyOn(workshopUtil, "getWorkshopFilesPath");
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return empty array if path is invalid", async () => {
    expect(await getWorkshopFilesNames(1)).toEqual([]);
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
    expect(getWorkshopFilesPath).toHaveBeenCalledOnce();
    expect(readdir).not.toHaveBeenCalled();
  });

  it("should return empty array if fail to read dir", async () => {
    readdir.mockRejectedValueOnce(new Error("error"));
    getWorkshopFilesPath.mockResolvedValueOnce("workshop-uuid/files");
    expect(await getWorkshopFilesNames(1)).toEqual([]);
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
  });
  it("should return the string array of datapacks names if successfully found", async () => {
    readdir.mockResolvedValueOnce(mockDirentArray);
    getWorkshopFilesPath.mockResolvedValueOnce("workshop-uuid/files");
    expect(await getWorkshopFilesNames(1)).toEqual(["file1", "file2", "file3"]);
    expect(getWorkshopUUIDFromWorkshopId).toHaveBeenCalledOnce();
    expect(getUserUUIDDirectory).toHaveBeenCalledOnce();
  });
});

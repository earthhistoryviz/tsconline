import { FastifyRequest, FastifyReply } from "fastify";
import { checkForUsersWithUsernameOrEmail, createUser, findUser } from "./database.js";
import { randomUUID } from "node:crypto";
import { hash } from "bcrypt-ts";
import { deleteUser } from "./database.js";
import { resolve, basename, extname, join } from "path";
import { adminconfig, assetconfigs, checkFileExists, getBytes } from "./util.js";
import { createWriteStream } from "fs";
import { readFile, realpath, rm, writeFile } from "fs/promises";
import { deleteDatapack, loadFileMetadata } from "./file-metadata-handler.js";
import { MultipartFile } from "@fastify/multipart";
import { datapackIndex, mapPackIndex } from "./index.js";
import { loadIndexes } from "./load-packs.js";
import validator from "validator";
import { pipeline } from "stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "util";
import { AdminDisplayDatapacks, assertAdminSharedUser, assertDatapackIndex } from "@tsconline/shared";
import { DatapackDescriptionInfo, NewUser } from "./types.js";
import { glob } from "glob";

/**
 * Get all users for admin to configure on frontend
 * @param _request
 * @param reply
 */
export const getUsers = async function getUsers(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const users = await findUser({});
    const displayedUsers = users.map((user) => {
      const { hashedPassword, ...displayedUser } = user;
      return {
        ...displayedUser,
        username: displayedUser.username,
        isGoogleUser: hashedPassword === null,
        isAdmin: user.isAdmin === 1,
        emailVerified: user.emailVerified === 1,
        invalidateSession: user.invalidateSession === 1
      };
    });
    displayedUsers.forEach((user) => {
      assertAdminSharedUser(user);
    });
    reply.status(200).send({ users: displayedUsers });
  } catch (e) {
    console.error(e);
    reply.status(404).send({ error: "Unknown error" });
  }
};

/**
 * Admin sends a request to create a user
 * @param request
 * @param reply
 * @returns
 */
export const adminCreateUser = async function adminCreateUser(request: FastifyRequest, reply: FastifyReply) {
  const { username, email, password, pictureUrl, isAdmin } = request.body as {
    username: string;
    email: string;
    password: string;
    pictureUrl: string;
    isAdmin: number;
  };
  if (!email || !password || !validator.isEmail(email)) {
    reply.status(400).send({ error: "Missing/invalid required fields" });
    return;
  }
  try {
    const user = await checkForUsersWithUsernameOrEmail(username || email, email);
    if (user.length > 0) {
      reply.status(409).send({ error: "User already exists" });
      return;
    }
    const customUser: NewUser = {
      username: username ?? email,
      email,
      hashedPassword: await hash(password, 10),
      uuid: randomUUID(),
      pictureUrl: pictureUrl ?? null,
      isAdmin: isAdmin,
      emailVerified: 1,
      invalidateSession: 0
    };
    await createUser(customUser);
    const newUser = await findUser({ email });
    if (newUser.length !== 1) {
      throw new Error("User not created");
    }
  } catch (error) {
    // this is needed because even when it fails, it will create the user in some cases
    try {
      await deleteUser({ email });
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    reply.status(500).send({ error: "Database error" });
    return;
  }
  reply.send({ message: "User created" });
};

/**
 * Admin sends a request to delete a user
 * TODO case where user is deleted, if user is still logged in, invalidate session or handle logic in login-routes
 * @param request
 * @param reply
 * @returns
 */
export const adminDeleteUser = async function adminDeleteUser(
  request: FastifyRequest<{ Body: { uuid: string } }>,
  reply: FastifyReply
) {
  const { uuid } = request.body;
  if (!uuid) {
    reply.status(400).send({ error: "Missing uuid" });
    return;
  }
  try {
    const user = await findUser({ uuid });
    if (!user || user.length < 1 || !user[0]) {
      reply.status(404).send({ error: "User not found" });
      return;
    }
    await deleteUser({ uuid });
    try {
      let userDirectory = resolve(assetconfigs.uploadDirectory, uuid);
      if (!userDirectory.startsWith(resolve(assetconfigs.uploadDirectory))) {
        reply.status(403).send({ error: "Directory traversal detected" });
        return;
      }
      userDirectory = await realpath(userDirectory);
      try {
        await rm(userDirectory, { recursive: true, force: true });
      } catch {
        // eslint-disable-next-line no-empty
      }
    } catch {
      // eslint-disable-next-line no-empty
    }
    const metadata = await loadFileMetadata(assetconfigs.fileMetadata);
    for (const file in metadata) {
      if (file.includes(uuid)) {
        delete metadata[file];
      }
    }
    await writeFile(assetconfigs.fileMetadata, JSON.stringify(metadata));
  } catch (error) {
    reply.status(500).send({ error: "Unknown error" });
    return;
  }
  reply.send({ message: "User deleted" });
};

export const adminDeleteUserDatapack = async function adminDeleteUserDatapack(
  request: FastifyRequest<{ Body: { uuid: string; datapack: string } }>,
  reply: FastifyReply
) {
  const { uuid, datapack } = request.body;
  if (!uuid || !datapack) {
    reply.status(400).send({ error: "Missing uuid or datapack id" });
    return;
  }
  try {
    const userDirectory = resolve(assetconfigs.uploadDirectory, uuid);
    const datapackDirectory = resolve(userDirectory, "datapack", datapack);
    if (
      !userDirectory.startsWith(resolve(assetconfigs.uploadDirectory)) ||
      !datapackDirectory.startsWith(resolve(userDirectory))
    ) {
      reply.status(403).send({ error: "Directory traversal detected" });
      return;
    }
    await realpath(datapackDirectory);
    await realpath(userDirectory);
    const metadata = await loadFileMetadata(assetconfigs.fileMetadata);
    if (!Object.keys(metadata).some((filePath) => filePath === datapackDirectory)) {
      reply.status(404).send({ error: "Datapack not found" });
      return;
    }
    await deleteDatapack(metadata, datapackDirectory);
    await writeFile(assetconfigs.fileMetadata, JSON.stringify(metadata));
  } catch (error) {
    reply.status(500).send({ error: "Unknown error" });
    return;
  }
  reply.send({ message: "Datapack deleted" });
};

export const adminUploadServerDatapack = async function adminUploadServerDatapack(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const parts = request.parts();
  let title: string | undefined;
  let description: string | undefined;
  let file: MultipartFile | undefined;
  let filename: string | undefined;
  let filepath: string | undefined;
  let decryptedFilepath: string | undefined;
  for await (const part of parts) {
    if (part.type === "file") {
      // DOWNLOAD FILE HERE AND SAVE TO FILE
      file = part;
      filename = file.filename;
      filepath = resolve(assetconfigs.datapacksDirectory, filename);
      decryptedFilepath = resolve(assetconfigs.decryptionDirectory, basename(filename));
      if (
        !filepath.startsWith(resolve(assetconfigs.datapacksDirectory)) ||
        !decryptedFilepath.startsWith(resolve(assetconfigs.decryptionDirectory))
      ) {
        reply.status(403).send({ error: "Directory traversal detected" });
        return;
      }
      if (!/^(\.dpk|\.txt|\.map|\.mdpk)$/.test(extname(file.filename))) {
        reply.status(400).send({ error: "Invalid file type" });
        return;
      }
      if (
        (await checkFileExists(filepath)) &&
        (await checkFileExists(decryptedFilepath)) &&
        (adminconfig.datapacks.some((datapack) => datapack.file === filename) ||
          (assetconfigs.activeDatapacks.some((datapack) => datapack.file === filename) &&
            !adminconfig.removeDevDatapacks.includes(filename))) &&
        datapackIndex[filename]
      ) {
        reply.status(409).send({ error: "File already exists" });
        return;
      }
      try {
        await pipeline(file.file, createWriteStream(filepath));
      } catch (error) {
        console.error(error);
        await rm(filepath, { force: true });
        reply.status(500).send({ error: "Error saving file" });
        return;
      }
      if (file.file.truncated) {
        await rm(filepath, { force: true });
        reply.status(400).send({ error: "File too large" });
        return;
      }
    } else if (part.fieldname === "title" && typeof part.value === "string") {
      title = part.value;
    } else if (part.fieldname === "description" && typeof part.value === "string") {
      description = part.value;
    }
  }
  if (!title || !description || !file || !filepath || !filename || !decryptedFilepath) {
    reply.status(400).send({ error: "Missing required fields" });
    return;
  }
  const errorHandler = async (error: string) => {
    if (!filepath || !decryptedFilepath || !filename)
      throw new Error("Missing required variables for file deletion and error handling");
    await rm(filepath, { force: true });
    await rm(decryptedFilepath, { force: true, recursive: true });
    if (datapackIndex[filename]) {
      delete datapackIndex[filename];
    }
    if (mapPackIndex[filename]) {
      delete mapPackIndex[filename];
    }
    reply.status(500).send({ error });
  };
  try {
    const { stdout, stderr } = await promisify(execFile)("java", [
      "-jar",
      assetconfigs.decryptionJar,
      "-d",
      filepath!.replaceAll("\\", "/"),
      "-dest",
      assetconfigs.decryptionDirectory.replaceAll("\\", "/")
    ]);
    if (stdout) console.log(stdout);
    if (stderr) {
      throw new Error(stderr);
    }
  } catch (error) {
    await errorHandler("Error decrypting file");
    return;
  }
  try {
    await realpath(decryptedFilepath);
  } catch (e) {
    await errorHandler("File was not decrypted properly");
    return;
  }

  const bytes = file.file.bytesRead;
  if (bytes === 0) {
    reply.status(400).send({ error: `Empty file cannot be uploaded` });
    return;
  }
  const datapackInfo: DatapackDescriptionInfo = {
    file: filename,
    description: description,
    title: title,
    size: getBytes(bytes)
  };

  const successful = await loadIndexes(datapackIndex, mapPackIndex, assetconfigs.decryptionDirectory, [datapackInfo]);
  if (!successful) {
    await errorHandler("Error parsing the datapack for chart generation");
    return;
  }
  try {
    // this was a previous dev datapack that was removed
    if (adminconfig.removeDevDatapacks.includes(filename)) {
      adminconfig.removeDevDatapacks = adminconfig.removeDevDatapacks.filter((pack) => pack !== filename);
      // on load, we prune datapacks that are in removeDevDatapacks so add it back but DON'T WRITE TO FILE
      if (!assetconfigs.activeDatapacks.some((datapack) => datapack.file === filename)) {
        assetconfigs.activeDatapacks.push(datapackInfo);
      }
    } else if (
      !assetconfigs.activeDatapacks.some((datapack) => datapack.file === filename) &&
      !adminconfig.datapacks.some((datapack) => datapack.file === filename)
    ) {
      adminconfig.datapacks.push(datapackInfo);
    }
    await writeFile(assetconfigs.adminConfigPath, JSON.stringify(adminconfig, null, 2));
  } catch (e) {
    await errorHandler("Error updating admin config");
    return;
  }
  reply.send({ message: "Datapack uploaded" });
};

/**
 * Delete admin server datapack from server or remove any dev datapacks in config
 * @param request
 * @param reply
 * @returns
 */
export const adminDeleteServerDatapack = async function adminDeleteServerDatapack(
  request: FastifyRequest<{ Body: { datapack: string } }>,
  reply: FastifyReply
) {
  const { datapack } = request.body;
  if (!datapack) {
    reply.status(400).send({ error: "Missing datapack id" });
    return;
  }
  if (!/^(\.dpk|\.txt|\.map|\.mdpk)$/.test(extname(datapack))) {
    reply.status(400).send({ error: "Invalid file extension" });
    return;
  }
  let filepath;
  let decryptedFilepath;
  try {
    filepath = resolve(assetconfigs.datapacksDirectory, datapack);
    decryptedFilepath = resolve(assetconfigs.decryptionDirectory, basename(datapack));
    if (
      !filepath.startsWith(resolve(assetconfigs.datapacksDirectory)) ||
      !decryptedFilepath.startsWith(resolve(assetconfigs.decryptionDirectory))
    ) {
      reply.status(403).send({ error: "Directory traversal detected" });
      return;
    }
    await realpath(filepath);
    await realpath(decryptedFilepath);
  } catch (e) {
    reply.status(500).send({ error: "Datapack file does not exist" });
    return;
  }
  if (
    !adminconfig.datapacks.some((dp) => dp.file === datapack) &&
    !assetconfigs.activeDatapacks.some((dp) => dp.file === datapack)
  ) {
    reply.status(404).send({ error: "Datapack not found" });
    return;
  }
  if (assetconfigs.activeDatapacks.some((dp) => dp.file === datapack)) {
    // don't write to file to prevent merge issues on server
    assetconfigs.activeDatapacks = assetconfigs.activeDatapacks.filter((pack) => pack.file !== datapack);
    adminconfig.removeDevDatapacks.push(datapack);
  }
  if (adminconfig.datapacks.some((dp) => dp.file === datapack)) {
    adminconfig.datapacks = adminconfig.datapacks.filter((pack) => pack.file !== datapack);
  }
  if (datapackIndex[datapack]) {
    delete datapackIndex[datapack];
  }
  if (mapPackIndex[datapack]) {
    delete mapPackIndex[datapack];
  }
  try {
    await rm(filepath, { force: true });
    await rm(decryptedFilepath, { force: true, recursive: true });
  } catch (e) {
    reply.status(500).send({ error: "Deleted from indexes, but was not able to delete files" });
    return;
  }
  try {
    await writeFile(assetconfigs.adminConfigPath, JSON.stringify(adminconfig, null, 2));
  } catch (e) {
    reply.status(500).send({
      error:
        "Deleted and resolved configurations, but was not able to write to file. Check with server admin to make sure your configuration is still viable"
    });
  }
  reply.status(200).send({ message: `Datapack ${datapack} deleted` });
};

export const getAllUserDatapacks = async function getAllUserDatapacks(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    let paths = await glob(`${assetconfigs.uploadDirectory}/*`);
    const adminDisplayDatapacks: AdminDisplayDatapacks = {}
    for (const path of paths) {
      const uuid = basename(path);
      const datapackIndexFilepath = join(path, "DatapackIndex.json");
      try {
        await realpath(datapackIndexFilepath);
        const datapackIndex = JSON.parse((await readFile(datapackIndexFilepath)).toString());
        assertDatapackIndex(datapackIndex);
      } catch {
        continue;
      }
      adminDisplayDatapacks[uuid] = {};
      for (const datapack in datapackIndex) {
        const datapackInfo = datapackIndex[datapack];
        if (!datapackInfo) return;
        adminDisplayDatapacks[uuid]![datapack] = datapackInfo
      }
    }
    reply.send({ datapacks: adminDisplayDatapacks });
  } catch (error) {
    reply.status(500).send({ error: "Unknown error" });
  }
}

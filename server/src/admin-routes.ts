import { FastifyRequest, FastifyReply } from "fastify";
import { checkForUsersWithUsernameOrEmail, createUser, findUser } from "./database.js";
import { randomUUID } from "node:crypto";
import { hash } from "bcrypt-ts";
import { deleteUser } from "./database.js";
import path from "path";
import { adminconfig, assetconfigs, checkFileExists } from "./util.js";
import { createWriteStream, realpathSync } from "fs";
import { rm, writeFile } from "fs/promises";
import { deleteDatapack, loadFileMetadata } from "./file-metadata-handler.js";
import { MultipartFile } from "@fastify/multipart";
import pump from "pump";
import { execFileSync } from "child_process";
import { datapackIndex, mapPackIndex } from "./index.js";
import { loadIndexes } from "./load-packs.js";
import validator from "validator";

/**
 * Get all users for admin to configure on frontend
 * @param _request
 * @param reply
 */
export const getUsers = async function getUsers(_request: FastifyRequest, reply: FastifyReply) {
  const users = await findUser({});
  reply.send(users);
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
  if (!username || !email || !password || !validator.isEmail(email)) {
    reply.status(400).send({ message: "Missing/invalid required fields" });
    return;
  }
  try {
    const user = await checkForUsersWithUsernameOrEmail(username, email);
    if (user.length > 0) {
      reply.status(409).send({ message: "User already exists" });
      return;
    }
    const customUser = {
      username,
      email,
      hashedPassword: await hash(password, 10),
      uuid: randomUUID(),
      pictureUrl: pictureUrl ? pictureUrl : null,
      isAdmin: isAdmin ? 1 : 0,
      emailVerified: 1,
      invalidateSession: 0
    };
    await createUser(customUser);
    const newUser = await findUser({ username });
    if (newUser.length !== 1) {
      throw new Error("User not created");
    }
  } catch (error) {
    reply.status(500).send({ message: "Database error" });
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
    reply.status(400).send({ message: "Missing uuid" });
    return;
  }
  const userDirectory = realpathSync(path.resolve(assetconfigs.uploadDirectory, uuid));
  if (!userDirectory.startsWith(path.resolve(assetconfigs.uploadDirectory))) {
    reply.status(403).send({ message: "Directory traversal detected" });
    return;
  }
  try {
    const user = await findUser({ uuid });
    if (!user || user.length < 1 || !user[0]) {
      reply.status(404).send({ message: "User not found" });
      return;
    }
    await deleteUser({ uuid });
    try {
      await rm(userDirectory, { recursive: true, force: true });
    } catch (error) {
      console.error(error);
    }
    const metadata = await loadFileMetadata(assetconfigs.fileMetadata);
    for (const file in metadata) {
      if (file.includes(uuid)) {
        delete metadata[file];
      }
    }
    await writeFile(assetconfigs.fileMetadata, JSON.stringify(metadata));
  } catch (error) {
    reply.status(500).send({ message: "Unknown error" });
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
    reply.status(400).send({ message: "Missing uuid or datapack id" });
    return;
  }
  try {
    const userDirectory = realpathSync(path.resolve(assetconfigs.uploadDirectory, uuid));
    const datapackDirectory = realpathSync(path.resolve(userDirectory, "datapack", datapack));
    if (!userDirectory.startsWith(assetconfigs.uploadDirectory) || !datapackDirectory.startsWith(userDirectory)) {
      throw new Error("Directory traversal detected");
    }
    const metadata = await loadFileMetadata(assetconfigs.fileMetadata);
    if (!Object.keys(metadata).some((filePath) => filePath === datapackDirectory)) {
      reply.status(404).send({ message: "Datapack not found" });
      return;
    }
    await deleteDatapack(metadata, datapackDirectory);
    await writeFile(assetconfigs.fileMetadata, JSON.stringify(metadata));
  } catch (error) {
    reply.status(500).send({ message: "Unknown error" });
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
      filepath = path.resolve(assetconfigs.datapacksDirectory, filename);
      decryptedFilepath = path.resolve(assetconfigs.decryptionDirectory, filename.split(".")[0]!);
      if (
        !filepath.startsWith(path.resolve(assetconfigs.datapacksDirectory)) ||
        !decryptedFilepath.startsWith(path.resolve(assetconfigs.decryptionDirectory))
      ) {
        reply.status(403).send({ message: "Directory traversal detected" });
        return;
      }
      if (!/^(\.dpk|\.txt|\.map|\.mdpk)$/.test(path.extname(file.filename))) {
        reply.status(400).send({ message: "Invalid file extension" });
        return;
      }
      if (
        (await checkFileExists(filepath)) &&
        (await checkFileExists(decryptedFilepath)) &&
        (adminconfig.datapacks.includes(filename) ||
          (assetconfigs.activeDatapacks.includes(filename) && !adminconfig.removeDevDatapacks.includes(filename))) &&
        datapackIndex[filename]
      ) {
        reply.status(409).send({ message: "File already exists" });
        return;
      }
      try {
        await new Promise<void>((resolve, reject) => {
          pump(file!.file, createWriteStream(filepath!), (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        await rm(filepath, { force: true });
        reply.status(500).send({ message: "Error saving file" });
        return;
      }
      if (file.file.truncated) {
        await rm(filepath, { force: true });
        reply.status(400).send({ message: "File too large" });
        return;
      }
    } else if (part.fieldname === "title" && typeof part.value === "string") {
      title = part.value;
    } else if (part.fieldname === "description" && typeof part.value === "string") {
      description = part.value;
    }
  }
  if (!title || !description || !file || !filepath || !filename || !decryptedFilepath) {
    reply.status(400).send({ message: "Missing required fields" });
    return;
  }
  const errorHandler = async (message: string) => {
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
    reply.status(500).send({ message });
  };
  try {
    await new Promise<void>((resolve, reject) => {
      try {
        const stdout = execFileSync(
          "java",
          [
            "-jar",
            assetconfigs.decryptionJar,
            "-d",
            filepath!.replaceAll("\\", "/"),
            "-dest",
            assetconfigs.decryptionDirectory.replaceAll("\\", "/")
          ],
          { stdio: "inherit" }
        );
        console.log("stdout: ", stdout);
      } catch (e) {
        console.error("Java decryption error: ", e);
        reject();
      }
      resolve();
    });
  } catch (error) {
    errorHandler("Error decrypting file");
    return;
  }
  const successful = await loadIndexes(datapackIndex, mapPackIndex, assetconfigs.decryptionDirectory, [filename]);
  if (!successful) {
    errorHandler("Error parsing the datapack for chart generation");
    return;
  }
  try {
    // this was a previous dev datapack that was removed
    if (adminconfig.removeDevDatapacks.includes(filename)) {
      adminconfig.removeDevDatapacks = adminconfig.removeDevDatapacks.filter((pack) => pack !== filename);
      // on load, we prune datapacks that are in removeDevDatapacks so add it back but DON'T WRITE TO FILE
      assetconfigs.activeDatapacks.push(filename);
    } else {
      adminconfig.datapacks.push(filename);
    }
    await writeFile(assetconfigs.adminConfigPath, JSON.stringify(adminconfig, null, 2));
  } catch (e) {
    errorHandler("Error updating admin config");
    return;
  }
  reply.send({ message: "Datapack uploaded" });
};

export const adminDeleteServerDatapack = async function adminDeleteServerDatapack(
  request: FastifyRequest<{ Body: { datapack: string } }>,
  reply: FastifyReply
) {
  const { datapack } = request.body;
  if (!datapack) {
    reply.status(400).send({ message: "Missing datapack id" });
    return;
  }
  if (!/^(\.dpk|\.txt|\.map|\.mdpk)$/.test(path.extname(datapack))) {
    reply.status(400).send({ message: "Invalid file extension" });
    return;
  }
  let filepath;
  let decryptedFilepath;
  try {
    filepath = realpathSync(path.resolve(assetconfigs.datapacksDirectory, datapack));
    decryptedFilepath = realpathSync(path.resolve(assetconfigs.decryptionDirectory, datapack.split(".")[0]!));
    if (
      !filepath.startsWith(path.resolve(assetconfigs.datapacksDirectory)) ||
      !decryptedFilepath.startsWith(path.resolve(assetconfigs.decryptionDirectory))
    ) {
      reply.status(403).send({ message: "Directory traversal detected" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ message: "Datapack file does not exist" });
    return;
  }
  if (!adminconfig.datapacks.includes(datapack) && !assetconfigs.activeDatapacks.includes(datapack)) {
    reply.status(404).send({ message: "Datapack not found" });
    return;
  }
  if (assetconfigs.activeDatapacks.includes(datapack)) {
    // don't write to file to prevent merge issues on server
    assetconfigs.activeDatapacks = assetconfigs.activeDatapacks.filter((pack) => pack !== datapack);
    adminconfig.removeDevDatapacks.push(datapack);
  }
  if (adminconfig.datapacks.includes(datapack)) {
    adminconfig.datapacks = adminconfig.datapacks.filter((pack) => pack !== datapack);
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
    reply.status(500).send({ message: "Deleted from indexes, but was not able to delete files" });
    return;
  }
  try {
    await writeFile(assetconfigs.adminConfigPath, JSON.stringify(adminconfig, null, 2));
  } catch (e) {
    reply.status(500).send({
      message:
        "Deleted and resolved configurations, but was not able to write to file. Check with server admin to make sure your configuration is still viable"
    });
  }
  reply.status(200).send({ message: `Datapack ${datapack} deleted` });
};

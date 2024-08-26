import { FastifyRequest, FastifyReply } from "fastify";
import { checkForUsersWithUsernameOrEmail, createUser, findUser, deleteUser } from "../database.js";
import { randomUUID } from "node:crypto";
import { hash } from "bcrypt-ts";
import { resolve, extname, join, relative, parse } from "path";
import { adminconfig, assetconfigs, checkFileExists, verifyFilepath } from "../util.js";
import { createWriteStream } from "fs";
import { readFile, realpath, rm, writeFile, rename } from "fs/promises";
import { deleteAllUserMetadata, deleteDatapackFoundInMetadata } from "../file-metadata-handler.js";
import { MultipartFile } from "@fastify/multipart";
import { serverDatapackIndex } from "../index.js";
import { loadIndexes } from "../load-packs.js";
import validator from "validator";
import { pipeline } from "stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "util";
import { assertAdminSharedUser, assertDatapackIndex } from "@tsconline/shared";
import { NewUser } from "../types.js";
import { uploadUserDatapackHandler } from "../upload-handlers.js";
import { parseExcelFile } from "../parse-excel-file.js";
import logger from "../error-logger.js";

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
    // add more root logic later (maybe a new table for root users or an extra column)
    if (user[0].email === (process.env.ADMIN_EMAIL || "test@gmail.com")) {
      reply.status(403).send({ error: "Cannot delete root user" });
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
    await deleteAllUserMetadata(assetconfigs.fileMetadata, uuid);
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
    const uploadDirectory = await realpath(resolve(assetconfigs.uploadDirectory));
    const userDirectory = await realpath(resolve(assetconfigs.uploadDirectory, uuid));
    const datapackDirectory = await realpath(resolve(userDirectory, "datapacks", datapack));
    if (!userDirectory.startsWith(uploadDirectory) || !datapackDirectory.startsWith(userDirectory)) {
      reply.status(403).send({ error: "Directory traversal detected" });
      return;
    }
    await deleteDatapackFoundInMetadata(assetconfigs.fileMetadata, relative(process.cwd(), datapackDirectory));
  } catch (error) {
    console.error(error);
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
  let file: MultipartFile | undefined;
  let filename: string | undefined;
  let filepath: string | undefined;
  let decryptedFilepath: string | undefined;
  const fields: { [fieldname: string]: string } = {};
  for await (const part of parts) {
    if (part.type === "file") {
      // DOWNLOAD FILE HERE AND SAVE TO FILE
      file = part;
      filename = file.filename;
      // store it temporarily in the upload directory
      // this is because we can't check if the file should overwrite the existing file until we verify it
      filepath = resolve(
        assetconfigs.datapacksDirectory,
        `__temp${(await hash(randomUUID(), 10)).replace(/[./]/g, "")}${filename}`
      );
      decryptedFilepath = resolve(assetconfigs.decryptionDirectory, parse(filename).name);
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
      if (file.file.bytesRead === 0) {
        await rm(filepath, { force: true });
        reply.status(400).send({ error: `Empty file cannot be uploaded` });
        return;
      }
    } else if (part.type === "field" && typeof part.fieldname === "string" && typeof part.value === "string") {
      fields[part.fieldname] = part.value;
    }
  }
  if (!file || !filepath || !filename || !decryptedFilepath) {
    reply.status(400).send({ error: "Missing file" });
    return;
  }
  fields.filepath = filepath;
  fields.filename = filename;
  const datapackMetadata = await uploadUserDatapackHandler(reply, fields, file.file.bytesRead).catch(async () => {
    filepath && (await rm(filepath, { force: true }));
    reply.status(500).send({ error: "Unexpected error with request fields." });
  });
  // if uploadUserDatapackHandler fails, it will send the error and delete the file and set the message so just return
  if (!datapackMetadata) {
    return;
  }
  const actualFilepath = join(assetconfigs.datapacksDirectory, filename);
  if (
    (await checkFileExists(actualFilepath)) &&
    (await checkFileExists(decryptedFilepath)) &&
    adminconfig.datapacks.some((datapack) => datapack.title === datapackMetadata.title) &&
    serverDatapackIndex[datapackMetadata.title]
  ) {
    filepath && (await rm(filepath, { force: true }));
    reply.status(409).send({ error: "Datapack already exists" });
    return;
  }
  try {
    await rename(filepath, actualFilepath);
    filepath = actualFilepath;
  } catch (e) {
    filepath && (await rm(filepath, { force: true }));
    reply.status(500).send({ error: "Error moving temp file" });
    return;
  }
  const errorHandler = async (error: string) => {
    if (!filepath || !decryptedFilepath || !filename)
      throw new Error("Missing required variables for file deletion and error handling");
    await rm(filepath, { force: true });
    await rm(decryptedFilepath, { force: true, recursive: true });
    if (serverDatapackIndex[filename]) {
      delete serverDatapackIndex[filename];
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
  const successful = await loadIndexes(serverDatapackIndex, assetconfigs.decryptionDirectory, [datapackMetadata], {
    type: "server"
  });
  if (!successful) {
    await errorHandler("Error parsing the datapack for chart generation");
    return;
  }
  try {
    if (!adminconfig.datapacks.some((dp) => dp.file === filename)) {
      adminconfig.datapacks.push(datapackMetadata);
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
  const datapackMetadata = adminconfig.datapacks.find((dp) => dp.title === datapack);
  if (!datapackMetadata) {
    reply.status(404).send({ error: "Datapack not found" });
    return;
  }
  if (adminconfig.datapacks.some((dp) => dp.file === datapack)) {
    adminconfig.datapacks = adminconfig.datapacks.filter((pack) => pack.file !== datapack);
  }
  if (serverDatapackIndex[datapack]) {
    delete serverDatapackIndex[datapack];
  }
  try {
    const filepath = join(assetconfigs.datapacksDirectory, datapackMetadata.file);
    const decryptedFilepath = join(assetconfigs.decryptionDirectory, parse(datapackMetadata.file).name);
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

export const getAllUserDatapacks = async function getAllUserDatapacks(request: FastifyRequest, reply: FastifyReply) {
  const { uuid } = request.body as { uuid: string };
  if (!uuid) {
    reply.status(400).send({ error: "Missing uuid in body" });
    return;
  }
  const datapackIndexFilepath = join(assetconfigs.uploadDirectory, uuid, "DatapackIndex.json");
  if (!(await verifyFilepath(datapackIndexFilepath))) {
    reply.send({});
    return;
  }
  let userDatapackIndex;
  try {
    userDatapackIndex = JSON.parse(await readFile(datapackIndexFilepath, "utf-8"));
    assertDatapackIndex(userDatapackIndex);
  } catch (e) {
    reply.status(500).send({ error: "Error reading user datapack index, possible corruption of file" });
  }
  reply.send(userDatapackIndex);
};

/**
 * Add users to a workshop
 * @param request
 * @param reply
 * @returns
 */
export const adminAddUsersToWorkshop = async function addUsersToWorkshop(request: FastifyRequest, reply: FastifyReply) {
  const parts = request.parts();
  let file: MultipartFile | undefined;
  let filename: string | undefined;
  let filepath: string | undefined;
  let emails: Set<string> | undefined;
  let workshopId: number | undefined;
  try {
    for await (const part of parts) {
      if (part.type === "file") {
        // DOWNLOAD FILE HERE AND SAVE TO FILE
        file = part;
        filename = file.filename;
        filepath = resolve(assetconfigs.uploadDirectory, filename);
        if (!filepath.startsWith(resolve(assetconfigs.uploadDirectory))) {
          reply.status(403).send({ error: "Directory traversal detected" });
          return;
        }
        if (!/^(\.xls|\.xlsx)$/.test(extname(file.filename))) {
          reply.status(400).send({ error: "Invalid file type" });
          return;
        }
        try {
          await pipeline(file.file, createWriteStream(filepath));
        } catch (error) {
          console.error(error);
          reply.status(500).send({ error: "Error saving file" });
          return;
        }
        if (file.file.truncated) {
          reply.status(400).send({ error: "File too large" });
          return;
        }
        if (file.file.bytesRead === 0) {
          reply.status(400).send({ error: `Empty file cannot be uploaded` });
          return;
        }
      } else if (part.fieldname === "emails") {
        emails = new Set(
          (part.value as string)
            .split(",")
            .map((email) => email.trim())
            .filter((email) => email !== "")
        );
      } else if (part.fieldname === "workshopId") {
        workshopId = parseInt(part.value as string);
      }
    }
    if (!workshopId || isNaN(workshopId)) {
      reply.status(400).send({ error: "Invalid or missing workshop id" });
      return;
    }
    if ((!emails || emails.size === 0) && (!file || !filepath || !filename)) {
      reply.status(400).send({ error: "Missing either emails or file" });
      return;
    }
    let emailList: string[] = [];
    let invalidEmails: string[] = [];
    if (file && filepath) {
      try {
        const excelData = await parseExcelFile(filepath);
        emailList = excelData.flat().map((email) => String(email).trim());
      } catch (e) {
        console.error("Error parsing excel file:", e);
        reply.status(400).send({ error: "Error parsing excel file" });
        return;
      }
      invalidEmails = emailList.filter((email) => !validator.isEmail(email));
    }
    if (emails) {
      invalidEmails.push(...Array.from(emails).filter((email) => !validator.isEmail(email)));
      emailList.push(...emails);
    }
    if (invalidEmails.length > 0) {
      reply.status(409).send({ error: "Invalid email addresses provided", invalidEmails: invalidEmails.join(", ") });
      return;
    }
    for (const email of emailList) {
      const user = await checkForUsersWithUsernameOrEmail(email, email);
      if (user.length > 0) {
        // TODO: Update existing user to workshop user
      } else {
        // TODO: These users cannot login yet, needs to be a workshop system to give them a password
        await createUser({
          email,
          hashedPassword: null,
          isAdmin: 0,
          emailVerified: 1,
          invalidateSession: 0,
          pictureUrl: null,
          username: email,
          uuid: randomUUID()
        });
        const newUser = await findUser({ email });
        if (newUser.length !== 1) {
          reply.status(500).send({ error: "Error creating user", invalidEmails: email });
          return;
        }
      }
    }
    reply.send({ message: "Users added" });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: "Unknown error" });
  } finally {
    if (file && filepath) {
      await rm(filepath, { force: true }).catch((e) => {
        logger.error("Error cleaning up file:", e);
      });
    }
  }
};

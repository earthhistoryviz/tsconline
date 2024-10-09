import { FastifyRequest, FastifyReply } from "fastify";
import {
  checkForUsersWithUsernameOrEmail,
  createUser,
  findUser,
  deleteUser,
  updateUser,
  createWorkshop,
  findWorkshop,
  getAndHandleWorkshopEnd,
  updateWorkshop,
  deleteWorkshop
} from "../database.js";
import { randomUUID } from "node:crypto";
import { hash } from "bcrypt-ts";
import { resolve, extname, join, relative, parse } from "path";
import { makeTempFilename, assetconfigs } from "../util.js";
import { createWriteStream } from "fs";
import { rm } from "fs/promises";
import { deleteAllUserMetadata, deleteDatapackFoundInMetadata } from "../file-metadata-handler.js";
import { MultipartFile } from "@fastify/multipart";
import { serverDatapackIndex } from "../index.js";
import validator from "validator";
import { pipeline } from "stream/promises";
import {
  SharedWorkshop,
  assertAdminSharedUser,
  assertSharedWorkshop,
  assertSharedWorkshopArray
} from "@tsconline/shared";
import { setupNewDatapackDirectoryInUUIDDirectory, uploadUserDatapackHandler } from "../upload-handlers.js";
import { AccountType, isAccountType, NewUser } from "../types.js";
import { parseExcelFile } from "../parse-excel-file.js";
import logger from "../error-logger.js";
import { addAdminConfigDatapack, getAdminConfigDatapacks, removeAdminConfigDatapack } from "./admin-config.js";
import "dotenv/config";
import {
  deleteAllUserDatapacks,
  deleteUserDatapack,
  doesDatapackFolderExistInAllUUIDDirectories,
  fetchAllUsersDatapacks,
  fetchUserDatapackFilepath
} from "../user/user-handler.js";

/**
 * Get all users for admin to configure on frontend
 * @param _request
 * @param reply
 */
export const getUsers = async function getUsers(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const users = await findUser({});
    const displayedUsers = await Promise.all(
      users.map(async (user) => {
        const { hashedPassword, workshopId, ...displayedUser } = user;
        let workshopTitle = "";
        if (workshopId) {
          const workshop = await findWorkshop({ workshopId });
          if (workshop && workshop.length === 1) {
            workshopTitle = workshop[0]?.title ?? "";
          }
        }
        return {
          ...displayedUser,
          username: displayedUser.username,
          isGoogleUser: hashedPassword === null,
          isAdmin: user.isAdmin === 1,
          emailVerified: user.emailVerified === 1,
          invalidateSession: user.invalidateSession === 1,
          ...(workshopTitle && { workshopTitle })
        };
      })
    );
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
      invalidateSession: 0,
      workshopId: 0,
      accountType: "default"
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
    await deleteAllUserDatapacks(uuid).catch(() => {});
    await deleteAllUserMetadata(assetconfigs.fileMetadata, uuid);
  } catch (error) {
    reply.status(500).send({ error: "Unknown error" });
    return;
  }
  reply.send({ message: "User deleted" });
};

/**
 * Admin sends a request to modify a user
 * @param request
 * @param reply
 * @returns
 */
export const adminModifyUser = async function adminModifyUser(request: FastifyRequest, reply: FastifyReply) {
  const { username, email, accountType, isAdmin } = request.body as {
    username: string;
    email: string;
    accountType?: AccountType;
    isAdmin?: number;
  };

  if (
    !email ||
    !validator.isEmail(email) ||
    (!accountType && isAdmin === undefined) ||
    !username ||
    (accountType && !isAccountType(accountType))
  ) {
    reply.status(400).send({ error: "Missing/invalid required fields" });
    return;
  }

  try {
    const user = await checkForUsersWithUsernameOrEmail(username, email);
    if (user.length === 0) {
      reply.status(409).send({ error: "User does not exist." });
      return;
    }

    const updateData: { accountType?: AccountType; isAdmin?: number } = {};
    if (accountType) updateData.accountType = accountType;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

    await updateUser({ email }, updateData);
    reply.send({ message: "User modified." });
  } catch (error) {
    reply.status(500).send({ error: "Database error" });
  }
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
    await deleteUserDatapack(uuid, datapack);
    const datapackDirectory = await fetchUserDatapackFilepath(uuid, datapack);
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
  let storedFileName: string | undefined;
  let filepath: string | undefined;
  let originalFileName: string | undefined;
  const fields: { [fieldname: string]: string } = {};
  for await (const part of parts) {
    if (part.type === "file") {
      // DOWNLOAD FILE HERE AND SAVE TO FILE
      file = part;
      originalFileName = file.filename;
      storedFileName = makeTempFilename(originalFileName);
      // store it temporarily in the upload directory
      // this is because we can't check if the file should overwrite the existing file until we verify it
      filepath = resolve(assetconfigs.datapacksDirectory, storedFileName);
      if (!filepath.startsWith(resolve(assetconfigs.datapacksDirectory))) {
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
  if (!file || !filepath || !storedFileName || !originalFileName) {
    reply.status(400).send({ error: "Missing file" });
    return;
  }
  fields.filepath = filepath;
  fields.storedFileName = storedFileName;
  fields.originalFileName = originalFileName;
  const datapackMetadata = await uploadUserDatapackHandler(reply, fields, file.file.bytesRead).catch(async () => {
    reply.status(500).send({ error: "Unexpected error with request fields." });
  });
  if (!datapackMetadata) {
    filepath && (await rm(filepath, { force: true }));
    return;
  }
  // if uploadUserDatapackHandler fails, it will send the error and delete the file and set the message so just return
  const errorHandler = async (error: string, errorCode: number = 500) => {
    if (!filepath || !storedFileName || !datapackMetadata)
      throw new Error("Missing required variables for file deletion and error handling");
    await rm(filepath, { force: true });
    if (serverDatapackIndex[datapackMetadata.title]) {
      delete serverDatapackIndex[datapackMetadata.title];
    }
    reply.status(errorCode).send({ error });
  };
  try {
    if (await doesDatapackFolderExistInAllUUIDDirectories("server", datapackMetadata.title)) {
      await errorHandler("Datapack already exists", 409);
      return;
    }
  } catch (e) {
    await errorHandler("Error checking if datapack exists");
    return;
  }
  try {
    const datapackIndex = await setupNewDatapackDirectoryInUUIDDirectory("server", filepath, datapackMetadata);
    if (!datapackIndex[datapackMetadata.title]) {
      throw new Error("Datapack not found in index");
    }
    serverDatapackIndex[datapackMetadata.title] = datapackIndex[datapackMetadata.title]!;
  } catch (error) {
    await errorHandler("Error setting up UUID Directory");
    return;
  }
  try {
    await addAdminConfigDatapack(datapackMetadata);
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
  const datapackMetadata = getAdminConfigDatapacks().find((dp) => dp.title === datapack);
  if (!datapackMetadata) {
    reply.status(404).send({ error: "Datapack not found" });
    return;
  }
  if (serverDatapackIndex[datapack]) {
    delete serverDatapackIndex[datapack];
  }
  try {
    const filepath = join(assetconfigs.datapacksDirectory, datapackMetadata.storedFileName);
    const decryptedFilepath = join(assetconfigs.decryptionDirectory, parse(datapackMetadata.storedFileName).name);
    await rm(filepath, { force: true });
    await rm(decryptedFilepath, { force: true, recursive: true });
  } catch (e) {
    reply.status(500).send({ error: "Deleted from indexes, but was not able to delete files" });
    return;
  }
  try {
    await removeAdminConfigDatapack(datapackMetadata);
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
  try {
    const datapackIndex = await fetchAllUsersDatapacks(uuid);
    reply.send(datapackIndex);
  } catch (e) {
    reply.status(500).send({ error: "Unknown error fetching user datapacks" });
    return;
  }
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
    const workshop = await getAndHandleWorkshopEnd(workshopId);
    if (!workshop) {
      reply.status(404).send({ error: "Workshop not found" });
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
        await updateUser({ email }, { workshopId });
      } else {
        await createUser({
          email,
          hashedPassword: await hash(email, 10),
          isAdmin: 0,
          emailVerified: 1,
          invalidateSession: 0,
          pictureUrl: null,
          username: email,
          uuid: randomUUID(),
          workshopId: workshopId,
          accountType: "default"
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

/**
 * Fetch all workshops
 * @param _request
 * @param reply
 * @returns
 */
export const adminGetWorkshops = async function adminGetWorkshops(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const workshops: SharedWorkshop[] = (await findWorkshop({})).map((workshop) => {
      const now = new Date();
      const start = new Date(workshop.start);
      const end = new Date(workshop.end);
      return {
        title: workshop.title,
        start: start.toISOString(),
        end: end.toISOString(),
        workshopId: workshop.workshopId,
        active: start <= now && now <= end
      };
    });
    assertSharedWorkshopArray(workshops);
    reply.send({ workshops });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: "Unknown error" });
  }
};

/**
 * Create a workshop
 * @param request
 * @param reply
 * @returns
 */
export const adminCreateWorkshop = async function adminCreateWorkshop(
  request: FastifyRequest<{ Body: { title: string; start: string; end: string } }>,
  reply: FastifyReply
) {
  const { title, start, end } = request.body;
  if (!title || !start || !end) {
    reply.status(400).send({ error: "Missing required fields" });
    return;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (
    isNaN(startDate.getTime()) ||
    isNaN(endDate.getTime()) ||
    startDate.getTime() > endDate.getTime() ||
    startDate.getTime() < Date.now()
  ) {
    reply.status(400).send({ error: "Invalid date format or dates are not valid" });
    return;
  }
  try {
    const existingWorkshops = await findWorkshop({ title, start: startDate.toISOString(), end: endDate.toISOString() });
    if (existingWorkshops.length > 0) {
      reply.status(409).send({ error: "Workshop with same title and dates already exists" });
      return;
    }
    const workshopId = await createWorkshop({
      title,
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });
    if (!workshopId) {
      throw new Error("Workshop not created");
    }
    const workshop: SharedWorkshop = {
      title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      workshopId,
      active: false
    };
    assertSharedWorkshop(workshop);
    reply.send({ workshop });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: "Unknown error" });
  }
};

/**
 * Edit a workshop
 * @param request
 * @param reply
 * @returns
 */
export const adminEditWorkshop = async function adminEditWorkshop(
  request: FastifyRequest<{ Body: { title: string; start: string; end: string; workshopId: number } }>,
  reply: FastifyReply
) {
  const { title, start, end, workshopId } = request.body;
  if (!workshopId || (!title && !start && !end)) {
    reply.status(400).send({ error: "Missing required fields" });
    return;
  }
  try {
    const fieldsToUpdate: Partial<SharedWorkshop> = {};
    if (title) {
      fieldsToUpdate.title = title;
    }
    if (start) {
      const startDate = new Date(start);
      if (isNaN(startDate.getTime())) {
        reply.status(400).send({ error: "Invalid start date" });
        return;
      }
      fieldsToUpdate.start = startDate.toISOString();
    }
    const existingWorkshop = (await findWorkshop({ workshopId }))[0];
    if (!existingWorkshop) {
      reply.status(404).send({ error: "Workshop not found" });
      return;
    }
    if (end) {
      const startDate = new Date(fieldsToUpdate.start ?? existingWorkshop.start);
      const endDate = new Date(end);
      if (isNaN(endDate.getTime()) || startDate.getTime() >= endDate.getTime()) {
        reply.status(400).send({ error: "Invalid end date" });
        return;
      }
      fieldsToUpdate.end = endDate.toISOString();
    }
    const newWorkshop = {
      title: fieldsToUpdate.title ?? existingWorkshop.title,
      start: fieldsToUpdate.start ?? existingWorkshop.start,
      end: fieldsToUpdate.end ?? existingWorkshop.end
    };
    const identicalWorkshops = await findWorkshop(newWorkshop);
    if (identicalWorkshops.length > 0) {
      reply.status(409).send({ error: "Workshop with same title and dates already exists" });
      return;
    }
    await updateWorkshop({ workshopId }, fieldsToUpdate);
    const now = new Date();
    const newStart = new Date(newWorkshop.start);
    const newEnd = new Date(newWorkshop.end);
    const workshop = {
      title: newWorkshop.title,
      start: newWorkshop.start,
      end: newWorkshop.end,
      workshopId: workshopId,
      active: newStart <= now && now <= newEnd
    };
    assertSharedWorkshop(workshop);
    reply.send({ workshop });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: "Unknown error" });
  }
};

/**
 * Delete a workshop
 * @param request
 * @param reply
 * @returns
 */
export const adminDeleteWorkshop = async function adminDeleteWorkshop(
  request: FastifyRequest<{ Body: { workshopId: number } }>,
  reply: FastifyReply
) {
  const { workshopId } = request.body;
  if (!workshopId) {
    reply.status(400).send({ error: "Missing workshopId" });
    return;
  }
  try {
    const workshop = await findWorkshop({ workshopId });
    if (workshop.length !== 1) {
      reply.status(404).send({ error: "Workshop not found" });
      return;
    }
    await deleteWorkshop({ workshopId });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: "Unknown error" });
  }
  reply.send({ message: "Workshop deleted" });
};

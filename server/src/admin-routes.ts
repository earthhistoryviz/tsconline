import { FastifyRequest, FastifyReply } from "fastify";
import { checkForUsersWithUsernameOrEmail, createUser, findUser } from "./database.js";
import { randomUUID } from "crypto";
import { hash } from "bcrypt-ts";
import { emailTestRegex } from "./login-routes.js";
import { deleteUser } from "./database.js";
import path from "path";
import { assetconfigs } from "./util.js";
import { realpathSync } from "fs";
import { access, rm, writeFile } from "fs/promises";
import { deleteDatapack, loadFileMetadata } from "./file-metadata-handler.js";

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
  if (!username || !email || !password || !emailTestRegex.test(email)) {
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
      password: await hash(password, 10),
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
  try {
    const user = await findUser({ uuid });
    if (!user) {
      reply.status(404).send({ message: "User not found" });
      return;
    }
    await deleteUser({ uuid });
    const userDirectory = realpathSync(path.resolve(assetconfigs.uploadDirectory, uuid));
    if (!userDirectory.startsWith(assetconfigs.uploadDirectory)) {
      throw new Error("Directory traversal detected");
    }
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

export const adminDeleteDatapack = async function adminDeleteDatapack(
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

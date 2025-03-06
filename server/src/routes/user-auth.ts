import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import {
  editDatapackMetadata,
  fetchSingleUserDatapack,
  requestDownload,
  uploadDatapack,
  userDeleteDatapack,
  fetchWorkshopDatapack,
  downloadDatapackFilesZip
} from "./user-routes.js";
import { findUser } from "../database.js";
import { checkRecaptchaToken } from "../verify.js";
import { googleRecaptchaBotThreshold } from "./login-routes.js";

async function verifySession(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "Unauthorized access" });
    return;
  }
  try {
    const user = await findUser({ uuid });
    if (!user || user.length !== 1 || !user[0]) {
      reply.status(401).send({ error: "Unauthorized access" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Database error" });
    return;
  }
}

async function verifyRecaptcha(request: FastifyRequest, reply: FastifyReply) {
  const recaptcha = request.headers["recaptcha-token"];
  if (!recaptcha || typeof recaptcha !== "string") {
    reply.status(400).send({ error: "Missing recaptcha token" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptcha);
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Recaptcha error" });
    return;
  }
}

export const userRoutes = async (fastify: FastifyInstance, _options: RegisterOptions) => {
  const looseRateLimit = {
    max: 70,
    timeWindow: "1 minute"
  };
  const moderateRateLimit = {
    max: 30,
    timeWindow: "1 minute"
  };
  const datapackTitleParams = {
    type: "object",
    properties: {
      datapack: { type: "string" }
    },
    required: ["datapack"]
  };
  const fetchWorkshopDatapackParams = {
    type: "object",
    properties: {
      workshopUUID: { type: "string" },
      datapackTitle: { type: "string" }
    },
    required: ["workshopUUID", "datapackTitle"]
  };
  const requestDownloadQuery = {
    type: "object",
    properties: {
      needEncryption: { type: "boolean" }
    }
  };
  const workshopTitleParams = {
    type: "object",
    properties: {
      workshopId: { type: "number" }
    },
    required: ["workshopId"]
  }
  const downloadDatapackFilesZipParams = {
    type: "object",
    properties: {
      datapackTitle: { type: "string" },
      uuid: { type: "string" },
      isPublic: { type: "boolean" }
    },
    required: ["datapackTitle", "uuid", "isPublic"]
  };
  const downloadDatapackFilesZipParams = {
    type: "object",
    properties: {
      datapackTitle: { type: "string" },
      uuid: { type: "string" },
      isPublic: { type: "boolean" }
    },
    required: ["datapackTitle", "uuid", "isPublic"]
  };
  fastify.addHook("preHandler", verifySession);
  fastify.addHook("preHandler", verifyRecaptcha);
  fastify.get(
    "/datapack/:datapack",
    {
      config: {
        rateLimit: looseRateLimit
      },
      schema: { params: datapackTitleParams }
    },
    fetchSingleUserDatapack
  );
  fastify.get(
    "/datapack/download/:datapack",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: datapackTitleParams, querystring: requestDownloadQuery }
    },
    requestDownload
  );
  // TODO - TRY WITH SCHEMA
  fastify.post("/datapack", { config: { rateLimit: moderateRateLimit } }, uploadDatapack);
  fastify.delete(
    "/datapack/:datapack",
    { config: { rateLimit: moderateRateLimit }, schema: { params: datapackTitleParams } },
    userDeleteDatapack
  );
  fastify.patch(
    "/datapack/:datapack",
    { config: { rateLimit: moderateRateLimit }, schema: { params: datapackTitleParams } },
    editDatapackMetadata
  );
  fastify.get(
    "/workshop/:workshopUUID/datapack/:datapackTitle",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: fetchWorkshopDatapackParams }
    },
    fetchWorkshopDatapack
  );
  fastify.get(
    "/workshop/download/:workshopId",
    { config: { rateLimit: looseRateLimit }, schema: { params: workshopTitleParams } },
    downloadWorkshopFilesZip
  );
  fastify.get(
    "/datapack/download/files/:datapackTitle/:uuid/:isPublic",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: downloadDatapackFilesZipParams }
    },
    downloadDatapackFilesZip
  );
};

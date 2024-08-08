import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import { fetchUserDatapacks, requestDownload } from "./user-routes.js";
import { verifyRecaptcha } from "../admin/admin-auth.js";
import { findUser } from "../database.js";

async function verifySession(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ error: "Unauthorized access" });
    return;
  }
  let user;
  try {
    user = await findUser({ uuid });
    if (!user || user.length !== 1 || !user[0]) {
      reply.status(401).send({ error: "Unauthorized access" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Database error" });
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
  const requestDownloadParams = {
    type: "object",
    properties: {
      filename: { type: "string" }
    },
    required: ["filename"]
  };
  const requestDownloadQuery = {
    type: "object",
    properties: {
      needEncryption: { type: "boolean" }
    }
  };
  fastify.addHook("preHandler", verifyRecaptcha);
  fastify.addHook("preHandler", verifySession);
  fastify.get("/datapacks", { config: { rateLimit: looseRateLimit } }, fetchUserDatapacks);
  fastify.get(
    "/datapack/:filename",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: requestDownloadParams, querystring: requestDownloadQuery }
    },
    requestDownload
  );
  // TODO - TRY WITH SCHEMA
  fastify.post("/datapack", { config: { rateLimit: moderateRateLimit } }, requestDownload);
};

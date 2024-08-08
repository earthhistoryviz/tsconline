import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import { requestDownload, uploadDatapack, userDeleteDatapack } from "./user-routes.js";
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
  const fileNameParams = {
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
  fastify.addHook("preHandler", verifySession);
  fastify.addHook("preHandler", verifyRecaptcha);
  fastify.get(
    "/datapack/:filename",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: fileNameParams, querystring: requestDownloadQuery }
    },
    requestDownload
  );
  // TODO - TRY WITH SCHEMA
  fastify.post("/datapack", { config: { rateLimit: moderateRateLimit } }, uploadDatapack);
  fastify.delete(
    "/datapack/:filename",
    { config: { rateLimit: moderateRateLimit }, schema: { params: fileNameParams } },
    userDeleteDatapack
  );
};

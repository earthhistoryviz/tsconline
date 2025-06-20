import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from "fastify";
import { findUser } from "../database.js";
import { googleRecaptchaBotThreshold } from "../routes/login-routes.js";
import { checkRecaptchaToken } from "../verify.js";
import { downloadWorkshopFilesZip, editWorkshopDatapackMetadata, serveWorkshopHyperlinks } from "./workshop-routes.js";

/**
 * This function verifiees the user making the request can edit/delete/change the workshops
 * Will currently only check if admin because only admins can create workshops
 * Abstracting this for the future when we want to allow users to create workshops
 * @param request
 * @param reply
 * @returns
 */
async function verifyAuthority<T extends FastifyRequest = FastifyRequest>(request: T, reply: FastifyReply) {
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
    request.user = user[0];
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
export const workshopRoutes = async (fastify: FastifyInstance, _options: RegisterOptions) => {
  const moderateRateLimit = {
    max: 30,
    timeWindow: "1 minute"
  };
  const editWorkshopDatapackMetadataParams = {
    type: "object",
    properties: {
      workshopUUID: { type: "string" },
      datapackTitle: { type: "string" }
    },
    required: ["workshopUUID", "datapackTitle"]
  };
  const workshopTitleParams = {
    type: "object",
    properties: {
      workshopId: { type: "number" }
    },
    required: ["workshopId"]
  };
  const serveWorkshopHyperlinksParams = {
    type: "object",
    properties: {
      workshopId: { type: "number" },
      filename: { type: "string", enum: ["presentation", "instructions"] }
    },
    required: ["workshopId", "filename"]
  };
  fastify.patch(
    "/:workshopUUID/datapack/:datapackTitle",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: editWorkshopDatapackMetadataParams },
      preHandler: [verifyAuthority, verifyRecaptcha]
    },
    editWorkshopDatapackMetadata
  );
  fastify.get(
    "/download/:workshopId",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: workshopTitleParams },
      preHandler: [verifyAuthority, verifyRecaptcha]
    },
    downloadWorkshopFilesZip
  );
  fastify.get(
    "/:workshopId/files/:filename",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: serveWorkshopHyperlinksParams },
      preHandler: [verifyAuthority]
    },
    serveWorkshopHyperlinks
  );
};

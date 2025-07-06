import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from "fastify";
import { findUser } from "../database.js";
import { downloadWorkshopFilesZip, editWorkshopDatapackMetadata, registerUserForWorkshop, serveWorkshopHyperlinks } from "./workshop-routes.js";
import { WorkshopRecaptchaActions } from "@tsconline/shared";
import { genericRecaptchaMiddlewarePrehandler } from "../routes/prehandlers.js";

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

export const workshopRoutes = async (fastify: FastifyInstance, _options: RegisterOptions) => {
  const moderateRateLimit = {
    max: 30,
    timeWindow: "1 minute"
  };
  const editWorkshopDatapackMetadataParams = {
    type: "object",
    properties: {
      workshopUUID: { type: "string", format: "uuid" },
      datapackTitle: { type: "string", minLength: 1 }
    },
    required: ["workshopUUID", "datapackTitle"]
  };
  const workshopIdParams = {
    type: "object",
    properties: {
      workshopId: { type: "integer", minimum: 1 }
    },
    required: ["workshopId"]
  };
  const serveWorkshopHyperlinksParams = {
    type: "object",
    properties: {
      workshopId: { type: "integer", minimum: 1 },
      filename: { type: "string", enum: ["presentation", "instructions"] }
    },
    required: ["workshopId", "filename"]
  };
  fastify.patch(
    "/:workshopUUID/datapack/:datapackTitle",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: editWorkshopDatapackMetadataParams },
      preHandler: [
        verifyAuthority,
        genericRecaptchaMiddlewarePrehandler(WorkshopRecaptchaActions.WORKSHOP_EDIT_DATAPACK_METADATA)
      ]
    },
    editWorkshopDatapackMetadata
  );
  fastify.get(
    "/download/:workshopId",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: workshopIdParams },
      preHandler: [
        verifyAuthority,
        genericRecaptchaMiddlewarePrehandler(WorkshopRecaptchaActions.WORKSHOP_DOWNLOAD_DATAPACK)
      ]
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
  fastify.post(
    "/register/:workshopId",
    {
    config: { rateLimit: moderateRateLimit },
    schema: { params: workshopIdParams },
    preHandler: [
      verifyAuthority,
      genericRecaptchaMiddlewarePrehandler(WorkshopRecaptchaActions.WORKSHOP_REGISTER)
    ]
  },
  registerUserForWorkshop
  )
};

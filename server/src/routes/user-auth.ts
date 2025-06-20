import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import {
  editDatapackMetadata,
  fetchSingleUserDatapack,
  requestDownload,
  uploadDatapack,
  userDeleteDatapack,
  fetchWorkshopDatapack,
  downloadDatapackFilesZip,
  uploadDatapackComment,
  updateDatapackComment,
  deleteDatapackComment
} from "./user-routes.js";
import { findUser } from "../database.js";
import { checkRecaptchaToken } from "../verify.js";
import { googleRecaptchaBotThreshold } from "./login-routes.js";
import { UserRecaptchaActions } from "@tsconline/shared";

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

async function verifyRecaptcha(request: FastifyRequest, reply: FastifyReply, action: string) {
  const recaptcha = request.headers["recaptcha-token"];
  if (!recaptcha || typeof recaptcha !== "string") {
    reply.status(400).send({ error: "Missing recaptcha token" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptcha, action);
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ error: "Recaptcha failed" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: "Recaptcha error" });
    return;
  }
}
const genericRecaptchaMiddlewarePrehandler = (action: string) => {
  const middleware = async function verifyRecaptchaPrehandler(request: FastifyRequest, reply: FastifyReply) {
    await verifyRecaptcha(request, reply, action);
  };
  middleware.recaptchaAction = action;
  return middleware;
};

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
  const downloadDatapackFilesZipParams = {
    type: "object",
    properties: {
      datapackTitle: { type: "string" },
      uuid: { type: "string" },
      isPublic: { type: "boolean" }
    },
    required: ["datapackTitle", "uuid", "isPublic"]
  };
  const uploadDatapackCommentParams = {
    type: "object",
    properties: {
      datapackTitle: { type: "string" }
    },
    required: ["datapackTitle"]
  };
  const updateDatapackCommentParams = {
    type: "object",
    properties: {
      commentId: { type: "number" }
    },
    required: ["commentId"]
  };
  const deleteDatapackCommentParams = {
    type: "object",
    properties: {
      commentId: { type: "number" }
    },
    required: ["commentId"]
  };
  fastify.get(
    "/datapack/:datapack",
    {
      config: {
        rateLimit: looseRateLimit
      },
      schema: { params: datapackTitleParams },
      preHandler: [verifySession, genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_FETCH_SINGLE_DATAPACK)]
    },
    fetchSingleUserDatapack
  );
  fastify.get(
    "/datapack/download/:datapack",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: datapackTitleParams, querystring: requestDownloadQuery },
      preHandler: [verifySession, genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_DOWNLOAD_DATAPACK)]
    },
    requestDownload
  );
  // TODO - TRY WITH SCHEMA
  fastify.post(
    "/datapack",
    {
      config: { rateLimit: moderateRateLimit },
      preHandler: [verifySession, genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_UPLOAD_DATAPACK)]
    },
    uploadDatapack
  );
  fastify.delete(
    "/datapack/:datapack",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: datapackTitleParams },
      preHandler: [verifySession, genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_DELETE_DATAPACK)]
    },
    userDeleteDatapack
  );
  fastify.patch(
    "/datapack/:datapack",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: datapackTitleParams },
      preHandler: [
        verifySession,
        genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_EDIT_DATAPACK_METADATA)
      ]
    },
    editDatapackMetadata
  );
  fastify.get(
    "/workshop/:workshopUUID/datapack/:datapackTitle",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: fetchWorkshopDatapackParams },
      preHandler: [
        verifySession,
        genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_FETCH_WORKSHOP_DATAPACK)
      ]
    },
    fetchWorkshopDatapack
  );
  fastify.get(
    "/datapack/download/files/:datapackTitle/:uuid/:isPublic",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: downloadDatapackFilesZipParams },
      preHandler: [
        verifySession,
        genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_DOWNLOAD_DATAPACK_FILES_ZIP)
      ]
    },
    downloadDatapackFilesZip
  );
  fastify.post(
    "/datapack/addComment/:datapackTitle",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: uploadDatapackCommentParams },
      preHandler: [
        verifySession,
        genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_UPLOAD_DATAPACK_COMMENT)
      ]
    },
    uploadDatapackComment
  );
  fastify.post(
    "/datapack/comments/report/:commentId",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: updateDatapackCommentParams },
      preHandler: [verifySession, genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_REPORT_COMMENT)]
    },
    updateDatapackComment
  );
  fastify.delete(
    "/datapack/comments/:commentId",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: deleteDatapackCommentParams },
      preHandler: [verifySession, genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_DELETE_COMMENT)]
    },
    deleteDatapackComment
  );
};

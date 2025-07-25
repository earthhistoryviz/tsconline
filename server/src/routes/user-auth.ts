import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import {
  editDatapackMetadata,
  fetchSingleUserDatapack,
  requestDownload,
  uploadDatapack,
  userDeleteDatapack,
  fetchWorkshopDatapack,
  downloadPublicDatapackFilesZip,
  uploadDatapackComment,
  updateDatapackComment,
  deleteDatapackComment,
  fetchUserDatapacksMetadata,
  fetchPublicUserDatapack,
  fetchUserHistoryMetadata,
  fetchUserHistory,
  deleteUserHistory,
  fetchDatapackComments,
  downloadPrivateDatapackFilesZip
} from "./user-routes.js";
import { findUser } from "../database.js";
import { UserRecaptchaActions } from "@tsconline/shared";
import { genericRecaptchaMiddlewarePrehandler } from "./prehandlers.js";

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
    request.user = user[0];
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
  const datapackTitleParams = {
    type: "object",
    properties: {
      datapack: { type: "string", minLength: 1 }
    },
    required: ["datapack"]
  };
  const fetchWorkshopDatapackParams = {
    type: "object",
    properties: {
      workshopUUID: { type: "string", minLength: 1 },
      datapackTitle: { type: "string", minLength: 1 }
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
      datapackTitle: { type: "string", minLength: 1 },
      uuid: { type: "string", minLength: 1 }
    },
    required: ["datapackTitle", "uuid"]
  };
  const uploadDatapackCommentParams = {
    type: "object",
    properties: {
      datapackTitle: { type: "string", minLength: 1 }
    },
    required: ["datapackTitle"]
  };
  const uploadDatapackCommentBody = {
    type: "object",
    properties: {
      commentText: { type: "string", minLength: 1 }
    },
    required: ["commentText"]
  };
  const updateDatapackCommentParams = {
    type: "object",
    properties: {
      commentId: { type: "number", minimum: 1 }
    },
    required: ["commentId"]
  };
  const updateDatapackCommentBody = {
    type: "object",
    properties: {
      flagged: { type: "number", enum: [0, 1] }
    },
    required: ["flagged"]
  };
  const deleteDatapackCommentParams = {
    type: "object",
    properties: {
      commentId: { type: "number", minimum: 1 }
    },
    required: ["commentId"]
  };
  const fetchPublicUserDatapackParams = {
    type: "object",
    properties: {
      uuid: { type: "string", minLength: 1 },
      datapackTitle: { type: "string", minLength: 1 }
    },
    required: ["uuid", "datapackTitle"]
  };
  const fetchUserHistoryParams = {
    type: "object",
    properties: {
      timestamp: { type: "string", format: "date-time", minLength: 1 }
    },
    required: ["timestamp"]
  };
  fastify.get(
    "/metadata",
    {
      config: {
        rateLimit: looseRateLimit
      },
      preHandler: [verifySession]
    },
    fetchUserDatapacksMetadata
  );
  fastify.get(
    "/uuid/:uuid/datapack/:datapackTitle",
    {
      config: {
        rateLimit: looseRateLimit
      },
      schema: { params: fetchPublicUserDatapackParams }
    },
    fetchPublicUserDatapack
  );
  fastify.get(
    "/history",
    {
      config: {
        rateLimit: looseRateLimit
      },
      preHandler: [verifySession]
    },
    fetchUserHistoryMetadata
  );
  fastify.get(
    "/history/:timestamp",
    {
      config: {
        rateLimit: looseRateLimit
      },
      schema: {
        params: fetchUserHistoryParams
      },
      preHandler: [verifySession]
    },
    fetchUserHistory
  );
  fastify.delete(
    "/history/:timestamp",
    {
      config: {
        rateLimit: looseRateLimit
      },
      schema: {
        params: fetchUserHistoryParams
      },
      preHandler: [verifySession]
    },
    deleteUserHistory
  );
  fastify.get(
    "/datapack/comments/:datapackTitle",
    {
      config: {
        rateLimit: looseRateLimit
      },
      schema: { params: uploadDatapackCommentParams }
    },
    fetchDatapackComments
  );
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
    "/datapack/download/public/files/:datapackTitle/:uuid",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: downloadDatapackFilesZipParams },
      preHandler: [genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_PUBLIC_DOWNLOAD_DATAPACK_FILES_ZIP)]
    },
    downloadPublicDatapackFilesZip
  );
  fastify.get(
    "/datapack/download/private/files/:datapackTitle/:uuid",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: downloadDatapackFilesZipParams },
      preHandler: [
        verifySession,
        genericRecaptchaMiddlewarePrehandler(UserRecaptchaActions.USER_PRIVATE_DOWNLOAD_DATAPACK_FILES_ZIP)
      ]
    },
    downloadPrivateDatapackFilesZip
  );
  fastify.post(
    "/datapack/addComment/:datapackTitle",
    {
      config: { rateLimit: looseRateLimit },
      schema: { params: uploadDatapackCommentParams, body: uploadDatapackCommentBody },
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
      schema: { params: updateDatapackCommentParams, body: updateDatapackCommentBody },
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

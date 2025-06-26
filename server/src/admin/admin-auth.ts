import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import { findUser } from "../database.js";
import {
  adminCreateUser,
  adminDeleteUserDatapack,
  adminDeleteUser,
  getUsers,
  adminDeleteOfficialDatapack,
  getAllUserDatapacks,
  adminAddUsersToWorkshop,
  adminCreateWorkshop,
  adminEditWorkshop,
  adminDeleteWorkshop,
  adminModifyUser,
  adminEditDatapackPriorities,
  adminAddOfficialDatapackToWorkshop,
  adminEditDatapackMetadata,
  adminUploadDatapack,
  adminUploadFilesToWorkshop,
  adminUploadCoverPictureToWorkshop,
  adminFetchSingleOfficialDatapack,
  adminDeleteDatapackComment
} from "./admin-routes.js";
import { checkRecaptchaToken } from "../verify.js";
import { googleRecaptchaBotThreshold } from "../routes/login-routes.js";
import { fetchAllPrivateOfficialDatapacks } from "../user/user-handler.js";
import { AdminRecaptchaActions } from "@tsconline/shared/dist/recaptcha-keys.js";

async function verifyAdmin(request: FastifyRequest, reply: FastifyReply) {
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
  const { isAdmin } = user[0];
  if (!isAdmin) {
    reply.status(401).send({ error: "Unauthorized access" });
    return;
  }
  request.user = user[0];
}

async function verifyRecaptcha(request: FastifyRequest, reply: FastifyReply, action: string) {
  const recaptchaToken = request.headers["recaptcha-token"];

  if (!recaptchaToken || typeof recaptchaToken !== "string") {
    reply.status(400).send({ error: "Missing recaptcha token" });
    return;
  }

  try {
    const score = await checkRecaptchaToken(recaptchaToken, action);
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

export const adminRoutes = async (fastify: FastifyInstance, _options: RegisterOptions) => {
  const looseRateLimit = {
    max: 70,
    timeWindow: "1 minute"
  };
  const moderateRateLimit = {
    max: 30,
    timeWindow: "1 minute"
  };
  const adminFetchSingleOfficialDatapackParams = {
    type: "object",
    properties: {
      datapackTitle: { type: "string" }
    },
    required: ["datapackTitle"]
  };
  const adminCreateUserBody = {
    type: "object",
    properties: {
      username: { type: "string" },
      email: { type: "string" },
      password: { type: "string" },
      pictureUrl: { type: "string" },
      isAdmin: { type: "number" }
    },
    required: ["email", "password"]
  };
  const adminUUIDbody = {
    type: "object",
    properties: {
      uuid: { type: "string", format: "uuid" }
    },
    required: ["uuid"]
  };
  const adminDeleteUserDatapackBody = {
    type: "object",
    properties: {
      uuid: { type: "string" },
      datapack: { type: "string" }
    },
    required: ["uuid", "datapack"]
  };
  const adminDeleteOfficialDatapackBody = {
    type: "object",
    properties: {
      datapack: { type: "string" }
    },
    required: ["datapack"]
  };
  const adminCreateWorkshopBody = {
    type: "object",
    properties: {
      title: { type: "string", minLength: 1 },
      start: { type: "string", format: "date-time" },
      end: { type: "string", format: "date-time" },
      regRestrict: { type: "number", enum: [0, 1] },
      creatorUUID: { type: "string", minLength: 1 },
      regLink: { type: "string", format: "uri" },
      description: { type: "string", minLength: 1 }
    },
    required: ["title", "start", "end", "regRestrict", "creatorUUID"]
  };
  const adminEditWorkshopBody = {
    type: "object",
    properties: {
      workshopId: { type: "number", minimum: 1 },
      title: { type: "string", minLength: 1 },
      start: { type: "string", format: "date-time" },
      end: { type: "string", format: "date-time" },
      regRestrict: { type: "number", enum: [0, 1] },
      creatorUUID: { type: "string", minLength: 1 },
      regLink: { type: "string", format: "uri" },
      description: { type: "string", minLength: 1 }
    },
    required: ["workshopId"],
    not: {
      required: ["workshopId"],
      maxProperties: 1
    },
    additionalProperties: false
  };
  const adminDeleteWorkshopBody = {
    type: "object",
    properties: {
      workshopId: { type: "number" }
    },
    required: ["workshopId"]
  };
  const adminModifyUserBody = {
    type: "object",
    properties: {
      username: { type: "string" },
      email: { type: "string" },
      accountType: { type: "string" },
      isAdmin: { type: "number" }
    },
    required: ["username", "email"],
    anyOf: [{ required: ["accountType"] }, { required: ["isAdmin"] }]
  };
  const adminAddOfficialDatapackToWorkshopBody = {
    type: "object",
    properties: {
      workshopId: { type: "number" },
      datapackTitle: { type: "string", minLength: 1 }
    },
    required: ["workshopId", "datapackTitle"]
  };
  const adminEditDatapackMetadataBody = {
    type: "object",
    properties: {
      datapack: { type: "string", minLength: 1 }
    },
    required: ["datapack"]
  };
  const addWorkshopCoverParams = {
    type: "object",
    properties: {
      workshopId: { type: "integer", minimum: 1 }
    },
    required: ["workshopId"]
  };
  const addWorkshopFileParams = {
    type: "object",
    properties: {
      workshopId: { type: "number" }
    },
    required: ["workshopId"]
  };
  const deleteDatapackCommentParams = {
    type: "object",
    properties: {
      commentId: { type: "integer", minimum: 1 }
    },
    required: ["commentId"]
  };

  fastify.addHook("preHandler", verifyAdmin);
  fastify.post(
    "/users",
    {
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_FETCH_USERS)],
      config: { rateLimit: looseRateLimit }
    },
    getUsers
  );
  fastify.get(
    "/official/datapacks/private",
    {
      config: { rateLimit: looseRateLimit },
      preHandler: [
        genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_FETCH_ALL_PRIVATE_OFFICIAL_DATAPACKS)
      ]
    },
    fetchAllPrivateOfficialDatapacks
  );
  fastify.get(
    "/official/datapack/:datapackTitle",
    {
      schema: { params: adminFetchSingleOfficialDatapackParams },
      config: { rateLimit: looseRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_FETCH_OFFICIAL_DATAPACK)]
    },
    adminFetchSingleOfficialDatapack
  );
  fastify.post(
    "/user",
    {
      schema: {
        body: adminCreateUserBody
      },
      config: {
        rateLimit: moderateRateLimit
      },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_CREATE_USER)]
    },
    adminCreateUser
  );
  fastify.delete(
    "/user",
    {
      schema: {
        body: adminUUIDbody
      },
      config: {
        rateLimit: moderateRateLimit
      },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_DELETE_USER)]
    },
    adminDeleteUser
  );
  fastify.delete(
    "/user/datapack",
    {
      schema: {
        body: adminDeleteUserDatapackBody
      },
      config: {
        rateLimit: moderateRateLimit
      },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_DELETE_USER_DATAPACKS)]
    },
    adminDeleteUserDatapack
  );
  fastify.post(
    "/official/datapack",
    {
      config: { rateLimit: moderateRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_UPLOAD_OFFICIAL_DATAPACK)]
    },
    adminUploadDatapack
  );
  fastify.delete(
    "/official/datapack",
    {
      schema: {
        body: adminDeleteOfficialDatapackBody
      },
      config: {
        rateLimit: moderateRateLimit
      },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_DELETE_OFFICIAL_DATAPACK)]
    },
    adminDeleteOfficialDatapack
  );
  fastify.post(
    "/user/datapacks",
    {
      schema: { body: adminUUIDbody },
      config: { rateLimit: looseRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_FETCH_USER_DATAPACKS)]
    },
    getAllUserDatapacks
  );
  fastify.post(
    "/workshop/users",
    {
      config: { rateLimit: looseRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_ADD_USERS_TO_WORKSHOP)]
    },
    adminAddUsersToWorkshop
  );
  fastify.post(
    "/workshop",
    {
      schema: { body: adminCreateWorkshopBody },
      config: { rateLimit: moderateRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_CREATE_WORKSHOP)]
    },
    adminCreateWorkshop
  );
  fastify.patch(
    "/workshop",
    {
      schema: { body: adminEditWorkshopBody },
      config: { rateLimit: moderateRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_EDIT_WORKSHOP)]
    },
    adminEditWorkshop
  );
  fastify.delete(
    "/workshop",
    {
      schema: { body: adminDeleteWorkshopBody },
      config: { rateLimit: moderateRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_DELETE_WORKSHOP)]
    },
    adminDeleteWorkshop
  );
  fastify.patch(
    "/user",
    {
      schema: { body: adminModifyUserBody },
      config: { rateLimit: moderateRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_EDIT_USER)]
    },
    adminModifyUser
  );
  fastify.patch(
    "/official/datapack/priority",
    {
      config: { rateLimit: moderateRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_UPDATE_DATAPACK_PRIORITY)]
    },
    adminEditDatapackPriorities
  );
  fastify.post(
    "/workshop/datapack",
    {
      config: { rateLimit: moderateRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_UPLOAD_DATAPACK_TO_WORKSHOP)]
    },
    adminUploadDatapack
  );
  fastify.post(
    "/workshop/official/datapack",
    {
      schema: { body: adminAddOfficialDatapackToWorkshopBody },
      config: { rateLimit: moderateRateLimit },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_ADD_OFFICIAL_DATAPACK_TO_WORKSHOP)]
    },
    adminAddOfficialDatapackToWorkshop
  );
  fastify.patch(
    "/official/datapack/:datapack",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: adminEditDatapackMetadataBody },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_EDIT_OFFICIAL_DATAPACK)]
    },
    adminEditDatapackMetadata
  );
  fastify.post(
    "/workshop/files/:workshopId",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: addWorkshopFileParams },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_UPLOAD_FILES_TO_WORKSHOP)]
    },
    adminUploadFilesToWorkshop
  );
  fastify.post(
    "/workshop/cover/:workshopId",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: addWorkshopCoverParams },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_UPLOAD_COVER_PICTURE_TO_WORKSHOP)]
    },
    adminUploadCoverPictureToWorkshop
  );
  fastify.delete(
    "/datapack/comments/:commentId",
    {
      config: { rateLimit: moderateRateLimit },
      schema: { params: deleteDatapackCommentParams },
      preHandler: [genericRecaptchaMiddlewarePrehandler(AdminRecaptchaActions.ADMIN_DELETE_DATAPACK_COMMENT)]
    },
    adminDeleteDatapackComment
  );
};

import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import { findUser } from "../database.js";
import {
  adminCreateUser,
  adminDeleteUserDatapack,
  adminDeleteUser,
  getUsers,
  adminUploadOfficialDatapack,
  adminDeleteOfficialDatapack,
  getAllUserDatapacks,
  adminAddUsersToWorkshop,
  adminCreateWorkshop,
  adminGetWorkshops,
  adminEditWorkshop,
  adminDeleteWorkshop,
  adminModifyUser,
  adminEditDatapackPriorities,
  adminUploadDatapackToWorkshop
} from "./admin-routes.js";
import { checkRecaptchaToken } from "../verify.js";
import { googleRecaptchaBotThreshold } from "../routes/login-routes.js";
import { fetchAllPrivateOfficialDatapacks } from "../user/user-handler.js";

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

export const adminRoutes = async (fastify: FastifyInstance, _options: RegisterOptions) => {
  const looseRateLimit = {
    max: 70,
    timeWindow: "1 minute"
  };
  const moderateRateLimit = {
    max: 30,
    timeWindow: "1 minute"
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
      uuid: { type: "string" }
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
      title: { type: "string" },
      start: { type: "string" },
      end: { type: "string" }
    },
    required: ["title", "start", "end"]
  };
  const adminEditWorkshopBody = {
    type: "object",
    properties: {
      title: { type: "string" },
      start: { type: "string" },
      end: { type: "string" },
      workshopId: { type: "number" }
    },
    required: ["workshopId"]
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
  fastify.addHook("preHandler", verifyAdmin);
  fastify.addHook("preHandler", verifyRecaptcha);
  fastify.post("/users", { config: { rateLimit: looseRateLimit } }, getUsers);
  fastify.get(
    "/official/datapacks/private",
    { config: { rateLimit: looseRateLimit } },
    fetchAllPrivateOfficialDatapacks
  );
  fastify.post(
    "/user",
    {
      schema: {
        body: adminCreateUserBody
      },
      config: {
        rateLimit: moderateRateLimit
      }
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
      }
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
      }
    },
    adminDeleteUserDatapack
  );
  fastify.post("/official/datapack", { config: { rateLimit: moderateRateLimit } }, adminUploadOfficialDatapack);
  fastify.delete(
    "/official/datapack",
    {
      schema: {
        body: adminDeleteOfficialDatapackBody
      },
      config: {
        rateLimit: moderateRateLimit
      }
    },
    adminDeleteOfficialDatapack
  );
  fastify.post(
    "/user/datapacks",
    { schema: { body: adminUUIDbody }, config: { rateLimit: looseRateLimit } },
    getAllUserDatapacks
  );
  fastify.post("/workshop/users", { config: { rateLimit: looseRateLimit } }, adminAddUsersToWorkshop);
  fastify.get("/workshops", { config: { rateLimit: looseRateLimit } }, adminGetWorkshops);
  fastify.post(
    "/workshop",
    { schema: { body: adminCreateWorkshopBody }, config: { rateLimit: moderateRateLimit } },
    adminCreateWorkshop
  );
  fastify.patch(
    "/workshop",
    { schema: { body: adminEditWorkshopBody }, config: { rateLimit: moderateRateLimit } },
    adminEditWorkshop
  );
  fastify.delete(
    "/workshop",
    { schema: { body: adminDeleteWorkshopBody }, config: { rateLimit: moderateRateLimit } },
    adminDeleteWorkshop
  );
  fastify.patch(
    "/user",
    { schema: { body: adminModifyUserBody }, config: { rateLimit: moderateRateLimit } },
    adminModifyUser
  );
  fastify.patch(
    "/official/datapack/priority",
    { config: { rateLimit: moderateRateLimit } },
    adminEditDatapackPriorities
  );
  fastify.post("/workshop/datapack", { config: { rateLimit: moderateRateLimit } }, adminUploadDatapackToWorkshop);
};

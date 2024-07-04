import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import { findUser } from "./database.js";
import {
  adminCreateUser,
  adminDeleteUserDatapack,
  adminDeleteUser,
  getUsers,
  adminUploadServerDatapack,
  adminDeleteServerDatapack
} from "./admin-routes.js";
import { checkRecaptchaToken } from "./verify.js";
import { googleRecaptchaBotThreshold } from "./login-routes.js";

async function verifyAdmin(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ message: "Unauthorized access" });
    return;
  }
  let user;
  try {
    user = await findUser({ uuid });
    if (!user || user.length !== 1 || !user[0]) {
      reply.status(401).send({ message: "Unauthorized access" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ message: "Database error" });
    return;
  }
  const { isAdmin } = user[0];
  if (!isAdmin) {
    reply.status(401).send({ message: "Unauthorized access" });
    return;
  }
}

async function verifyRecaptcha(request: FastifyRequest, reply: FastifyReply) {
  const recaptcha = request.headers["recaptcha-token"];
  if (!recaptcha || typeof recaptcha !== "string") {
    reply.status(400).send({ message: "Missing recaptcha token" });
    return;
  }
  try {
    const score = await checkRecaptchaToken(recaptcha);
    if (score < googleRecaptchaBotThreshold) {
      reply.status(422).send({ message: "Recaptcha failed" });
      return;
    }
  } catch (e) {
    reply.status(500).send({ message: "Recaptcha error" });
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
  fastify.addHook("preHandler", verifyAdmin);
  fastify.addHook("preHandler", verifyRecaptcha);
  fastify.get("/users", { config: { rateLimit: looseRateLimit } }, getUsers);
  fastify.post(
    "/user",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            username: { type: "string" },
            email: { type: "string" },
            password: { type: "string" },
            pictureUrl: { type: "string" },
            isAdmin: { type: "number" }
          },
          required: ["username", "email", "password"]
        }
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
        body: {
          type: "object",
          properties: {
            uuid: { type: "string" }
          },
          required: ["uuid"]
        }
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
        body: {
          type: "object",
          properties: {
            uuid: { type: "string" },
            datapack: { type: "string" }
          },
          required: ["uuid", "datapack"]
        }
      },
      config: {
        rateLimit: moderateRateLimit
      }
    },
    adminDeleteUserDatapack
  );
  fastify.post("/server/datapack", adminUploadServerDatapack);
  fastify.delete(
    "/server/datapack",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            datapack: { type: "string" }
          },
          required: ["datapack"]
        }
      },
      config: {
        rateLimit: moderateRateLimit
      }
    },
    adminDeleteServerDatapack
  );
};

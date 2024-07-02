import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";
import { findUser } from "./database.js";
import { adminCreateUser, adminDeleteDatapack, adminDeleteUser, getUsers } from "./admin-routes.js";
import { checkRecaptchaToken } from "./verify.js";
import { googleRecaptchaBotThreshold } from "./login-routes.js";

async function verifyAdmin(request: FastifyRequest, reply: FastifyReply) {
  const uuid = request.session.get("uuid");
  if (!uuid) {
    reply.status(401).send({ message: "Unauthorized access" });
    return;
  }
  const user = await findUser({ uuid });
  if (!user || user.length !== 1) {
    reply.status(401).send({ message: "Unauthorized access" });
    return;
  }
  const { isAdmin } = user[0]!;
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
  const score = await checkRecaptchaToken(recaptcha);
  if (score < googleRecaptchaBotThreshold) {
    reply.status(422).send({ message: "Recaptcha failed" });
    return;
  }
}

export const adminRoutes = async (fastify: FastifyInstance, _options: RegisterOptions) => {
  fastify.addHook("preHandler", fastify.auth([verifyAdmin, verifyRecaptcha]));
  fastify.get("/users", getUsers);
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
      }
    },
    adminDeleteDatapack
  );
};

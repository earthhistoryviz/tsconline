import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { findUser } from "./database";
import { createUser, getUsers } from "./admin-routes";

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

export const adminRoute = async(fastify: FastifyInstance) => {
    fastify.addHook("preHandler", fastify.auth([verifyAdmin]));
    fastify.get("/users", getUsers);
    fastify.post("/create-user", {
            schema: {
                body: {
                    type: "object",
                    properties: {
                        username: { type: "string" },
                        email: { type: "string" },
                        password: { type: "string" },
                        pictureUrl: { type: "string" }
                    },
                    required: ["username", "email", "password"]
                }
            }
        },
        createUser);
}
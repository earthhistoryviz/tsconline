import { FastifyRequest, FastifyReply } from "fastify";
import { findUser } from "./database";

export const getUsers = async function getUsers(_request: FastifyRequest, reply: FastifyReply) {
    const users = await findUser({});
    reply.send(users);
}

export const createUser = async function createUser(request: FastifyRequest, reply: FastifyReply) {
    const { username, email, password, pictureUrl } = request.body as {
        username: string;
        email: string;
        password: string;
        pictureUrl: string;
    };
    if (!username || !email || !password) {
        reply.status(400).send({ message: "Missing required fields" });
        return;
    }
    // create user
    reply.send({ message: "User created" });
}

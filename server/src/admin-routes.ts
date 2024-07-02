import { FastifyRequest, FastifyReply } from "fastify";
import { checkForUsersWithUsernameOrEmail, createUser, findUser } from "./database";
import { randomUUID } from "crypto";
import { hash } from "bcrypt-ts";
import { emailTestRegex } from "./login-routes";

export const getUsers = async function getUsers(_request: FastifyRequest, reply: FastifyReply) {
    const users = await findUser({});
    reply.send(users);
}

export const createAdminOriginUser = async function createAdminOriginUser(request: FastifyRequest, reply: FastifyReply) {
    const { username, email, password, pictureUrl, isAdmin } = request.body as {
        username: string;
        email: string;
        password: string;
        pictureUrl: string;
        isAdmin: number;
    };
    if (!username || !email || !password || !emailTestRegex.test(email)) {
        reply.status(400).send({ message: "Missing/invalid required fields" });
        return;
    }
    try {
        const user = await checkForUsersWithUsernameOrEmail( username, email );
        if (user.length > 0) {
            reply.status(409).send({ message: "User already exists" });
            return;
        }
        const customUser = {
            username,
            email,
            password: await hash(password, 10),
            uuid: randomUUID(),
            pictureUrl: pictureUrl ? pictureUrl : null,
            isAdmin: isAdmin ? 1 : 0,
            emailVerified: 1,
            invalidateSession: 0
        }
        await createUser(customUser);
        const newUser = await findUser({ username });
        if (newUser.length !== 1) {
            throw new Error("User not created");
        }
    } catch (error) {
        reply.status(500).send({ message: "Database error" });
        return;
    }
    reply.send({ message: "User created" });
}

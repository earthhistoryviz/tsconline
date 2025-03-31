import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from "fastify";
import { findUser } from "../database";
import { autoPlotPoints, convertCrossPlot } from "./crossplot-routes";

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

export const crossPlotRoutes = async (fastify: FastifyInstance, _options: RegisterOptions) => {
  const looseRateLimit = {
    max: 70,
    timeWindow: "1 minute"
  };
  fastify.addHook("preHandler", verifySession);
  fastify.post("/convert", { config: { rateLimit: looseRateLimit } }, convertCrossPlot);
  fastify.post("/autoplot", { config: { rateLimit: looseRateLimit } }, autoPlotPoints);
};

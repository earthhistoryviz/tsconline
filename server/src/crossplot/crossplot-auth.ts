import { FastifyInstance, RegisterOptions } from "fastify";
import { autoPlotPoints, convertCrossPlot } from "./crossplot-routes.js";

export const crossPlotRoutes = async (fastify: FastifyInstance, _options: RegisterOptions) => {
  const looseRateLimit = {
    max: 70,
    timeWindow: "1 minute"
  };
  fastify.post("/convert", { config: { rateLimit: looseRateLimit } }, convertCrossPlot);
  fastify.post("/autoplot", { config: { rateLimit: looseRateLimit } }, autoPlotPoints);
};

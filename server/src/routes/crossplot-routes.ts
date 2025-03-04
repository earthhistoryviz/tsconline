import { assertConvertCrossPlotRequest } from "@tsconline/shared";
import { FastifyReply, FastifyRequest } from "fastify";

export const convertCrossplot = async function convertCrossplot(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body;
  assertConvertCrossPlotRequest(body);
};

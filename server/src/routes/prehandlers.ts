import { FastifyReply, FastifyRequest } from "fastify";
import { checkRecaptchaToken } from "../verify.js";
import { googleRecaptchaBotThreshold } from "./login-routes.js";
import { AdminRecaptchaActions, UserRecaptchaActions, WorkshopRecaptchaActions } from "@tsconline/shared";

export type RecaptchaAction = AdminRecaptchaActions | UserRecaptchaActions | WorkshopRecaptchaActions;

export async function verifyRecaptcha(request: FastifyRequest, reply: FastifyReply, action: RecaptchaAction) {
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

export const genericRecaptchaMiddlewarePrehandler = (action: RecaptchaAction) => {
  const middleware = async function verifyRecaptchaPrehandler(request: FastifyRequest, reply: FastifyReply) {
    await verifyRecaptcha(request, reply, action);
  };
  middleware.recaptchaAction = action;
  return middleware;
};

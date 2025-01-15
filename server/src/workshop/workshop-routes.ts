import { FastifyRequest, FastifyReply } from "fastify";
import { editDatapackMetadataRequestHandler } from "../cloud/general-cloud-requests.js";
import { findUser } from "../database.js";
import { verifyWorkshopValidity } from "./workshop-util.js";

export const editWorkshopDatapackMetadata = async function editWorkshopDatapackMetadata(
  request: FastifyRequest<{ Params: { workshopUUID: string; datapackTitle: string } }>,
  reply: FastifyReply
) {
  const { workshopUUID, datapackTitle } = request.params;
  const uuid = request.session.get("uuid");
  try {
    const user = await findUser({ uuid });
    if (!user || user.length !== 1 || !user[0]) {
      reply.status(401).send({ error: "Unauthorized access" });
      return;
    }
    const result = verifyWorkshopValidity(workshopUUID, user[0].userId);
    if (result.code !== 200) {
      reply.status(result.code).send({ error: result.message });
      return;
    }
    const response = await editDatapackMetadataRequestHandler(request.parts(), workshopUUID, datapackTitle);
    reply.status(response.code).send({ message: response.message });
  } catch (e) {
    reply.status(500).send({ error: "Failed to edit metadata" });
  }
};

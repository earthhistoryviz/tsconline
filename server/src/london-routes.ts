import { processLondonDatapack } from "./upload-london.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { readConfig, configPaths } from "./add-dev-config.js";

export const fetchLondonDatapack = async function fetchLondonDatapack(_request: FastifyRequest, reply: FastifyReply) {
  try {
    await processLondonDatapack();
    const config = await readConfig(configPaths.london);
    console.log("London Config from route: ", config);
    return reply.status(200).send({ metadata: config, message: "London datapack migration started" });
  } catch (error) {
    console.error("Error fetching London datapack:", error);
    return reply.status(500).send({ error: "Failed to fetch London datapack" });
  }
};
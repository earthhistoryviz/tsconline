import { retrieveLondonDatapack } from "./upload-london.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { readConfig, configPaths } from "./add-dev-config.js";
import { DatapackMetadata } from "@tsconline/shared";
export const fetchLondonDatapack = async function (
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const londonDatapack: File = await retrieveLondonDatapack();
    if (!londonDatapack) return reply.status(404).send({ error: "London datapack not found" });
    console.log("London datapack file retrieved:", londonDatapack);

    const configResult = await readConfig(configPaths.london);
    const config: DatapackMetadata | undefined = configResult[0];
    if (!config) {
      return reply.status(500).send({ error: "London datapack config not found" });
    }
    const arrayBuffer = await londonDatapack.arrayBuffer();

    // Build a Buffer for Fastify to send cleanly
    const buf = Buffer.from(arrayBuffer);
    const mime = "text/plain";
    const filename = "london-datapack.txt";

    // If this is cross-origin, expose the header so fetch() can read it
    reply.header("Access-Control-Expose-Headers", "X-Config");

    // Set metadata header (keep it small!)
    reply.header("X-Config", JSON.stringify(config));

    reply
      .header("Content-Type", mime)
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(buf); // <- important
  } catch (err) {
    console.error("Error fetching London datapack:", err);
    return reply.status(500).send({ error: "Failed to fetch London datapack" });
  }
};
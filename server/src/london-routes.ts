import { retrieveLondonDatapack } from "./upload-london.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { readLondonConfig } from "./add-dev-config.js";
import { DatapackMetadata } from "@tsconline/shared";
export const fetchLondonDatapack = async function (_request: FastifyRequest, reply: FastifyReply) {
  try {
    const londonDatapack: File = await retrieveLondonDatapack();
    if (!londonDatapack) return reply.status(404).send({ error: "London datapack not found" });

    let config: DatapackMetadata | undefined;
    try {
      const londonConfig = await readLondonConfig();
      config = londonConfig[0];
    } catch (e) {
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

    reply.header("Content-Type", mime).header("Content-Disposition", `attachment; filename="${filename}"`).send(buf);
  } catch (err) {
    console.error("Error fetching London datapack:", err);
    return reply.status(500).send({ error: "Failed to fetch London datapack" });
  }
};

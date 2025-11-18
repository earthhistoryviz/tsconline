import type { FastifyRequest, FastifyReply } from "fastify";
import { DatapackMetadata, ChartRequest, ChartProgressUpdate } from "@tsconline/shared";
import { loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { fetchAllPrivateOfficialDatapacks } from "../user/user-handler.js";
import { extractMetadataFromDatapack } from "../util.js";
import { generateChart } from "../chart-generation/generate-chart.js";

export async function mcpGenerateChart(_request: FastifyRequest, _reply: FastifyReply) {
  try {
    const chartRequest = _request.body as unknown as ChartRequest;
    const uuid = ((_request.query as unknown) as { uuid?: string })?.uuid;

    // We don't stream progress back to MCP for now; MCP only needs the final chart info.
    const onProgress = (_p: ChartProgressUpdate) => {
      // no-op or could log progress for server-side debugging
    };

    const result = await generateChart(chartRequest, onProgress, uuid);
    _reply.send(result);
  } catch (err) {
    _reply.status(500).send({ error: (err as Error)?.message ?? String(err) });
  }
}

/**
 * MCP route: list datapacks (public + official)
 */
export async function mcpListDatapacks(_request: FastifyRequest, reply: FastifyReply) {
  const publicDatapacks = await loadPublicUserDatapacks();
  const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
  const combined = [...publicDatapacks, ...officialDatapacks];
  const datapackMetadata: DatapackMetadata[] = combined.map((dp) => extractMetadataFromDatapack(dp));
  reply.send(datapackMetadata);
}
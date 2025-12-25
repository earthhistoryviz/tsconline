import type { FastifyRequest, FastifyReply } from "fastify";
import { DatapackMetadata, ChartRequest, ChartProgressUpdate, DatapackConfigForChartRequest, Datapack } from "@tsconline/shared";
import { loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { fetchAllPrivateOfficialDatapacks } from "../user/user-handler.js";
import { extractMetadataFromDatapack } from "../util.js";
import { generateChart } from "../chart-generation/generate-chart.js";
import { buildSettingsFromDatapacks } from "../settings-generation/build-settings-from-datapacks.js";
import { getCachedDatapackFromDirectory } from "../user/fetch-user-files.js";
import path from "path";
import { assetconfigs } from "../util.js";
import { getDatapackSettingsSchema, generateChartWithSchema } from "../settings-generation/unified-chart-generation.js";
import { SettingsSchema } from "../settings-generation/build-settings-schema.js";

export async function mcpGenerateChart(_request: FastifyRequest, _reply: FastifyReply) {
  try {
    const chartRequest = _request.body as unknown as ChartRequest;
    const uuid = (_request.query as unknown as { uuid?: string })?.uuid;

    // We don't stream progress back to MCP for now; MCP only needs the final chart info.
    const onProgress = (_p: ChartProgressUpdate) => {
      // no-op or could log progress for server-side debugging
    };

    const result = await generateChart(chartRequest, onProgress, uuid);
    _reply.send(result);
  } catch (err) {
    // Normalize error output to a string to avoid branching on Error.message vs other values
    _reply.status(500).send({ error: String(err) });
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

/**
 * MCP route: Get settings schema for datapacks
 * Returns a simplified JSON structure showing available columns and settings
 */
export async function mcpGetDatapackSettingsSchema(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const { datapackTitles } = _request.body as { datapackTitles: string[] };
    
    if (!datapackTitles || !Array.isArray(datapackTitles) || datapackTitles.length === 0) {
      reply.status(400).send({ error: "datapackTitles array is required" });
      return;
    }

    // Load all available datapacks
    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const allDatapacks = [...publicDatapacks, ...officialDatapacks];

    // Filter to requested datapacks
    const requestedDatapacks = allDatapacks.filter((dp) => datapackTitles.includes(dp.title));

    if (requestedDatapacks.length === 0) {
      reply.status(404).send({ error: "No matching datapacks found" });
      return;
    }

    const schema = await getDatapackSettingsSchema(requestedDatapacks);
    reply.send(schema);
  } catch (err) {
    reply.status(500).send({ error: String(err) });
  }
}

/**
 * MCP route: Generate chart with JSON settings schema
 * Takes datapack titles and a settings schema object, returns chart SVG
 */
export async function mcpGenerateChartWithSchema(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const { datapackTitles, settingsSchema, useCache, isCrossPlot } = _request.body as {
      datapackTitles: string[];
      settingsSchema: SettingsSchema;
      useCache?: boolean;
      isCrossPlot?: boolean;
    };

    if (!datapackTitles || !Array.isArray(datapackTitles) || datapackTitles.length === 0) {
      reply.status(400).send({ error: "datapackTitles array is required" });
      return;
    }

    if (!settingsSchema) {
      reply.status(400).send({ error: "settingsSchema object is required" });
      return;
    }

    // Load all available datapacks
    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const allDatapacks = [...publicDatapacks, ...officialDatapacks];

    // Filter to requested datapacks
    const requestedDatapacks = allDatapacks.filter((dp) => datapackTitles.includes(dp.title));

    if (requestedDatapacks.length === 0) {
      reply.status(404).send({ error: "No matching datapacks found" });
      return;
    }

    // Generate settings XML from schema
    const settingsXml = await generateChartWithSchema(requestedDatapacks, settingsSchema);

    // Build chart request
    const chartRequest: ChartRequest = {
      settings: settingsXml,
      datapacks: requestedDatapacks.map((dp) => ({
        storedFileName: dp.storedFileName,
        title: dp.title,
        isPublic: dp.isPublic,
        type: dp.type,
        uuid: (dp as any).uuid || "official"
      })),
      useCache: useCache ?? true,
      isCrossPlot: isCrossPlot ?? false
    };

    // Generate chart
    const onProgress = (_p: ChartProgressUpdate) => {
      // no-op for MCP dont have to show loading (:
    };

    const result = await generateChart(chartRequest, onProgress);
    reply.send(result);
  } catch (err) {
    reply.status(500).send({ error: String(err) });
  }
}

/**
 * MCP route: generate settings XML from datapack metadata
 */
export async function mcpGenerateSettings(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = _request.body as { datapacks: DatapackConfigForChartRequest[] };
    
    if (!body.datapacks || !Array.isArray(body.datapacks)) {
      reply.status(400).send({ error: "Invalid request: datapacks array is required" });
      return;
    }

    console.log("body.datapacks:", JSON.stringify(body.datapacks, null, 2));

    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const allDatapacks = [...publicDatapacks, ...officialDatapacks];
    
    const requestedDatapacks = allDatapacks.filter((dp) =>
      body.datapacks.some((config) => config.storedFileName === dp.storedFileName)
    );

    const settingsXml = buildSettingsFromDatapacks(requestedDatapacks);
    
    reply.type("application/xml").send(settingsXml);
  } catch (err) {
    console.error("Error generating settings:", err);
    reply.status(500).send({ error: String(err) });
  }
}

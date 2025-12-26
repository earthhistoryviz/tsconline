import type { FastifyRequest, FastifyReply } from "fastify";
import { DatapackMetadata, ChartRequest, ChartProgressUpdate } from "@tsconline/shared";
import { loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { fetchAllPrivateOfficialDatapacks } from "../user/user-handler.js";
import { extractMetadataFromDatapack } from "../util.js";
import { generateChart } from "../chart-generation/generate-chart.js";
import {
  getDatapackSettingsSchema,
  generateChartWithSchema,
  generateChartWithEdits,
  listColumns,
  SchemaOverrides,
  ColumnToggles
} from "../settings-generation/unified-chart-generation.js";
import { SettingsSchema } from "../settings-generation/build-settings-schema.js";

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
        uuid: "uuid" in dp && typeof dp.uuid === "string" ? dp.uuid : "official"
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
 * MCP route: List columns in a flat structure to simplify toggling
 */
export async function mcpListColumns(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const { datapackTitles } = _request.body as { datapackTitles: string[] };

    if (!datapackTitles || !Array.isArray(datapackTitles) || datapackTitles.length === 0) {
      reply.status(400).send({ error: "datapackTitles array is required" });
      return;
    }

    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const allDatapacks = [...publicDatapacks, ...officialDatapacks];
    const requestedDatapacks = allDatapacks.filter((dp) => datapackTitles.includes(dp.title));

    if (requestedDatapacks.length === 0) {
      reply.status(404).send({ error: "No matching datapacks found" });
      return;
    }

    const flat = listColumns(requestedDatapacks);
    reply.send(flat);
  } catch (err) {
    reply.status(500).send({ error: String(err) });
  }
}

/**
 * MCP route: Generate chart with small edit payload (overrides + column toggles)
 */
export async function mcpRenderChartWithEdits(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const {
      datapackTitles,
      overrides = {},
      columnToggles = {},
      useCache,
      isCrossPlot
    } = _request.body as {
      datapackTitles: string[];
      overrides?: SchemaOverrides;
      columnToggles?: ColumnToggles;
      useCache?: boolean;
      isCrossPlot?: boolean;
    };

    if (!datapackTitles || !Array.isArray(datapackTitles) || datapackTitles.length === 0) {
      reply.status(400).send({ error: "datapackTitles array is required" });
      return;
    }

    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const allDatapacks = [...publicDatapacks, ...officialDatapacks];
    const requestedDatapacks = allDatapacks.filter((dp) => datapackTitles.includes(dp.title));

    if (requestedDatapacks.length === 0) {
      reply.status(404).send({ error: "No matching datapacks found" });
      return;
    }

    const settingsXml = await generateChartWithEdits(requestedDatapacks, overrides, columnToggles);

    const chartRequest: ChartRequest = {
      settings: settingsXml,
      datapacks: requestedDatapacks.map((dp) => ({
        storedFileName: dp.storedFileName,
        title: dp.title,
        isPublic: dp.isPublic,
        type: dp.type,
        uuid: "uuid" in dp && typeof dp.uuid === "string" ? dp.uuid : "official"
      })),
      useCache: useCache ?? true,
      isCrossPlot: isCrossPlot ?? false
    };

    const onProgress = (_p: ChartProgressUpdate) => {};
    const result = await generateChart(chartRequest, onProgress);
    reply.send(result);
  } catch (err) {
    reply.status(500).send({ error: String(err) });
  }
}

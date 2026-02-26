import type { FastifyRequest, FastifyReply } from "fastify";
import { DatapackMetadata, ChartRequest, ChartProgressUpdate } from "@tsconline/shared";
import { loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { fetchAllPrivateOfficialDatapacks } from "../user/user-handler.js";
import { extractMetadataFromDatapack } from "../util.js";
import { generateChart } from "../chart-generation/generate-chart.js";
import {
  generateChartWithEdits,
  listColumns,
  SchemaOverrides,
  ColumnToggles
} from "../settings-generation/build-settings.js";
import { processAndUploadDatapack } from "../upload-datapack.js";

/**
 * MCP route: list datapacks (public + official)
 */
export async function mcpListDatapacks(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const combined = [...publicDatapacks, ...officialDatapacks];
    const datapackMetadata: DatapackMetadata[] = combined.map((dp) => extractMetadataFromDatapack(dp));
    reply.send(datapackMetadata);
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

// Route used by app to make POST request to mcp server with addition of passing in auth token for Authorization header
export async function mcpUserInfoProxy(request: FastifyRequest, reply: FastifyReply) {
  const { sessionId, userInfo } = request.body as { sessionId?: string; userInfo?: { uuid?: string } };

  // No session id was passed in from frontend
  if (!sessionId) {
    return reply.code(400).send({ error: "Missing sessionId" });
  }
  // Error checking to see if userInfo does or does NOT include uuid propety
  if (!userInfo?.uuid) {
    return reply.code(400).send({ error: "Missing userInfo.uuid" });
  }

  // Get the trusted UUID from the server-side session
  const sessionUuid = request.session?.get?.("uuid");

  // If there is no session UUID, the user is not authenticated
  if (!sessionUuid) {
    return reply.code(401).send({ error: "Not logged in" });
  }
  // Make sure the UUID provided by the client matches the UUID stored in the trusted session.
  if (userInfo.uuid !== sessionUuid) {
    return reply.code(403).send({ error: "UUID mismatch" });
  }

  // Get the token the mcp server is expecting
  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) return reply.code(500).send({ error: "Missing MCP_AUTH_TOKEN" });

  // Base mcp server url
  const base = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : `http://localhost:3001`;

  // Make call to MCP server with info from frontend with additional Authorization header
  const res = await fetch(`${base}/messages/user-info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId, userInfo })
  });

  // Wait and return response from request call
  const data = await res.json();
  return reply.code(res.status).send(data);
}

export const mcpUploadDatapack = async function uploadDatapack(request: FastifyRequest, reply: FastifyReply) {
  // User-ID is sent by MCP client; header names are lowercased by Fastify
  const uuid = (request.headers["user-id"] ?? request.headers["User-ID"]) as string | undefined;
  if (!uuid || !String(uuid).trim()) {
    reply.status(401).send({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await processAndUploadDatapack(uuid, request.parts());
    if (result.code !== 200) {
      reply.status(result.code).send({ error: result.message });
      return;
    }
  } catch (e) {
    reply.status(500).send({ error: `Error uploading datapack` });
    return;
  }
  reply.send({ message: "Datapack uploaded" });
};

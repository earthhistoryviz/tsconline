import type { FastifyRequest, FastifyReply } from "fastify";
import { DatapackMetadata, ChartRequest, ChartProgressUpdate } from "@tsconline/shared";
import { loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { fetchAllPrivateOfficialDatapacks, fetchAllUsersDatapacks } from "../user/user-handler.js";
import { extractMetadataFromDatapack } from "../util.js";
import { generateChart } from "../chart-generation/generate-chart.js";
import { findUser } from "../database.js";
import {
  generateChartWithEdits,
  listColumns,
  SchemaOverrides,
  ColumnToggles
} from "../settings-generation/build-settings.js";
import { processAndUploadDatapack } from "../upload-datapack.js";

/**
 * MCP route: list datapacks (public + official + user's private if authenticated)
 */
export async function mcpListDatapacks(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const { uuid } = (_request.body ?? {}) as { uuid?: string };

    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const userDatapacks = uuid ? await fetchAllUsersDatapacks(uuid) : [];
    const combined = [...publicDatapacks, ...officialDatapacks, ...userDatapacks];
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
    const { datapackTitles, uuid } = (_request.body ?? {}) as { datapackTitles: string[]; uuid?: string };

    if (!datapackTitles || !Array.isArray(datapackTitles) || datapackTitles.length === 0) {
      reply.status(400).send({ error: "datapackTitles array is required" });
      return;
    }

    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const userDatapacks = uuid ? await fetchAllUsersDatapacks(uuid) : [];
    const allDatapacks = [...publicDatapacks, ...officialDatapacks, ...userDatapacks];
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
      isCrossPlot,
      uuid
    } = (_request.body ?? {}) as {
      datapackTitles?: string[];
      overrides?: SchemaOverrides;
      columnToggles?: ColumnToggles;
      useCache?: boolean;
      isCrossPlot?: boolean;
      uuid?: string;
    };

    if (!datapackTitles || !Array.isArray(datapackTitles) || datapackTitles.length === 0) {
      reply.status(400).send({ error: "datapackTitles array is required" });
      return;
    }

    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    const userDatapacks = uuid ? await fetchAllUsersDatapacks(uuid) : [];
    const allDatapacks = [...publicDatapacks, ...officialDatapacks, ...userDatapacks];
    const requestedDatapacks = allDatapacks.filter((dp) => datapackTitles.includes(dp.title));

    const missingDatapacks = datapackTitles.filter((dp) => !requestedDatapacks.some((rdp) => rdp.title === dp));
    if (missingDatapacks.length > 0) {
      reply.status(404).send({ error: `No matching datapacks found for titles: ${missingDatapacks.join(", ")}` });
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
    const result = await generateChart(chartRequest, onProgress, uuid);
    reply.send(result);
  } catch (err) {
    reply.status(500).send({ error: String(err) });
  }
}

export async function mcpUserInfoProxy(request: FastifyRequest, reply: FastifyReply) {
  const { sessionId } = request.body as { sessionId?: string };

  if (!sessionId) {
    return reply.code(400).send({ error: "Missing sessionId" });
  }

  const sessionUuid = request.session?.get?.("uuid");
  if (!sessionUuid) {
    return reply.code(401).send({ error: "Not logged in" });
  }

  const users = await findUser({ uuid: sessionUuid });
  if (!users || users.length !== 1 || !users[0]) {
    return reply.code(404).send({ error: "User not found" });
  }
  const user = users[0];

  const userInfo = {
    uuid: user.uuid,
    username: user.username,
    email: user.email,
    pictureUrl: user.pictureUrl || "",
    accountType: user.accountType,
    isAdmin: Boolean(user.isAdmin)
  };

  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) return reply.code(500).send({ error: "Missing MCP_AUTH_TOKEN" });

  const base = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : `http://localhost:3001`;

  const res = await fetch(`${base}/messages/user-info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId, userInfo })
  });

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
  }
  reply.send({ message: "Datapack uploaded" });
};

import type { FastifyRequest, FastifyReply } from "fastify";
import {
  DatapackMetadata,
  ChartRequest,
  ChartProgressUpdate,
  MCPChartSyncClientMessage,
  MCPChartSyncServerMessage
} from "@tsconline/shared";
import type { MCPCreateSessionRequest, MCPUpdateSessionChartStateRequest } from "@tsconline/shared";
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { loadPublicUserDatapacks } from "../public-datapack-handler.js";
import { deleteUserDatapack, fetchAllPrivateOfficialDatapacks, fetchAllUsersDatapacks } from "../user/user-handler.js";
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

type PendingChartStateRequest = {
  resolve: (value: { ok: boolean; error?: string }) => void;
  timeout: NodeJS.Timeout;
};

type ColumnTreeNode = {
  __children: ColumnTree;
};

type ColumnTree = Record<string, ColumnTreeNode>;

interface SimplifiedColumnsMap {
  [key: string]: SimplifiedColumns | string[] | undefined;
  _leaves?: string[];
}

type SimplifiedColumns = string[] | SimplifiedColumnsMap;

const mcpChartStateSockets = new Map<string, WebSocket>();
const pendingChartStateRequests = new Map<string, PendingChartStateRequest>();

function sendMcpSocketMessage(sessionId: string | undefined, message: MCPChartSyncServerMessage): boolean {
  if (!sessionId) return false;

  const socket = mcpChartStateSockets.get(sessionId);
  if (!socket || socket.readyState !== 1) {
    return false;
  }

  try {
    socket.send(JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
}

function clearPendingChartStateRequest(requestId: string) {
  const pending = pendingChartStateRequests.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingChartStateRequests.delete(requestId);
}

async function requestChartStateViaSocket(
  sessionId: string,
  timeoutMs = 10000
): Promise<{ ok: boolean; error?: string }> {
  const socket = mcpChartStateSockets.get(sessionId);
  if (!socket || socket.readyState !== 1) {
    return { ok: false, error: "No active TSCOnline websocket for this session" };
  }

  const requestId = randomUUID();

  const resultPromise = new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const timeout = setTimeout(() => {
      pendingChartStateRequests.delete(requestId);
      resolve({ ok: false, error: "Timed out waiting for chart state response" });
    }, timeoutMs);

    pendingChartStateRequests.set(requestId, { resolve, timeout });
  });

  try {
    socket.send(JSON.stringify({ type: "request-chart-state", requestId }));
  } catch {
    clearPendingChartStateRequest(requestId);
    return { ok: false, error: "Failed to send chart state request over websocket" };
  }

  return resultPromise;
}

export async function handleMcpChartStateSync(socket: WebSocket, request: FastifyRequest) {
  const sessionUuid = request.session?.get?.("uuid");
  if (!sessionUuid) {
    socket.close();
    return;
  }

  let registeredSessionId: string | undefined;

  socket.on("message", (rawMessage) => {
    let message: unknown;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      return;
    }

    if (!message || typeof message !== "object") return;

    const typed = message as Partial<MCPChartSyncClientMessage>;

    if (typed.type === "register" && typeof typed.sessionId === "string" && typed.sessionId.length > 0) {
      const existing = mcpChartStateSockets.get(typed.sessionId);
      if (existing && existing !== socket && existing.readyState === 1) {
        existing.close();
      }

      registeredSessionId = typed.sessionId;
      mcpChartStateSockets.set(typed.sessionId, socket);
      return;
    }

    if (typed.type === "chart-state-response" && typeof typed.requestId === "string") {
      const pending = pendingChartStateRequests.get(typed.requestId);
      if (!pending) return;

      clearPendingChartStateRequest(typed.requestId);
      pending.resolve({ ok: typed.ok === true, ...(typed.error ? { error: typed.error } : {}) });
    }
  });

  const cleanup = () => {
    if (registeredSessionId && mcpChartStateSockets.get(registeredSessionId) === socket) {
      mcpChartStateSockets.delete(registeredSessionId);
    }
  };

  socket.on("close", cleanup);
  socket.on("error", cleanup);
}

/**
 * MCP route: list datapacks (public + official + user's private if authenticated)
 */
export async function mcpListDatapacks(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const { uuid, sessionId } = (_request.body ?? {}) as { uuid?: string; sessionId?: string };

    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    let userDatapacks = uuid ? await fetchAllUsersDatapacks(uuid) : [];

    if (uuid === process.env.TMP_USR_SESSION_ID) {
      //filter out datapacks that do not have a sessionId and sessionId is not the temp user sessionId
      userDatapacks = userDatapacks.filter((dp) => dp.sessionId === sessionId);
    }

    console.log("uuid", uuid);
    console.log(uuid === process.env.TMP_USR_SESSION_ID);
    console.log("userDatapacks", userDatapacks);
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
    // Build a simplified nested structure from the flattened columns.
    // Each flat entry has a `path` like "Chart Title > Group > Subgroup > Column".
    const paths = flat.map((c) => c.path.split(" > "));

    // If all paths share the same first segment (often a chart root), drop it for clarity.
    const firstSegments = Array.from(new Set(paths.map((p) => p[0] ?? "")));
    const hasNestedPath = paths.some((p) => p.length > 1);
    const dropRoot = firstSegments.length === 1 && hasNestedPath;

    // Build a nested tree as maps
    const root: ColumnTree = {};

    for (const segs of paths) {
      const parts = dropRoot ? segs.slice(1) : segs.slice();
      if (parts.length === 0) continue;
      let node = root;
      for (const part of parts) {
        if (!node[part]) node[part] = { __children: {} };
        node = node[part]!.__children;
      }
    }

    // Convert the internal tree into a simplified JSON:
    // - If a node's children are all leaves (no further grandchildren), represent as an array of names
    // - Otherwise represent as an object mapping child name -> nested structure
    const simplifyNode = (node: ColumnTree): SimplifiedColumns | undefined => {
      const keys = Object.keys(node);
      if (keys.length === 0) return undefined;

      const leaves: string[] = [];
      const children: Record<string, SimplifiedColumns> = {};

      for (const k of keys) {
        const childKeys = Object.keys(node[k]?.__children ?? {});
        if (childKeys.length === 0) {
          leaves.push(k);
        } else {
          const simplifiedChild = simplifyNode(node[k]?.__children ?? {});
          if (simplifiedChild !== undefined) children[k] = simplifiedChild;
        }
      }

      // If there are no nested children, return a simple array of leaf names.
      if (Object.keys(children).length === 0) {
        return leaves;
      }

      // Mixed node: include nested children and, if present, a compact _leaves array.
      const out: SimplifiedColumnsMap = { ...children };
      if (leaves.length > 0) out._leaves = leaves;
      return out;
    };

    const simplified = simplifyNode(root);

    reply.send({
      datapackTitles,
      columns: simplified
    });
  } catch (err) {
    reply.status(500).send({ error: String(err) });
  }
}

/**
 * MCP route: Generate chart with small edit payload (overrides + column toggles)
 */
export async function mcpRenderChartWithEdits(_request: FastifyRequest, reply: FastifyReply) {
  const requestId = randomUUID();

  try {
    const {
      datapackTitles,
      overrides = {},
      columnToggles = {},
      useCache,
      isCrossPlot,
      uuid,
      sessionId
    } = (_request.body ?? {}) as {
      datapackTitles?: string[];
      overrides?: SchemaOverrides;
      columnToggles?: ColumnToggles;
      useCache?: boolean;
      isCrossPlot?: boolean;
      uuid?: string;
      sessionId?: string;
    };

    if (!datapackTitles || !Array.isArray(datapackTitles) || datapackTitles.length === 0) {
      reply.status(400).send({ error: "datapackTitles array is required" });
      return;
    }

    const publicDatapacks = await loadPublicUserDatapacks();
    const officialDatapacks = await fetchAllPrivateOfficialDatapacks();
    let userDatapacks = uuid ? await fetchAllUsersDatapacks(uuid) : [];
    if (uuid === process.env.TMP_USR_SESSION_ID) {
      //filter out datapacks that do not have a sessionId and sessionId is not the temp user sessionId
      userDatapacks = userDatapacks.filter((dp) => dp.sessionId === sessionId);
    }

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

    sendMcpSocketMessage(sessionId, { type: "geogpt-chart-update-start", requestId });

    const onProgress = (progress: ChartProgressUpdate) => {
      if (progress.stage === "Complete" || progress.stage === "Error") {
        return;
      }

      sendMcpSocketMessage(sessionId, {
        type: "geogpt-chart-update-progress",
        requestId,
        stage: progress.stage,
        percent: progress.percent
      });
    };

    const result = await generateChart(chartRequest, onProgress, uuid);
    sendMcpSocketMessage(sessionId, {
      type: "geogpt-chart-update-complete",
      requestId,
      mcpLinkParams: {
        datapacks: datapackTitles,
        chartHash: result.hash
      }
    });
    reply.send(result);
  } catch (err) {
    const { sessionId } = (_request.body ?? {}) as { sessionId?: string };
    sendMcpSocketMessage(sessionId, {
      type: "geogpt-chart-update-error",
      requestId,
      error: String(err)
    });
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

// route called by frontend to create a new mcp session entry - need to pass in auth token here to get through to mcp server
export async function mcpCreateSession(request: FastifyRequest, reply: FastifyReply) {
  // if there is no session UUID, the user is not logged in
  const sessionUuid = request.session?.get?.("uuid");
  if (!sessionUuid) return reply.code(401).send({ error: "Not logged in" });

  // get trusted auth token the mcp server expects with each request call
  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) return reply.code(500).send({ error: "Missing MCP_AUTH_TOKEN" });

  // base mcp url
  const base = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : `http://localhost:3001`;

  // Extract chart state from request body if provided
  const { userChartState } = (request.body ?? {}) as MCPCreateSessionRequest;

  // Build request body for MCP server
  const mcpRequestBody: Record<string, unknown> = {};
  if (userChartState) {
    mcpRequestBody.userChartState = userChartState;
  }

  // continue call to mcp server with the additional auth token passed in
  const res = await fetch(`${base}/messages/create-session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(Object.keys(mcpRequestBody).length > 0 ? { "Content-Type": "application/json" } : {})
    },
    ...(Object.keys(mcpRequestBody).length > 0 && { body: JSON.stringify(mcpRequestBody) })
  });

  // wait and return reponse from request call
  const data = await res.json();
  return reply.code(res.status).send(data);
}

export async function mcpDeleteTempSessionDatapacks(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { uuid, sessionId } = (request.body ?? {}) as { uuid?: string; sessionId?: string };
    const tempUserUuid = process.env.TMP_USR_SESSION_ID;

    if (!uuid || !sessionId) {
      return reply.code(400).send({ error: "Missing uuid or sessionId" });
    }

    if (!tempUserUuid || uuid !== tempUserUuid) {
      return reply.code(400).send({ error: "Invalid temp user uuid" });
    }

    const userDatapacks = await fetchAllUsersDatapacks(uuid);
    const sessionDatapacks = userDatapacks.filter((dp) => dp.sessionId === sessionId);

    await Promise.allSettled(sessionDatapacks.map((dp) => deleteUserDatapack(uuid, dp.title)));

    return reply.code(200).send({ deleted: sessionDatapacks.length });
  } catch (err) {
    return reply.code(500).send({ error: String(err) });
  }
}

// route called by frontend to update chart state for an existing mcp session entry
export async function mcpUpdateSessionChartState(request: FastifyRequest, reply: FastifyReply) {
  const sessionUuid = request.session?.get?.("uuid");
  if (!sessionUuid) return reply.code(401).send({ error: "Not logged in" });

  const { sessionId, userChartState } = (request.body ?? {}) as Partial<MCPUpdateSessionChartStateRequest>;
  if (!sessionId || !userChartState) {
    return reply.code(400).send({ error: "Missing sessionId or userChartState" });
  }

  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) return reply.code(500).send({ error: "Missing MCP_AUTH_TOKEN" });

  const base = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : `http://localhost:3001`;

  const res = await fetch(`${base}/messages/update-chart-state`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId, userChartState })
  });

  const data = await res.json();
  return reply.code(res.status).send(data);
}

// route called by mcp server to request fresh chart state from the active TSCOnline websocket client
export async function mcpRequestSessionChartState(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const expectedToken = process.env.MCP_AUTH_TOKEN;

  if (!expectedToken || !authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing or invalid Bearer token" });
  }

  const token = authHeader.slice(7);
  if (token !== expectedToken) {
    return reply.code(401).send({ error: "Invalid Bearer token" });
  }

  const { sessionId } = (request.body ?? {}) as { sessionId?: string };
  if (!sessionId) {
    return reply.code(400).send({ error: "Missing sessionId" });
  }

  const result = await requestChartStateViaSocket(sessionId);
  if (!result.ok) {
    return reply.code(409).send({ ok: false, sessionId, error: result.error || "Unable to refresh chart state" });
  }

  return reply.code(200).send({ ok: true, sessionId });
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

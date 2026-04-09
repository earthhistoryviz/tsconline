import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import * as path from "path";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import type { SharedUser } from "@tsconline/shared";
import { MCPLinkParams, assertDatapackMetadata, DatapackMetadata, DatapackType } from "@tsconline/shared";
import { fetchFileFromUrl, getImageFileExtension, assertValidImageMimeType, assertPdfMimeType } from "./mcp-helper.js";
import { TOOL_DESCRIPTIONS } from "./tool-descriptions.js";

// We use the .env file from server cause mcp is a semi-lazy-parasite of server
dotenv.config({
  path: path.resolve(process.cwd(), "../server/.env"),
  override: true,
  quiet: true
});

const serverUrl = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : `http://localhost:3000`;

const frontendUrl = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : `http://localhost:5173`;

//for MCP route requests, use the internal server url so we can restrict IPs
const internalServerUrl = `http://127.0.0.1:3000`;

//temp user uuid for all temp user datapack uploads
const tempUserUuid = process.env.TMP_USR_SESSION_ID;
if (!tempUserUuid) {
  throw new Error("Missing TMP_USR_SESSION_ID for MCP temp user");
}

// Single session map: sessionId -> { userInfo?, createdAt, lastActivity }
export interface SessionEntry {
  userInfo?: SharedUser; // undefined = pre-login, defined = authenticated
  createdAt: number;
  lastActivity: number;
  userChartState: ChartState;
}

export const sessions = new Map<string, SessionEntry>();

const PRE_LOGIN_TTL_MS = 30 * 60 * 1000; // login link valid for 30 min
const AUTHENTICATED_INACTIVITY_TTL_MS = 4 * 60 * 60 * 1000; // session lasts 4 hours since last active
const MAX_CONCURRENT_LOGIN_REQUESTS = 10; // rate limit: max 10 pre-login sessions

// Cleanup expired sessions every 1 minute
export const cleanupInterval = setInterval(
  () => {
    const now = Date.now();

    for (const [sessionId, entry] of sessions.entries()) {
      const isAuthenticated = entry.userInfo !== undefined;
      const timeSinceCreation = now - entry.createdAt;
      const timeSinceLastActivity = now - entry.lastActivity;

      if (!isAuthenticated && timeSinceCreation > PRE_LOGIN_TTL_MS) {
        sessions.delete(sessionId);
        continue;
      }

      if (isAuthenticated && timeSinceLastActivity > AUTHENTICATED_INACTIVITY_TTL_MS) {
        sessions.delete(sessionId);
      }
    }
  },
  1 * 60 * 1000 // Run every 1 minute
).unref?.();

// Chart state management - tracks current chart configuration
interface ChartState {
  datapackTitles: string[];
  overrides: Record<string, unknown>;
  columnToggles: { on?: string[]; off?: string[] };
  lastChartPath?: string;
  lastModified?: Date;
}

//create a temp shared user object for the temp user
const tempSharedUser: SharedUser = {
  uuid: process.env.TMP_USR_SESSION_ID ?? "",
  username: process.env.TMP_USR_USERNAME ?? "tempuser",
  email: process.env.TMP_USR_EMAIL ?? "tempuser@tsconline.internal",
  isGoogleUser: false,
  isAdmin: false,
  accountType: "default",
  historyEntries: [],
  pictureUrl: null,
};

function newChartState(): ChartState {
  return { datapackTitles: [], overrides: {}, columnToggles: {} };
}

function createSession(): { sessionId: string; entry: SessionEntry } {
  const sessionId = randomUUID();
  const entry: SessionEntry = {
    createdAt: Date.now(),
    lastActivity: Date.now(),
    userInfo: tempSharedUser,
    userChartState: newChartState()
  };

  sessions.set(sessionId, entry);
  return { sessionId, entry };
}

type SessionResult = { sessionId: string; entry: SessionEntry; internalNote?: string };

function verifyMCPSession(sessionId?: string): SessionResult {
  // No sessionId provided -> Create one
  if (!sessionId) {
    const created = createSession();
    return {
      sessionId: created.sessionId,
      entry: created.entry,
      internalNote: "No sessionId provided -> created a new pre-login session"
    };
  }

  const entry = sessions.get(sessionId);

  // Provided sessionId is unknown/expired -> Create a new one
  if (!entry) {
    const created = createSession();
    return {
      sessionId: created.sessionId,
      entry: created.entry,
      internalNote: "Provided sessionId not found/expired -> created a new sessionId"
    };
  }

  return { sessionId, entry };
}

/*
function denyNeedLogin(es: { sessionId: string; internalNote?: string }) {
  const loginUrl = `${frontendUrl}/login?mcp_session=${es.sessionId}`;

  return {
    content: [
      {
        type: "text" as const,
        text: `[SHOW TO USER]
Please log in to continue:
${loginUrl}

[INTERNAL - DO NOT SHOW TO USER]
sessionId: ${es.sessionId}
(Store for tool calls. Valid 30 min until login, then 10 min of inactivity.)`
      }
    ]
  };
}
*/

function requireSession(es: { sessionId: string; entry: SessionEntry; internalNote?: string }): {
  entry: SessionEntry;
  sessionId: string;
} {
  es.entry.lastActivity = Date.now();
  return { entry: es.entry, sessionId: es.sessionId };
}

// Helper to wrap tool responses with sessionId
function wrapResponse(content: unknown, sessionId: string): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            data: content,
            sessionId: sessionId
          },
          null,
          2
        )
      }
    ]
  };
}

// version for tools that truly need login
/*
function requireLogin(es: {
  sessionId: string;
  entry: SessionEntry;
  internalNote?: string;
}): { response: { content: { type: "text"; text: string }[] } } | { entry: SessionEntry } {
  if (!es.entry.userInfo) {
    return { response: denyNeedLogin(es) };
  }

  es.entry.lastActivity = Date.now();
  return { entry: es.entry };
}
*/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function decodeInlineDatapackContent(content: string): Buffer {
  const trimmed = content.trim();
  const dataUriMatch = trimmed.match(/^data:[^;]+;base64,(.+)$/i);
  if (dataUriMatch?.[1]) {
    return Buffer.from(dataUriMatch[1], "base64");
  }

  // Heuristic: handle agent-sent base64 blobs while leaving normal text untouched.
  const compact = trimmed.replace(/[\r\n\s]/g, "");
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  const looksBase64 = compact.length >= 64 && compact.length % 4 === 0 && base64Pattern.test(compact);

  if (looksBase64) {
    try {
      const decoded = Buffer.from(compact, "base64");
      // Roundtrip check avoids misclassifying regular text as base64.
      if (decoded.length > 0 && decoded.toString("base64").replace(/=+$/, "") === compact.replace(/=+$/, "")) {
        return decoded;
      }
    } catch {
      // Fall back to utf8 path below.
    }
  }

  return Buffer.from(new TextEncoder().encode(content).buffer);
}

const datapackTitlesSchema = z.preprocess((val: unknown) => {
  if (Array.isArray(val)) return val;
  if (isRecord(val) && "datapackTitles" in val && Array.isArray(val.datapackTitles)) {
    return val.datapackTitles;
  }
  return val;
}, z.array(z.string()));

const overridesSchema = z
  .object({
    topAge: z.number().optional(),
    baseAge: z.number().optional(),
    unitsPerMY: z.union([z.number(), z.array(z.object({ unit: z.string(), value: z.number() }))]).optional(),
    skipEmptyColumns: z.boolean().optional(),
    variableColors: z.string().optional(),
    noIndentPattern: z.boolean().optional(),
    negativeChk: z.boolean().optional(),
    doPopups: z.boolean().optional(),
    enEventColBG: z.boolean().optional(),
    enChartLegend: z.boolean().optional(),
    enPriority: z.boolean().optional(),
    enHideBlockLable: z.boolean().optional()
  })
  .passthrough();

const columnToggleSchema = z
  .object({
    on: z.array(z.string()).optional(),
    off: z.array(z.string()).optional()
  })
  .passthrough();

const updateChartArgsSchema = z.object({
  datapackTitles: datapackTitlesSchema,
  overrides: overridesSchema.optional(),
  columnToggles: columnToggleSchema.optional(),
  useCache: z.boolean().optional(),
  isCrossPlot: z.boolean().optional(),
  sessionId: z
    .string()
    .optional()
    .describe("INTERNAL ONLY: Session ID from login() - tracks user activity, extends session timeout")
});

export const createMCPServer = () => {
  const server = new McpServer({
    name: "demo-server",
    version: "1.0.0",
    title: "Demo MCP Server",
    description: "A simple server to demonstrate MCP capabilities",
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: { listChanged: true }
    }
  });

  // Get current chart state
  server.registerTool(
    "getCurrentChartState",
    {
      title: TOOL_DESCRIPTIONS.getCurrentChartState.title,
      description: TOOL_DESCRIPTIONS.getCurrentChartState.description,
      inputSchema: {
        sessionId: z.string().optional().describe("Session ID from login tool for authenticated access")
      }
    },
    async ({ sessionId }) => {
      const es = verifyMCPSession(sessionId);

      const sess = requireSession(es);

      return wrapResponse(sess.entry.userChartState, sess.sessionId);
    }
  );

  // Reset chart state
  server.registerTool(
    "resetChartState",
    {
      title: TOOL_DESCRIPTIONS.resetChartState.title,
      description: TOOL_DESCRIPTIONS.resetChartState.description,
      inputSchema: {
        sessionId: z.string().optional().describe("Session ID from login tool for authenticated access")
      }
    },
    async ({ sessionId }) => {
      const es = verifyMCPSession(sessionId);

      const sess = requireSession(es);

      sess.entry.userChartState = newChartState();

      return wrapResponse({ message: "Chart state cleared for this session." }, sess.sessionId);
    }
  );

  // Update/Generate chart
  server.registerTool(
    "updateChartState",
    {
      title: TOOL_DESCRIPTIONS.updateChartState.title,
      description: TOOL_DESCRIPTIONS.updateChartState.description,
      inputSchema: updateChartArgsSchema.shape
    },
    async (args) => {
      const es = verifyMCPSession(args.sessionId);

      const sess = requireSession(es);

      const entry = sess.entry;

      if (!args.datapackTitles) {
        return wrapResponse({ error: "datapackTitles is required." }, sess.sessionId);
      }

      const st = entry.userChartState;

      // Merge args into session chart state
      st.datapackTitles = args.datapackTitles;

      st.overrides = {
        ...st.overrides,
        ...(args.overrides ?? {})
      };

      const incomingOff = new Set((args.columnToggles?.off ?? []).map((id) => id.toLowerCase()));
      const incomingOn = new Set((args.columnToggles?.on ?? []).map((id) => id.toLowerCase()));

      const currentOff = new Set((st.columnToggles.off ?? []).map((id) => id.toLowerCase()));
      const currentOn = new Set((st.columnToggles.on ?? []).map((id) => id.toLowerCase()));

      for (const id of incomingOff) {
        currentOn.delete(id);
        currentOff.add(id);
      }
      for (const id of incomingOn) {
        currentOff.delete(id);
        currentOn.add(id);
      }

      st.columnToggles.off = Array.from(currentOff);
      st.columnToggles.on = Array.from(currentOn);

      // Generate chart with THIS SESSION'S state
      try {
        const res = await fetch(`${internalServerUrl}/mcp/render-chart-with-edits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datapackTitles: st.datapackTitles,
            overrides: st.overrides,
            columnToggles: st.columnToggles,
            useCache: args.useCache ?? true,
            isCrossPlot: args.isCrossPlot ?? false,
            uuid: entry.userInfo?.uuid,
            sessionId: args.sessionId
          })
        });

        const json = await res.json();

        if (!res.ok) {
          return wrapResponse({ error: `Server error ${res.status}: ${JSON.stringify(json)}` }, sess.sessionId);
        }

        const chartPath = typeof json.chartpath === "string" ? json.chartpath : "";
        const chartHash = typeof json.hash === "string" ? json.hash : "";

        // Update state with new chart path
        st.lastChartPath = chartPath;
        st.lastModified = new Date();

        const mcpLinkObj: MCPLinkParams = {
          datapacks: st.datapackTitles,
          chartHash: chartHash
        };

        const mcpLinkJson = JSON.stringify(mcpLinkObj);

        // Encode using base64url (URL-safe, compact, no special characters)
        const mcpLinkEncoded = Buffer.from(mcpLinkJson, "utf8")
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");

        const mcpToolUrl = `${frontendUrl}/chart-view?mcpChartState=${mcpLinkEncoded}`;

        const chartResponse = {
          directUrl: mcpToolUrl,
          embeddedChartUrl: `${serverUrl}${chartPath}`,
          currentState: st
        };

        const wrapped = wrapResponse(chartResponse, sess.sessionId);

        return wrapped;
      } catch (e) {
        return wrapResponse({ error: `Error generating chart: ${String(e)}` }, sess.sessionId);
      }
    }
  );

  server.registerTool(
    "listDatapacks",
    {
      title: TOOL_DESCRIPTIONS.listDatapacks.title,
      description: TOOL_DESCRIPTIONS.listDatapacks.description,
      inputSchema: {
        sessionId: z.string().optional().describe("Session ID from login tool for authenticated access")
      }
    },
    async ({ sessionId }) => {
      const es = verifyMCPSession(sessionId);
      const sess = requireSession(es);
      const uuid = sess.entry.userInfo?.uuid;


      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };

        console.log("LIST DATAPACKS DEBUGGING");
        console.log("temp user uuid", tempUserUuid);
        console.log("uuid", uuid);

        //only if uuid is the temp user uuid, then sessionId is required
        let body: { uuid?: string, sessionId?: string };
        if (uuid === tempUserUuid) {
          if (!sessionId) {
            return wrapResponse({ error: "sessionId is required" }, sess.sessionId);
          }
          body = { uuid, sessionId };
        } else {
          body = { uuid };
        }


        const res = await fetch(`${internalServerUrl}/mcp/datapacks`, {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const text = await res.text();
          return wrapResponse({ error: `Server error: ${res.status} ${text}` }, sess.sessionId);
        }
        const json = await res.json();
        return wrapResponse(json, sess.sessionId);
      } catch (e) {
        return wrapResponse({ error: `Error fetching datapacks: ${String(e)}` }, sess.sessionId);
      }
    }
  );

  server.registerTool(
    "listColumns",
    {
      title: TOOL_DESCRIPTIONS.listColumns.title,
      description: TOOL_DESCRIPTIONS.listColumns.description,
      inputSchema: {
        datapackTitles: z
          .array(z.string())
          .describe("Array of datapack titles to merge (e.g., ['GTS2020', 'Paleobiology'])"),
        sessionId: z.string().optional().describe("Session ID from login tool for authenticated access")
      }
    },
    async ({ datapackTitles, sessionId }) => {
      const es = verifyMCPSession(sessionId);
      const sess = requireSession(es);

      try {
        const entry = sessionId ? sessions.get(sessionId) : undefined;
        const uuid = entry?.userInfo?.uuid;

        const res = await fetch(`${internalServerUrl}/mcp/list-columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datapackTitles, uuid })
        });

        if (!res.ok) {
          const text = await res.text();
          return wrapResponse({ error: `Server error ${res.status}: ${text}` }, sess.sessionId);
        }

        const json = await res.json();
        return wrapResponse(json, sess.sessionId);
      } catch (e) {
        return wrapResponse({ error: `Error listing columns: ${String(e)}` }, sess.sessionId);
      }
    }
  );

  server.registerTool(
    "login",
    {
      title: TOOL_DESCRIPTIONS.login.title,
      description: TOOL_DESCRIPTIONS.login.description,
      inputSchema: { sessionId: z.string().optional() }
    },
    async ({ sessionId }) => {
      try {
        // Rate limit: check number of pre-login sessions using temp user uuid
        const preLoginCount = Array.from(sessions.values()).filter((entry) => entry.userInfo?.uuid !== tempUserUuid).length;

        if (preLoginCount >= MAX_CONCURRENT_LOGIN_REQUESTS) {
          const es = verifyMCPSession(sessionId);
          return wrapResponse(
            {
              error:
                "Too many active login requests. Please wait for existing logins to expire (30 minutes) and try again."
            },
            es.sessionId
          );
        }

        const es = verifyMCPSession(sessionId);
        requireSession(es);

        const loginUrl = `${frontendUrl}/login?mcp_session=${es.sessionId}`;
        return wrapResponse(
          {
            message: "Please visit this link to log in",
            loginUrl: loginUrl
          },
          es.sessionId
        );
      } catch (e) {
        return wrapResponse({ error: `Error logging in: ${String(e)}` }, sessionId || "");
      }
    }
  );

  server.registerTool(
    "whoami",
    {
      title: TOOL_DESCRIPTIONS.whoami.title,
      description: TOOL_DESCRIPTIONS.whoami.description,
      inputSchema: {
        sessionId: z.string().optional().describe("Session ID from login tool response")
      }
    },
    async ({ sessionId }) => {
      try {
        if (!sessionId) {
          const es = verifyMCPSession(undefined);
          return wrapResponse(
            { error: "You are not logged in. Please use the login tool to authenticate.", loginRequired: true },
            es.sessionId
          );
        }

        const entry = sessions.get(sessionId);
        if (!entry) {
          const es = verifyMCPSession(undefined);
          return wrapResponse(
            { error: "Session ID not found. Please run login tool again.", loginRequired: true },
            es.sessionId
          );
        }

        requireSession({ sessionId, entry });

        if (entry.userInfo) {
          return wrapResponse(
            {
              message: "You are logged in",
              userInfo: entry.userInfo.username
                ? { username: entry.userInfo.username, email: entry.userInfo.email }
                : null
            },
            sessionId
          );
        } else {
          return wrapResponse(
            {
              message: "Session exists but not yet authenticated",
              loginRequired: true
            },
            sessionId
          );
        }
      } catch (e) {
        return wrapResponse({ error: `Error checking user info: ${String(e)}` }, sessionId || "");
      }
    }
  );

  server.registerTool(
    "uploadDatapack",
    {
      title: TOOL_DESCRIPTIONS.uploadDatapack.title,
      description: TOOL_DESCRIPTIONS.uploadDatapack.description,

      inputSchema: {
        sessionId: z
          .string()
          .describe("The session ID of the user. If not provided, the user will not be authenticated."),
        datapackUri: z
          .string()
          .optional()
          .describe("A HTTP or HTTPS URL of the datapack file uploaded to cloud storage by the AI."),
        datapackContent: z
          .string()
          .optional()
          .describe(
            "Direct datapack content as a string. Use this when the datapack is provided inline instead of by URL. Include the full raw datapack content exactly as provided, preserving tabular structure with \\t between columns and \\n between rows."
          ),
        datapackImageUri: z
          .string()
          .url()
          .optional()
          .describe(
            "A HTTP or HTTPS URL of the profile picture file uploaded to cloud storage by the AI. If not provided, the profile picture will not be uploaded."
          ),
        datapackFileName: z
          .string()
          .optional()
          .describe("The name of the datapack file. If not provided, the name will be extracted from the URL."),
        pdfFilesUris: z
          .array(z.string().url())
          .optional()
          .describe(
            "Array of HTTP or HTTPS URLs of the pdf files uploaded to cloud storage by the AI. If not provided, the pdf files will not be uploaded."
          ),
        title: z.string().describe("The title of the datapack"),
        description: z.string().describe("The description of the datapack"),
        contact: z.string().optional().describe("The contact of the datapack (optional)"),
        date: z.string().optional().describe("The date of the datapack (optional)"),
        tags: z.array(z.string()).optional().describe("String array of tags of the datapack (optional)"),
        priority: z.number().optional().describe("The priority of the datapack (optional)"),
        references: z.array(z.string()).optional().describe("String array of references of the datapack (optional)"),
        notes: z.string().optional().describe("The notes of the datapack (optional)")
      }
    },
    async ({
      sessionId,
      datapackUri,
      datapackContent,
      datapackFileName,
      title,
      description,
      contact,
      notes,
      tags,
      references,
      priority,
      datapackImageUri,
      pdfFilesUris
    }): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> => {
      //Update session activity
      if (!sessionId) {
        return wrapResponse({ error: "No session ID provided. Please login again." }, sessionId || "");
      }

      const es = verifyMCPSession(sessionId);
      const sess = requireSession(es);

      const entry = sess.entry;
      const user = entry.userInfo;
      const uuid = user?.uuid ?? tempUserUuid;

      if (!uuid) {
        return wrapResponse({ error: "User UUID not found." }, sess.sessionId);
      }

      //Check if description is provided
      if (description.length === 0 || title.length === 0) {
        return wrapResponse({ error: "Description and title are required." }, sess.sessionId);
      }

      try {
        const rawUriInput = typeof datapackUri === "string" ? datapackUri.trim() : "";
        const hasUriInput = rawUriInput.length > 0;
        const rawContentInput = typeof datapackContent === "string" ? datapackContent : "";
        const hasContentInput = rawContentInput.length > 0;

        if (hasUriInput && hasContentInput) {
          return wrapResponse(
            {
              error: "Provide exactly one datapack source: use either datapackUri or datapackContent, not both."
            },
            sess.sessionId
          );
        }

        if (!hasUriInput && !hasContentInput) {
          return wrapResponse(
            {
              error: "Provide one datapack source: datapackUri (URL) or datapackContent (inline content)."
            },
            sess.sessionId
          );
        }

        let datapackBuffer: Buffer;
        let datapackMimeType: string | null;

        if (hasContentInput) {
          datapackBuffer = decodeInlineDatapackContent(rawContentInput);
          datapackMimeType = "text/plain";
        } else {
          const [arrayBuffer, fetchedMimeType] = await fetchFileFromUrl(rawUriInput);
          datapackBuffer = Buffer.from(arrayBuffer);
          datapackMimeType = fetchedMimeType;
        }

        //todo: assert datapackMimeType is a valid datapack mime type

        let profilePictureBuffer: Buffer | undefined;
        let profilePictureMimeType: string | null = null;
        let profilePictureExtension: string | undefined;
        if (datapackImageUri) {
          const [profilePictureArrayBuffer, rawMimeType] = await fetchFileFromUrl(datapackImageUri);
          profilePictureBuffer = Buffer.from(profilePictureArrayBuffer);
          profilePictureMimeType = assertValidImageMimeType(rawMimeType);
          profilePictureExtension = getImageFileExtension(profilePictureMimeType);
        }

        const pdfBuffers: Buffer[] = [];
        const pdfMimeTypes: string[] = [];
        const pdfExtensions: string[] = [];
        let hasFiles = false;
        if (pdfFilesUris && pdfFilesUris.length > 0) {
          hasFiles = true;
          for (const pdfUri of pdfFilesUris) {
            const [pdfArrayBuffer, rawMimeType] = await fetchFileFromUrl(pdfUri);
            pdfBuffers.push(Buffer.from(pdfArrayBuffer));
            pdfMimeTypes.push(assertPdfMimeType(rawMimeType));
            pdfExtensions.push(".pdf");
          }
        }

        let authoredBy = entry.userInfo?.username ?? "";

        if (uuid === tempUserUuid) authoredBy = "tempuser";

        const datapackType: DatapackType = {
          type: "user",
          uuid: uuid
        };

        const metadata: DatapackMetadata = {
          description,
          title,
          originalFileName: datapackFileName ?? "default-datapack.txt",
          storedFileName: datapackFileName ?? "default-datapack.txt",
          size: datapackBuffer.length.toString(),
          date: new Date().toISOString().split("T")[0] ?? "",
          authoredBy,
          tags: tags ?? [],
          references: references ?? [],
          isPublic: false,
          priority: priority ?? 0,
          hasFiles: hasFiles,
          ...datapackType,
          ...(contact != null && contact !== "" && { contact }),
          ...(notes != null && notes !== "" && { notes })
        };

        assertDatapackMetadata(metadata);

        const formData = new FormData();
        const filename = metadata.storedFileName;
        formData.append(
          "datapack",
          new Blob([datapackBuffer], { type: datapackMimeType ?? undefined }) as unknown as Blob,
          filename
        );
        formData.append("title", metadata.title);
        formData.append("description", metadata.description);
        formData.append("references", JSON.stringify(metadata.references));
        formData.append("tags", JSON.stringify(metadata.tags));
        formData.append("authoredBy", metadata.authoredBy);
        formData.append("isPublic", metadata.isPublic.toString());
        formData.append("uuid", metadata.uuid);
        formData.append("type", metadata.type);
        formData.append("priority", metadata.priority.toString());
        if (profilePictureBuffer && profilePictureMimeType && profilePictureExtension) {
          const profileFilename = `profile-picture${profilePictureExtension}`;
          formData.append(
            "datapack-image",
            new Blob([profilePictureBuffer], { type: profilePictureMimeType }) as unknown as Blob,
            profileFilename
          );
        }

        formData.append("hasFiles", metadata.hasFiles.toString());
        if (hasFiles) {
          pdfBuffers.forEach((pdfBuffer, index) => {
            formData.append(
              "pdfFiles[]",
              new Blob([pdfBuffer], { type: pdfMimeTypes[index] }) as unknown as Blob,
              `attachment-${index}.pdf`
            );
          });
        }
        if (metadata.notes) formData.append("notes", metadata.notes);
        if (metadata.contact) formData.append("contact", metadata.contact);
        if (metadata.date) formData.append("date", metadata.date);
        if (uuid === tempUserUuid) formData.append("sessionId", sess.sessionId);
        

        const uploadResponse = await fetch(`${internalServerUrl}/mcp/upload-datapack`, {
          method: "POST",
          headers: { "User-ID": uuid },
          body: formData
        });

        if (!uploadResponse.ok) {
          let details = `${uploadResponse.status} ${uploadResponse.statusText}`;
          try {
            const errorJson = await uploadResponse.json();
            if (
              errorJson &&
              typeof errorJson === "object" &&
              "error" in errorJson &&
              typeof errorJson.error === "string"
            ) {
              details = errorJson.error;
            }
          } catch {
            // Fall back to status text when the response body is not JSON.
          }
          return wrapResponse(
            {
              error: `Failed to upload datapack: ${details}`
            },
            sess.sessionId
          );
        }

        const data = await uploadResponse.json();
        return wrapResponse({ message: `Datapack uploaded: ${data.message}` }, sess.sessionId);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        return wrapResponse({ error: `Upload failed: ${errorMsg}` }, sess.sessionId);
      }
    }
  );

  server.registerResource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    {
      title: "Greeting Resource",
      description: "Dynamic greeting generator"
    },
    async (uri, { name }) => ({
      contents: [
        {
          uri: uri.href,
          text: `Hello, ${name}!`
        }
      ]
    })
  );
  return server;
};

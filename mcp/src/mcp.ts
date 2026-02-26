import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import * as path from "path";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import type { SharedUser } from "@tsconline/shared";
import { MCPLinkParams, assertDatapackMetadata, DatapackMetadata, DatapackType, UserDatapack, assertDatapackTypeString} from "@tsconline/shared";

// We use the .env file from server cause mcp is a semi-lazy-parasite of server
dotenv.config({
  path: path.resolve(process.cwd(), "../server/.env"),
  override: true,
  quiet: true
});

const serverUrl = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : `http://localhost:3000`;
const frontendUrl = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : `http://localhost:5173`;

// Single session map: sessionId -> { userInfo?, createdAt, lastActivity }
export interface SessionEntry {
  userInfo?: SharedUser; // undefined = pre-login, defined = authenticated
  createdAt: number;
  lastActivity: number;
  userChartState: ChartState;
}

export const sessions = new Map<string, SessionEntry>();

const PRE_LOGIN_TTL_MS = 30 * 60 * 1000; // login link valid for 30 min
const AUTHENTICATED_INACTIVITY_TTL_MS = 10 * 60 * 1000; // session lasts 10 minutes since last active
const MAX_CONCURRENT_LOGIN_REQUESTS = 10; // rate limit: max 10 pre-login sessions

// Cleanup expired sessions every 1 minute
export const cleanupInterval = setInterval(
  () => {
    const now = Date.now();

    console.log("-----");
    console.log("sessions: ", sessions.size);
    console.log("sessions makeup:", sessions);

    console.log("-----");

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

function newChartState(): ChartState {
  return { datapackTitles: [], overrides: {}, columnToggles: {} };
}

function createSession(): { sessionId: string; entry: SessionEntry } {
  const sessionId = randomUUID();
  const entry: SessionEntry = {
    createdAt: Date.now(),
    lastActivity: Date.now(),
    userInfo: undefined,
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
  if (es.internalNote) console.log("[Auth Notice]", es.internalNote);

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
  if (es.internalNote) console.log("[Session Notice]", es.internalNote);

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

const TOOL_DESCRIPTIONS = {
  getCurrentChartState: {
    title: "Get Current Chart State",
    description: `What it does: returns the server's current chart configuration (datapacks, merged overrides, column toggles, last chart path/time).

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

This tool (like ALL tools) returns: { "data": {...}, "sessionId": "uuid" }
The sessionId flows through: listDatapacks → login → whoami → updateChartState → (etc)

If this is your VERY FIRST tool call in the conversation: omit sessionId (auto-created).
WARNING: Omitting sessionId on subsequent calls breaks the session chain and creates a NEW session (losing all previous state).

    When to use:
    - Before incremental changes (see what's set)
    - After updateChartState (verify changes)
    - When debugging why a chart looks a certain way

    Input: { sessionId?: string }
    - sessionId: REQUIRED (except first call) - the sessionId from your previous tool call

    Example output shape:
    {
      "data": {
        "datapackTitles": ["Africa Bight"],
        "overrides": { "topAge": 0, "baseAge": 65 },
        "columnToggles": { "off": ["nigeria coast"], "on": [] },
        "lastChartPath": "/charts/...",
        "lastModified": "..."
      },
      "sessionId": "uuid-to-use-in-next-call"
    }`
  },
  resetChartState: {
    title: "Reset Chart State",
    description: `What it does: clears the server's current chart configuration for this session. Next updateChartState call starts fresh.

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

WARNING: Omitting sessionId breaks the session chain and creates a NEW session (losing all previous state).

    When to use:
    - Starting a brand new chart setup
    - State feels confusing; you want a clean slate

    Input: { sessionId?: string }
    - sessionId: REQUIRED (except first call) - the sessionId from your previous tool call`
  },

  updateChartState: {
    title: "Update/Generate Chart",
    description: `What it does: merges into the chart state and triggers chart render. Returns the generated chart SVG and updated state.

CRITICAL REQUIREMENT: Every call MUST include datapackTitles (array, non-empty). Partial updates are allowed for overrides and columnToggles, but datapacks cannot be omitted.
A good workflow is to try to use the datapackTitles given to you (or what you assume the user wants). And should chart generation fail, you can always call listDatapacks to see available options.
If you are suspicious of a given chart name or are unsure which datapacks to use, first call listDatapacks to see available options. Try to best align with existing + expected datapacks.

When to use:
- First chart or changing datapacks: provide datapackTitles (required).
- Adjust time/settings: provide overrides (object, optional). Only known keys have guaranteed effect; unknown keys are accepted but may be ignored by the renderer.
- Toggle columns: provide columnToggles with on/off arrays (optional). Just use the column names the user gives you - assume they're correct. Case-insensitive; exclusive on/off (adding to off removes from on).
- Debugging: always set useCache to true

Column toggling workflow:
- If user says "turn off column X": just do it with { columnToggles: { off: ["X"] } }
- Don't pre-emptively call listColumns to verify names
- Only if chart generation FAILS or user complains about missing columns, THEN call listColumns to see available options

Payload shape (ALWAYS FOLLOWS THIS SHAPE):
{ datapackTitles: string[]; overrides?: Record<string, unknown>; columnToggles?: { on?: string[]; off?: string[] }; useCache?: boolean; isCrossPlot?: boolean; sessionId?: string }

This tool does NOT accept chart geometry/axes/series. Do not send xAxis/yAxis/series/title. Use datapacks + overrides + column toggles only.

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

Example flow: listDatapacks → (get sessionId) → login WITH THAT sessionId → (get sessionId) → updateChartState WITH THAT sessionId

If this is your VERY FIRST tool call in the conversation: omit sessionId (auto-created).
WARNING: Omitting sessionId on subsequent calls breaks the session chain and creates a NEW session (losing all previous state).

Response format:
{
  "data": { "message": "Chart generated!", "directUrl": "...", "embeddedChartUrl": "...", "currentState": {...} },
  "sessionId": "uuid-to-use-in-next-call"
}

Important notes:
- Do NOT wrap payload twice. In MCP Inspector's per-field input, enter {...} directly, not { overrides: {...} }.
- Unknown override keys are allowed by the schema but may be silently ignored by the renderer.
- Only these override keys are officially supported: topAge, baseAge, unitsPerMY, skipEmptyColumns, variableColors, noIndentPattern, negativeChk, doPopups, enEventColBG, enChartLegend, enPriority, enHideBlockLable.

useCache behavior: it should ALWAYS be true for predictable results, no matter what. Setting to false may yield unexpected charts due to caching logic.

Don't invent chart structure from thin air; always build incrementally from existing state. The only exception is the first call after resetChartState, which starts fresh.
Follow these patterns ALWAYS (don't invent stuff):

Example 1 (minimal/default/basic):
{ "datapackTitles": ["Africa Bight"] }

Example 2 (override topAge, baseAge, and vertical scale):
{
  "datapackTitles": ["GTS2020"],
  "overrides": { "topAge": 0, "baseAge": 100, "unitsPerMY": 2 },
  "useCache": true
}

Example 3 (toggle columns by id, change overrides):
{
  "datapackTitles": ["GTS2020"],
  "overrides": { "topAge": 5, "baseAge": 150 },
  "columnToggles": { "on": ["column-id-1"], "off": ["column-id-2"] },
  "useCache": true
}

These are just examples for changing datapacks, overrides, and column toggles. You can mix and match as needed.

Remember: datapack settings will persist across calls until resetChartState is used. If a column is toggled off, it stays off until explicitly toggled on again. Same with toggling it on.
The point is you only have to include the changes you want to make; the rest of the state is preserved automatically.

AUTO-DISPLAY REQUIREMENT (default behavior):
After every successful updateChartState call, the assistant MUST immediately display the generated chart inline in the conversation.

This is an example for how to display it in Markdown with an embedded image:

Use the url marked as <![Chart] below to embed the chart image like this:
![Chart](https://pr-preview.geolex.org/public/charts/b3427e1d4e367edd668b65695e4df0f4/chart.svg)

so ![Chart](<INSERT_RETURNED_CHART_URL_HERE>)

There are 2 URLs in the response. Use the one labeled as <Embedded Chart URL> for embedding the image in Markdown. Do not display this link to the user directly; it's for embedding only. Use the URL marked as Direct URL to show the user the direct link to the chart.

Example response snippet:
{
  "content": [
    {
      "type": "text",
      "text": "Chart generated!\n\nDirect URL: https://pr-preview.geolex.org/chart-view?mcpChartState=eyJkYXRhcGFja3MiOlsiQWZyaWNhIEJpZ2h\n\nCurrent state:\n{...}\n\n<Embedded Chart URL>: https://pr-preview.geolex.org/public/charts/b3427e1d4e367edd668b65695e4df0f4/chart.svg"
    },
}

The assistant MUST embed the chart image using the returned chart URL in a Markdown image tag as shown above.

The assistant SHOULD still provide the direct URL as plain text under the embed.`
  },

  listDatapacks: {
    title: "List Available Datapacks",
    description: `What it does: lists datapacks you can use when building a chart.

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

This tool (like ALL tools) returns: { "data": [...], "sessionId": "uuid" }
The returned sessionId MUST be passed to your NEXT tool call (whether it's login, updateChartState, or any other tool).

If this is your VERY FIRST tool call in the conversation: omit sessionId (auto-created).
WARNING: Omitting sessionId on subsequent calls breaks the session chain and creates a NEW session.

    When to use:
    - First step before selecting datapacks
    - Need to confirm titles/ids available

    Input: { sessionId?: string }
    - sessionId: REQUIRED (except first call) - the sessionId from your previous tool call
    - Do not wrap payload twice (no nested { input: {...} }).`
  },

  listColumns: {
    title: "List Columns",
    description: `What it does: returns a flat list of column ids and metadata for the given datapacks.

WHEN TO USE THIS:
- User explicitly ASKS "what columns are available?" or "show me the columns"
- updateChartState FAILED and you need to troubleshoot which columns actually exist
- User complains about missing columns after chart generation

WHEN NOT TO USE:
- Before calling updateChartState "just to check" - DON'T do this!
- User says "turn off column X" - just trust them and call updateChartState directly
- Preemptively verifying column names - unnecessary, wastes time

Workflow: Trust user's column names → updateChartState fails? → THEN call listColumns to debug

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

WARNING: Omitting sessionId breaks the session chain and creates a NEW session (losing all previous state).

Input: { datapackTitles: string[], sessionId?: string }
- Titles must exist (see listDatapacks)
- sessionId: REQUIRED (except first call) - the sessionId from your previous tool call
- Do not wrap payload twice (no nested { input: {...} })

Example: { "datapackTitles": ["GTS2020"], "sessionId": "<from-previous-call>" }`
  },

  login: {
    title: "Login",
    description: `Generate a login link for user authentication.

========================================================================
CRITICAL: The sessionId is a SECRET. NEVER display the sessionId to the user.
It must ONLY be used in subsequent internal tool calls.
========================================================================

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

EXAMPLE: If you just called listDatapacks and received sessionId "abc-123", you MUST pass "abc-123" to THIS login call.
The session chain flows: listDatapacks → (returns sessionId) → login WITH THAT sessionId → (returns sessionId) → next tool WITH THAT sessionId

If this is your VERY FIRST tool call in the conversation: omit sessionId (auto-created).
WARNING: Omitting sessionId when you already have one breaks the chain and creates a NEW session (user will see different states).

What to show the user:
- loginUrl ONLY - this is the ONLY thing the user should see

What to keep internal:
- sessionId - store this for passing to tool calls, DO NOT display it

Session lifecycle:
- Pre-login sessions: 30 minutes valid
- After login completed: session valid for 10 minutes of inactivity
- Pass sessionId to tool calls to track activity and extend session

Response format: { "data": { "message": "...", "loginUrl": "..." }, "sessionId": "uuid-string" }`
  },

  whoami: {
    title: "Who Am I? Am I logged in?",
    description: `What it does: Check if you're logged in and get user details.

=== SESSION MANAGEMENT (CRITICAL) ===
Session continuity is MANDATORY across ALL tool calls in a conversation.
After your first tool call, EVERY subsequent call MUST include the sessionId returned by the IMMEDIATELY PREVIOUS tool call response, REGARDLESS of which specific tool was called.

EXAMPLE: If you just called login and received sessionId "abc-123", you MUST pass "abc-123" to THIS whoami call to check the status of THAT specific session.

WARNING: Omitting sessionId breaks the session chain and creates a NEW session (you'll check a different session, not the one you just created with login).

REMINDER: sessionId is internal only - don't show it to the user!

Returns one of three states:
1. LOGGED IN: Returns user object (username, email, isAdmin, etc.) → session is authenticated
2. NOT YET AUTHENTICATED: Session exists but user hasn't completed login → show login link again or wait
3. AUTO-CREATED NEW SESSION: If session expired/omitted, a new one is automatically created

Input: { sessionId?: string }
- sessionId: REQUIRED (except first call) - the sessionId from your previous tool call

Session Expiration Rules:
- Pre-login: 30 minutes from creation (user must complete login within 30 min)
- Authenticated: 10 minutes of inactivity (any tool call resets timer)
- Invalid/expired: Auto-replaced with new session on any tool call`
  }
} as const;

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
        const res = await fetch(`${serverUrl}/mcp/render-chart-with-edits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datapackTitles: st.datapackTitles,
            overrides: st.overrides,
            columnToggles: st.columnToggles,
            useCache: args.useCache ?? true,
            isCrossPlot: args.isCrossPlot ?? false,
            uuid: entry.userInfo?.uuid
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
          message: `Chart generated!\n\nDirect URL (use this link directly): ${mcpToolUrl}`,
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

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const entry = sessionId ? sessions.get(sessionId) : undefined;
        const uuid = entry?.userInfo?.uuid;

        const res = await fetch(`${serverUrl}/mcp/datapacks`, {
          method: "POST",
          headers,
          body: JSON.stringify({ uuid })
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

        const res = await fetch(`${serverUrl}/mcp/list-columns`, {
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
        // Rate limit: check number of pre-login sessions
        const preLoginCount = Array.from(sessions.values()).filter((entry) => entry.userInfo === undefined).length;

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

        console.log("Created login URL:", loginUrl);
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

  // Upload files: accepts HTTP/HTTPS URLs from AI (user uploads files to AI, AI uploads to cloud storage), converts to base64, and uploads them
  server.registerTool(
    "uploadFiles",
    {
      title: "Upload Files",
      description: `Upload one or more image files to the server. The user uploads files to the AI, the AI saves files at some internal storage and serves HTTP/HTTPS URLs.

When to use:
- User provides image files (uploaded to the AI) and you need to send them to the server.
- Files will be automatically fetched from the HTTP URLs, converted to base64, and uploaded.
- For images: if files are JPG/JPEG, PNG, or GIF, the server will return them for display.

Input:
- fileUris: Array of HTTP or HTTPS URLs of the files (e.g. ["https://example.com/image1.jpg", "https://example.com/image2.png"])
- fileNames: (optional) Array of original file names. If not provided, will be extracted from URLs or defaulted.`,
      inputSchema: {
        fileUris: z.array(z.string().url()).min(1).describe("Array of HTTP or HTTPS URLs of the files uploaded to cloud storage by the AI. At least one URL is required."),
        fileNames: z.array(z.string()).optional().describe("Optional: Array of original file names. If provided, must match the length of fileUris. If not provided, extracted from URLs")
      }
    },
    async ({ fileUris, fileNames }, _extra) => {
      try {
        const { writeFile, mkdir } = await import("fs/promises");
        const { tmpdir } = await import("os");

        // Validate that at least one file is provided
        if (!fileUris || fileUris.length === 0) {
          return {
            content: [{ type: "text", text: "Error: No files provided. Please provide at least one file URL." }],
            isError: true
          };
        }

        // Validate fileNames length matches fileUris if provided
        if (fileNames && fileNames.length !== fileUris.length) {
          return {
            content: [{ type: "text", text: `Error: fileNames array length (${fileNames.length}) does not match fileUris array length (${fileUris.length}).` }],
            isError: true
          };
        }

        type TextContent = { type: "text"; text: string };
        type ImageContent = { type: "image"; data: string; mimeType: string };
        const content: (TextContent | ImageContent)[] = [];
        const uploadDir = path.join(tmpdir(), "mcp-uploads");
        await mkdir(uploadDir, { recursive: true });

        const uploadedFiles: Array<{ fileName: string; safeName: string; isImage: boolean; mimeType?: string }> = [];
        const errors: string[] = [];

        // Process each file
        for (let i = 0; i < fileUris.length; i++) {
          const fileUri = fileUris[i];
          
          // Skip if fileUri is undefined (shouldn't happen, but TypeScript safety check)
          if (!fileUri) {
            errors.push(`File ${i + 1}: Missing file URI`);
            continue;
          }
          
          try {
            // Validate that it's an HTTP/HTTPS URL
            let url: URL;
            try {
              url = new URL(fileUri);
              if (url.protocol !== "http:" && url.protocol !== "https:") {
                errors.push(`File ${i + 1}: Invalid URL protocol. Only HTTP and HTTPS URLs are supported. Got: ${url.protocol}`);
                continue;
              }
            } catch {
              errors.push(`File ${i + 1}: Invalid URL format: ${fileUri}`);
              continue;
            }

            // Fetch the file from the HTTP/HTTPS URL
            const response = await fetch(fileUri);
            if (!response.ok) {
              errors.push(`File ${i + 1}: Failed to fetch file from URL: ${response.status} ${response.statusText}`);
              continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const fileContentBase64 = buffer.toString("base64");
            const detectedMimeType = response.headers.get("content-type") || undefined;

            // Determine file name
            let finalFileName = fileNames?.[i];
            if (!finalFileName) {
              finalFileName = path.basename(url.pathname) || `upload-${randomUUID()}`;
            }

            // Determine file extension and type
            const ext = path.extname(finalFileName).toLowerCase();
            const isJpg = ext === ".jpg" || ext === ".jpeg";
            const isPng = ext === ".png";
            const isGif = ext === ".gif";
            const isImage = isJpg || isPng || isGif || (detectedMimeType?.startsWith("image/") ?? false);

            // Determine MIME type
            let mimeType = detectedMimeType || "image/jpeg";
            if (!mimeType.startsWith("image/")) {
              if (isPng) mimeType = "image/png";
              else if (isGif) mimeType = "image/gif";
              else if (isJpg) mimeType = "image/jpeg";
            }

            // Save to server temp dir
            const safeName = `${randomUUID()}-${path.basename(finalFileName)}`;
            const serverPath = path.join(uploadDir, safeName);
            await writeFile(serverPath, buffer);

            uploadedFiles.push({
              fileName: finalFileName,
              safeName,
              isImage,
              mimeType
            });

            // Add image to content for display
            if (isImage) {
              content.push({ type: "image", data: fileContentBase64, mimeType });
            }
          } catch (e) {
            errors.push(`File ${i + 1}: Upload failed: ${String(e)}`);
          }
        }

        // Build response message
        let textMessage = "";
        if (uploadedFiles.length > 0) {
          textMessage += `Successfully uploaded ${uploadedFiles.length} file(s):\n`;
          uploadedFiles.forEach((file, idx) => {
            textMessage += `  ${idx + 1}. ${file.fileName} (saved as ${file.safeName})`;
            if (file.isImage) {
              textMessage += ` - Image (${file.mimeType})`;
            }
            textMessage += "\n";
          });
        }

        if (errors.length > 0) {
          textMessage += `\nErrors encountered:\n`;
          errors.forEach((error) => {
            textMessage += `  - ${error}\n`;
          });
        }

        if (uploadedFiles.length === 0) {
          return {
            content: [{ type: "text", text: `Error: Failed to upload any files.\n\n${errors.join("\n")}` }],
            isError: true
          };
        }

        content.unshift({ type: "text", text: textMessage.trim() });

        return { content } as { content: TextContent[] };
      } catch (e) {
        return { content: [{ type: "text", text: `Upload failed: ${String(e)}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "uploadDatapack",
    {
      title: "Upload Datapack",
      description: `Upload a datapack file to the server as well as meta data, profile picture, and optional pdf files. The user uploads the datapack file, optional profile picture, and optional pdf files to the AI, the AI saves the file at some internal storage and serves the HTTP/HTTPS URL.

    When to use:
    - user asks to upload a datapack
    - user provides the datapack file, optional profile picture, and optional pdf files


    Input:
    - datapackFile: The datapack file to upload 
    - datapackFileName: The name of the datapack file. If not provided, the AI should try to send filename from the user uploaded datapack. 
    - title: The title of the datapack
    - description: The description of the datapack
    - datapackImage: The profile picture to upload (optional)
    - pdfFiles: The pdf files to upload (optional)
    - contact: The contact of the datapack (optional)
    - date: The date of the datapack (optional)
    - tags: The tags of the datapack (optional)`,

    inputSchema: {
            datapackUri: z.string().url().describe("A HTTP or HTTPS URL of the datapack file uploaded to cloud storage by the AI."),
            datapackImageUri: z.string().url().optional().describe("A HTTP or HTTPS URL of the profile picture file uploaded to cloud storage by the AI. If not provided, the profile picture will not be uploaded."),
            datapackFileName: z.string().optional().describe("The name of the datapack file. If not provided, the name will be extracted from the URL."),
            pdfFilesUris: z.array(z.string().url()).optional().describe("Array of HTTP or HTTPS URLs of the pdf files uploaded to cloud storage by the AI. If not provided, the pdf files will not be uploaded."),
            title: z.string().describe("The title of the datapack"),
            description: z.string().describe("The description of the datapack"),
            contact: z.string().optional().describe("The contact of the datapack (optional)"),
            date: z.string().optional().describe("The date of the datapack (optional)"),
            tags: z.array(z.string()).optional().describe("String array of tags of the datapack (optional)"),
            priority: z.number().optional().describe("The priority of the datapack (optional)"),
            sessionId: z.string().optional().describe("The session ID of the user. If not provided, the user will not be authenticated."),
            references: z.array(z.string()).optional().describe("String array of references of the datapack (optional)"),
        },
      },
    async ({datapackUri, datapackFileName, title, description, contact, sessionId, tags, references, priority}) => {

      //Update session activity

      // const v = verifyMCPSession(sessionId);
      // if ("response" in v) return v.response;

      //neel uuid 7b9cf389-f0ef-4fbc-a82e-37046cb61bac

      // const entry = v.entry;
      // const user = entry.userInfo;
      // const uuid = user?.uuid;
      const uuid = "7b9cf389-f0ef-4fbc-a82e-37046cb61bac";
      if (!uuid) {
        return { content: [{ type: "text", text: `Error: User UUID not found.` }], isError: true };
      }

      console.log("_______\n\nuuid", uuid);

      //Check if description is provided
      if (description.length === 0 || title.length === 0) {
        return { content: [{ type: "text", text: `Error: Description and title are required.` }], isError: true };
      }

      try {
      //fetch file form datapackUri
      const datapack_response = await fetch(datapackUri);
      if (!datapack_response.ok) {
        return { content: [{ type: "text", text: `Failed to fetch file from URL: ${datapack_response.status} ${datapack_response.statusText}` }], isError: true };
      }
      const arrayBuffer = await datapack_response.arrayBuffer();
      const datapack_buffer = Buffer.from(arrayBuffer);
      
      // const authoredBy = entry.userInfo?.username ?? "";
      const authoredBy = "Neel";
      const isPublic = false;
      const notes = ""; // TODO: add notes




      const datapackType: DatapackType = {
        type: "user",
        uuid: uuid
      };

      const metadata: DatapackMetadata = {
        description,
        title,
        originalFileName: datapackFileName ?? "default-datapack.txt",
        storedFileName: datapackFileName ?? "default-datapack.txt",
        size: datapack_buffer.length.toString(),
        date: new Date().toISOString().split("T")[0] ?? "",
        authoredBy,
        tags: tags ?? [],
        references: references ?? [],
        isPublic,
        priority: priority ?? 0,
        hasFiles: false,
        ...datapackType,
        ...(contact != null && contact !== "" && { contact }),
        ...(notes != null && notes !== "" && { notes })
      };

      assertDatapackMetadata(metadata);

      const formData = new FormData();
      const filename = metadata.storedFileName ?? "default-datapack.txt";
      formData.append("datapack", new Blob([datapack_buffer]) as unknown as Blob, filename);
      formData.append("title", metadata.title);
      formData.append("description", metadata.description);
      formData.append("references", JSON.stringify(metadata.references));
      formData.append("tags", JSON.stringify(metadata.tags));
      formData.append("authoredBy", metadata.authoredBy);
      formData.append("isPublic", metadata.isPublic.toString());
      formData.append("uuid", metadata.uuid);
      formData.append("type", metadata.type);
      formData.append("hasFiles", metadata.hasFiles.toString());
      formData.append("priority", metadata.priority.toString());
      if (metadata.notes) formData.append("notes", metadata.notes);
      if (metadata.contact) formData.append("contact", metadata.contact);
      if (metadata.date) formData.append("date", metadata.date);


      const upload_response = await fetch(`${serverUrl}/mcp/upload-datapack`, {
        method: "POST",
        headers: { "User-ID": uuid },
        body: formData
      });

      if (!upload_response.ok) {
        return { content: [{ type: "text", text: `Failed to upload datapack: ${upload_response.status} ${upload_response.statusText}` }], isError: true };
      }


      const data = await upload_response.json();
      return { content: [{ type: "text", text: `Datapack uploaded: ${data.message}` }] };
    } catch (e: unknown) {
      //print the stack trace
      return { content: [{ type: "text", text: `Upload failed stack: ${(e as Error).stack}` }], isError: true };
    }
  });

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

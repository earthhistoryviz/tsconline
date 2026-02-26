import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import * as path from "path";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import type { SharedUser } from "@tsconline/shared";
import { MCPLinkParams } from "@tsconline/shared";

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
function wrapResponse(content: unknown, sessionId: string) {
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
  datapackTitles: datapackTitlesSchema.optional(),
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

  // Tool: Get current chart state
  server.registerTool(
    "getCurrentChartState",
    {
      title: "Get Current Chart State",
      description: `What it does: returns the server's current chart configuration (datapacks, merged overrides, column toggles, last chart path/time).

=== SESSION MANAGEMENT ===
IMPORTANT: Every tool call returns a sessionId in the response. Store and pass this sessionId to all subsequent tool calls.
If you don't provide a sessionId, one will be automatically created.
If you provide an invalid/expired sessionId, a new one will be automatically created and returned.

    When to use:
    - Before incremental changes (see what's set)
    - After updateChartState (verify changes)
    - When debugging why a chart looks a certain way

    Input: { sessionId?: string }
    - sessionId (optional): From previous tool call response. Maintains session state and user activity.

    Example output shape:
    {
      "datapackTitles": ["Africa Bight"],
      "overrides": { "topAge": 0, "baseAge": 65 },
      "columnToggles": { "off": ["nigeria coast"], "on": [] },
      "lastChartPath": "/charts/...",
      "lastModified": "..."
    }`,
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

  // Tool: Reset chart state
  server.registerTool(
    "resetChartState",
    {
      title: "Reset Chart State",
      description: `What it does: clears the server's chart state so the next build starts fresh.

=== SESSION MANAGEMENT ===
Important: Pass the sessionId from your previous tool response to maintain the session. A new one will be automatically created if not provided.
The response will include the current (or newly created) sessionId - store it for the next call.

    When to use:
    - Starting a brand new chart setup
    - State feels confusing; you want a clean slate

    Input: { sessionId?: string }
    - sessionId (optional): From previous tool call response. Maintains session state.`,
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

  // Tool: Update/Generate chart
  server.registerTool(
    "updateChartState",
    {
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
{ datapackTitles: string[]; overrides?: Record<string, unknown>; columnToggles?: { on?: string[]; off?: string[] }; useCache?: boolean; isCrossPlot?: boolean }

This tool does NOT accept chart geometry/axes/series. Do not send xAxis/yAxis/series/title. Use datapacks + overrides + column toggles only.

=== SESSION MANAGEMENT ===
PASS THE sessionId FROM YOUR PREVIOUS TOOL CALL. If this is your first call, one will be auto-created and returned.
All responses include both the chart data AND the sessionId - store the sessionId and pass it to your next tool call. Response format:
{
  "data": { "message": "Chart generated!", "directUrl": "...", "embeddedChartUrl": "...", "currentState": {...} },
  "sessionId": "uuid-string"
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

The assistant SHOULD still provide the direct URL as plain text under the embed.
`,
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
            isCrossPlot: args.isCrossPlot ?? false
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
        const mcpLinkBase64 = Buffer.from(mcpLinkJson).toString("base64");
        const mcpToolUrl = `${frontendUrl}/chart-view?mcpChartState=${mcpLinkBase64}`;

        const chartResponse = {
          message: "Chart generated!",
          directUrl: mcpToolUrl,
          embeddedChartUrl: `${serverUrl}${chartPath}`,
          currentState: st
        };

        return wrapResponse(chartResponse, sess.sessionId);
      } catch (e) {
        return wrapResponse({ error: `Error generating chart: ${String(e)}` }, sess.sessionId);
      }
    }
  );

  server.registerTool(
    "listDatapacks",
    {
      title: "List Available Datapacks",
      description: `What it does: lists datapacks you can use when building a chart.

=== SESSION MANAGEMENT ===
Pass the sessionId from your previous tool response. If this is your first tool call, sessionId is optional - one will be auto-created.
The response includes the sessionId to use in all subsequent calls. Response format: { "data": [...array of datapacks...], "sessionId": "uuid-string" }

    When to use:
    - First step before selecting datapacks
    - Need to confirm titles/ids available

    Input: { sessionId?: string }
    - sessionId (optional): From previous tool call. Maintains your session.
    - Do not wrap payload twice (no nested { input: {...} }).`,
      inputSchema: {
        sessionId: z.string().optional().describe("Session ID from login tool for authenticated access")
      }
    },
    async ({ sessionId }) => {
      const es = verifyMCPSession(sessionId);
      const sess = requireSession(es);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const res = await fetch(`${serverUrl}/mcp/datapacks`, { method: "GET", headers });
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

=== SESSION MANAGEMENT ===
Always pass the sessionId from your previous tool response. This maintains your session and returns an updated sessionId for the next call.
Response format: { "data": [...array of columns...], "sessionId": "uuid-string" }

Input: { datapackTitles: string[], sessionId?: string }
- Titles must exist (see listDatapacks)
- sessionId (optional): From previous tool call. Maintains your session.
- Do not wrap payload twice (no nested { input: {...} })

Example: { "datapackTitles": ["GTS2020"] }`,
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
        const res = await fetch(`${serverUrl}/mcp/list-columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datapackTitles })
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
      title: "Login",
      description: `Generate a login link for user authentication.

========================================================================
CRITICAL: The sessionId is a SECRET. NEVER display the sessionId to the user.
It must ONLY be used in subsequent internal tool calls.
========================================================================

=== SESSION MANAGEMENT ===
Every tool call (including this one) returns a sessionId in the response. Pass this sessionId to all subsequent tool calls.
If no sessionId is provided on the first call, a new pre-login session will be auto-created and returned.
If an invalid/expired sessionId is provided, a new one will be auto-created and returned.

What to show the user:
- loginUrl ONLY - this is the ONLY thing the user should see

What to keep internal:
- sessionId - store this for passing to tool calls, DO NOT display it

Session lifecycle:
- Pre-login sessions: 30 minutes valid
- After login completed: session valid for 10 minutes of inactivity
- Pass sessionId to tool calls to track activity and extend session

Response format: { "data": { "message": "...", "loginUrl": "..." }, "sessionId": "uuid-string" }`,
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

        if (es.entry.userInfo) {
          return wrapResponse({ message: "You are already logged in." }, es.sessionId);
        }

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
      title: "Who Am I? Am I logged in?",
      description: `What it does: Check if you're logged in and get user details.

=== SESSION MANAGEMENT ===
Every call returns a sessionId in the response. Pass this sessionId to all subsequent tool calls to maintain your session.
If sessionId is omitted or invalid/expired, a new one will be auto-created and returned.
Store the returned sessionId and use it in your next tool call. Response format: { "data": {...}, "sessionId": "uuid-string" }

REMINDER: sessionId is internal only - don't show it to the user!

Returns one of three states:
1. LOGGED IN: Returns user object (username, email, isAdmin, etc.) → session is authenticated
2. NOT YET AUTHENTICATED: Session exists but user hasn't completed login → show login link again or wait
3. AUTO-CREATED NEW SESSION: If session expired, a new one is automatically created and returned

Input: { sessionId?: string }
- sessionId (optional): From previous tool call. Pass it here to maintain auth status.

Session Expiration Rules:
- Pre-login: 30 minutes from creation (user must complete login within 30 min)
- Authenticated: 10 minutes of inactivity (any tool call resets timer)
- Invalid/expired: Auto-replaced with new session on any tool call`,
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
              userInfo: entry.userInfo
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

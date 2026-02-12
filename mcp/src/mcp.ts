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

const PRE_LOGIN_TTL_MS = 2 * 60 * 1000; // login link valid for 2 min
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

function verifyMCPSession(
  sessionId?: string
): { entry: SessionEntry } | { response: { content: { type: "text"; text: string }[] } } {
  if (!sessionId) {
    return { response: { content: [{ type: "text", text: "Missing sessionId." }] } };
  }

  const entry = sessions.get(sessionId);
  if (!entry) {
    return {
      response: {
        content: [{ type: "text", text: "Session not found or expired. Please login again." }]
      }
    };
  }

  if (!entry.userInfo) {
    return {
      response: {
        content: [{ type: "text", text: "Session exists but is not authenticated yet. Please complete login." }]
      }
    };
  }

  entry.lastActivity = Date.now();
  return { entry };
}

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

    When to use:
    - Before incremental changes (see what's set)
    - After updateChartState (verify changes)
    - When debugging why a chart looks a certain way

    Input: { sessionId?: string }
    - sessionId (optional): Session ID from login tool for authenticated access. Tracking activity if provided.

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
      const v = verifyMCPSession(sessionId);
      if ("response" in v) return v.response;

      return {
        content: [{ type: "text", text: JSON.stringify(v.entry.userChartState, null, 2) }]
      };
    }
  );

  // Tool: Reset chart state
  server.registerTool(
    "resetChartState",
    {
      title: "Reset Chart State",
      description: `What it does: clears the server's chart state so the next build starts fresh.

    When to use:
    - Starting a brand new chart setup
    - State feels confusing; you want a clean slate

    Input: { sessionId?: string }
    - sessionId (optional): Session ID from login tool for authenticated access. Tracking activity if provided.`,
      inputSchema: {
        sessionId: z.string().optional().describe("Session ID from login tool for authenticated access")
      }
    },
    async ({ sessionId }) => {
      const v = verifyMCPSession(sessionId);
      if ("response" in v) return v.response;

      v.entry.userChartState = newChartState();

      return {
        content: [{ type: "text", text: "Chart state cleared for this session." }]
      };
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
      const v = verifyMCPSession(args.sessionId);
      if ("response" in v) return v.response;

      const entry = v.entry;

      if (!args.datapackTitles) {
        return { content: [{ type: "text", text: "Error: datapackTitles is required." }] };
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
          return { content: [{ type: "text", text: `Server error ${res.status}: ${JSON.stringify(json)}` }] };
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

        return {
          content: [
            {
              type: "text",
              text: `Chart generated!\n\nDirect URL: ${mcpToolUrl}
              \n\nCurrent state:\n${JSON.stringify(st, null, 2)}
              \n\n<Embedded Chart URL>: ${serverUrl}${chartPath}`
            }
          ]
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error generating chart: ${String(e)}` }] };
      }
    }
  );

  server.registerTool(
    "listDatapacks",
    {
      title: "List Available Datapacks",
      description: `What it does: lists datapacks you can use when building a chart.

    When to use:
    - First step before selecting datapacks
    - Need to confirm titles/ids available

    Output: array of objects with at least { title, id }. Use title for later calls.

    Input: { sessionId?: string }
    - sessionId (optional): Session ID from login tool for authenticated access. Tracking activity if provided.
    - Do not wrap payload twice (no nested { input: {...} }).`,
      inputSchema: {
        sessionId: z.string().optional().describe("Session ID from login tool for authenticated access")
      }
    },
    async ({ sessionId }) => {
      // Track activity if authenticated
      if (sessionId) {
        const entry = sessions.get(sessionId);
        if (entry?.userInfo) {
          entry.lastActivity = Date.now();
        }
      }

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const res = await fetch(`${serverUrl}/mcp/datapacks`, { method: "GET", headers });
        if (!res.ok) {
          const text = await res.text();
          return { content: [{ type: "text", text: `Server error: ${res.status} ${text}` }] };
        }
        const json = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(json) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Error fetching datapacks: ${String(e)}` }] };
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

Input: { datapackTitles: string[], sessionId?: string }
- Titles must exist (see listDatapacks)
- sessionId (optional): Session ID from login tool for authenticated access. Tracking activity if provided.
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
      // Track activity if authenticated
      if (sessionId) {
        const entry = sessions.get(sessionId);
        if (entry?.userInfo) {
          entry.lastActivity = Date.now();
        }
      }

      try {
        const res = await fetch(`${serverUrl}/mcp/list-columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datapackTitles })
        });

        if (!res.ok) {
          const text = await res.text();
          return { content: [{ type: "text", text: `Server error ${res.status}: ${text}` }] };
        }

        const json = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(json, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Error listing columns: ${String(e)}` }] };
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

What to show the user:
- loginUrl ONLY - this is the ONLY thing the user should see

What to keep internal:
- sessionId - store this for passing to tool calls, DO NOT display it

Session lifecycle:
- Link valid for 2 minutes (user must complete login)
- After login: session valid for 10 minutes of inactivity
- Pass sessionId to tool calls to track activity`,
      inputSchema: {}
    },
    async () => {
      try {
        // Rate limit: check number of pre-login sessions
        const preLoginCount = Array.from(sessions.values()).filter((entry) => entry.userInfo === undefined).length;

        if (preLoginCount >= MAX_CONCURRENT_LOGIN_REQUESTS) {
          return {
            content: [
              {
                type: "text",
                text: `Too many active login requests. Please wait for existing logins to expire (2 minutes) and try again.`
              }
            ]
          };
        }

        const sessionId = randomUUID();
        const loginUrl = `${frontendUrl}/login?mcp_session=${sessionId}`;

        sessions.set(sessionId, {
          createdAt: Date.now(),
          lastActivity: Date.now(),
          // userInfo is undefined until /mcp/user-info is called
          userChartState: newChartState()
        });

        console.log("Created login URL:", loginUrl);
        return {
          content: [
            {
              type: "text",
              text: `[SHOW TO USER]
Please visit this link to log in:
${loginUrl}

[INTERNAL - DO NOT SHOW TO USER]
sessionId: ${sessionId}
(Store for tool calls. Valid 2 min until login, then 10 min of inactivity.)`
            }
          ]
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error logging in: ${String(e)}` }] };
      }
    }
  );

  server.registerTool(
    "whoami",
    {
      title: "Who Am I? Am I logged in?",
      description: `What it does: Check if you're logged in and get user details.

REMINDER: sessionId is internal only - don't show it to the user!

Returns one of three states:
1. LOGGED IN: Returns user object (username, email, isAdmin, etc.) → session is authenticated
2. NOT YET AUTHENTICATED: Session exists but user hasn't completed login → show login link again or wait
3. SESSION NOT FOUND: Session expired or never existed → call login() to get new sessionId

Input: { sessionId?: string }
- sessionId (optional): Internal ID from login() tool. Pass it here to check auth status.

Session Expiration Rules:
- Pre-login: 2 minutes from creation (user must complete login within 2 min)
- Authenticated: 10 minutes of inactivity (any tool call resets timer)

If you see "not found": session expired, call login() again.`,
      inputSchema: {
        sessionId: z.string().optional().describe("Session ID from login tool response")
      }
    },
    async ({ sessionId }) => {
      try {
        if (!sessionId) {
          return {
            content: [
              {
                type: "text",
                text: `You are not logged in. Please use the login tool to authenticate, then provide the resulting Session ID to this tool.`
              }
            ]
          };
        }

        const entry = sessions.get(sessionId);
        if (!entry) {
          return {
            content: [
              {
                type: "text",
                text: `Session ID not found. Please run login tool again.`
              }
            ]
          };
        }

        if (entry.userInfo) {
          // Track activity for authenticated session
          entry.lastActivity = Date.now();

          return {
            content: [
              {
                type: "text",
                text: `You are logged in!\n\nUser Information:\n${JSON.stringify(entry.userInfo, null, 2)}`
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Session ID not found or not yet authenticated. Please complete the login flow using the URL from the login tool.`
              }
            ]
          };
        }
      } catch (e) {
        return { content: [{ type: "text", text: `Error checking user info: ${String(e)}` }] };
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

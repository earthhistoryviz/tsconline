import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { readFile } from "fs/promises";
import * as path from "path";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import type { SharedUser } from "@tsconline/shared";

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
}

export const sessions = new Map<string, SessionEntry>();

const PRE_LOGIN_TTL_MS = 2 * 60 * 1000; // 2 minutes for unauthenticated sessions
const AUTHENTICATED_INACTIVITY_TTL_MS = 10 * 60 * 1000; // 10 minutes of inactivity for authenticated sessions

// Cleanup expired sessions every 1 minute
export const cleanupInterval = setInterval(
  () => {
    const now = Date.now();
    console.log("========");
    console.log("Active sessions:", sessions.size);
    console.log("sessions map:", Array.from(sessions).map(([id, entry]) => ({
      sessionId: id,
      userInfo: entry.userInfo,
      createdAt: entry.createdAt,
      lastActivity: entry.lastActivity
    })));
    console.log("=========");
    for (const [sessionId, entry] of sessions.entries()) {
      const isAuthenticated = entry.userInfo !== undefined;
      const timeSinceCreation = now - entry.createdAt;
      const timeSinceLastActivity = now - entry.lastActivity;

      // Pre-login: delete if older than 2 minutes
      if (!isAuthenticated && timeSinceCreation > PRE_LOGIN_TTL_MS) {
        console.log(`Deleting expired pre-login session: ${sessionId}`);
        sessions.delete(sessionId);
        continue;
      }

      // Authenticated: delete if inactive for 10 minutes
      if (isAuthenticated && timeSinceLastActivity > AUTHENTICATED_INACTIVITY_TTL_MS) {
        console.log(`Deleting inactive authenticated session: ${sessionId}`);
        sessions.delete(sessionId);
      }
    }
  },
  .1 * 60 * 1000 // Run every 1 minute
).unref?.();

// Chart state management - tracks current chart configuration
interface ChartState {
  datapackTitles: string[];
  overrides: Record<string, unknown>;
  columnToggles: { on?: string[]; off?: string[] };
  lastChartPath?: string;
  lastModified?: Date;
}

let currentChartState: ChartState = {
  datapackTitles: [],
  overrides: {},
  columnToggles: {}
};

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
  sessionId: z.string().optional().describe("Session ID from login tool for authenticated access")
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
      // Track activity if authenticated
      if (sessionId) {
        const entry = sessions.get(sessionId);
        if (entry?.userInfo) {
          entry.lastActivity = Date.now();
        }
      }

      if (!currentChartState) {
        return {
          content: [
            {
              type: "text",
              text: "No chart state set. Use updateChartState to create your first chart."
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(currentChartState, null, 2)
          }
        ]
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
      // Track activity if authenticated
      if (sessionId) {
        const entry = sessions.get(sessionId);
        if (entry?.userInfo) {
          entry.lastActivity = Date.now();
        }
      }

      currentChartState = {
        datapackTitles: [],
        overrides: {},
        columnToggles: {}
      };
      return {
        content: [
          {
            type: "text",
            text: "Chart state cleared. Ready for new configuration."
          }
        ]
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
- Toggle columns: provide columnToggles with on/off arrays (optional). Prefer column ids from listColumns; names may work but ids are safer. Case-insensitive; exclusive on/off (adding to off removes from on).
- Debugging: always set useCache to true

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

This is just an example of a chart, replace the URL with the actual returned chart url.
![Chart](https://pr-preview.geolex.org/public/charts/b3427e1d4e367edd668b65695e4df0f4/chart.svg)

so ![Chart](<INSERT_RETURNED_CHART_URL_HERE>)

The assistant MUST embed the chart image using the returned chart URL in a Markdown image tag as shown above.

The assistant SHOULD still provide the direct URL as plain text under the embed.
`,
      inputSchema: updateChartArgsSchema.shape
    },
    async (args) => {
      // Track activity if authenticated
      if (args.sessionId) {
        const entry = sessions.get(args.sessionId);
        if (entry?.userInfo) {
          entry.lastActivity = Date.now();
        }
      }

      // If no state exists and no datapackTitles provided, error
      if (!currentChartState && !args.datapackTitles) {
        return {
          content: [
            {
              type: "text",
              text: "First chart requires datapackTitles. Example: { datapackTitles: ['Africa Bight'], overrides: {}, columnToggles: {} }"
            }
          ]
        };
      }

      if (!args.datapackTitles) {
        return { content: [{ type: "text", text: `Error: datapackTitles is required for updating the chart state.` }] };
      }

      // Merge args into current state
      currentChartState.datapackTitles = args.datapackTitles;

      currentChartState.overrides = {
        ...currentChartState.overrides,
        ...(args.overrides ?? {})
      };

      const incomingOff = new Set((args.columnToggles?.off ?? []).map((id) => id.toLowerCase()));
      const incomingOn = new Set((args.columnToggles?.on ?? []).map((id) => id.toLowerCase()));

      const currentOff = new Set((currentChartState.columnToggles.off ?? []).map((id) => id.toLowerCase()));
      const currentOn = new Set((currentChartState.columnToggles.on ?? []).map((id) => id.toLowerCase()));

      for (const id of incomingOff) {
        currentOn.delete(id); // Exclusive enforcement
        currentOff.add(id);
      }
      for (const id of incomingOn) {
        currentOff.delete(id); // Exclusive enforcement
        currentOn.add(id);
      }

      currentChartState.columnToggles.off = Array.from(currentOff);
      currentChartState.columnToggles.on = Array.from(currentOn);

      // Generate chart with current state
      try {
        const res = await fetch(`${serverUrl}/mcp/render-chart-with-edits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datapackTitles: currentChartState.datapackTitles,
            overrides: currentChartState.overrides,
            columnToggles: currentChartState.columnToggles,
            useCache: args.useCache ?? true,
            isCrossPlot: args.isCrossPlot ?? false
          })
        });

        const json = await res.json();

        if (!res.ok) {
          return { content: [{ type: "text", text: `Server error ${res.status}: ${JSON.stringify(json)}` }] };
        }
        const chartPath = typeof json.chartpath === "string" ? json.chartpath : "";
        const filePath = path.join("..", "server", chartPath);
        const svg = await readFile(filePath, "utf8");

        let svgBase64: string;
        try {
          svgBase64 = Buffer.from(svg).toString("base64");
        } catch (e) {
          return {
            content: [
              {
                type: "text",
                text: `Error loading chart SVG for embedding: ${String(e)}\nFile path: ${filePath}`
              }
            ]
          };
        }
        const dataUri = `data:image/svg+xml;base64,${svgBase64}`;

        // Update state with new chart path
        currentChartState.lastChartPath = chartPath;
        currentChartState.lastModified = new Date();

        return {
          content: [
            {
              type: "text",
              text: `Chart generated!\n\nURL: ${serverUrl}${chartPath}\n\nCurrent state:\n${JSON.stringify(currentChartState, null, 2)}`
            },
            {
              type: "resource",
              resource: {
                uri: dataUri,
                mimeType: "image/svg+xml",
                text: svg
              }
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
    "getSettingsSchema",
    {
      title: "Get Chart Settings Schema",
      description: `What it does: returns the merged default schema (columns + chartSettings) for the given datapacks. Heavy call; usually not needed.

    When to use:
    - Need to audit every field/default
    - Investigating mismatches between defaults and overrides
    - Want nested columns tree, not just flat ids

    Input: { datapackTitles: string[], sessionId?: string }
    - Titles must exist (see listDatapacks)
    - sessionId (optional): Session ID from login tool for authenticated access. Tracking activity if provided.
    - Do not wrap payload twice (no nested { input: {...} })

    Normal flow: listDatapacks -> listColumns (for ids) -> updateChartState (with overrides/columnToggles).`,
      inputSchema: {
        datapackTitles: z
          .array(z.string())
          .describe(
            "Array of datapack titles to merge (e.g., ['GTS2020', 'Paleobiology']). Get available titles from listDatapacks tool."
          ),
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
        const res = await fetch(`${serverUrl}/mcp/get-settings-schema`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datapackTitles })
        });

        if (!res.ok) {
          const text = await res.text();
          return {
            content: [
              {
                type: "text",
                text: `Server error ${res.status}: ${text}`
              }
            ]
          };
        }

        const schema = await res.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schema, null, 2)
            }
          ]
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting settings schema: ${String(e)}`
            }
          ]
        };
      }
    }
  );

  server.registerTool(
    "listColumns",
    {
      title: "List Columns",
      description: `What it does: returns a flat list of column ids and metadata for the given datapacks.

When to use:
- After picking datapacks, to fetch column ids for toggling in updateChartState.
- Need a lightweight view (id, name, path, on, enableTitle, type).

Prefer column ids (the id field) when toggling. Names may work if they match an id, but ids are the safe, guaranteed choice.

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
      description: `What it does: generate a login link to provide to the user for authentication.

When to use:
- Initial step to authenticate the user
- Obtain a login URL to present to the user
- Token is valid for 5 minutes; user must complete login flow within that window

Input: {}
- Do not wrap payload twice (no nested { input: {...} })

Returns: login URL and sessionId. The sessionId is for the AI to reference in subsequent tool calls after the user completes login.`,
      inputSchema: {}
    },
    async (_, session) => {
      try {
        const sessionId = randomUUID();
        const loginUrl = `${frontendUrl}/login?mcp_session=${sessionId}`;

        sessions.set(sessionId, {
          createdAt: Date.now(),
          lastActivity: Date.now()
          // userInfo is undefined until /mcp/user-info is called
        });

        console.log("Created login URL:", loginUrl, "Session ID:", sessionId);
        return {
          content: [
            {
              type: "text",
              text: `Login URL: ${loginUrl}\n\nSession ID (for reference): ${sessionId}\n\nThe login link is valid for 2 minutes. After successful login, use the Session ID in subsequent tool calls for authenticated features.`
            }
          ]
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error logging in: ${String(e)}` }]};
      }
    }
  );

  server.registerTool(
    "whoami",
    {
      title: "Who Am I? Am I logged in?",
      description: `What it does: returns complete user information if logged in.

When to use:
- Check if user is authenticated
- Get user details (username, email, admin status, etc.)
- Verify user permissions

Input: { sessionId?: string }
- sessionId (optional): The session ID from the login tool response. If provided and authenticated, returns the associated user info.
- If no sessionId provided, returns "not logged in" (for general unauthenticated users).

Examples:
- With sessionId: { "sessionId": "uuid-from-login-tool" }
- Without sessionId: {} (general unauthenticated user)`,
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

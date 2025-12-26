import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { readFile } from "fs/promises";
import * as path from "path";
import "dotenv/config";

const domain = process.env.DOMAIN ?? "http://localhost:3000";
const serverUrl = domain.startsWith("http") ? domain : `https://${domain}`;

export const createMCPServer = () => {
  console.log("Starting MCP server...");
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
  server.registerTool(
    "add",
    {
      title: "Addition Tool",
      description: "Add two numbers",
      inputSchema: { a: z.number(), b: z.number() }
    },
    async ({ a, b }) => {
      console.log(`MCP tool "add" invoked with`, { a, b });
      const result = a + b;
      console.log(`MCP tool "add" result:`, result);
      return {
        content: [{ type: "text", text: String(result) }]
      };
    }
  );
  server.registerTool(
    "subtract",
    {
      title: "Subtraction Tool",
      description: "Subtract two numbers",
      inputSchema: { a: z.number(), b: z.number() }
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a - b) }]
    })
  );

  // Tool: list datapacks from the main server's /mcp/datapacks endpoint.
  server.registerTool(
    "listDatapacks",
    {
      title: "List Available Datapacks",
      description: `Lists all available datapacks (geological timescales and data columns) that can be used to create charts.
      
Each datapack contains columns of geological/paleontological data. Common datapacks include:
- GTS2020: Geological Time Scale 2020 with epochs, periods, eras
- Paleobiology: Fossil occurrence and diversity data
- Regional timescales: Africa, Europe, Asia, etc.
- Specialty data: Sea level, climate, events, etc.

Returns an array of datapack objects with 'title' and 'id' fields. Use the 'title' field when requesting schemas or generating charts.`,
      inputSchema: {}
    },
    async () => {
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
      description: `Optional helper to view the full default schema (columns + chartSettings) for selected datapacks. For normal use, prefer the lightweight flow: listDatapacks/listColumns -> renderChartWithEdits. Use this only when you need to inspect every field or debug defaults.

Contents:
1) columns[]: id (unique), name, type, on, enableTitle, children
2) chartSettings: topAge, baseAge, unitsPerMY, skipEmptyColumns, variableColors, noIndentPattern, negativeChk, doPopups, enEventColBG, enChartLegend, enPriority, enHideBlockLable

Typical reasons to call:
- You want to audit default visibility/ages before editing.
- You need to see all available columns (including nesting) beyond the flat list.
- You are debugging a mismatch between defaults and overrides.

Normal edit path (recommended): listDatapacks -> listColumns (to get ids) -> renderChartWithEdits (overrides + columnToggles).`,
      inputSchema: {
        datapackTitles: z
          .array(z.string())
          .describe(
            "Array of datapack titles to merge (e.g., ['GTS2020', 'Paleobiology']). Get available titles from listDatapacks tool."
          )
      }
    },
    async ({ datapackTitles }) => {
      try {
        const serverUrl = "http://localhost:3000";
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
      description:
        "Returns a flat list of columns (id, name, path, on, enableTitle, type) for the selected datapacks. Use this to grab the unique id before calling renderChartWithEdits. Example: columnToggles: { off: ['africa-bight-id'] }.",
      inputSchema: {
        datapackTitles: z
          .array(z.string())
          .describe("Array of datapack titles to merge (e.g., ['GTS2020', 'Paleobiology'])")
      }
    },
    async ({ datapackTitles }) => {
      try {
        const serverUrl = "http://localhost:3000";
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

  const renderChartArgsSchema = z.object({
    datapackTitles: datapackTitlesSchema,
    overrides: overridesSchema.optional(),
    columnToggles: columnToggleSchema.optional(),
    useCache: z.boolean().optional(),
    isCrossPlot: z.boolean().optional()
  });

  type RenderChartArgs = z.infer<typeof renderChartArgsSchema>;

  server.registerTool(
    "renderChartWithEdits",
    {
      title: "Render Chart with Edits",
      description: `Generate a chart by sending only small edits (overrides + column toggles), not the full schema.

  Output:
  - Returns a direct Chart URL (HTTP link) to the generated SVG
  - Also includes a local file resource when running locally
  - Click the Chart URL to view the SVG inline in your browser

  Flow:
  1) If unsure what's available, call listDatapacks; to see ids, call listColumns (datapackTitles).
  2) Call renderChartWithEdits with:
     - overrides: chartSettings fields you want to change
     - columnToggles: ids to turn on/off (ids are unique)

  Examples:
  - Default Africa Bight as-is: overrides: {}, columnToggles: {}
  - Change ages + hide one column: overrides: { topAge: 0, baseAge: 65 }, columnToggles: { off: ["africa-bight-id"] }
  - Turn a column on: columnToggles: { on: ["gts2020-stages"] }

  Overrides (chartSettings):
  - topAge/baseAge (Ma)
  - unitsPerMY (vertical scale): number or array [{unit:"Ma", value:4}]
  - skipEmptyColumns, variableColors, noIndentPattern, negativeChk, doPopups, enEventColBG, enChartLegend, enPriority, enHideBlockLable

  Validation: 0 <= topAge < baseAge <= 4600; unitsPerMY 0-50. Only allowed fields are applied.
  
  Here's an example call:
  {
    "datapackTitles": ["Africa Bight"],
    "overrides": {
      "topAge": 0,
      "baseAge": 65,
      "unitsPerMY": [{"unit":"Ma","value":2}]
    },
    "columnToggles": {
      "on": [],
      "off": ["Nigeria Coast"]
    },
    "useCache": true,
    "isCrossPlot": false
  }
  you want useCache to be true always
  `,
      inputSchema: renderChartArgsSchema.shape
    },
    async (args: RenderChartArgs) => {
      const { datapackTitles, overrides = {}, columnToggles = {}, useCache, isCrossPlot } = args;
      try {
        const serverUrl = "http://localhost:3000";
        const res = await fetch(`${serverUrl}/mcp/render-chart-with-edits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datapackTitles, overrides, columnToggles, useCache, isCrossPlot })
        });

        const json = await res.json();

        if (!res.ok) {
          return { content: [{ type: "text", text: `Server error ${res.status}: ${JSON.stringify(json)}` }] };
        }

        const chartPath = typeof json.chartpath === "string" ? json.chartpath : "";
        const filePath = path.join("..", "server", chartPath);
        const absolutePath = path.resolve(filePath);
        const svg = await readFile(filePath, "utf8");

        return {
          content: [
            {
              type: "text",
              text: `Chart URL: ${serverUrl}${chartPath}`
            },
            {
              type: "resource",
              resource: {
                uri: `${serverUrl}${chartPath}`,
                mimeType: "image/svg+xml",
                text: svg
              }
            }
          ]
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Error rendering chart with edits: ${String(e)}` }] };
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

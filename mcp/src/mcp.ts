import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import { readFile } from "fs/promises";
import * as path from "path";

// Define recursive column schema for MCP validation
const ColumnSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      on: z.boolean(),
      enableTitle: z.boolean(),
      children: z.array(ColumnSchema).optional()
    })
    .passthrough()
);

// Define complete settings schema
const SettingsSchema = z
  .object({
    columns: z.array(ColumnSchema),
    chartSettings: z
      .object({
        topAge: z.number().optional(),
        baseAge: z.number().optional(),
        unitsPerMY: z.array(z.object({ unit: z.string(), value: z.number() })),
        skipEmptyColumns: z.array(z.object({ unit: z.string(), value: z.boolean() })).optional(),
        variableColors: z.string().optional(),
        noIndentPattern: z.boolean().optional(),
        negativeChk: z.boolean().optional(),
        doPopups: z.boolean().optional(),
        enEventColBG: z.boolean().optional(),
        enChartLegend: z.boolean().optional(),
        enPriority: z.boolean().optional(),
        enHideBlockLable: z.boolean().optional()
      })
      .passthrough()
  })
  .passthrough();

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
        const serverUrl = "http://localhost:3000";
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
      description: `Retrieves a JSON schema showing all available columns and settings for the selected datapacks.
      
IMPORTANT: Always call this FIRST before generating a chart to see what's available and get the default configuration.

The schema has two main sections:

1. COLUMNS ARRAY: Controls which data columns appear in the chart
   - Each column has:
     * 'id': Unique identifier for the column
     * 'name': Display name (what appears on the chart)
     * 'type': Column type (e.g., "zone", "event", "sequence", "range", "chron")
     * 'on': boolean - TRUE to show column, FALSE to hide it
     * 'enableTitle': boolean - TRUE to show column name/header, FALSE to hide
     * 'children': Nested sub-columns (can be turned on/off independently)

2. CHART SETTINGS OBJECT: Global chart configuration
   - 'topAge': Top of time range (younger age, in millions of years)
   - 'baseAge': Bottom of time range (older age, in millions of years)
   - 'unitsPerMY': Array of vertical scale settings by unit (e.g., [{unit: "Ma", value: 2}] means 2 pixels per million years)
     * LARGER values = MORE STRETCHED vertically (chart is taller)
     * SMALLER values = MORE COMPRESSED vertically (chart is shorter)
     * Default is 2, typical range is 0.5 to 10
   - 'skipEmptyColumns': Skip columns with no data in the time range
   - 'variableColors': Color scheme for blocks ("rainbow", "modulated", "timescale", etc.)
   - 'noIndentPattern': Don't indent chronostratigraphic subdivisions
   - 'negativeChk': Enable negative ages (for future dates)
   - 'doPopups': Enable hover tooltips
   - 'enEventColBG': Show background in event columns
   - 'enChartLegend': Show chart legend
   - 'enPriority': Enable priority-based column ordering
   - 'enHideBlockLable': Hide block labels/text

USAGE EXAMPLES:
- To turn a column ON: Set column.on = true
- To turn a column OFF: Set column.on = false
- To show column header: Set column.enableTitle = true
- To change age range: Set baseAge = 10, topAge = 0 (shows 0-10 Ma)
- To make chart taller: Increase unitsPerMY value (e.g., from 2 to 5)
- To make chart shorter: Decrease unitsPerMY value (e.g., from 2 to 1)`,
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
    "generateChartWithSchema",
    {
      title: "Generate Geological Time Scale Chart",
      description: `Generates a geological timescale chart (SVG image) using the provided datapacks and customized settings schema.

WORKFLOW:
1. Call listDatapacks to see available datapacks
2. Call getSettingsSchema with desired datapack titles to get the default schema
3. Modify the schema JSON to customize the chart (turn columns on/off, change ages, adjust scale, etc.)
4. Call this tool with the modified schema to generate the chart

MODIFYING THE SCHEMA:

COLUMN CONTROLS (in 'columns' array):
- Turn column ON: Find the column by name and set "on": true
- Turn column OFF: Find the column by name and set "on": false
- Hide column title: Set "enableTitle": false
- Show column title: Set "enableTitle": true
- Work with nested columns: Navigate through "children" arrays to find sub-columns

AGE RANGE (in 'chartSettings'):
- Set time window: Modify "topAge" (younger) and "baseAge" (older)
  Example: "topAge": 0, "baseAge": 10 shows 0-10 million years ago
  Example: "topAge": 65, "baseAge": 250 shows Mesozoic Era (65-250 Ma)

VERTICAL SCALE (in 'chartSettings.unitsPerMY'):
- Controls chart height - how stretched/compressed the time axis is
- Modify the "value" for the unit being used (usually "Ma")
- LARGER value = TALLER chart (more stretched)
- SMALLER value = SHORTER chart (more compressed)
  Example: "value": 2 is default (2 pixels per million years)
  Example: "value": 5 makes chart 2.5x taller
  Example: "value": 1 makes chart 2x shorter

APPEARANCE (boolean flags in 'chartSettings'):
- "skipEmptyColumns": true/false - Hide columns with no data in range
- "doPopups": true/false - Enable hover tooltips on blocks
- "enChartLegend": true/false - Show/hide legend
- "enEventColBG": true/false - Background color for event columns
- "variableColors": Color scheme ("rainbow", "modulated", "timescale")

COMMON REQUESTS:
- "Make chart for 0-10 Ma": Set topAge: 0, baseAge: 10
- "Turn on Africa column": Find column with name containing "Africa", set on: true
- "Make chart twice as tall": Double the unitsPerMY value (e.g., 2 → 4)
- "Hide all event columns": Find columns with type: "event", set on: false
- "Show only GTS2020 stages": Turn off all columns except stage-related ones

The tool returns the chart as an SVG image that can be displayed or saved.`,
      inputSchema: {
        datapackTitles: z
          .array(z.string())
          .describe("Array of datapack titles to use (same as used in getSettingsSchema)"),
        settingsSchema: SettingsSchema.describe(
          "Complete settings schema (from getSettingsSchema) with your modifications applied to columns and chartSettings"
        ),
        useCache: z.boolean().optional().describe("Use cached chart if available (default: true)"),
        isCrossPlot: z.boolean().optional().describe("Generate as cross-plot chart (default: false)")
      }
    },
    async ({ datapackTitles, settingsSchema, useCache, isCrossPlot }) => {
      try {
        const serverUrl = "http://localhost:3000";
        const res = await fetch(`${serverUrl}/mcp/generate-chart-with-schema`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datapackTitles,
            settingsSchema,
            useCache: useCache ?? true,
            isCrossPlot: isCrossPlot ?? false
          })
        });

        const json = await res.json();

        if (!res.ok) {
          return {
            content: [
              {
                type: "text",
                text: `Server error ${res.status}: ${JSON.stringify(json)}`
              }
            ]
          };
        }

        const chartPath = typeof json.chartpath === "string" ? json.chartpath : "";
        const filePath = path.join("..", "server", chartPath);
        const svg = await readFile(filePath, "utf8");

        return {
          content: [
            {
              type: "text",
              text: svg,
              mediaType: "image/svg+xml"
            }
          ]
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `Error generating chart with schema: ${String(e)}`
            }
          ]
        };
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

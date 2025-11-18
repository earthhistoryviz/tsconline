import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  assertDatapackConfigForChartRequest,
  type DatapackConfigForChartRequest,
  type ChartRequest
} from "@tsconline/shared";
import z from "zod";
import { readFile } from "fs/promises";
import * as path from "path";

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
      title: "List Datapacks",
      description: "Fetch the current public and official datapacks from the main server",
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
    "generateChart",
    {
      title: "Generate Chart",
      description:
        "Send settings + datapack metadata to the main server to generate a chart",
      inputSchema: {
        settings: z.string(),
        datapacks: z.array(
          z.object({
              storedFileName: z.string(),
              title: z.string(),
              isPublic: z.boolean()
            })
            .passthrough()
        ),
        useCache: z.boolean().optional(),
        isCrossPlot: z.boolean().optional()
      }
    },
    async ({ settings, datapacks, useCache, isCrossPlot }) => {
      try {
        const validatedDatapacks: DatapackConfigForChartRequest[] = [];
        for (const dp of datapacks) {
          assertDatapackConfigForChartRequest(dp);
          validatedDatapacks.push(dp as DatapackConfigForChartRequest);
        }

        const chartRequest: ChartRequest = {
          settings,
          datapacks: validatedDatapacks,
          useCache: useCache ?? true,
          isCrossPlot: isCrossPlot ?? false
        };

        const serverUrl = "http://localhost:3000"; // adjust if needed
        const res = await fetch(`${serverUrl}/mcp/generate-chart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chartRequest)
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
        console.log("Chart generation response:", json);
        const chartPath = typeof json.chartpath === "string" ? json.chartpath : "";
        const chartUrl = chartPath.startsWith("http") ? chartPath : `${serverUrl}${chartPath}`;
        console.log("chart path", path.join("..", "server", chartPath));
        const filePath = path.join("..", "server", chartPath);
        const svg = await readFile(filePath, "utf8"); // read SVG as text

        // Return the raw SVG content (as text). If you prefer a data URI or base64,
        // replace the returned object accordingly.
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
              text: `Error generating chart: ${String(e)}`
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

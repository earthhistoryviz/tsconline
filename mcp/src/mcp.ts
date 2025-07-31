import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";

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
  server.registerTool(
    "add",
    {
      title: "Addition Tool",
      description: "Add two numbers",
      inputSchema: { a: z.number(), b: z.number() }
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }]
    })
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

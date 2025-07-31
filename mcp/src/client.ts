import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

try {
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/mcp"));

  const client = new Client({
    name: "ExampleClient",
    version: "1.0.0"
  });

  await client.connect(transport);

  const tools = await client.listTools();
  console.log("Tools:", JSON.stringify(tools, null, 2));

  const result = await client.callTool({
    name: "add",
    arguments: { a: 4, b: 5 }
  });
  console.log("Result of add:", result);

  const greeting = await client.readResource({
    uri: "greeting://World"
  });
  console.log("Greeting:", greeting);
  await client.close();
  await transport.close();
} catch (err) {
  console.error("Error in MCP client:\n", err);
  process.exit(1);
}

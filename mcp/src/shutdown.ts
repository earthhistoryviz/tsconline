import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import chalk from "chalk";
import { FastifyInstance } from "fastify";

// Handle server shutdown gracefully
export const shutdown = async (fastify: FastifyInstance, transports: Record<string, StreamableHTTPServerTransport>) => {
  const shutdownTransports = async () => {
    console.log(chalk.cyan("Shutting down MCP server..."));
    await Promise.all(
      Object.values(transports).map((t) => {
        console.log(chalk.yellow("Closing transport:", t.sessionId));
        t.close?.();
      })
    );
    await fastify.close();
    console.log(chalk.green("MCP server shutdown complete."));
  };
  // make sure to handle process termination gracefully
  process.on("SIGINT", async () => {
    await shutdownTransports();
    process.exit(0);
  });

  // make sure to handle nodemon restarts gracefully
  process.once("SIGUSR2", async () => {
    await shutdownTransports();
    process.kill(process.pid, "SIGUSR2");
  });
};

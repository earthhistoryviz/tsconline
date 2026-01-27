// shutdown.ts
import type { FastifyInstance } from "fastify";

// Handle server shutdown gracefully
type Transports =
  | Record<string, StreamableHTTPServerTransport>
  | { streamable: Record<string, StreamableHTTPServerTransport>; sse?: Record<string, SSEServerTransport> };

/**
 * Gracefully shuts down Fastify.
 * Assumes resource cleanup (closing transports, destroying SSE sockets, clearing timers)
 * is done in fastify.ts via app.addHook("onClose", ...).
 *
 * IMPORTANT: This function does NOT register process signal handlers.
 * Does that in index.ts and call this function.
 */
export async function shutdown(app: FastifyInstance, signal: string, opts: ShutdownOptions = {}) {
  const { timeoutMs = 5000, exitOnComplete = true } = opts;

  // Prevent double shutdown attempts
  const appWithShutdownFlag = app as FastifyInstance & { __isShuttingDown?: boolean };
  if (appWithShutdownFlag.__isShuttingDown) return;
  appWithShutdownFlag.__isShuttingDown = true;

    const normalized: {
      streamable: Record<string, StreamableHTTPServerTransport>;
      sse: Record<string, SSEServerTransport>;
    } = isNestedTransports(transports)
      ? { streamable: transports.streamable, sse: transports.sse ?? {} }
      : { streamable: transports as Record<string, StreamableHTTPServerTransport>, sse: {} };

    const streamableCloses = Object.values(normalized.streamable || {}).map((t) => {
      try {
        const sessionId = (t as unknown as { sessionId?: string }).sessionId;
        console.log(chalk.yellow("Closing streamable transport:", sessionId));
        const result = t.close ? t.close() : undefined;
        return Promise.resolve(result);
      } catch (e) {
        // ignore individual errors during shutdown
        return Promise.resolve();
      }
    });

    const sseCloses = Object.values(normalized.sse || {}).map((t) => {
      try {
        const sessionId = (t as unknown as { sessionId?: string }).sessionId;
        console.log(chalk.yellow("Closing sse transport:", sessionId));
        const result = t.close ? t.close() : undefined;
        return Promise.resolve(result);
      } catch (e) {
        return Promise.resolve();
      }
    });

    await Promise.all([...streamableCloses, ...sseCloses]);
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

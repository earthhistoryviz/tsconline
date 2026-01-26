// shutdown.ts
import type { FastifyInstance } from "fastify";

export interface ShutdownOptions {
  timeoutMs?: number; // default 5000
  exitOnComplete?: boolean; // default true
}

/**
 * Gracefully shuts down Fastify.
 * Assumes resource cleanup (closing transports, destroying SSE sockets, clearing timers)
 * is done in fastify.ts via app.addHook("onClose", ...).
 *
 * IMPORTANT: This function does NOT register process signal handlers.
 * Do that in index.ts and call this function.
 */
export async function shutdown(
  app: FastifyInstance,
  signal: string,
  opts: ShutdownOptions = {}
) {
  const { timeoutMs = 5000, exitOnComplete = true } = opts;

  // Prevent double shutdown attempts
  const anyApp = app as any;
  if (anyApp.__isShuttingDown) return;
  anyApp.__isShuttingDown = true;

  app.log.info({ signal }, "Shutting down...");

  const forceTimer = setTimeout(() => {
    app.log.error({ timeoutMs }, "Force exiting after shutdown timeout");
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }, timeoutMs);
  forceTimer.unref();

  try {
    await app.close(); // triggers onClose hook in fastify.ts
    clearTimeout(forceTimer);
    app.log.info("Shutdown complete");

    if (exitOnComplete) {
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    }
  } catch (err) {
    clearTimeout(forceTimer);
    app.log.error({ err }, "Error during shutdown");

    if (exitOnComplete) {
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
  }
}

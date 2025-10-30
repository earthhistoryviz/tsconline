import { FastifyInstance } from "fastify";
import { shutdown } from "../src/shutdown";
import { beforeAll, describe, it, expect, vi } from "vitest";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("shutdown", () => {
  const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);
  const killSpy = vi.spyOn(process, "kill").mockReturnValue(undefined as never);
  it("should handle server shutdown gracefully", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const transports = {
      session1: {
        sessionId: "session1",
        close: vi.fn()
      },
      session2: {
        sessionId: "session2",
        close: vi.fn()
      }
    } as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    // wait for the shutdown to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(transports["session1"].close).toHaveBeenCalledOnce();
    expect(transports["session2"].close).toHaveBeenCalledOnce();
    expect(fastify.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
  it("should handle nodemon restarts gracefully", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const transports = {
      session1: {
        sessionId: "session1",
        close: vi.fn()
      },
      session2: {
        sessionId: "session2",
        close: vi.fn()
      }
    } as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGUSR2");
    // wait for the shutdown to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(transports["session1"].close).toHaveBeenCalledOnce();
    expect(transports["session2"].close).toHaveBeenCalledOnce();
    expect(fastify.close).toHaveBeenCalled();
    expect(killSpy).toHaveBeenCalledWith(process.pid, "SIGUSR2");
  });
});

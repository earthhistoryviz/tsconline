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

  it("should handle nested transport shapes", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const transports = {
      streamable: {
        s1: {
          sessionId: "s1",
          close: vi.fn()
        }
      },
      sse: {
        s2: {
          sessionId: "s2",
          close: vi.fn()
        }
      }
    } as unknown as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(transports.streamable.s1.close).toHaveBeenCalledOnce();
    expect(transports.sse.s2.close).toHaveBeenCalledOnce();
    expect(fastify.close).toHaveBeenCalled();
  });

  it("should continue shutdown when transport.close throws", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const transports = {
      sessionBad: {
        sessionId: "bad",
        close: vi.fn(() => {
          throw new Error("boom");
        })
      }
    } as unknown as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fastify.close).toHaveBeenCalled();
  });

  it("should handle transport.close getter throwing during shutdown", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const bad: Record<string, unknown> & { sessionId: string } = { sessionId: "bad" };
    Object.defineProperty(bad, "close", {
      get() {
        throw new Error("boom-get");
      },
      configurable: true
    });

    const transports = {
      bad
    } as unknown as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fastify.close).toHaveBeenCalled();
  });

  it("should handle getter throwing for sse transports during shutdown", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const badSSE: Record<string, unknown> & { sessionId: string } = { sessionId: "sse-bad" };
    Object.defineProperty(badSSE, "close", {
      get() {
        throw new Error("boom-sse-get");
      },
      configurable: true
    });

    const transports = {
      streamable: {},
      sse: {
        "sse-bad": badSSE
      }
    } as unknown as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fastify.close).toHaveBeenCalled();
  });

  it("should handle streamable transports without a close method", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const transports = {
      s1: {
        sessionId: "s1"
        // no close method
      }
    } as unknown as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fastify.close).toHaveBeenCalled();
  });

  it("should handle nested transports where streamable is not an object", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const transports = {
      streamable: "not-an-object"
    } as unknown as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fastify.close).toHaveBeenCalled();
  });

  it("should handle null transports gracefully", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const transports = null as unknown as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fastify.close).toHaveBeenCalled();
  });

  it("should handle sse transports without a close method", async () => {
    const fastify = {
      close: vi.fn()
    } as unknown as FastifyInstance;

    const transports = {
      streamable: {},
      sse: {
        sA: {
          sessionId: "sA"
          // no close method
        }
      }
    } as unknown as (typeof shutdown.arguments)[1];

    await shutdown(fastify, transports);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fastify.close).toHaveBeenCalled();
  });
});

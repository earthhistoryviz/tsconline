import type { FastifyInstance } from "fastify";
import { shutdown } from "../src/shutdown";
import { beforeAll, describe, it, expect, vi } from "vitest";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

type TestApp = FastifyInstance & {
  __isShuttingDown?: boolean;
  log: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  close: ReturnType<typeof vi.fn>;
};

describe("shutdown", () => {
  const exitSpy = vi.spyOn(process, "exit").mockReturnValue(undefined as never);

  const makeApp = (): TestApp =>
    ({
      log: {
        info: vi.fn(),
        error: vi.fn()
      },
      close: vi.fn().mockResolvedValue(undefined)
    }) as unknown as TestApp;

  it("shuts down gracefully without exiting when exitOnComplete=false", async () => {
    const app = makeApp();
    await shutdown(app, "SIGINT", { exitOnComplete: false });
    expect(app.close).toHaveBeenCalledTimes(1);
    expect(app.log.info).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("prevents double shutdown", async () => {
    const app = makeApp();
    await shutdown(app, "SIGTERM", { exitOnComplete: false });
    await shutdown(app, "SIGTERM", { exitOnComplete: false });
    expect(app.close).toHaveBeenCalledTimes(1);
  });

  it("logs error and does not exit when close rejects and exitOnComplete=false", async () => {
    const app = makeApp();
    app.close.mockRejectedValueOnce(new Error("boom"));
    await shutdown(app, "SIGINT", { exitOnComplete: false });
    expect(app.log.error).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits with code 1 when close rejects and exitOnComplete=true", async () => {
    const app = makeApp();
    app.close.mockRejectedValueOnce(new Error("boom"));
    await shutdown(app, "SIGINT", { exitOnComplete: true });
    expect(app.log.error).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with code 0 on success when exitOnComplete=true", async () => {
    const app = makeApp();
    await shutdown(app, "SIGINT", { exitOnComplete: true });
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("forces exit with code 1 on timeout", async () => {
    const app = makeApp();
    app.close.mockImplementation(() => new Promise<void>(() => {}));
    void shutdown(app, "SIGINT", { timeoutMs: 10 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

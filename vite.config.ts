import { fileURLToPath, URL } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxConcurrency: 20,
    pool: "vmThreads",
    poolOptions: {
      threads: {
        singleThread: true,
      }
    },
    isolate: true,
    cache: false,
    environment: "node",
    include: ["server/__tests__/**.test.ts", "app/__tests__/**.test.ts", "shared/__tests__/**.test.ts"],
    coverage: {
      reporter: ["lcov", "text"],
      include: ["server/src/**", "app/src/**", "shared/src/**"]
    },
    outputFile: "coverage/sonar-report.xml"
  },
  resolve: {
    alias: [{ find: "@/", replacement: fileURLToPath(new URL("./", import.meta.url)) }]
  }
});

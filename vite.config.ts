import { fileURLToPath, URL } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    // TODO: remove include prop after complete Vitest migration
    include: ["server/__tests-vitest__/**"],
    coverage: {
      reporter: ["lcov", "text"],
    },
    outputFile: "coverage/sonar-report.xml",
  },
  resolve: {
    alias: [{ find: "@/", replacement: fileURLToPath(new URL("./", import.meta.url))
      },
    ],}});
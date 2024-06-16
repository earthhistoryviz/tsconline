import { fileURLToPath, URL } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60 * 60 * 1000,
    cache: false,
    environment: "jsdom",
    include: ["server/__tests__/**.test.ts"],
    coverage: {
      reporter: ["lcov", "text"],
      include: ["server/src/**"]
    },
    outputFile: "coverage/sonar-report.xml"
  },
  resolve: {
    alias: [{ find: "@/", replacement: fileURLToPath(new URL("./", import.meta.url)) }]
  }
});

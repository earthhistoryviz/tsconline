import { fileURLToPath, URL } from "url";
import { defineConfig } from "vitest/config";

const thresholdConfig = {
  statements: 90,
  branches: 90,
  functions: 90,
  lines: 90
};

export default defineConfig({
  test: {
    pool: "forks",
    cache: false,
    environment: "node",
    include: ["server/__tests__/**.test.ts", "app/__tests__/**.test.ts", "shared/__tests__/**.test.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["server/src/**", "app/src/**", "shared/src/**"],
      // TODO: add the commented out files
      thresholds: {
        "server/src/admin/admin-auth.ts": thresholdConfig,
        "server/src/admin/admin-routes.ts": thresholdConfig,
        // "server/src/encryption.ts": thresholdConfig,
        "server/src/routes/login-routes.ts": thresholdConfig,
        "server/src/parse-datapacks.ts": thresholdConfig,
        "server/src/parse-map-packs.ts": thresholdConfig,
        "shared/src/util.ts": thresholdConfig,
        "server/src/upload-handlers.ts": thresholdConfig
        // "server/src/user/user-handler.ts": thresholdConfig
      },
      ignoreEmptyLines: true
    },
    outputFile: "coverage/sonar-report.xml"
  },
  resolve: {
    alias: [{ find: "@/", replacement: fileURLToPath(new URL("./", import.meta.url)) }]
  }
});

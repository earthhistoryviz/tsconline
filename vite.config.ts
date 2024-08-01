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
    cache: false,
    environment: "node",
    include: ["server/__tests__/**.test.ts", "app/__tests__/**.test.ts", "shared/__tests__/**.test.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["server/src/**", "app/src/**", "shared/src/**"],
      thresholds: {
        "server/src/admin-auth.ts": thresholdConfig,
        "server/src/admin-routes.ts": thresholdConfig,
        "server/src/encryption.ts": thresholdConfig,
        "server/src/login-routes.ts": thresholdConfig,
        "server/src/parse-datapacks.ts": thresholdConfig,
        "server/src/parse-map-packs.ts": thresholdConfig,
        "shared/src/util.ts": thresholdConfig
      },
      ignoreEmptyLines: true
    },
    outputFile: "coverage/sonar-report.xml"
  },
  resolve: {
    alias: [{ find: "@/", replacement: fileURLToPath(new URL("./", import.meta.url)) }]
  }
});

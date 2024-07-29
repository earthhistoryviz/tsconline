import { fileURLToPath, URL } from "url";
import { defineConfig } from "vitest/config";

const config = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80
};

export default defineConfig({
  test: {
    maxConcurrency: 20,
    cache: false,
    environment: "node",
    include: ["server/__tests__/**.test.ts", "app/__tests__/**.test.ts", "shared/__tests__/**.test.ts"],
    coverage: {
      reporter: ["text", "json-summary", "json", "lcov"],
      include: ["server/src/**", "app/src/**", "shared/src/**"],
      thresholds: {
        "server/src/admin-auth.ts": config,
        "server/src/admin-routes.ts": config,
        "server/src/encryption.ts": {
          ...config,
          branches: 50
        },
        "server/src/login-routes.ts": config,
        "server/src/parse-datapacks.ts": config,
        "server/src/parse-map-packs.ts": config,
        "shared/src/util.ts": config
      },
      ignoreEmptyLines: true
    },
    outputFile: "coverage/sonar-report.xml"
  },
  resolve: {
    alias: [{ find: "@/", replacement: fileURLToPath(new URL("./", import.meta.url)) }]
  }
});

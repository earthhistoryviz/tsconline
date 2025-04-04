import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default defineConfig({
  test: {
    ...viteConfig.test,
    coverage: {
      ...viteConfig.test?.coverage,
      exclude: ["server/src/crossplot-handlers.ts", "server/src/encryption.ts"]
    }
  }
});

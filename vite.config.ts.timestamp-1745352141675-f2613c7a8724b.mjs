// vite.config.ts
import { fileURLToPath, URL } from "url";
import { defineConfig } from "file:///Users/paologum/tscreator/tsconline/.yarn/__virtual__/vitest-virtual-645c8fb53d/0/cache/vitest-npm-1.6.1-d33201e97b-50d551be2c.zip/node_modules/vitest/dist/config.js";
var __vite_injected_original_import_meta_url = "file:///Users/paologum/tscreator/tsconline/vite.config.ts";
var thresholdConfig = {
  statements: 90,
  branches: 90,
  functions: 90,
  lines: 90
};
var vite_config_default = defineConfig({
  test: {
    pool: "forks",
    cache: false,
    environment: "node",
    include: ["server/__tests__/**.test.ts", "app/__tests__/**.test.ts", "shared/__tests__/**.test.ts"],
    coverage: {
      reporter: ["text", "lcov", "html"],
      include: ["server/src/**", "app/src/**", "shared/src/**"],
      // TODO: add the commented out files
      thresholds: {
        "server/src/admin/admin-auth.ts": thresholdConfig,
        "server/src/admin/admin-routes.ts": thresholdConfig,
        "server/src/encryption.ts": thresholdConfig,
        "server/src/routes/login-routes.ts": thresholdConfig,
        "server/src/parse-datapacks.ts": thresholdConfig,
        "server/src/parse-map-packs.ts": thresholdConfig,
        "shared/src/util.ts": thresholdConfig,
        "server/src/upload-handlers.ts": thresholdConfig,
        "server/src/upload-datapack.ts": thresholdConfig,
        "server/src/user-auth.ts": thresholdConfig,
        "server/src/cloud/general-cloud-requests.ts": thresholdConfig,
        "server/src/cloud/edit-handler.ts": thresholdConfig,
        "server/src/workshop/workshop-auth.ts": thresholdConfig,
        "server/src/workshop/workshop-routes.ts": thresholdConfig,
        "server/src/constants.ts": thresholdConfig,
        "server/src/error-logger.ts": thresholdConfig,
        "server/src/crossplot-handler.ts": thresholdConfig,
        "server/src/routes/crossplot-routes.ts": thresholdConfig,
        "server/src/user/chart-history.ts": thresholdConfig,
        "server/src/crossplot/extract-markers.ts": thresholdConfig,
        "server/src/crossplot/crossplot-handler.ts": thresholdConfig
        // "server/src/user-routes.ts": thresholdConfig,
        // "server/src/user/user-handler.ts": thresholdConfig,
      },
      ignoreEmptyLines: true
    }
  },
  resolve: {
    alias: [{ find: "@/", replacement: fileURLToPath(new URL("./", __vite_injected_original_import_meta_url)) }]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcGFvbG9ndW0vdHNjcmVhdG9yL3RzY29ubGluZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3Bhb2xvZ3VtL3RzY3JlYXRvci90c2NvbmxpbmUvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3Bhb2xvZ3VtL3RzY3JlYXRvci90c2NvbmxpbmUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tIFwidXJsXCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZXN0L2NvbmZpZ1wiO1xuXG5jb25zdCB0aHJlc2hvbGRDb25maWcgPSB7XG4gIHN0YXRlbWVudHM6IDkwLFxuICBicmFuY2hlczogOTAsXG4gIGZ1bmN0aW9uczogOTAsXG4gIGxpbmVzOiA5MFxufTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgdGVzdDoge1xuICAgIHBvb2w6IFwiZm9ya3NcIixcbiAgICBjYWNoZTogZmFsc2UsXG4gICAgZW52aXJvbm1lbnQ6IFwibm9kZVwiLFxuICAgIGluY2x1ZGU6IFtcInNlcnZlci9fX3Rlc3RzX18vKioudGVzdC50c1wiLCBcImFwcC9fX3Rlc3RzX18vKioudGVzdC50c1wiLCBcInNoYXJlZC9fX3Rlc3RzX18vKioudGVzdC50c1wiXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcmVwb3J0ZXI6IFtcInRleHRcIiwgXCJsY292XCIsIFwiaHRtbFwiXSxcbiAgICAgIGluY2x1ZGU6IFtcInNlcnZlci9zcmMvKipcIiwgXCJhcHAvc3JjLyoqXCIsIFwic2hhcmVkL3NyYy8qKlwiXSxcbiAgICAgIC8vIFRPRE86IGFkZCB0aGUgY29tbWVudGVkIG91dCBmaWxlc1xuICAgICAgdGhyZXNob2xkczoge1xuICAgICAgICBcInNlcnZlci9zcmMvYWRtaW4vYWRtaW4tYXV0aC50c1wiOiB0aHJlc2hvbGRDb25maWcsXG4gICAgICAgIFwic2VydmVyL3NyYy9hZG1pbi9hZG1pbi1yb3V0ZXMudHNcIjogdGhyZXNob2xkQ29uZmlnLFxuICAgICAgICBcInNlcnZlci9zcmMvZW5jcnlwdGlvbi50c1wiOiB0aHJlc2hvbGRDb25maWcsXG4gICAgICAgIFwic2VydmVyL3NyYy9yb3V0ZXMvbG9naW4tcm91dGVzLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgXCJzZXJ2ZXIvc3JjL3BhcnNlLWRhdGFwYWNrcy50c1wiOiB0aHJlc2hvbGRDb25maWcsXG4gICAgICAgIFwic2VydmVyL3NyYy9wYXJzZS1tYXAtcGFja3MudHNcIjogdGhyZXNob2xkQ29uZmlnLFxuICAgICAgICBcInNoYXJlZC9zcmMvdXRpbC50c1wiOiB0aHJlc2hvbGRDb25maWcsXG4gICAgICAgIFwic2VydmVyL3NyYy91cGxvYWQtaGFuZGxlcnMudHNcIjogdGhyZXNob2xkQ29uZmlnLFxuICAgICAgICBcInNlcnZlci9zcmMvdXBsb2FkLWRhdGFwYWNrLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgXCJzZXJ2ZXIvc3JjL3VzZXItYXV0aC50c1wiOiB0aHJlc2hvbGRDb25maWcsXG4gICAgICAgIFwic2VydmVyL3NyYy9jbG91ZC9nZW5lcmFsLWNsb3VkLXJlcXVlc3RzLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgXCJzZXJ2ZXIvc3JjL2Nsb3VkL2VkaXQtaGFuZGxlci50c1wiOiB0aHJlc2hvbGRDb25maWcsXG4gICAgICAgIFwic2VydmVyL3NyYy93b3Jrc2hvcC93b3Jrc2hvcC1hdXRoLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgXCJzZXJ2ZXIvc3JjL3dvcmtzaG9wL3dvcmtzaG9wLXJvdXRlcy50c1wiOiB0aHJlc2hvbGRDb25maWcsXG4gICAgICAgIFwic2VydmVyL3NyYy9jb25zdGFudHMudHNcIjogdGhyZXNob2xkQ29uZmlnLFxuICAgICAgICBcInNlcnZlci9zcmMvZXJyb3ItbG9nZ2VyLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgXCJzZXJ2ZXIvc3JjL2Nyb3NzcGxvdC1oYW5kbGVyLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgXCJzZXJ2ZXIvc3JjL3JvdXRlcy9jcm9zc3Bsb3Qtcm91dGVzLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgXCJzZXJ2ZXIvc3JjL3VzZXIvY2hhcnQtaGlzdG9yeS50c1wiOiB0aHJlc2hvbGRDb25maWcsXG4gICAgICAgIFwic2VydmVyL3NyYy9jcm9zc3Bsb3QvZXh0cmFjdC1tYXJrZXJzLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgXCJzZXJ2ZXIvc3JjL2Nyb3NzcGxvdC9jcm9zc3Bsb3QtaGFuZGxlci50c1wiOiB0aHJlc2hvbGRDb25maWdcbiAgICAgICAgLy8gXCJzZXJ2ZXIvc3JjL3VzZXItcm91dGVzLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgICAgLy8gXCJzZXJ2ZXIvc3JjL3VzZXIvdXNlci1oYW5kbGVyLnRzXCI6IHRocmVzaG9sZENvbmZpZyxcbiAgICAgIH0sXG4gICAgICBpZ25vcmVFbXB0eUxpbmVzOiB0cnVlXG4gICAgfVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IFt7IGZpbmQ6IFwiQC9cIiwgcmVwbGFjZW1lbnQ6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vXCIsIGltcG9ydC5tZXRhLnVybCkpIH1dXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEyUixTQUFTLGVBQWUsV0FBVztBQUM5VCxTQUFTLG9CQUFvQjtBQURpSixJQUFNLDJDQUEyQztBQUcvTixJQUFNLGtCQUFrQjtBQUFBLEVBQ3RCLFlBQVk7QUFBQSxFQUNaLFVBQVU7QUFBQSxFQUNWLFdBQVc7QUFBQSxFQUNYLE9BQU87QUFDVDtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxJQUNKLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxJQUNQLGFBQWE7QUFBQSxJQUNiLFNBQVMsQ0FBQywrQkFBK0IsNEJBQTRCLDZCQUE2QjtBQUFBLElBQ2xHLFVBQVU7QUFBQSxNQUNSLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVMsQ0FBQyxpQkFBaUIsY0FBYyxlQUFlO0FBQUE7QUFBQSxNQUV4RCxZQUFZO0FBQUEsUUFDVixrQ0FBa0M7QUFBQSxRQUNsQyxvQ0FBb0M7QUFBQSxRQUNwQyw0QkFBNEI7QUFBQSxRQUM1QixxQ0FBcUM7QUFBQSxRQUNyQyxpQ0FBaUM7QUFBQSxRQUNqQyxpQ0FBaUM7QUFBQSxRQUNqQyxzQkFBc0I7QUFBQSxRQUN0QixpQ0FBaUM7QUFBQSxRQUNqQyxpQ0FBaUM7QUFBQSxRQUNqQywyQkFBMkI7QUFBQSxRQUMzQiw4Q0FBOEM7QUFBQSxRQUM5QyxvQ0FBb0M7QUFBQSxRQUNwQyx3Q0FBd0M7QUFBQSxRQUN4QywwQ0FBMEM7QUFBQSxRQUMxQywyQkFBMkI7QUFBQSxRQUMzQiw4QkFBOEI7QUFBQSxRQUM5QixtQ0FBbUM7QUFBQSxRQUNuQyx5Q0FBeUM7QUFBQSxRQUN6QyxvQ0FBb0M7QUFBQSxRQUNwQywyQ0FBMkM7QUFBQSxRQUMzQyw2Q0FBNkM7QUFBQTtBQUFBO0FBQUEsTUFHL0M7QUFBQSxNQUNBLGtCQUFrQjtBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTyxDQUFDLEVBQUUsTUFBTSxNQUFNLGFBQWEsY0FBYyxJQUFJLElBQUksTUFBTSx3Q0FBZSxDQUFDLEVBQUUsQ0FBQztBQUFBLEVBQ3BGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

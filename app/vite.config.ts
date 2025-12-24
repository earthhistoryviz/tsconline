import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: process.env.VITE_OPEN_SCREEN !== undefined ? process.env.VITE_OPEN_SCREEN === "true" : true,
    port: 5173,
    host: "0.0.0.0",
    watch: {
      usePolling: true
    }
  },
  worker: {
    format: "es"
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  }
});

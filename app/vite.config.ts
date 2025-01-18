import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), checker({ typescript: true })],
  server: {
    open: process.env.VITE_OPEN_SCREEN !== undefined ? process.env.VITE_OPEN_SCREEN === "true" : true,
    port: 5173,
    host: "0.0.0.0"
  },
  worker: {
    format: "es"
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  }
});

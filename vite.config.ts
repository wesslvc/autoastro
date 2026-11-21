import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
  server: {
    // `vercel dev` is the simplest way to run the API; this proxy is for
    // running `vite` alongside a separately started API on :3000.
    proxy: { "/api": "http://localhost:3000" },
  },
});

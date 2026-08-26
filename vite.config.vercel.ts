import { defineConfig } from "vite";
import path from "node:path";

// Bundle the Express app and all local imports into one ESM file for Vercel.
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/index.ts"),
      name: "server",
      fileName: "index",
      formats: ["es"],
    },
    outDir: "dist/server-vercel",
    target: "node22",
    ssr: true,
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "fs", "path", "url", "http", "https", "os", "crypto", "stream",
        "util", "events", "buffer", "querystring", "child_process",
        "node:fs", "node:fs/promises", "node:path", "node:url", "node:crypto",
        "express", "cors", "dotenv", "dotenv/config", "zod",
        "@supabase/supabase-js", "@google/genai",
      ],
      output: { format: "es", entryFileNames: "[name].mjs" },
    },
    minify: false,
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  define: { "process.env.NODE_ENV": '"production"' },
});

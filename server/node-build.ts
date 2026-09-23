import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "./index";
import * as express from "express";

const app = createServer();

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

// Serve static files
app.use(express.static(distPath));

// Handle React Router - serve index.html for all non-API routes
app.get("{*all}", (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  res.sendFile(path.join(distPath, "index.html"));
});

export default app;

// Keep the bundle usable both as the local production server and as the Vercel
// function handler. Vercel imports this module, so it must not open a listener.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = process.env.PORT || 3000;

  app.listen(Number(port), "0.0.0.0", () => {
    console.log(`🚀 Fusion Starter server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
  });

  const shutdown = (signal: string) => {
    console.log(`🛑 Received ${signal}, shutting down gracefully`);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

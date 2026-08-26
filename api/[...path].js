// Vercel serverless entrypoint for all /api/* routes.
// The server is pre-bundled by vite.config.vercel.ts, avoiding Vercel's
// TypeScript/ESM extension and directory resolution issues.
import { createServer } from "../dist/server-vercel/index.mjs";

const app = createServer();

export default function handler(req, res) {
  return app(req, res);
}

// Explicit Vercel route for agency profile lookups.
// This avoids relying on the catch-all route for /api/agencies/:id.
import { createServer } from "../../dist/server-vercel/index.mjs";

const app = createServer();

export default function handler(req, res) {
  return app(req, res);
}

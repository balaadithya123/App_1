import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "../server/index.ts";

// Explicitly reference the TypeScript module so Vercel's ESM runtime does not
// try to resolve /var/task/server or /var/task/server/index as a filesystem path.
const app = createServer();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}

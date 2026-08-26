import { createServer } from "../server/index.ts";

// Explicitly reference the TypeScript module so Vercel's ESM runtime bundles
// the server instead of trying to resolve /var/task/server as a directory.
const app = createServer();

export default function handler(req: any, res: any) {
  return app(req, res);
}

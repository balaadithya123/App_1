import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServer } from "../server/index";

// Keep the server import static so Vercel's ESM bundler resolves and includes
// the TypeScript server module instead of trying to resolve /var/task/server
// as a runtime directory import.
const app = createServer();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}

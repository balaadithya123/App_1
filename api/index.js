// Vercel builds this function after `npm run build`, so it can bundle the
// generated server artifact (including every Express route) instead of trying
// to resolve the TypeScript server tree at runtime.
import app from "../dist/server/node-build.mjs";

export default function handler(req, res) {
  return app(req, res);
}

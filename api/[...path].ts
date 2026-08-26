import type { VercelRequest, VercelResponse } from "@vercel/node";

// Load the Express application lazily so Vercel can return the real module/runtime
// error instead of failing the function during module initialization.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { createServer } = await import("../server");
    const app = createServer();
    return app(req, res);
  } catch (error) {
    console.error("[vercel-api] function initialization failed:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Vercel API initialization failed.",
    });
  }
}

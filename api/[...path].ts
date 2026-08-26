import { createServer } from "../server";

// Vercel's Node runtime natively supports Express handlers. Export the
// Express app directly instead of wrapping it with serverless-http.
// This avoids a runtime adapter failure in the Vercel function while
// preserving the existing /api/* routes.
const app = createServer();

export default app;

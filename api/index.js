import app from "../dist/server/node-build.mjs";

export default function handler(req, res) {
  return app(req, res);
}

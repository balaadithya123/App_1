import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleGetWorkers, handleRegisterWorker, handleUpdateWorkerPhoto } from "./routes/workers.js";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.get("/api/ping", (_req, res) => res.json({ message: process.env.PING_MESSAGE ?? "ping" }));
  app.get("/api/workers", handleGetWorkers);
  app.post("/api/workers/register", handleRegisterWorker);
  app.post("/api/workers/photo", handleUpdateWorkerPhoto);
  return app;
}

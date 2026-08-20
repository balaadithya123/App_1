import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleGetWorkers, handleRegisterWorker, handleUpdateWorkerAvailability, handleUpdateWorkerPhoto, handleUpdateWorkerProfile } from "./routes/workers.js";
import { handleGetNotifications, handleMarkNotificationRead, handleWatchWorker } from "./routes/notifications.js";
import { handleGetWorkerCallbackRequests } from "./routes/callback-requests.js";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.get("/api/ping", (_req, res) => res.json({ message: process.env.PING_MESSAGE ?? "ping" }));
  app.get("/api/workers", handleGetWorkers);
  app.post("/api/workers/register", handleRegisterWorker);
  app.post("/api/workers/profile", handleUpdateWorkerProfile);
  app.post("/api/workers/photo", handleUpdateWorkerPhoto);
  app.post("/api/workers/availability", handleUpdateWorkerAvailability);
  app.get("/api/callback-requests", handleGetWorkerCallbackRequests);
  app.post("/api/notifications/watch", handleWatchWorker);
  app.get("/api/notifications", handleGetNotifications);
  app.post("/api/notifications/read", handleMarkNotificationRead);
  return app;
}

import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import { handleGetWorkers, handleRegisterWorker, handleUpdateWorkerAvailability, handleUpdateWorkerPhoto, handleUpdateWorkerProfile } from "./routes/workers";
import { handleGetNotifications, handleMarkNotificationRead, handleWatchWorker } from "./routes/notifications";
import { handleGetWorkerCallbackRequests, handleDeleteWorkerCallbackRequest, handleUpdateWorkerCallbackStatus } from "./routes/callback-requests";
import { handleGetWorkerStats, handleRecordWorkerReferral } from "./routes/growth";
import {
  handleGetAgencies,
  handleGetAgencyTeam,
  handleGetMyAgency,
  handleRegisterAgency,
  handleRegenerateAgencyCode,
  handleJoinAgency,
  handleGetWorkerAffiliation,
  handleLeaveAgency,
  handleGetAgencyDashboard,
  handleUpdateAgencyCallbackStatus,
  handleRemoveWorkerFromAgency,
  handleGetAgencyProjects,
  handleCreateAgencyProject,
  handleDeleteAgencyProject,
  handleGetWorkerProjects,
  handleUpdateWorkerProjectStatus,
} from "./routes/agencies";
import { handleCompletePhoneVerification } from "./routes/phone-verification";
import { handleGeocode, handleReverseGeocode } from "./routes/maps";
import { handleServiceChat } from "./routes/chat";
import { handleVoiceOnboarding } from "./routes/voice-onboarding";
import { handleScreenPortfolio } from "./routes/portfolio-screen";
import { handleEvaluateRanking } from "./routes/ranking";
import {
  handleGetWorkerPortfolio,
  handleGetMyPortfolio,
  handleUploadPortfolio,
  handleDeletePortfolioPhoto,
  handleGetAdminWorkersWithFlags,
  handleResolveWorkerFlags,
  handleToggleWorkerVerification,
} from "./routes/portfolio";
import { handlePostANeed, handleRecordLead } from "./routes/post-a-need";
import { handleCreateTrackRecord, handleGetWorkerTrackRecord } from "./routes/track-record";

// Production runtime: Supabase credentials are supplied through Vercel environment variables; Gemini remains optional.
export function createServer(){const app=express();app.use(cors());app.use(express.json({limit:"15mb"}));app.use(express.urlencoded({extended:true,limit:"15mb"}));app.get("/api/ping",(_req,res)=>res.json({message:process.env.PING_MESSAGE??"ping"}));app.get("/api/maps/geocode",handleGeocode);app.get("/api/maps/reverse-geocode",handleReverseGeocode);app.post("/api/chat",handleServiceChat);app.post("/api/voice-onboarding",handleVoiceOnboarding);app.post("/api/portfolio/screen",handleScreenPortfolio);app.post("/api/ranking/evaluate",handleEvaluateRanking);app.get("/api/workers",handleGetWorkers);app.post("/api/workers/register",handleRegisterWorker);app.post("/api/workers/profile",handleUpdateWorkerProfile);app.post("/api/workers/photo",handleUpdateWorkerPhoto);app.post("/api/workers/availability",handleUpdateWorkerAvailability);app.post("/api/phone-verification/complete",handleCompletePhoneVerification);app.get("/api/callback-requests",handleGetWorkerCallbackRequests);app.delete("/api/callback-requests/:id",handleDeleteWorkerCallbackRequest);app.patch("/api/callback-requests/:id",handleUpdateWorkerCallbackStatus);app.get("/api/worker-stats",handleGetWorkerStats);app.post("/api/worker-referral",handleRecordWorkerReferral);app.post("/api/notifications/watch",handleWatchWorker);app.get("/api/notifications",handleGetNotifications);app.post("/api/agencies/register",handleRegisterAgency);app.get("/api/agencies/me",handleGetMyAgency);app.get("/api/agencies/dashboard",handleGetAgencyDashboard);app.patch("/api/agencies/callbacks/:id",handleUpdateAgencyCallbackStatus);app.post("/api/agencies/regenerate-code",handleRegenerateAgencyCode);app.post("/api/agencies/join",handleJoinAgency);app.post("/api/agencies/leave",handleLeaveAgency);app.post("/api/agencies/remove-worker",handleRemoveWorkerFromAgency);app.get("/api/agencies/projects",handleGetAgencyProjects);app.post("/api/agencies/projects",handleCreateAgencyProject);app.delete("/api/agencies/projects/:id",handleDeleteAgencyProject);app.get("/api/agencies/worker-affiliation",handleGetWorkerAffiliation);app.get("/api/agencies",handleGetAgencies);
app.get("/api/workers/projects", handleGetWorkerProjects);
app.patch("/api/workers/projects/:id/status", handleUpdateWorkerProjectStatus);
app.get("/api/agencies/:id",handleGetAgencyTeam);
app.get("/api/workers/portfolio/my",handleGetMyPortfolio);
app.get("/api/workers/:id/portfolio",handleGetWorkerPortfolio);
app.post("/api/workers/portfolio",handleUploadPortfolio);
app.delete("/api/workers/portfolio/:photoId",handleDeletePortfolioPhoto);
app.get("/api/admin/workers",handleGetAdminWorkersWithFlags);
app.post("/api/admin/workers/:workerId/resolve-flags",handleResolveWorkerFlags);
app.post("/api/admin/workers/:workerId/toggle-verify",handleToggleWorkerVerification);
app.post("/api/workers/post-a-need", handlePostANeed);
app.post("/api/workers/:id/lead", handleRecordLead);
app.post("/api/track-record", handleCreateTrackRecord);
app.get("/api/workers/:id/track-record", handleGetWorkerTrackRecord);
app.get("/api/download-zip", (_req, res) => {
  const file = path.join(process.cwd(), "public", "project-source.zip");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="project-source.zip"');
  res.download(file, "project-source.zip", (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: "Failed to download zip", details: String(err) });
    }
  });
});
return app}

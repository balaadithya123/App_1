import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import "./global.css";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SearchResults from "./pages/SearchResults";
import WorkerProfile from "./pages/WorkerProfile";
import AgencyProfile from "./pages/AgencyProfile";
import SavedWorkers from "./pages/SavedWorkers";
import RecentlyViewed from "./pages/RecentlyViewed";
import ProfileCompleteness from "./pages/ProfileCompleteness";
import Register from "./pages/Register";
import AgencyRegister from "./pages/AgencyRegister";
import AgencyDashboard from "./pages/AgencyDashboard";
import AgencyProfileEdit from "./pages/AgencyProfileEdit";
import AgencyProfileCompleteness from "./pages/AgencyProfileCompleteness";
import Report from "./pages/Report";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerCommitments from "./pages/WorkerCommitments";
import Inbox from "./pages/Inbox";
import WorkerCallbackRequests from "./pages/WorkerCallbackRequests";
import AdminDashboard from "./pages/AdminDashboard";
import ChatAssistantPage from "./pages/ChatAssistantPage";
import FloatingChatButton from "./components/FloatingChatButton";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/assistant" element={<ChatAssistantPage />} />
            <Route path="/chat" element={<ChatAssistantPage />} />
            <Route path="/saved" element={<SavedWorkers />} />
            <Route path="/recently-viewed" element={<RecentlyViewed />} />
            <Route path="/profile-completeness" element={<ProfileCompleteness />} />
            <Route path="/worker" element={<WorkerProfile />} />
            <Route path="/agency-profile" element={<AgencyProfile />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-agency" element={<AgencyRegister />} />
            <Route path="/agency" element={<AgencyDashboard />} />
            <Route path="/agency/dashboard" element={<AgencyDashboard />} />
            <Route path="/agency/profile/edit" element={<AgencyProfileEdit />} />
            <Route path="/agency/profile-completeness" element={<AgencyProfileCompleteness />} />
            <Route path="/join" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/worker-dashboard" element={<WorkerDashboard />} />
            <Route path="/worker-commitments" element={<WorkerCommitments />} />
            <Route path="/callback-requests" element={<WorkerCallbackRequests />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/admin/analytics" element={<AdminDashboard />} />
            <Route path="/report" element={<Report />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingChatButton />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}


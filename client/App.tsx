import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import "./global.css";

import Index from "./pages/Index";
import { applyTheme, getInitialTheme } from "./lib/theme";

const NotFound = lazy(() => import("./pages/NotFound"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const WorkerProfile = lazy(() => import("./pages/WorkerProfile"));
const AgencyProfile = lazy(() => import("./pages/AgencyProfile"));
const SavedWorkers = lazy(() => import("./pages/SavedWorkers"));
const RecentlyViewed = lazy(() => import("./pages/RecentlyViewed"));
const ProfileCompleteness = lazy(() => import("./pages/ProfileCompleteness"));
const Register = lazy(() => import("./pages/Register"));
const AgencyRegister = lazy(() => import("./pages/AgencyRegister"));
const AgencyDashboard = lazy(() => import("./pages/AgencyDashboard"));
const AgencyProfileEdit = lazy(() => import("./pages/AgencyProfileEdit"));
const AgencyProfileCompleteness = lazy(
  () => import("./pages/AgencyProfileCompleteness"),
);
const Report = lazy(() => import("./pages/Report"));
const Login = lazy(() => import("./pages/Login"));
const Profile = lazy(() => import("./pages/Profile"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const WorkerCommitments = lazy(() => import("./pages/WorkerCommitments"));
const Inbox = lazy(() => import("./pages/Inbox"));
const WorkerCallbackRequests = lazy(
  () => import("./pages/WorkerCallbackRequests"),
);
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ChatAssistantPage = lazy(() => import("./pages/ChatAssistantPage"));
const VoiceOnboarding = lazy(() => import("./pages/VoiceOnboarding"));
const PortfolioModeration = lazy(() => import("./pages/PortfolioModeration"));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  React.useEffect(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/voice-onboarding" element={<VoiceOnboarding />} />
              <Route path="/voice" element={<VoiceOnboarding />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/assistant" element={<ChatAssistantPage />} />
              <Route path="/chat" element={<ChatAssistantPage />} />
              <Route path="/saved" element={<SavedWorkers />} />
              <Route path="/my-circle" element={<SavedWorkers />} />
              <Route path="/recently-viewed" element={<RecentlyViewed />} />
              <Route
                path="/profile-completeness"
                element={<ProfileCompleteness />}
              />
              <Route path="/worker" element={<WorkerProfile />} />
              <Route path="/worker/:id" element={<WorkerProfile />} />
              <Route path="/workers/:id" element={<WorkerProfile />} />
              <Route path="/agency-profile" element={<AgencyProfile />} />
              <Route path="/agency/:id" element={<AgencyProfile />} />
              <Route path="/agencies/:id" element={<AgencyProfile />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-agency" element={<AgencyRegister />} />
              <Route path="/agency" element={<AgencyDashboard />} />
              <Route path="/agency/dashboard" element={<AgencyDashboard />} />
              <Route
                path="/agency/profile/edit"
                element={<AgencyProfileEdit />}
              />
              <Route
                path="/agency/profile-completeness"
                element={<AgencyProfileCompleteness />}
              />
              <Route path="/join" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/worker-dashboard" element={<WorkerDashboard />} />
              <Route
                path="/worker-commitments"
                element={<WorkerCommitments />}
              />
              <Route
                path="/callback-requests"
                element={<WorkerCallbackRequests />}
              />
              <Route path="/inbox" element={<Inbox />} />
              <Route
                path="/portfolio-screen"
                element={<PortfolioModeration />}
              />
              <Route
                path="/portfolio-screening"
                element={<PortfolioModeration />}
              />
              <Route
                path="/portfolio-moderation"
                element={<PortfolioModeration />}
              />
              <Route
                path="/admin/portfolio"
                element={<PortfolioModeration />}
              />
              <Route path="/ranking-engine" element={<SearchResults />} />
              <Route path="/ranking" element={<SearchResults />} />
              <Route path="/worker-ranking" element={<SearchResults />} />
              <Route path="/admin/ranking" element={<SearchResults />} />
              <Route path="/admin/analytics" element={<AdminDashboard />} />
              <Route path="/report" element={<Report />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const globalWithRoot = window as unknown as {
    __reactRoot?: ReturnType<typeof createRoot>;
  };
  if (!globalWithRoot.__reactRoot) {
    globalWithRoot.__reactRoot = createRoot(rootElement);
  }
  globalWithRoot.__reactRoot.render(<App />);
}

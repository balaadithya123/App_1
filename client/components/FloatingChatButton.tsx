import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, MessageSquare } from "lucide-react";

export default function FloatingChatButton() {
  const location = useLocation();

  // Hide on the dedicated assistant/chat page
  if (location.pathname === "/assistant" || location.pathname === "/chat") {
    return null;
  }

  return (
    <aside aria-label="AI Assistant Quick Access" className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      <Link
        to="/assistant"
        className="group flex h-11 items-center gap-2 rounded-full border border-border bg-foreground px-3.5 text-background shadow-md transition-all duration-200 hover:opacity-90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open AI Assistant"
        title="Open AI Assistant"
      >
        <Sparkles size={16} className="text-primary shrink-0" />
        <span className="text-xs font-bold tracking-tight">AI Assistant</span>
      </Link>
    </aside>
  );
}


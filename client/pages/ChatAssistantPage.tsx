import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  MapPin,
  Phone,
  MessageSquare,
  ShieldCheck,
  Building2,
  HardHat,
  Loader2,
  Navigation,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Send,
} from "lucide-react";
import PageShell from "@/components/PageShell";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  matchedWorkers?: any[];
  matchedAgencies?: any[];
  groundingChunks?: any[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Emergency pipe leak repair",
  "Electrician for power tripping & sparking",
  "House painting estimate",
  "Carpenter for kitchen cabinet repairs",
  "Deep house cleaning service",
];

export default function ChatAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Describe the work or repairs you need, along with your locality. I will recommend suitable specialists and verified agencies near you.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [clientLocation, setClientLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle GPS location detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `/api/maps/reverse-geocode?lat=${latitude}&lng=${longitude}`,
          );
          const data = await res.json();
          if (data.status === "OK") {
            const loc =
              data.place_name || data.city || data.locality || "Local Area";
            setClientLocation(loc);
          }
        } catch {
          setClientLocation("Local Area");
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { timeout: 8000 },
    );
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content:
          "Describe the work or repairs you need, along with your locality. I will recommend suitable specialists and verified agencies near you.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = newHistory.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          clientLocation: clientLocation.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to get AI response");
      }

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content:
          data.text || "Here are matching recommendations for your request.",
        matchedWorkers: data.matchedWorkers || [],
        matchedAgencies: data.matchedAgencies || [],
        groundingChunks: data.groundingChunks || [],
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "Unable to process your request at the moment. Please check your network connection and try again.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      backTo="/"
      backLabel="Back"
      containerWidth="lg"
      contentPadding="px-2 sm:px-6 py-2 sm:py-4"
    >
      <div className="mx-auto flex h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-7.5rem)] max-w-4xl flex-col rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-[#EAE2DC] dark:border-white/10 bg-gradient-to-r from-[#FFF4EF] via-[#FAF8F5] to-white dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#161514] px-3 py-2.5 sm:px-5 sm:py-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#141210] dark:text-[#FAFAFA] truncate">
                AI Assistant
              </h1>
              <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F] hidden sm:block truncate">
                Find verified specialists and agencies by requirements
              </p>
            </div>
          </div>

          {/* Location & Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#0B0A09] px-2.5 py-1 text-xs">
              <MapPin size={12} className="mr-1 text-[#F4512C] shrink-0" />
              <input
                type="text"
                placeholder="Area (e.g. Kattur)"
                value={clientLocation}
                onChange={(e) => setClientLocation(e.target.value)}
                className="w-20 sm:w-28 bg-transparent text-xs text-[#141210] dark:text-[#FAFAFA] outline-hidden placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A]"
              />
              <button
                type="button"
                onClick={handleDetectLocation}
                title="Use GPS"
                aria-label="Use GPS"
                disabled={isLocating}
                className="ml-0.5 text-[#6B645F] dark:text-[#9E958F] hover:text-[#F4512C] transition disabled:opacity-50"
              >
                {isLocating ? (
                  <Loader2 size={12} className="animate-spin text-[#F4512C]" />
                ) : (
                  <Navigation size={12} />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetChat}
              title="Reset conversation"
              aria-label="Reset conversation"
              className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] transition hover:border-[#F4512C]/50 hover:text-[#141210] dark:hover:text-[#FAFAFA]"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto bg-[#FAF8F5]/50 dark:bg-[#0B0A09]/40 p-3 sm:p-5 space-y-3.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C] mt-0.5">
                  <Sparkles size={13} />
                </div>
              )}

              <div
                className={`max-w-[94%] sm:max-w-[82%] space-y-2.5 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#141210] dark:bg-white text-white dark:text-[#11100F] font-medium rounded-br-xs"
                    : "bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA] border border-[#EAE2DC] dark:border-white/10 rounded-bl-xs shadow-2xs"
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-sm">
                  {msg.content}
                </div>

                {/* Google Maps Grounding Sources */}
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-2.5 text-xs">
                    <p className="font-semibold text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1 mb-1 text-[11px]">
                      <MapPin size={11} className="text-[#F4512C]" />
                      <span>Verified Nearby Areas:</span>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {msg.groundingChunks.map((chunk, idx) => {
                        const title =
                          chunk.web?.title ||
                          chunk.maps?.title ||
                          "Area Location";
                        const uri = chunk.web?.uri || chunk.maps?.uri;
                        return uri ? (
                          <a
                            key={idx}
                            href={uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] px-2.5 py-0.5 text-[10px] font-semibold text-[#F4512C] hover:opacity-85"
                          >
                            <span>{title}</span>
                            <ExternalLink size={9} />
                          </a>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Worker Match Cards */}
                {msg.matchedWorkers && msg.matchedWorkers.length > 0 && (
                  <div className="mt-2.5 space-y-2 pt-2 border-t border-[#EAE2DC] dark:border-white/10">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1.5">
                      <HardHat size={12} className="text-[#F4512C]" />
                      <span>
                        Matching Specialists ({msg.matchedWorkers.length})
                      </span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {msg.matchedWorkers.map((worker: any) => (
                        <div
                          key={worker.id}
                          className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-2.5 sm:p-3 shadow-2xs transition hover:border-[#F4512C]/50 text-left"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-[#141210] dark:text-[#FAFAFA] text-xs truncate">
                                  {worker.name}
                                </h3>
                                {worker.phone_verified && (
                                  <span title="Verified">
                                    <ShieldCheck
                                      size={12}
                                      className="text-[#0F8A73] dark:text-[#3DD1B3] shrink-0"
                                    />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F] truncate">
                                {worker.category} • {worker.locality}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] px-2 py-0.5 text-[10px] font-bold text-[#F4512C]">
                              {worker.experience}y exp
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center gap-1.5">
                            <a
                              href={`tel:${worker.phone}`}
                              className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#141210] dark:bg-white py-1.5 text-[11px] font-bold text-white dark:text-[#11100F] hover:opacity-90 transition"
                            >
                              <Phone size={11} />
                              <span>Call</span>
                            </a>
                            <a
                              href={`https://wa.me/91${worker.phone}?text=${encodeURIComponent(
                                `Hi ${worker.name}, I found your profile on Builderco for ${worker.category} work.`,
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] text-white py-1.5 text-[11px] font-bold shadow-xs transition"
                            >
                              <MessageSquare size={11} />
                              <span>WhatsApp</span>
                            </a>
                            <Link
                              to={`/worker?id=${worker.id}`}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA] transition"
                              title="View Profile"
                            >
                              <ChevronRight size={13} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agency Match Cards */}
                {msg.matchedAgencies && msg.matchedAgencies.length > 0 && (
                  <div className="mt-2.5 space-y-2 pt-2 border-t border-[#EAE2DC] dark:border-white/10">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1.5">
                      <Building2 size={12} className="text-[#F4512C]" />
                      <span>
                        Matching Agencies ({msg.matchedAgencies.length})
                      </span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {msg.matchedAgencies.map((agency: any) => (
                        <div
                          key={agency.id}
                          className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] p-2.5 sm:p-3 shadow-2xs transition hover:border-[#F4512C]/50 text-left"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-[#141210] dark:text-[#FAFAFA] text-xs truncate">
                                  {agency.name}
                                </h3>
                                {agency.verified && (
                                  <span title="Verified Agency">
                                    <ShieldCheck
                                      size={12}
                                      className="text-[#0F8A73] dark:text-[#3DD1B3] shrink-0"
                                    />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F] truncate">
                                {(agency.categories || []).join(", ")}
                              </p>
                              <p className="text-[10px] text-[#8C847E] dark:text-[#766F6A] truncate">
                                Areas:{" "}
                                {(agency.service_locations || []).join(", ")}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#FCEAE4] dark:bg-[#3A2018] px-2 py-0.5 text-[10px] font-bold text-[#F4512C]">
                              {agency.team_size_band}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center gap-1.5">
                            {agency.phone && (
                              <a
                                href={`tel:${agency.phone}`}
                                className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#141210] dark:bg-white py-1.5 text-[11px] font-bold text-white dark:text-[#11100F] hover:opacity-90 transition"
                              >
                                <Phone size={11} />
                                <span>Call</span>
                              </a>
                            )}
                            <Link
                              to={`/agency-profile?id=${agency.id}`}
                              className="flex flex-1 items-center justify-center gap-1 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] py-1.5 text-[11px] font-bold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition"
                            >
                              <span>Profile</span>
                              <ArrowRight size={11} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-[#8C847E] dark:text-[#766F6A] text-right mt-1">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Typing / Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
                <Sparkles size={13} />
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-xs border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3.5 py-2.5 text-xs text-[#6B645F] dark:text-[#9E958F]">
                <span className="inline-flex items-center gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F4512C] animate-bounce [animation-delay:-0.24s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F4512C] animate-bounce [animation-delay:-0.12s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F4512C] animate-bounce" />
                </span>
                <span>Finding matching specialists & agencies...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Requirement Chips (horizontal scroll on mobile) */}
        {messages.length <= 2 && (
          <div className="border-t border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3 py-2 sm:px-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="shrink-0 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3 py-1 text-[11px] font-medium text-[#141210] dark:text-[#FAFAFA] transition hover:border-[#F4512C]/50 hover:text-[#F4512C]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Input Bar */}
        <div className="border-t border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-2.5 sm:p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-1.5 sm:gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what work you need done..."
              disabled={isLoading}
              className="h-10 flex-1 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 text-xs sm:text-sm text-[#141210] dark:text-[#FAFAFA] outline-hidden focus:border-[#F4512C] focus:ring-2 focus:ring-[#F4512C]/20 placeholder:text-[#8C847E] dark:placeholder:text-[#766F6A]"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4512C] text-white transition hover:bg-[#E04320] disabled:opacity-40 cursor-pointer"
              aria-label="Send message"
              title="Send"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

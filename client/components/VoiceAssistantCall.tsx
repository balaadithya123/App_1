import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  VolumeX,
  Send,
  X,
  MapPin,
  MessageCircle,
  BadgeCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, useLanguage, type AppLanguage } from "@/lib/i18n";
import { useVoiceAssistant } from "@/lib/voice-assistant-context";
import { getStandardLocation } from "@/lib/location";
import { getWorkerContactHref, getWorkerWhatsAppHref } from "@/lib/contact";
import { supabase } from "@/lib/supabase";
import type { Worker } from "@shared/workers";

type CallPhase = "idle" | "listening" | "thinking" | "speaking" | "muted";

interface VoiceTurnItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  workers?: Worker[];
  actionLabel?: string;
}

interface VoiceActionPayload {
  type:
    | "navigate"
    | "open_post_need"
    | "switch_language"
    | "toggle_availability"
    | "show_workers";
  route?: string;
  searchService?: string;
  searchLocation?: string;
  needCategory?: string;
  needDescription?: string;
  languageCode?: AppLanguage;
  availableToday?: boolean;
  urgentToday?: boolean;
}

export default function VoiceAssistantCall() {
  const { isOpen, autoStart, closeCall } = useVoiceAssistant();
  const { language, setLanguage, languageMeta, t } = useLanguage();
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [callActive, setCallActive] = useState(false);
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [callSeconds, setCallSeconds] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [micError, setMicError] = useState("");
  const [turns, setTurns] = useState<VoiceTurnItem[]>([]);
  const [userMeta, setUserMeta] = useState<{ role?: string; availableToday?: boolean }>({});

  const turnsEndRef = useRef<HTMLDivElement>(null);
  const callActiveRef = useRef(false);
  const micMutedRef = useRef(false);
  const speakerMutedRef = useRef(false);
  const languageRef = useRef<AppLanguage>(language);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechActiveRef = useRef(false);
  const silenceStartRef = useRef<number>(0);
  const recordStartRef = useRef<number>(0);
  const discardOnStopRef = useRef(false);
  const turnsRef = useRef<VoiceTurnItem[]>([]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  useEffect(() => {
    speakerMutedRef.current = speakerMuted;
  }, [speakerMuted]);

  useEffect(() => {
    turnsRef.current = turns;
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, phase]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        setUserMeta({
          role: u.user_metadata?.role,
          availableToday: Boolean(u.user_metadata?.available_today),
        });
      }
    });
  }, [isOpen]);

  // Call duration timer
  useEffect(() => {
    if (!callActive) {
      setCallSeconds(0);
      return;
    }
    const id = window.setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [callActive]);

  const stopPlayback = useCallback(() => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.src = "";
      playbackAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopMicCapture = useCallback((discard = true) => {
    discardOnStopRef.current = discard;
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const executeActions = useCallback(
    (actions: VoiceActionPayload[] = []): string | undefined => {
      let summaryLabel: string | undefined;
      for (const act of actions) {
        if (act.type === "switch_language" && act.languageCode) {
          setLanguage(act.languageCode);
          summaryLabel = `Language: ${act.languageCode.toUpperCase()}`;
        } else if (act.type === "navigate" && act.route) {
          let target = act.route;
          if (target === "/search" && (act.searchService || act.searchLocation)) {
            const p = new URLSearchParams();
            if (act.searchService) p.set("service", act.searchService);
            if (act.searchLocation) p.set("location", act.searchLocation);
            target = `/search?${p.toString()}`;
          }
          navigate(target);
          summaryLabel = `Opened ${act.route}`;
        } else if (act.type === "open_post_need") {
          navigate("/home", {
            state: {
              openPostNeed: true,
              initialCategory: act.needCategory || "Electrician",
              initialLocation: act.searchLocation || getStandardLocation(),
            },
          });
          summaryLabel = "Opened Post a Need";
        } else if (act.type === "toggle_availability") {
          window.dispatchEvent(
            new CustomEvent("builderco-voice-availability", {
              detail: {
                availableToday: Boolean(act.availableToday),
                urgentToday: act.urgentToday,
              },
            }),
          );
          summaryLabel = act.availableToday ? "Marked Available Today" : "Marked Busy Today";
        }
      }
      return summaryLabel;
    },
    [navigate, setLanguage],
  );

  const speakResponse = useCallback(
    async (replyText: string, audioBase64?: string | null, langCode?: AppLanguage) => {
      if (speakerMutedRef.current || !callActiveRef.current) return;
      setPhase("speaking");

      if (audioBase64) {
        await new Promise<void>((resolve) => {
          const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
          playbackAudioRef.current = audio;
          const finish = () => {
            if (playbackAudioRef.current === audio) playbackAudioRef.current = null;
            resolve();
          };
          audio.onended = finish;
          audio.onerror = finish;
          audio.play().catch(finish);
        });
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window && replyText) {
        await new Promise<void>((resolve) => {
          try {
            const utter = new SpeechSynthesisUtterance(replyText);
            const targetLang = langCode || languageRef.current;
            const meta =
              SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) ||
              languageMeta;
            utter.lang = meta.speechLocale;
            utter.rate = 0.98;
            utter.onend = () => resolve();
            utter.onerror = () => resolve();
            window.speechSynthesis.speak(utter);
          } catch {
            resolve();
          }
        });
      }
    },
    [languageMeta],
  );

  const startListeningLoop = useRef<() => Promise<void>>(async () => {});

  const sendVoiceTurn = useCallback(
    async (payload: { audioBase64?: string; mimeType?: string; text?: string }) => {
      if (!payload.audioBase64 && !payload.text) return;
      setPhase("thinking");

      const optimisticUserId = payload.text ? `u-${Date.now()}` : null;
      if (optimisticUserId && payload.text) {
        setTurns((prev) => [
          ...prev,
          { id: optimisticUserId, role: "user", text: payload.text! },
        ]);
      }

      try {
        const res = await fetch("/api/voice-assistant/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            lang: languageRef.current,
            history: turnsRef.current.slice(-6).map((item) => ({
              role: item.role,
              content: item.text,
            })),
            context: {
              role: userMeta.role || "customer",
              route: routerLocation.pathname,
              location: getStandardLocation(),
              availableToday: userMeta.availableToday,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Voice turn failed");
        }

        const spokenTranscript = String(data.userTranscript || "").trim();
        if (!optimisticUserId && spokenTranscript) {
          setTurns((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: "user", text: spokenTranscript },
          ]);
        }

        const actionLabel = executeActions(data.actions || []);
        const replyText = String(data.replyText || "").trim();
        const nextLang = (data.language as AppLanguage) || languageRef.current;

        if (replyText) {
          setTurns((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: replyText,
              workers: Array.isArray(data.matchedWorkers) ? data.matchedWorkers : [],
              actionLabel,
            },
          ]);
        }

        if (callActiveRef.current) {
          await speakResponse(replyText, data.audioBase64, nextLang);
        }
      } catch (err) {
        console.warn("[VoiceAssistantCall] turn failed:", err);
      } finally {
        if (callActiveRef.current) {
          if (micMutedRef.current) {
            setPhase("muted");
          } else {
            void startListeningLoop.current();
          }
        } else {
          setPhase("idle");
        }
      }
    },
    [executeActions, routerLocation.pathname, speakResponse, userMeta],
  );

  startListeningLoop.current = async () => {
    if (!callActiveRef.current || micMutedRef.current) {
      setPhase(micMutedRef.current ? "muted" : "idle");
      return;
    }
    stopMicCapture(true);
    setMicError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!callActiveRef.current || micMutedRef.current) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }

      streamRef.current = stream;
      chunksRef.current = [];
      discardOnStopRef.current = false;
      speechActiveRef.current = false;
      silenceStartRef.current = 0;
      recordStartRef.current = Date.now();

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType =
        mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const shouldDiscard = discardOnStopRef.current;
        const chunks = [...chunksRef.current];
        const finalType = recorder.mimeType || "audio/webm";

        if (vadRafRef.current !== null) {
          cancelAnimationFrame(vadRafRef.current);
          vadRafRef.current = null;
        }
        stream.getTracks().forEach((tr) => tr.stop());
        if (streamRef.current === stream) streamRef.current = null;
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
        setAudioLevel(0);

        if (shouldDiscard || !callActiveRef.current || chunks.length === 0) {
          return;
        }

        const blob = new Blob(chunks, { type: finalType });
        if (blob.size < 1400) {
          // Too tiny/empty -> resume listening
          if (callActiveRef.current && !micMutedRef.current) {
            void startListeningLoop.current();
          }
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = String(reader.result || "").split(",")[1];
          if (b64 && callActiveRef.current) {
            void sendVoiceTurn({ audioBase64: b64, mimeType: blob.type });
          }
        };
        reader.readAsDataURL(blob);
      };

      // VAD Silence Detection
      try {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!analyserRef.current || !callActiveRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArr);
          let sum = 0;
          for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
          const avg = sum / dataArr.length;
          const level = Math.min(100, Math.round((avg / 90) * 100));
          setAudioLevel(level);

          const now = Date.now();
          if (avg > 14) {
            speechActiveRef.current = true;
            silenceStartRef.current = 0;
          } else if (speechActiveRef.current) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = now;
            } else if (
              now - silenceStartRef.current > 1350 &&
              now - recordStartRef.current > 900
            ) {
              // User finished speaking a phrase -> auto-send
              discardOnStopRef.current = false;
              if (recorderRef.current?.state === "recording") {
                recorderRef.current.stop();
              }
              return;
            }
          }

          // Max single turn 18s safety cap
          if (now - recordStartRef.current > 18000) {
            discardOnStopRef.current = !speechActiveRef.current;
            if (recorderRef.current?.state === "recording") {
              recorderRef.current.stop();
            }
            if (!speechActiveRef.current && callActiveRef.current) {
              void startListeningLoop.current();
            }
            return;
          }

          vadRafRef.current = requestAnimationFrame(tick);
        };
        vadRafRef.current = requestAnimationFrame(tick);
      } catch {
        // If Web Audio analyser fails, user can tap "Send Now"
      }

      recorder.start(250);
      setPhase("listening");
    } catch {
      setMicError(
        "Microphone access needed for live call. You can allow mic permission or type/tap suggestions below.",
      );
      setPhase("muted");
    }
  };

  const beginCall = useCallback(async () => {
    stopPlayback();
    callActiveRef.current = true;
    setCallActive(true);
    setMicMuted(false);
    micMutedRef.current = false;
    setMicError("");
    await startListeningLoop.current();
  }, [stopPlayback]);

  const endCall = useCallback(() => {
    callActiveRef.current = false;
    setCallActive(false);
    setPhase("idle");
    stopMicCapture(true);
    stopPlayback();
  }, [stopMicCapture, stopPlayback]);

  // Auto-start call when opened via Voice button
  useEffect(() => {
    if (!isOpen) {
      endCall();
      return;
    }
    if (autoStart) {
      void beginCall();
    }
    return () => {
      callActiveRef.current = false;
      stopMicCapture(true);
      stopPlayback();
    };
  }, [isOpen, autoStart, beginCall, endCall, stopMicCapture, stopPlayback]);

  const handleManualSendNow = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      discardOnStopRef.current = false;
      recorderRef.current.stop();
    }
  };

  const handleToggleMicMute = () => {
    const next = !micMuted;
    setMicMuted(next);
    micMutedRef.current = next;
    if (next) {
      stopMicCapture(true);
      setPhase("muted");
    } else if (callActiveRef.current) {
      void startListeningLoop.current();
    }
  };

  const handleTextSubmit = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const val = (customText ?? textInput).trim();
    if (!val || phase === "thinking") return;
    if (!customText) setTextInput("");

    // Pause active mic recording without sending old buffer
    stopMicCapture(true);
    stopPlayback();
    if (!callActiveRef.current) {
      callActiveRef.current = true;
      setCallActive(true);
    }
    void sendVoiceTurn({ text: val });
  };

  if (!isOpen) return null;

  const mins = String(Math.floor(callSeconds / 60)).padStart(2, "0");
  const secs = String(callSeconds % 60).padStart(2, "0");

  const statusLabel =
    phase === "listening"
      ? t("voice.listening")
      : phase === "thinking"
        ? t("voice.thinking")
        : phase === "speaking"
          ? t("voice.speaking")
          : phase === "muted"
            ? t("voice.muted")
            : t("voice.ready");

  const starters = [
    t("voice.starter1"),
    t("voice.starter2"),
    t("voice.starter3"),
    t("voice.starter4"),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("voice.title")}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="relative flex h-[92dvh] sm:h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#141210] dark:text-[#FAFAFA] shadow-2xl">
        {/* Top Call Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4512C] text-white">
              <PhoneCall size={16} />
              {callActive && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#0F8A73] ring-2 ring-white dark:ring-[#161514]" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-extrabold">{t("voice.title")}</h2>
              <p className="text-[11px] font-semibold text-[#6B645F] dark:text-[#9E958F]">
                {callActive ? `${languageMeta.nativeName} · ${mins}:${secs}` : t("voice.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const next = !speakerMuted;
                setSpeakerMuted(next);
                speakerMutedRef.current = next;
                if (next) stopPlayback();
              }}
              aria-label={speakerMuted ? "Unmute speaker" : "Mute speaker"}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white cursor-pointer"
            >
              {speakerMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button
              type="button"
              onClick={() => {
                endCall();
                closeCall();
              }}
              aria-label="Close voice assistant"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* 6-Language Switcher Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#EAE2DC]/70 dark:border-white/10 bg-white/70 dark:bg-[#161514]/70 px-4 py-2 no-scrollbar">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  active
                    ? "bg-[#F4512C] text-white shadow-xs"
                    : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-white"
                }`}
              >
                {lang.nativeName}
              </button>
            );
          })}
        </div>

        {/* Central Call Stage + Live Captions */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Interactive Voice Orb */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-white to-[#F7ECE4] dark:from-[#261B16] dark:via-[#161514] dark:to-[#131110] px-4 py-5 text-center">
            <div className="relative flex items-center justify-center">
              {phase === "listening" && (
                <div
                  aria-hidden="true"
                  className="absolute rounded-full bg-[#F4512C]/20 transition-all duration-100"
                  style={{
                    width: `${76 + Math.round(audioLevel * 0.45)}px`,
                    height: `${76 + Math.round(audioLevel * 0.45)}px`,
                  }}
                />
              )}
              {phase === "speaking" && (
                <div
                  aria-hidden="true"
                  className="absolute h-24 w-24 animate-ping rounded-full bg-[#0F8A73]/20"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  if (!callActive) void beginCall();
                  else if (phase === "listening") handleManualSendNow();
                  else if (phase === "muted") handleToggleMicMute();
                }}
                aria-label={callActive ? statusLabel : t("voice.startCall")}
                className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 cursor-pointer ${
                  phase === "speaking"
                    ? "bg-[#0F8A73]"
                    : phase === "thinking"
                      ? "bg-amber-600"
                      : phase === "muted"
                        ? "bg-neutral-500"
                        : "bg-[#F4512C] hover:bg-[#E04320]"
                }`}
              >
                {phase === "speaking" ? (
                  <Volume2 size={26} />
                ) : phase === "thinking" ? (
                  <Sparkles size={24} className="animate-pulse" />
                ) : phase === "muted" ? (
                  <MicOff size={24} />
                ) : (
                  <Mic size={26} />
                )}
              </button>
            </div>

            <p className="mt-3 text-xs sm:text-sm font-bold text-[#141210] dark:text-[#FAFAFA]">
              {statusLabel}
            </p>

            {micError && (
              <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 max-w-sm">
                {micError}
              </p>
            )}

            {/* Primary Call Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {!callActive ? (
                <button
                  type="button"
                  onClick={() => void beginCall()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0F8A73] hover:bg-[#0B6E5B] px-4 text-xs font-bold text-white transition cursor-pointer"
                >
                  <PhoneCall size={14} />
                  <span>{t("voice.startCall")}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleToggleMicMute}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition cursor-pointer ${
                      micMuted
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA]"
                    }`}
                  >
                    {micMuted ? <MicOff size={13} /> : <Mic size={13} />}
                    <span>{micMuted ? t("voice.unmuteMic") : t("voice.muteMic")}</span>
                  </button>

                  {phase === "listening" && (
                    <button
                      type="button"
                      onClick={handleManualSendNow}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#141210] text-white dark:bg-white dark:text-[#11100F] px-3.5 text-xs font-bold transition hover:opacity-90 cursor-pointer"
                    >
                      <Send size={12} />
                      <span>{t("voice.tapToSend")}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={endCall}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 px-3.5 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <PhoneOff size={13} />
                    <span>{t("voice.endCall")}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Starter Prompts when fresh */}
          {turns.length === 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F]">
                {t("voice.trySaying")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {starters.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleTextSubmit(undefined, prompt)}
                    className="rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-3 py-2.5 text-left text-xs font-semibold text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/50 transition cursor-pointer"
                  >
                    “{prompt}”
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Transcript & Matched Workers */}
          <div className="space-y-3">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`flex flex-col ${
                  turn.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    turn.role === "user"
                      ? "bg-[#141210] text-white dark:bg-white dark:text-[#11100F] font-medium"
                      : "border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] text-[#141210] dark:text-[#FAFAFA]"
                  }`}
                >
                  <p>{turn.text}</p>
                  {turn.actionLabel && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#F4512C]/10 px-2 py-0.5 text-[10px] font-bold text-[#F4512C]">
                      <Sparkles size={10} />
                      {turn.actionLabel}
                    </span>
                  )}
                </div>

                {turn.workers && turn.workers.length > 0 && (
                  <div className="mt-2 w-full space-y-2">
                    {turn.workers.map((w) => {
                      const telHref = getWorkerContactHref(w);
                      const waHref = getWorkerWhatsAppHref(w);
                      return (
                        <div
                          key={w.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">{w.name}</span>
                              {w.phone_verified && (
                                <BadgeCheck size={13} className="text-emerald-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-[#6B645F] dark:text-[#9E958F] flex items-center gap-1">
                              <span>{w.category}</span>
                              <span>·</span>
                              <MapPin size={10} />
                              <span className="truncate">{w.locality}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {waHref && (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center gap-1 rounded-full bg-[#0F8A73] px-3 text-[11px] font-bold text-white"
                              >
                                <MessageCircle size={12} />
                                <span>{t("card.whatsapp")}</span>
                              </a>
                            )}
                            <a
                              href={telHref}
                              className="inline-flex h-8 items-center gap-1 rounded-full bg-[#141210] dark:bg-white text-white dark:text-[#11100F] px-3 text-[11px] font-bold"
                            >
                              <Phone size={12} />
                              <span>{t("card.call")}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`/worker?worker=${encodeURIComponent(w.id)}`);
                                closeCall();
                              }}
                              aria-label={`View ${w.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE2DC] dark:border-white/10 text-[#6B645F] hover:text-[#F4512C] cursor-pointer"
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            <div ref={turnsEndRef} />
          </div>
        </div>

        {/* Bottom Text Fallback Bar */}
        <form
          onSubmit={(e) => handleTextSubmit(e)}
          className="flex items-center gap-2 border-t border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] px-4 py-3"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={t("voice.typePlaceholder")}
            className="h-10 flex-1 rounded-full border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-4 text-xs sm:text-sm outline-none focus:border-[#F4512C]"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || phase === "thinking"}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4512C] hover:bg-[#E04320] text-white disabled:opacity-40 cursor-pointer"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

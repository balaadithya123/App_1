import type { RequestHandler } from "express";
import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type FunctionDeclaration,
} from "@google/genai";
import { getAllWorkers } from "./workers";
import { supabase } from "../lib/supabase";

type SupportedLang = "en" | "ta" | "hi" | "te" | "ml" | "kn";

const LANG_CONFIG: Record<
  SupportedLang,
  { name: string; native: string; styleHint: string; fallbackGreeting: string }
> = {
  en: {
    name: "English (Everyday Indian English)",
    native: "English",
    styleHint:
      "Warm, friendly, clear everyday conversational Indian English, concise phone-call pace",
    fallbackGreeting:
      "I'm ready to help! Tell me which worker you need, your area, or ask me to open your dashboard or saved contacts.",
  },
  ta: {
    name: "Everyday Spoken Tamil (பேச்சு தமிழ், NOT pure literary Tamil)",
    native: "தமிழ்",
    styleHint:
      "Warm, friendly everyday spoken Chennai/Tamil Nadu conversational Tamil, natural pace",
    fallbackGreeting:
      "சொல்லுங்க, உங்களுக்கு என்ன உதவி வேணும்? எலக்ட்ரீஷியன், பிளம்பர் தேடணுமா இல்ல டேஷ்போர்டு ஓபன் பண்ணனுமா?",
  },
  hi: {
    name: "Everyday Spoken Hindi (आम बोलचाल की हिंदी, Hinglish-friendly, NOT formal/pure Sanskritized Hindi)",
    native: "हिन्दी",
    styleHint:
      "Warm, friendly everyday conversational Hindi, natural clear pace",
    fallbackGreeting:
      "बताइए, मैं आपकी क्या मदद करूँ? आस-पास का कारीगर ढूंढना है, रेट देखना है, या डैशबोर्ड खोलना है?",
  },
  te: {
    name: "Everyday Spoken Telugu (సహజమైన వాడుక తెలుగు, NOT pure bookish Telugu)",
    native: "తెలుగు",
    styleHint:
      "Warm, friendly everyday conversational Telugu, natural clear pace",
    fallbackGreeting:
      "చెప్పండి, మీకు ఏం సాయం కావాలి? ఎలక్ట్రీషియన్, ప్లంబర్ వెతకాలా లేదా సేవ్ చేసిన నంబర్లు చూడాలా?",
  },
  ml: {
    name: "Everyday Spoken Malayalam (സാധാരണ സംസാര മലയാളം, NOT formal literary Malayalam)",
    native: "മലയാളം",
    styleHint:
      "Warm, friendly everyday conversational Malayalam, natural clear pace",
    fallbackGreeting:
      "പറയൂ, എന്ത് സഹായമാണ് വേണ്ടത്? ഇലക്ട്രീഷ്യനെ തിരയണോ അതോ സേവ് ചെയ്ത നമ്പറുകൾ തുറക്കണോ?",
  },
  kn: {
    name: "Everyday Spoken Kannada (ಸಹಜ ಆಡುಮಾತಿನ ಕನ್ನಡ, NOT formal literary Kannada)",
    native: "ಕನ್ನಡ",
    styleHint:
      "Warm, friendly everyday conversational Kannada, natural clear pace",
    fallbackGreeting:
      "ಹೇಳಿ, ನಿಮಗೆ ಏನು ಸಹಾಯ ಬೇಕು? ಹತ್ತಿರದ ಎಲೆಕ್ಟ್ರೀಷಿಯನ್ ಹುಡುಕಬೇಕಾ ಅಥವಾ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಓಪನ್ ಮಾಡಬೇಕಾ?",
  },
};

function normalizeLang(input: unknown): SupportedLang {
  const s = String(input || "en").toLowerCase().trim();
  if (s === "ta" || s === "hi" || s === "te" || s === "ml" || s === "kn") {
    return s;
  }
  return "en";
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export interface VoiceAction {
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
  languageCode?: SupportedLang;
  availableToday?: boolean;
  urgentToday?: boolean;
}

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_workers",
    description:
      "Search verified local trade workers in the Builderco directory by trade category and/or neighborhood/city.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description:
            "Trade category such as Electrician, Plumber, Carpenter, Painter, Cleaner, AC Repair, Mason. Leave empty to list top verified pros.",
        },
        locality: {
          type: Type.STRING,
          description: "Locality, neighborhood, or city name.",
        },
        available_today_only: {
          type: Type.BOOLEAN,
          description: "If true, filter to workers available today.",
        },
      },
    },
  },
  {
    name: "navigate_page",
    description:
      "Navigate the user's app directly to a specific page or filtered search view.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        route: {
          type: Type.STRING,
          description:
            "Target route path: /home, /search, /saved, /inbox, /rate-guide, /materials, /worker-dashboard, /worker-passbook, /worker-commitments, /callback-requests, /profile, /voice-onboarding",
        },
        search_service: {
          type: Type.STRING,
          description: "Optional trade filter when navigating to /search.",
        },
        search_location: {
          type: Type.STRING,
          description: "Optional locality filter when navigating to /search.",
        },
      },
      required: ["route"],
    },
  },
  {
    name: "open_post_need",
    description:
      "Open the Post a Need modal/request form so the customer can submit a job requirement.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "Trade category if known (e.g. Electrician, Plumber).",
        },
        description: {
          type: Type.STRING,
          description: "Short summary of the customer's repair or job need.",
        },
        locality: {
          type: Type.STRING,
          description: "Customer locality if mentioned.",
        },
      },
    },
  },
  {
    name: "get_fair_rates",
    description:
      "Look up typical local job prices / fair rates for a trade category in a locality.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description:
            "Trade category (Electrician, Plumber, Carpenter, Painter, Cleaner, AC Repair, Mason).",
        },
        locality: {
          type: Type.STRING,
          description: "Optional locality or city.",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "update_worker_availability",
    description:
      "When the signed-in user is a worker (or asks to change their availability status), update whether they are available for work today or urgent jobs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        available_today: {
          type: Type.BOOLEAN,
          description: "True if available for work today, false if busy.",
        },
        urgent_today: {
          type: Type.BOOLEAN,
          description: "Optional true if accepting urgent/same-day jobs.",
        },
      },
      required: ["available_today"],
    },
  },
  {
    name: "switch_app_language",
    description:
      "Switch the Builderco app interface and voice assistant language when the user asks to speak or view the app in Tamil, Hindi, Telugu, Malayalam, Kannada, or English.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        language_code: {
          type: Type.STRING,
          description: "One of: en, ta, hi, te, ml, kn",
        },
      },
      required: ["language_code"],
    },
  },
];

async function queryFairRates(category: string, locality?: string) {
  try {
    let query = supabase
      .from("worker_rates")
      .select("rate_min,rate_max,rate_unit,workers!inner(category,locality)")
      .ilike("workers.category", `%${category}%`)
      .limit(30);
    if (locality) {
      query = query.ilike("workers.locality", `%${locality}%`);
    }
    const { data } = await query;
    if (Array.isArray(data) && data.length > 0) {
      const mins = data.map((d: any) => Number(d.rate_min)).filter((n) => n > 0);
      const maxs = data.map((d: any) => Number(d.rate_max)).filter((n) => n > 0);
      if (mins.length > 0 && maxs.length > 0) {
        const low = Math.min(...mins);
        const high = Math.max(...maxs);
        return {
          category,
          locality: locality || "local area",
          typicalRangeRupees: `₹${low} to ₹${high}`,
          sampleCount: data.length,
        };
      }
    }
  } catch {
    // fallback defaults below
  }

  const defaults: Record<string, string> = {
    electrician: "₹300 to ₹800 per visit / small repair",
    plumber: "₹350 to ₹900 per visit / pipe or tap repair",
    carpenter: "₹450 to ₹1,200 per job",
    painter: "₹18 to ₹35 per sq ft, or ₹800–₹1,200 per day",
    cleaner: "₹800 to ₹2,500 depending on rooms",
    "ac repair": "₹500 to ₹1,500 for service / gas check",
    mason: "₹900 to ₹1,400 per day",
  };
  const key = category.toLowerCase();
  const matched =
    Object.entries(defaults).find(([k]) => key.includes(k))?.[1] ||
    "₹400 to ₹1,000 per visit";
  return {
    category,
    locality: locality || "your area",
    typicalRangeRupees: matched,
    note: "Typical local estimate; confirm exact price with the worker before starting.",
  };
}

function detectTradeKeyword(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (
    /electric|wiring|switch|fan|inverter|current|மின்சார|எலக்ட்ர|बिजली|इलेक्ट्र|ఎలక్ట్ర|ఇలెక్ట్రీ|ಎಲೆಕ್ಟ್ರ/.test(
      lower,
    )
  )
    return "Electrician";
  if (
    /plumb|pipe|leak|tap|geyser|motor|water|பிளம்ப|குழாய்|प्लम्ब|नल|పాని|ప్లంబ|പൈപ്പ്|പ്ലംബ|ನೀರು|ಪ್ಲಂಬ/.test(
      lower,
    )
  )
    return "Plumber";
  if (/carpent|wood|door|furniture|கார்பென்|மர|बढ़ई|कारपें|కార్పె|ആശാരി|ಕಾರ್ಪೆ/.test(lower))
    return "Carpenter";
  if (/paint|wall|putty|பெயிண்ட்|पेंटर|पुताई|పెయింట్|പെയിന്റ്|ಪೇಂಟ/.test(lower))
    return "Painter";
  if (/clean|wash|bathroom|sofa|கிளீன்|सुथरा|क्लीन|క్లీన్|ക്ലീൻ|ಕ್ಲೀನ್/.test(lower))
    return "Cleaner";
  if (/ac|air condition|cooling|ஏசி|एसी|ఏసీ|എസി|ಎಸಿ/.test(lower))
    return "AC Repair";
  return undefined;
}

function detectLanguageSwitch(text: string): SupportedLang | null {
  const lower = text.toLowerCase();
  if (/\b(tamil|தமிழ்|தமிழில்)\b/.test(lower)) return "ta";
  if (/\b(hindi|हिन्दी|हिंदी)\b/.test(lower)) return "hi";
  if (/\b(telugu|తెలుగు)\b/.test(lower)) return "te";
  if (/\b(malayalam|മലയാളം)\b/.test(lower)) return "ml";
  if (/\b(kannada|ಕನ್ನಡ)\b/.test(lower)) return "kn";
  if (/\b(english|இங்கிலீஷ்|अंग्रेजी)\b/.test(lower)) return "en";
  return null;
}

async function generateTtsAudio(
  ai: GoogleGenAI,
  text: string,
  lang: SupportedLang,
): Promise<string | null> {
  const cleanText = text.replace(/[*_`#]/g, "").trim();
  if (!cleanText) return null;
  try {
    const ttsPromise = ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: LANG_CONFIG[lang].styleHint,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TTS timeout")), 9000),
    );
    const ttsRes: any = await Promise.race([ttsPromise, timeout]);
    const base64Audio =
      ttsRes?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return typeof base64Audio === "string" && base64Audio.length > 0
      ? base64Audio
      : null;
  } catch (err: any) {
    console.warn("[voice-assistant] TTS error:", err?.message || err);
    return null;
  }
}

export const handleVoiceAssistantTurn: RequestHandler = async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType,
      text,
      lang: rawLang,
      history = [],
      context = {},
    } = req.body || {};

    let lang = normalizeLang(rawLang);
    let userTranscript = typeof text === "string" ? text.trim() : "";

    const ai = getAiClient();

    // 1. Transcribe audio if audioBase64 was sent
    if (audioBase64 && !userTranscript && ai) {
      try {
        const cleanMime = String(mimeType || "audio/webm")
          .split(";")[0]
          .trim();
        const transcribePromise = ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: audioBase64,
                },
              },
              {
                text: `Transcribe the spoken speech verbatim in its original language/script (${LANG_CONFIG[lang].native} or code-switched English). Return only the spoken words.`,
              },
            ],
          },
        });
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Transcribe timeout")), 8000),
        );
        const transcribeRes: any = await Promise.race([
          transcribePromise,
          timeout,
        ]);
        userTranscript = (transcribeRes?.text || "").trim();
      } catch (err: any) {
        console.warn("[voice-assistant] transcribe fallback:", err?.message);
      }
    }

    if (!userTranscript && !audioBase64) {
      return res.status(400).json({
        message: "Provide either audioBase64 or text.",
      });
    }

    if (!userTranscript) {
      // Fallback if audio could not be transcribed
      const msg = LANG_CONFIG[lang].fallbackGreeting;
      return res.json({
        userTranscript: "",
        replyText: msg,
        language: lang,
        matchedWorkers: [],
        actions: [],
        audioBase64: null,
        audioMimeType: "audio/wav",
      });
    }

    const allWorkers = await getAllWorkers().catch(() => []);
    const actions: VoiceAction[] = [];
    let matchedWorkers: any[] = [];
    let replyText = "";

    // 2. Run conversational reasoning + tool execution via Gemini 4 Hydrogen
    if (ai) {
      try {
        const systemInstruction = `You are Builderco's helpful live Voice Call Assistant.
You are speaking on an interactive voice call with a user in: ${LANG_CONFIG[lang].name}.

CRITICAL STYLE & LANGUAGE RULES:
1. ALWAYS reply in ${LANG_CONFIG[lang].name} using warm, natural, everyday SPOKEN conversational language that common homeowners and trade workers actually speak on the phone.
2. NEVER use pure/formal/textbook/literary vocabulary! Keep familiar everyday words natural (like electrician, plumber, dashboard, passbook, WhatsApp, OTP, GPS) written naturally in the language script or colloquial blend.
3. Keep every reply SHORT (1 to 3 short spoken sentences max) so it feels snappy and natural on a phone call — no markdown bullet lists, no asterisks, no emojis.
4. Use your tools to ACTUALLY DO WORK for the user whenever they ask to find someone, check prices, open a screen (saved contacts, dashboard, callbacks, passbook, materials, rate guide), post a need, switch language, or toggle availability!
5. User context:
   - Role: ${context.role || "customer"}
   - Current page: ${context.route || "/home"}
   - User area/location: ${context.location || "not set"}
   - Worker currently available today: ${Boolean(context.availableToday)}`;

        const recentHistory = Array.isArray(history)
          ? history.slice(-6).map((m: any) => ({
              role: m.role === "assistant" ? ("model" as const) : ("user" as const),
              parts: [{ text: String(m.content || "") }],
            }))
          : [];

        const conversationContents: any[] = [
          ...recentHistory,
          { role: "user", parts: [{ text: userTranscript }] },
        ];

        const firstPromise = ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: conversationContents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
          },
        });

        const firstTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini turn timeout")), 9000),
        );
        const firstRes: any = await Promise.race([firstPromise, firstTimeout]);

        const calls = firstRes?.functionCalls;
        if (Array.isArray(calls) && calls.length > 0) {
          const functionResponses: any[] = [];

          for (const call of calls) {
            const args = (call.args || {}) as Record<string, any>;
            let toolResult: any = { ok: true };

            if (call.name === "search_workers") {
              const cat = String(args.category || "").toLowerCase();
              const loc = String(
                args.locality || context.location || "",
              ).toLowerCase();
              const availOnly = Boolean(args.available_today_only);

              let results = allWorkers.filter((w) => {
                const catOk =
                  !cat ||
                  w.category.toLowerCase().includes(cat) ||
                  (w.services || []).some((s) => s.toLowerCase().includes(cat));
                const availOk = !availOnly || Boolean(w.available_today);
                return catOk && availOk;
              });

              if (loc) {
                const locMatches = results.filter((w) =>
                  w.locality.toLowerCase().includes(loc),
                );
                if (locMatches.length > 0) results = locMatches;
              }

              matchedWorkers = results.slice(0, 4);
              actions.push({
                type: "show_workers",
                searchService: args.category || undefined,
                searchLocation: args.locality || context.location || undefined,
              });
              toolResult = {
                count: matchedWorkers.length,
                workers: matchedWorkers.map((w) => ({
                  name: w.name,
                  category: w.category,
                  locality: w.locality,
                  experience: w.experience,
                  available_today: Boolean(w.available_today),
                  verified: Boolean(w.phone_verified),
                })),
              };
            } else if (call.name === "navigate_page") {
              const route = String(args.route || "/home");
              actions.push({
                type: "navigate",
                route,
                searchService: args.search_service,
                searchLocation: args.search_location,
              });
              toolResult = { navigatedTo: route };
            } else if (call.name === "open_post_need") {
              actions.push({
                type: "open_post_need",
                needCategory: args.category,
                needDescription: args.description,
                searchLocation: args.locality || context.location,
              });
              toolResult = { openedPostNeedModal: true };
            } else if (call.name === "get_fair_rates") {
              const rateData = await queryFairRates(
                String(args.category || "Electrician"),
                args.locality || context.location,
              );
              toolResult = rateData;
            } else if (call.name === "update_worker_availability") {
              actions.push({
                type: "toggle_availability",
                availableToday: Boolean(args.available_today),
                urgentToday:
                  args.urgent_today !== undefined
                    ? Boolean(args.urgent_today)
                    : undefined,
              });
              toolResult = {
                updatedAvailability: Boolean(args.available_today),
              };
            } else if (call.name === "switch_app_language") {
              const nextLang = normalizeLang(args.language_code);
              lang = nextLang;
              actions.push({
                type: "switch_language",
                languageCode: nextLang,
              });
              toolResult = { switchedTo: nextLang };
            }

            functionResponses.push({
              functionResponse: {
                id: call.id,
                name: call.name,
                response: toolResult,
              },
            });
          }

          const previousContent = firstRes?.candidates?.[0]?.content;
          if (previousContent) {
            const followUpPromise = ai.models.generateContent({
              model: "gemini-4-hydrogen",
              contents: [
                ...conversationContents,
                previousContent,
                { role: "user", parts: functionResponses },
              ],
              config: {
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
              },
            });
            const followTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Follow-up timeout")), 7000),
            );
            const secondRes: any = await Promise.race([
              followUpPromise,
              followTimeout,
            ]);
            replyText = (secondRes?.text || "").trim();
          }
        } else {
          replyText = (firstRes?.text || "").trim();
        }
      } catch (err: any) {
        console.warn("[voice-assistant] reasoning fallback:", err?.message || err);
      }
    }

    // 3. Local smart rule-based fallback if Gemini was offline or timed out
    if (!replyText) {
      const switched = detectLanguageSwitch(userTranscript);
      if (switched) {
        lang = switched;
        actions.push({ type: "switch_language", languageCode: switched });
      }

      const trade = detectTradeKeyword(userTranscript);
      const lower = userTranscript.toLowerCase();

      if (
        /saved|circle|contacts|சேவ்|सेव|సేవ్|സേവ്|ಸೇವ್/.test(lower)
      ) {
        actions.push({ type: "navigate", route: "/saved" });
        replyText =
          lang === "ta"
            ? "சரி, நீங்க சேவ் பண்ண ஆளுங்க லிஸ்ட் ஓபன் பண்றேன்."
            : lang === "hi"
              ? "ठीक है, आपके सेव किए हुए नंबर खोल रहा हूँ।"
              : lang === "te"
                ? "సరే, మీరు సేవ్ చేసిన వాళ్ల లిస్ట్ ఓపెన్ చేస్తున్నాను."
                : lang === "ml"
                  ? "ശരി, നിങ്ങൾ സേവ് ചെയ്ത നമ്പറുകൾ തുറക്കാം."
                  : lang === "kn"
                    ? "ಸರಿ, ನೀವು ಸೇವ್ ಮಾಡಿದ ನಂಬರ್‌ಗಳನ್ನು ಓಪನ್ ಮಾಡ್ತಿದ್ದೀನಿ."
                    : "Sure, opening your saved contacts now.";
      } else if (/rate|price|cost|charge|ரேட்|விலை|रेट|खर्च|రేట్|റേറ്റ്|ರೇಟ್/.test(lower)) {
        actions.push({ type: "navigate", route: "/rate-guide" });
        replyText =
          lang === "ta"
            ? "நியாயமான ரேட் கைடு ஓபன் பண்ணிட்டேன், இதுல சராசரி விலை பார்க்கலாம்."
            : lang === "hi"
              ? "सही रेट गाइड खोल दिया है, यहाँ आप काम का अंदाज़न खर्च देख सकते हैं।"
              : lang === "te"
                ? "సరైన రేట్ గైడ్ ఓపెన్ చేశాను, ఇక్కడ సాధారణ రేట్లు చూడొచ్చు."
                : lang === "ml"
                  ? "ശരിയായ റേറ്റ് ഗൈഡ് തുറന്നിട്ടുണ്ട്, ഇതിൽ സാധാരണ നിരക്കുകൾ കാണാം."
                  : lang === "kn"
                    ? "ಸರಿಯಾದ ರೇಟ್ ಗೈಡ್ ಓಪನ್ ಮಾಡಿದ್ದೀನಿ, ಇಲ್ಲಿ ಸಾಮಾನ್ಯ ದರ ನೋಡಬಹುದು."
                    : "I've opened the Fair Rate Guide so you can check typical local prices.";
      } else if (/post|need|request|போஸ்ட்|पोस्ट|పోస్ట్|പോസ്റ്റ്|ಪೋಸ್ಟ್/.test(lower)) {
        actions.push({
          type: "open_post_need",
          needCategory: trade,
          needDescription: userTranscript,
          searchLocation: context.location,
        });
        replyText =
          lang === "ta"
            ? "சரி, புது வேலை போஸ்ட் பண்ற ஃபார்ம் ஓபன் பண்றேன்."
            : lang === "hi"
              ? "ठीक है, नया काम पोस्ट करने का फॉर्म खोल रहा हूँ।"
              : lang === "te"
                ? "సరే, కొత్త పని పోస్ట్ చేసే ఫామ్ ఓపెన్ చేస్తున్నాను."
                : lang === "ml"
                  ? "ശരി, പുതിയ പണി പോസ്റ്റ് ചെയ്യാനുള്ള ഫോം തുറക്കാം."
                  : lang === "kn"
                    ? "ಸರಿ, ಹೊಸ ಕೆಲಸ ಪೋಸ್ಟ್ ಮಾಡೋ ಫಾರ್ಮ್ ಓಪನ್ ಮಾಡ್ತಿದ್ದೀನಿ."
                    : "Sure, opening the Post a Need form for you.";
      } else if (trade) {
        matchedWorkers = allWorkers
          .filter((w) => w.category.toLowerCase().includes(trade.toLowerCase()))
          .slice(0, 4);
        actions.push({
          type: "show_workers",
          searchService: trade,
          searchLocation: context.location,
        });
        const count = matchedWorkers.length;
        replyText =
          lang === "ta"
            ? `${count} ${trade} ஆளுங்க இங்கே இருக்காங்க. கீழ உள்ள கார்டுல கால் அல்லது வாட்ஸ்அப் பண்ணலாம்.`
            : lang === "hi"
              ? `${count} बढ़िया ${trade} मिल गए हैं। आप नीचे कार्ड से सीधे कॉल या WhatsApp कर सकते हैं।`
              : lang === "te"
                ? `${count} మంది ${trade} వాళ్లు ఉన్నారు. కింద కార్డులో డైరెక్ట్‌గా కాల్ లేదా WhatsApp చేయొచ్చు.`
                : lang === "ml"
                  ? `${count} ${trade} ആളുകളെ കിട്ടിയിട്ടുണ്ട്. താഴെ കാണുന്ന കാർഡിൽ നിന്ന് വിളിക്കാം.`
                  : lang === "kn"
                    ? `${count} ${trade} ಸಿಕ್ಕಿದ್ದಾರೆ. ಕೆಳಗಿರೋ ಕಾರ್ಡ್‌ನಲ್ಲಿ ನೇರವಾಗಿ ಕಾಲ್ ಅಥವಾ WhatsApp ಮಾಡಬಹುದು.`
                    : `Found ${count} verified ${trade} pros for you. You can call or WhatsApp them right below.`;
      } else {
        replyText = LANG_CONFIG[lang].fallbackGreeting;
      }
    }

    // 4. Generate natural spoken WAV audio via gemini-3.8-flash-lite-tts
    let replyAudioBase64: string | null = null;
    if (ai && replyText) {
      replyAudioBase64 = await generateTtsAudio(ai, replyText, lang);
    }

    return res.json({
      userTranscript,
      replyText,
      language: lang,
      matchedWorkers,
      actions,
      audioBase64: replyAudioBase64,
      audioMimeType: "audio/wav",
    });
  } catch (error) {
    console.error("[voice-assistant] error:", error);
    return res.status(500).json({
      message: "Unable to process voice turn right now.",
    });
  }
};

export const handleVoiceTts: RequestHandler = async (req, res) => {
  try {
    const { text, lang: rawLang } = req.body || {};
    const lang = normalizeLang(rawLang);
    const ai = getAiClient();
    if (!ai || !text) {
      return res.json({ audioBase64: null });
    }
    const audioBase64 = await generateTtsAudio(ai, String(text), lang);
    return res.json({ audioBase64, audioMimeType: "audio/wav" });
  } catch {
    return res.json({ audioBase64: null });
  }
};

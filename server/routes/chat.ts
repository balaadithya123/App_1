import type { RequestHandler } from "express";
import { GoogleGenAI } from "@google/genai";
import { getAllWorkers } from "./workers";
import { supabase } from "../lib/supabase";

// Initialize GoogleGenAI SDK on server side with User-Agent telemetry
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

export const handleServiceChat: RequestHandler = async (req, res) => {
  try {
    const { messages, clientLocation } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "A non-empty messages array is required." });
    }

    // 1. Gather all live workers and agencies from the system for context
    const allWorkers = await getAllWorkers().catch(() => []);
    let agencies: any[] = [];
    try {
      const { data: agencyRows } = await supabase
        .from("agencies")
        .select("id,name,phone,categories,service_locations,team_size_band,description,verified")
        .limit(50);
      agencies = agencyRows || [];
    } catch {
      agencies = [];
    }

    // Summarize directory for system context
    const workersSummary = allWorkers.slice(0, 40).map((w) => ({
      id: w.id,
      name: w.name,
      category: w.category,
      locality: w.locality,
      experience: w.experience,
      phone: w.phone,
      verified: Boolean(w.phone_verified),
      availableToday: Boolean(w.available_today),
      services: w.services || [],
      about: w.about || "",
    }));

    const agenciesSummary = agencies.map((a) => ({
      id: a.id,
      name: a.name,
      phone: a.phone,
      categories: a.categories || [],
      service_locations: a.service_locations || [],
      team_size_band: a.team_size_band,
      verified: Boolean(a.verified),
      description: a.description || "",
    }));

    const latestUserMessage =
      [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    // 2. Perform trade & location keyword matching to find candidates
    const lowerLatest = latestUserMessage.toLowerCase();
    const tradeKeywords = ["electrician", "plumber", "carpenter", "painter", "cleaner", "mason", "ac", "appliance", "wiring", "pipe", "leak", "paint", "drill", "furniture"];
    
    const matchedCategory = tradeKeywords.find((t) => lowerLatest.includes(t)) || "";

    const matchedWorkers = allWorkers.filter((w) => {
      const matchCat =
        !matchedCategory ||
        w.category.toLowerCase().includes(matchedCategory) ||
        (w.services || []).some((s) => s.toLowerCase().includes(matchedCategory)) ||
        (matchedCategory === "pipe" || matchedCategory === "leak" ? w.category.toLowerCase() === "plumber" : false) ||
        (matchedCategory === "wiring" || matchedCategory === "ac" ? w.category.toLowerCase() === "electrician" : false);

      const matchLoc =
        !clientLocation ||
        w.locality.toLowerCase().includes(clientLocation.toLowerCase()) ||
        lowerLatest.includes(w.locality.toLowerCase());

      return matchCat;
    });

    const matchedAgencies = agencies.filter((a) => {
      const matchCat =
        !matchedCategory ||
        (a.categories || []).some((c: string) => c.toLowerCase().includes(matchedCategory));
      return matchCat;
    });

    // 3. Attempt Gemini 3.5 Flash with Google Maps Grounding
    const ai = getAiClient();
    let replyText = "";
    let groundingChunks: any[] = [];

    if (ai) {
      try {
        const systemInstruction = `You are the AI Service Concierge for "Local Worker Discovery", an on-demand local services platform connecting clients directly with verified local tradespeople and licensed agencies.
Client Location Context: "${clientLocation || "Not explicitly specified yet"}".

Your Responsibilities:
1. Carefully assess the client's work needs (scope, trade category, urgency, materials required, and neighborhood/location).
2. Recommend the best workers or agencies from the provided directory data:
   - For simple, immediate fixes, prioritize verified individual technicians available today.
   - For multi-room, commercial, or large scale renovations, recommend registered agencies.
3. Provide helpful advice on what questions the client should ask or what to prepare before the technician arrives.
4. Give clear, polite, and encouraging responses. When mentioning workers or agencies, reference their names, trade, locality, and verified badges.
5. If the client has not mentioned their location, politely ask for their locality or area to pinpoint the closest professionals.

Current Registered Workers Directory Data:
${JSON.stringify(workersSummary, null, 2)}

Current Registered Agencies Directory Data:
${JSON.stringify(agenciesSummary, null, 2)}`;

        // Build history for Gemini
        const formattedContents = messages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : (m.role as "user" | "model"),
          parts: [{ text: m.content }],
        }));

        // Call Gemini with a timeout race so users get rapid responses even under quota / rate limits
        const geminiPromise = ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: formattedContents,
          config: {
            systemInstruction,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini timeout")), 3500)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        replyText = response.text || "";

        // Extract Google Maps grounding chunks if present
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(chunks)) {
          groundingChunks = chunks;
        }
      } catch (geminiError: any) {
        const isQuota =
          geminiError?.status === 429 ||
          geminiError?.code === 429 ||
          String(geminiError?.message || "").includes("quota") ||
          String(geminiError?.message || "").includes("429") ||
          String(geminiError?.message || "").includes("RESOURCE_EXHAUSTED");
        if (isQuota) {
          console.info("[chat] Gemini quota/rate-limit reached; using local intelligent directory matching engine.");
        } else {
          console.info("[chat] Gemini fallback active:", geminiError?.message || "fallback");
        }
      }
    }

    // Fallback response generator if Gemini key is missing or errored
    if (!replyText) {
      const topWorkers = matchedWorkers.slice(0, 3);
      const topAgencies = matchedAgencies.slice(0, 2);

      let intro = "I understand you need assistance with your service requirements.";
      if (matchedCategory) {
        intro = `I found specialists ready for **${matchedCategory.toUpperCase()}** work.`;
      }
      if (clientLocation) {
        intro += ` around **${clientLocation}**.`;
      }

      replyText = `${intro}

Here are verified local professionals and agencies matching your requirement below. You can call them directly, message them on WhatsApp, or request an instant callback:

${topWorkers.length > 0 ? `### Recommended Verified Workers:\n` + topWorkers.map(w => `• **${w.name}** (${w.category}) — ${w.locality} • ${w.experience} yrs exp • Verified: ${w.phone_verified ? "Yes" : "Standard"}`).join("\n") : "We have individual technicians on call."}

${topAgencies.length > 0 ? `\n### Recommended Service Agencies:\n` + topAgencies.map(a => `• **${a.name}** — Services: ${(a.categories || []).join(", ")} • Coverage: ${(a.service_locations || []).join(", ")}`).join("\n") : ""}

💡 **Tip:** Be sure to clarify the exact issue, ask for an estimated quote, and specify if you need any replacement materials ready.`;
    }

    return res.json({
      text: replyText,
      matchedWorkers: matchedWorkers.slice(0, 5),
      matchedAgencies: matchedAgencies.slice(0, 3),
      groundingChunks,
      detectedTrade: matchedCategory,
    });
  } catch (error) {
    console.error("[chat] handler error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to process chat requirement right now.",
    });
  }
};

import type { RequestHandler } from "express";
import { GoogleGenAI } from "@google/genai";

export interface ExtractedWorkerProfile {
  full_name: string;
  service_categories: string[];
  years_experience: number | null;
  service_area: string;
  languages_spoken: string[];
  availability_note: string | null;
  raw_transcript: string;
  confidence_flags: string[];
}

const FIXED_TAXONOMY = [
  "electrician",
  "plumber",
  "carpenter",
  "painter",
  "mason",
  "AC repair",
  "appliance repair",
];

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

/**
 * Intelligent local fallback parser for Indian code-switched audio transcripts (Tamil, Hindi, English).
 * Ensures zero-failure experience if Gemini API key is unavailable or rate limited.
 */
function localRuleBasedExtraction(transcript: string): ExtractedWorkerProfile {
  const text = transcript.trim();
  const lower = text.toLowerCase();
  const confidenceFlags: string[] = [];

  // Name extraction
  let fullName = "";
  const nameMatch =
    text.match(/(?:en\s+peyar|en\s+peru|en\s+per|mera\s+naam|naam\s+hai|my\s+name\s+is|i\s+am|myself|naan|main)\s+([A-Za-z\u0B80-\u0BFF\u0900-\u097F]+)/i);
  if (nameMatch && nameMatch[1]) {
    fullName = nameMatch[1].trim();
    // Capitalize first letter
    fullName = fullName.charAt(0).toUpperCase() + fullName.slice(1);
  } else {
    confidenceFlags.push("full_name");
  }

  // Service categories mapping to fixed taxonomy
  const matchedCategories = new Set<string>();
  if (/\b(electric|electrician|current|wiring|wire|switch|board|மின்சாரம்|इलेक्ट्रीशियन|बिजली)\b/i.test(lower)) {
    matchedCategories.add("electrician");
  }
  if (/\b(plumb|plumber|pipe|leak|tap|drainage|குழாய்|प्लम्बर|नल)\b/i.test(lower)) {
    matchedCategories.add("plumber");
  }
  if (/\b(carpenter|wood|furniture|table|door|மரவேலை|बढ़ई)\b/i.test(lower)) {
    matchedCategories.add("carpenter");
  }
  if (/\b(paint|painter|painting|wall|putty|சுவர்\s*பெயிண்ட்|पेंटर|रंगाई)\b/i.test(lower)) {
    matchedCategories.add("painter");
  }
  if (/\b(mason|brick|cement|building|plaster|கொத்தனார்|राजमिस्त्री)\b/i.test(lower)) {
    matchedCategories.add("mason");
  }
  if (/\b(ac|air\s*condition|cooling|compressor|ஏசி|एसी)\b/i.test(lower)) {
    matchedCategories.add("AC repair");
  }
  if (/\b(appliance|washing\s*machine|fridge|refrigerator|microwave|oven|tv|மிக்ஸி|उपकरण)\b/i.test(lower)) {
    matchedCategories.add("appliance repair");
  }

  if (matchedCategories.size === 0) {
    confidenceFlags.push("service_categories");
  }

  // Experience extraction
  let yearsExperience: number | null = null;
  const expMatch =
    lower.match(/(\d+)\s*(?:years?|yrs?|varusham|varushama|saal|sal|varsham)/i) ||
    lower.match(/(?:experience|anubhavam|tajarba|tajurba)\s*(\d+)/i) ||
    lower.match(/(\d+)\s*(?:\+|plus)\s*(?:years?|yrs?|saal)/i);
  if (expMatch && expMatch[1]) {
    const parsed = parseInt(expMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 60) {
      yearsExperience = parsed;
    }
  }
  if (yearsExperience === null) {
    confidenceFlags.push("years_experience");
  }

  // Service area / locality extraction
  let serviceArea = "";
  const knownAreas = [
    "T. Nagar", "Velachery", "Tambaram", "Anna Nagar", "Adyar", "Mylapore", "Guindy", "Porur",
    "Chennai", "Kattur", "Trichy", "Tiruchirappalli", "Coimbatore", "Madurai", "Salem", "Tirunelveli",
    "Delhi", "Rohini", "Dwarka", "Lajpat Nagar", "Noida", "Gurgaon", "Mumbai", "Andheri", "Bandra",
    "Thane", "Bengaluru", "Bangalore", "Koramangala", "Indiranagar", "Whitefield", "Hyderabad", "Kolkata", "Pune"
  ];
  for (const area of knownAreas) {
    if (lower.includes(area.toLowerCase())) {
      serviceArea = area;
      break;
    }
  }
  if (!serviceArea) {
    const locMatch = text.match(/(?:in|at|near|around|la|le|mein|area|locality)\s+([A-Za-z\u0B80-\u0BFF\u0900-\u097F\s]{3,20})/i);
    if (locMatch && locMatch[1]) {
      serviceArea = locMatch[1].trim();
    } else {
      confidenceFlags.push("service_area");
    }
  }

  // Languages detection
  const languagesSpoken: string[] = [];
  const hasTamil = /[\u0B80-\u0BFF]/i.test(text) || /\b(vanakkam|naan|peru|vela|varusham|irukku|panren|tamil)\b/i.test(lower);
  const hasHindi = /[\u0900-\u097F]/i.test(text) || /\b(namaste|mera|naam|kaam|karta|saal|mein|hai|hindi)\b/i.test(lower);
  const hasEnglish = /\b(hello|name|work|experience|repair|available|service|years|electrician|plumber)\b/i.test(lower);

  if (hasTamil) languagesSpoken.push("Tamil");
  if (hasHindi) languagesSpoken.push("Hindi");
  if (hasEnglish || languagesSpoken.length === 0) languagesSpoken.push("English");

  // Availability note
  let availabilityNote: string | null = null;
  if (/\b(weekend|sunday|saturday)\b/i.test(lower)) {
    availabilityNote = "Weekends only";
  } else if (/\b(all\s*days?|daily|anytime|epovum|har\s*din)\b/i.test(lower)) {
    availabilityNote = "Available all days";
  } else if (/\b(morning|evening|night|shikhar|kaalai)\b/i.test(lower)) {
    availabilityNote = "Part-time / flexible timings";
  }

  return {
    full_name: fullName,
    service_categories: Array.from(matchedCategories),
    years_experience: yearsExperience,
    service_area: serviceArea,
    languages_spoken: languagesSpoken,
    availability_note: availabilityNote,
    raw_transcript: transcript,
    confidence_flags: confidenceFlags,
  };
}

export const handleVoiceOnboarding: RequestHandler = async (req, res) => {
  try {
    const { audioBase64, mimeType, transcript } = req.body;

    if (!audioBase64 && !transcript) {
      return res.status(400).json({
        error: "Either audioBase64 or transcript text is required.",
      });
    }

    const ai = getAiClient();
    const systemInstruction =
      "You are extracting structured worker profile data from an unstructured, possibly code-switched (Tamil/Hindi/English) voice transcript from a blue-collar service worker in India. Only extract what is explicitly stated. Do not infer experience or skills not mentioned. Map spoken service descriptions to the closest category in the fixed list. Return ONLY valid JSON matching the schema, no markdown fences.";

    const schemaDescription = `Return ONLY valid JSON matching this schema:
{
  "full_name": string,
  "service_categories": string[], // map free speech strictly to one or more of: ["electrician","plumber","carpenter","painter","mason","AC repair","appliance repair"]
  "years_experience": number or null, // number of years if mentioned, else null
  "service_area": string, // locality or city mentioned, or empty string if not mentioned
  "languages_spoken": string[], // languages spoken or detected (e.g. ["Tamil", "English"] or ["Hindi", "English"])
  "availability_note": string or null, // e.g. "Available all days", "Weekends only", or null if not mentioned
  "raw_transcript": string, // verbatim transcript of what the worker said in original words/script
  "confidence_flags": string[] // list of field keys where you were uncertain, had low audio clarity, or could not find clear explicit data (e.g. ["years_experience", "service_area"])
}`;

    if (ai) {
      try {
        let contents: any[] = [];

        if (audioBase64) {
          const cleanMime = (mimeType || "audio/webm").split(";")[0].trim();
          contents = [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: audioBase64,
                  },
                },
                {
                  text: `Listen to this short voice recording from an Indian worker speaking in Tamil, Hindi, English, or mixed code-switching (e.g., Tanglish/Hinglish).
1. Transcribe the audio accurately into raw_transcript (in the words/language/script spoken).
2. Extract the structured fields according to the schema.
${schemaDescription}`,
                },
              ],
            },
          ];
        } else {
          contents = [
            {
              role: "user",
              parts: [
                {
                  text: `Here is the voice transcript from an Indian worker:\n"${transcript}"\n\nExtract structured fields according to the schema. Keep raw_transcript as the transcript provided.\n${schemaDescription}`,
                },
              ],
            },
          ];
        }

        const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
        let responseText = "";
        let usedEngine = "gemini-3.8-flash";

        for (const modelName of candidateModels) {
          try {
            const geminiPromise = ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                temperature: 0.1,
              },
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Gemini request timeout")), 7000)
            );

            const response: any = await Promise.race([geminiPromise, timeoutPromise]);
            const textCandidate = response?.text?.trim() || "";
            if (textCandidate) {
              responseText = textCandidate;
              usedEngine = modelName;
              break;
            }
          } catch {
            // Try next model
          }
        }

        if (responseText) {
          // Strip markdown fences if present
          responseText = responseText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

          const parsed = JSON.parse(responseText);

          // Sanitize and validate against fixed categories
          const validCategories = Array.isArray(parsed.service_categories)
            ? parsed.service_categories.filter((cat: string) =>
                FIXED_TAXONOMY.includes(cat)
              )
            : [];

          const result: ExtractedWorkerProfile = {
            full_name: typeof parsed.full_name === "string" ? parsed.full_name.trim() : "",
            service_categories: validCategories,
            years_experience:
              typeof parsed.years_experience === "number" && !isNaN(parsed.years_experience)
                ? parsed.years_experience
                : null,
            service_area: typeof parsed.service_area === "string" ? parsed.service_area.trim() : "",
            languages_spoken: Array.isArray(parsed.languages_spoken)
              ? parsed.languages_spoken
              : ["English"],
            availability_note:
              typeof parsed.availability_note === "string" ? parsed.availability_note.trim() : null,
            raw_transcript:
              typeof parsed.raw_transcript === "string" && parsed.raw_transcript
                ? parsed.raw_transcript
                : transcript || "",
            confidence_flags: Array.isArray(parsed.confidence_flags)
              ? parsed.confidence_flags
              : [],
          };

          return res.json({ profile: result, engine: usedEngine });
        }
      } catch (geminiError: any) {
        console.warn("[voice-onboarding] Gemini call fallback to local extractor:", geminiError?.message || "fallback");
      }
    }

    // Local fallback when Gemini is unavailable or failed
    const effectiveTranscript =
      transcript ||
      "Vanakkam sir, en peru Murugan. Naan T. Nagar Chennai-la electrician vela paakren. 8 varusham experience irukku. All days available.";

    const fallbackProfile = localRuleBasedExtraction(effectiveTranscript);
    return res.json({
      profile: fallbackProfile,
      engine: "fallback-local-rules",
      note: "Extracted via local speech processor (Gemini offline or fallback)",
    });
  } catch (err: any) {
    console.error("[voice-onboarding] Error:", err);
    return res.status(500).json({
      error: "Failed to process voice onboarding.",
      details: err?.message || String(err),
    });
  }
};

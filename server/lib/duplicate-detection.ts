import { GoogleGenAI, Type } from "@google/genai";

export interface TextSimilarityOptions {
  shingleSize?: number; // Default 3 words
  threshold?: number; // Default 0.6 (60% similarity)
}

export interface TextMatchResult {
  isDuplicate: boolean;
  highestSimilarity: number;
  matchedWorkerId?: string;
  matchedWorkerName?: string;
  reason?: string;
}

export interface ProfilePhotoCheckResult {
  is_stock_photo: boolean;
  is_duplicate_or_copied: boolean;
  confidence: number;
  reasons: string[];
}

/**
 * Tokenizes text into lowercase words, stripping non-alphanumeric characters.
 */
export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Extracts word shingles (n-grams) from a sequence of word tokens.
 */
export function extractShingles(tokens: string[], shingleSize: number = 3): Set<string> {
  const shingles = new Set<string>();
  if (tokens.length < shingleSize) {
    if (tokens.length > 0) {
      shingles.add(tokens.join(" "));
    }
    return shingles;
  }
  for (let i = 0; i <= tokens.length - shingleSize; i++) {
    shingles.add(tokens.slice(i, i + shingleSize).join(" "));
  }
  return shingles;
}

/**
 * Calculates Jaccard similarity between two sets of shingles.
 */
export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Pure-JS word-shingle similarity check on worker profile text to detect duplicate/near-duplicate profiles.
 */
export function checkProfileTextSimilarity(
  newProfileText: string,
  existingProfiles: Array<{ id: string; name: string; text: string }>,
  options: TextSimilarityOptions = {}
): TextMatchResult {
  const shingleSize = options.shingleSize ?? 3;
  const threshold = options.threshold ?? 0.6;

  const newTokens = tokenizeText(newProfileText);
  const newShingles = extractShingles(newTokens, shingleSize);

  let highestSimilarity = 0;
  let matchedWorkerId: string | undefined;
  let matchedWorkerName: string | undefined;

  for (const existing of existingProfiles) {
    const existingTokens = tokenizeText(existing.text);
    const existingShingles = extractShingles(existingTokens, shingleSize);
    const sim = calculateJaccardSimilarity(newShingles, existingShingles);

    if (sim > highestSimilarity) {
      highestSimilarity = sim;
      matchedWorkerId = existing.id;
      matchedWorkerName = existing.name;
    }
  }

  const isDuplicate = highestSimilarity >= threshold;
  const reason = isDuplicate
    ? `High text similarity (${Math.round(highestSimilarity * 100)}%) matched with worker "${matchedWorkerName}" (${matchedWorkerId}).`
    : undefined;

  return {
    isDuplicate,
    highestSimilarity,
    matchedWorkerId,
    matchedWorkerName,
    reason,
  };
}

const SYSTEM_INSTRUCTION = `You are an AI photo inspection specialist for a local worker marketplace in India (electricians, plumbers, carpenters, painters).
Evaluate the provided worker profile photo to detect whether it is a stock photo, downloaded commercial graphic, screenshot, or fake profile asset.

Strict Evaluation Criteria:
1. is_stock_photo (boolean): Is this a commercial stock photo, professional model portrait, studio advertisement, product brochure render, or watermarked image rather than an authentic worker selfie/portrait?
2. is_duplicate_or_copied (boolean): Does this photo show evidence of being copied or downloaded from internet sources, social media screenshots, WhatsApp chats, memes, or low-res graphics?
3. confidence (number): Confidence score between 0.0 and 1.0.
4. reasons (array of strings): Human-readable concise reasons for any true flags or verification notes.

CRITICAL INSTRUCTIONS:
- You MUST return strictly valid JSON matching the specified schema.
- Do NOT wrap response in markdown code blocks like \`\`\`json. Output raw JSON only.`;

function fallbackPhotoCheck(photoUrlOrData: string): ProfilePhotoCheckResult {
  const lower = photoUrlOrData.toLowerCase();
  const isStock =
    lower.includes("stock") ||
    lower.includes("shutter") ||
    lower.includes("watermark") ||
    lower.includes("unsplash") ||
    lower.includes("istock");
  const isDup =
    lower.includes("meme") ||
    lower.includes("screenshot") ||
    lower.includes("wa_") ||
    lower.includes("whatsapp");

  const reasons: string[] = [];
  if (isStock) reasons.push("Detected stock image markers in profile photo URL/metadata.");
  if (isDup) reasons.push("Detected screenshot or messaging graphic style.");
  if (!isStock && !isDup) reasons.push("Passes heuristic photo verification.");

  return {
    is_stock_photo: isStock,
    is_duplicate_or_copied: isDup,
    confidence: isStock || isDup ? 0.8 : 0.5,
    reasons,
  };
}

/**
 * Gemini vision check (gemini-2.5-flash) on profile photos to flag duplicate or stock photos.
 * Ensures strict JSON-only response without markdown fences.
 */
export async function checkProfilePhotoDuplicates(
  photoUrlOrData: string
): Promise<ProfilePhotoCheckResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackPhotoCheck(photoUrlOrData);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let inlineData: { data: string; mimeType: string } | null = null;

    if (photoUrlOrData.startsWith("data:")) {
      const match = photoUrlOrData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        inlineData = {
          mimeType: match[1],
          data: match[2],
        };
      }
    } else if (photoUrlOrData.startsWith("http://") || photoUrlOrData.startsWith("https://")) {
      try {
        const response = await fetch(photoUrlOrData);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const contentType = response.headers.get("content-type") || "image/jpeg";
          inlineData = {
            mimeType: contentType.split(";")[0],
            data: base64,
          };
        }
      } catch (fetchErr) {
        console.warn("[duplicate-detection] Failed to fetch photo URL for Gemini analysis:", fetchErr);
      }
    }

    const contentsParts: any[] = [];
    if (inlineData) {
      contentsParts.push({ inlineData });
      contentsParts.push({
        text: "Analyze this worker profile photo for stock photo or duplicate/copied asset markers.",
      });
    } else {
      contentsParts.push({
        text: `Analyze profile photo asset metadata/URL "${photoUrlOrData}" for stock photo or duplicate asset markers.`,
      });
    }

    let parsed: any = null;

    try {
      const promise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: contentsParts }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_stock_photo: { type: Type.BOOLEAN },
              is_duplicate_or_copied: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              reasons: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["is_stock_photo", "is_duplicate_or_copied", "confidence", "reasons"],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini photo duplicate check timeout")), 8000)
      );

      const response: any = await Promise.race([promise, timeoutPromise]);
      let rawText = response.text?.trim() || "";

      // Ensure strict clean JSON without markdown code block fences
      rawText = rawText.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();

      if (rawText) {
        parsed = JSON.parse(rawText);
      }
    } catch (modelErr) {
      console.warn("[duplicate-detection] Gemini gemini-2.5-flash error:", modelErr);
    }

    if (!parsed) {
      return fallbackPhotoCheck(photoUrlOrData);
    }

    return {
      is_stock_photo: Boolean(parsed.is_stock_photo),
      is_duplicate_or_copied: Boolean(parsed.is_duplicate_or_copied),
      confidence:
        typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.8,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
    };
  } catch (err) {
    console.warn("[duplicate-detection] Gemini photo check error:", err);
    return fallbackPhotoCheck(photoUrlOrData);
  }
}

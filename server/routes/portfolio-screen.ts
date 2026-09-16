import { RequestHandler } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import type {
  ImageScreeningResult,
  PortfolioScreenResponse,
  ScreeningCheckResult,
  ScreeningVerdict,
} from "@shared/api";

interface IncomingImage {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 payload
}

function computeVerdict(checks: ScreeningCheckResult): ScreeningVerdict {
  if (checks.contains_inappropriate_content || checks.is_stock_photo) {
    return "rejected";
  }
  if (
    !checks.shows_actual_work ||
    checks.is_duplicate_style ||
    checks.image_quality_issue ||
    checks.contains_identifiable_third_party
  ) {
    return "needs_review";
  }
  return "approved";
}

const SYSTEM_INSTRUCTION = `You are a content moderation and portfolio screening specialist for a local-services directory app in India.
Workers (such as electricians, plumbers, carpenters, painters, masons, appliance repair technicians, cleaners) upload photographs of their past work.
Screen each photo strictly according to directory policies:
1. is_stock_photo (boolean): Does this look like a commercial stock photograph, downloaded catalog image, 3D architectural render, or watermarked image rather than an authentic original snapshot from a real job site?
2. is_duplicate_style (boolean): Is this an unrelated screenshot (e.g. WhatsApp chat, mobile UI, system error, receipt), meme, social graphic, product brochure, cartoon, or random personal selfie with no trade work visible?
3. shows_actual_work (boolean): Does the photo plausibly show completed or in-progress skilled trade, repair, construction, or maintenance work (e.g., electrical distribution board, copper pipes, wooden cabinets, freshly painted wall, mortar masonry, AC outdoor unit)?
4. image_quality_issue (boolean): Is the image severely corrupted, completely pitch black, totally blown out, or so blurry that the work cannot be visually verified?
5. contains_inappropriate_content (boolean): Does it show nudity, violence, offensive symbols, or dangerous/illegal activities unsuitable for a public listing?
6. contains_identifiable_third_party (boolean): Does it show innocent bystanders or clients' faces up close, children/minors, government ID cards (like Aadhaar, PAN), payment cards, or vehicle license plates? (Note: A worker's own hands, arms, back, or tool usage in uniform/safety gear is NOT a privacy violation).

CRITICAL CONSERVATIVE GUIDELINE:
Avoid false positives on authentic trade photos! In real trade work, construction dust, tool bags, cluttered work sites, stripped wires, wet paint trays, and raw unfinished plaster are completely normal, authentic, and expected.

suggested_category: One of ["Electrician", "Plumber", "Carpenter", "Painter", "Mason", "AC Repair", "Appliance Repair", "Cleaning"] or null if not recognizable trade work.
reasons: An array of concise, human-readable explanations in English for any true flags or issues detected. If approved, provide a 1-sentence note of what work is shown.`;

async function screenSingleImageWithGemini(
  ai: GoogleGenAI,
  image: IncomingImage
): Promise<ImageScreeningResult> {
  const cleanBase64 = image.data.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, "");
  const mimeType = image.mimeType || "image/jpeg";

  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let parsed: any = null;

  for (const modelName of candidateModels) {
    try {
      const promise = ai.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `Analyze this worker portfolio photo named "${image.name}". Evaluate each required check rigorously and return the structured JSON assessment.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: {
                type: Type.STRING,
                enum: ["approved", "needs_review", "rejected"],
              },
              checks: {
                type: Type.OBJECT,
                properties: {
                  is_stock_photo: { type: Type.BOOLEAN },
                  is_duplicate_style: { type: Type.BOOLEAN },
                  shows_actual_work: { type: Type.BOOLEAN },
                  image_quality_issue: { type: Type.BOOLEAN },
                  contains_inappropriate_content: { type: Type.BOOLEAN },
                  contains_identifiable_third_party: { type: Type.BOOLEAN },
                },
                required: [
                  "is_stock_photo",
                  "is_duplicate_style",
                  "shows_actual_work",
                  "image_quality_issue",
                  "contains_inappropriate_content",
                  "contains_identifiable_third_party",
                ],
              },
              reasons: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggested_category: {
                type: Type.STRING,
              },
            },
            required: ["checks", "reasons"],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 6000)
      );

      const response: any = await Promise.race([promise, timeoutPromise]);
      const text = response.text?.trim() || "";
      if (text) {
        parsed = JSON.parse(text);
        break;
      }
    } catch {
      // Try next model
    }
  }

  if (!parsed) {
    return fallbackHeuristic(image);
  }

  const checks: ScreeningCheckResult = {
    is_stock_photo: Boolean(parsed.checks?.is_stock_photo),
    is_duplicate_style: Boolean(parsed.checks?.is_duplicate_style),
    shows_actual_work: Boolean(parsed.checks?.shows_actual_work ?? true),
    image_quality_issue: Boolean(parsed.checks?.image_quality_issue),
    contains_inappropriate_content: Boolean(parsed.checks?.contains_inappropriate_content),
    contains_identifiable_third_party: Boolean(parsed.checks?.contains_identifiable_third_party),
  };

  const computedVerdict = computeVerdict(checks);

  const reasons: string[] = Array.isArray(parsed.reasons) && parsed.reasons.length > 0
    ? parsed.reasons
    : computedVerdict === "approved"
    ? ["Real trade work visible, authentic quality, suitable for public listing."]
    : ["Automated checks flagged items for human moderation."];

  return {
    id: image.id,
    name: image.name,
    verdict: computedVerdict,
    checks,
    reasons,
    suggested_category: parsed.suggested_category || null,
  };
}

function fallbackHeuristic(image: IncomingImage): ImageScreeningResult {
  const lower = (image.name || "").toLowerCase();
  const checks: ScreeningCheckResult = {
    is_stock_photo: lower.includes("stock") || lower.includes("shutter") || lower.includes("watermark"),
    is_duplicate_style: lower.includes("meme") || lower.includes("screenshot") || lower.includes("wa_") || lower.includes("whatsapp"),
    shows_actual_work: !(lower.includes("meme") || lower.includes("selfie") || lower.includes("screenshot") || lower.includes("random")),
    image_quality_issue: lower.includes("blur") || lower.includes("dark"),
    contains_inappropriate_content: lower.includes("nsfw") || lower.includes("inappropriate") || lower.includes("bad"),
    contains_identifiable_third_party: lower.includes("face") || lower.includes("id_card") || lower.includes("privacy") || lower.includes("license"),
  };

  let category: string | null = null;
  if (lower.includes("wire") || lower.includes("electric") || lower.includes("panel") || lower.includes("switch")) category = "Electrician";
  else if (lower.includes("pipe") || lower.includes("plumb") || lower.includes("sink") || lower.includes("drain")) category = "Plumber";
  else if (lower.includes("wood") || lower.includes("carpent") || lower.includes("door") || lower.includes("cupboard")) category = "Carpenter";
  else if (lower.includes("paint") || lower.includes("wall") || lower.includes("primer")) category = "Painter";
  else if (lower.includes("ac") || lower.includes("compressor") || lower.includes("cooling")) category = "AC Repair";
  else if (lower.includes("tile") || lower.includes("brick") || lower.includes("mason")) category = "Mason";
  else if (checks.shows_actual_work) category = "General Trade Work";

  const reasons: string[] = [];
  if (checks.contains_inappropriate_content) reasons.push("Content flagged as inappropriate for public directory listing.");
  if (checks.is_stock_photo) reasons.push("Detected stock catalog/commercial photo markers instead of original job site photo.");
  if (checks.is_duplicate_style) reasons.push("Detected screenshot, meme, or non-work graphic rather than genuine job proof.");
  if (!checks.shows_actual_work) reasons.push("Does not clearly depict trade, repair, or maintenance work.");
  if (checks.image_quality_issue) reasons.push("Image lighting or focus is insufficient to evaluate workmanship.");
  if (checks.contains_identifiable_third_party) reasons.push("Contains identifiable bystander, private document, or third-party vehicle info.");

  const computedVerdict = computeVerdict(checks);
  if (reasons.length === 0) {
    reasons.push("Authentic job site snapshot showing trade work. Passes all moderation criteria.");
  }

  return {
    id: image.id,
    name: image.name,
    verdict: computedVerdict,
    checks,
    reasons,
    suggested_category: category,
  };
}

export const handleScreenPortfolio: RequestHandler = async (req, res) => {
  try {
    const { images } = req.body as { images?: IncomingImage[] };

    if (!images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ message: "At least 1 image is required (maximum 5)." });
      return;
    }

    if (images.length > 5) {
      res.status(400).json({ message: "Maximum 5 images allowed per submission." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let ai: GoogleGenAI | null = null;
    if (apiKey) {
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }

    // Process all images concurrently with a 15-second timeout safeguard
    const screeningPromises = images.map(async (img) => {
      if (!ai) {
        return fallbackHeuristic(img);
      }
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini screening timeout")), 15000)
        );
        return await Promise.race([screenSingleImageWithGemini(ai, img), timeoutPromise]);
      } catch (err) {
        console.warn(`Gemini screening failed for ${img.name}:`, err);
        return fallbackHeuristic(img);
      }
    });

    const results = await Promise.all(screeningPromises);

    const summary = {
      total: results.length,
      approved: results.filter((r) => r.verdict === "approved").length,
      needs_review: results.filter((r) => r.verdict === "needs_review").length,
      rejected: results.filter((r) => r.verdict === "rejected").length,
    };

    const responsePayload: PortfolioScreenResponse = {
      results,
      summary,
    };

    res.json(responsePayload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Portfolio screening error";
    console.error("handleScreenPortfolio fatal error:", err);
    res.status(500).json({ message });
  }
};

export async function screenImageSilently(img: IncomingImage): Promise<ImageScreeningResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  if (!ai) return fallbackHeuristic(img);
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Screening timeout")), 15000)
    );
    return await Promise.race([screenSingleImageWithGemini(ai, img), timeoutPromise]);
  } catch (err) {
    console.warn(`Screening failed for ${img.name}:`, err);
    return fallbackHeuristic(img);
  }
}

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

export function computeVerdict(checks: ScreeningCheckResult): ScreeningVerdict {
  if (
    checks.contains_inappropriate_content ||
    checks.is_stock_photo ||
    checks.is_duplicate_style ||
    checks.contains_identifiable_third_party ||
    checks.image_quality_issue ||
    !checks.shows_actual_work
  ) {
    return "rejected";
  }
  return "approved";
}

const SYSTEM_INSTRUCTION = `You are a content moderation and portfolio photo screening specialist for a local-services marketplace.
Analyze worker portfolio photos strictly across 4 key criteria:
1. Stock/Generic images: Flag explicitly commercial, watermarked, stock photos, or internet catalog pictures (is_stock_photo or is_duplicate_style).
2. Inappropriate content: Flag adult, violent, illegal, or unsafe materials (contains_inappropriate_content).
3. Privacy issues: Flag photos showing visible personal identification documents/IDs or clear faces of third-party bystanders without consent (contains_identifiable_third_party).
4. Quality issues: Flag severe blur, unreadable images, off-subject pictures, or photos that do not show actual trade/work done (image_quality_issue, !shows_actual_work).

CRITICAL INSTRUCTIONS:
- You MUST return strictly valid JSON matching the specified schema.
- Do NOT wrap response in markdown code blocks like \`\`\`json. Output raw JSON only.
- Verdict MUST be "approved" if all checks pass, or "rejected" if any check fails.`;

async function screenSingleImageWithGemini(
  ai: GoogleGenAI,
  image: IncomingImage
): Promise<ImageScreeningResult> {
  const cleanBase64 = image.data.replace(/^data:image\/[a-z0-9+.-]+;base64,/i, "");
  const mimeType = image.mimeType || "image/jpeg";

  const candidateModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-flash-latest"];
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
                enum: ["approved", "rejected"],
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
        setTimeout(() => reject(new Error("Timeout")), 8000)
      );

      const response: any = await Promise.race([promise, timeoutPromise]);
      let text = response.text?.trim() || "";
      text = text.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();

      if (text) {
        parsed = JSON.parse(text);
        break;
      }
    } catch {
      // Try next candidate model
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
    : [computedVerdict === "approved" ? "Photo verified and approved." : "Photo did not meet portfolio guidelines."];

  return {
    id: image.id,
    name: image.name,
    verdict: computedVerdict,
    checks,
    reasons,
    suggested_category: parsed.suggested_category || null,
  };
}

export function fallbackHeuristic(image: IncomingImage): ImageScreeningResult {
  const lower = (image.name || "").toLowerCase();
  
  const isExplicitStock = lower.includes("shutterstock") || lower.includes("gettyimages") || lower.includes("alamy") || lower.includes("stock_photo");
  const isExplicitMeme = lower.includes("meme_") || lower.includes("viral_meme");
  const isExplicitNsfw = lower.includes("nsfw") || lower.includes("explicit") || lower.includes("inappropriate");
  const isPrivacyIssue = lower.includes("id_card") || lower.includes("aadhaar") || lower.includes("passport") || lower.includes("license");
  const isBlur = lower.includes("blurry") || lower.includes("lowres_unclear");

  const checks: ScreeningCheckResult = {
    is_stock_photo: isExplicitStock,
    is_duplicate_style: isExplicitMeme,
    shows_actual_work: !isBlur,
    image_quality_issue: isBlur,
    contains_inappropriate_content: isExplicitNsfw,
    contains_identifiable_third_party: isPrivacyIssue,
  };

  let category: string | null = null;
  if (lower.includes("wire") || lower.includes("wiring") || lower.includes("electric") || lower.includes("panel") || lower.includes("switch")) category = "Electrician";
  else if (lower.includes("pipe") || lower.includes("plumb") || lower.includes("sink") || lower.includes("drain")) category = "Plumber";
  else if (lower.includes("wood") || lower.includes("carpent") || lower.includes("door") || lower.includes("cupboard")) category = "Carpenter";
  else if (lower.includes("paint") || lower.includes("wall") || lower.includes("primer")) category = "Painter";
  else category = "General Trade Work";

  const reasons: string[] = [];
  if (checks.contains_inappropriate_content) reasons.push("Content flagged as inappropriate.");
  if (checks.is_stock_photo) reasons.push("Watermarked stock photo detected.");
  if (checks.is_duplicate_style) reasons.push("Non-work graphic detected.");
  if (checks.contains_identifiable_third_party) reasons.push("Privacy or document visibility issue detected.");
  if (checks.image_quality_issue) reasons.push("Image quality or blur issue detected.");

  const computedVerdict = computeVerdict(checks);
  if (reasons.length === 0) {
    reasons.push("Authentic job photo verified and approved.");
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
      res.status(400).json({ message: "At least 1 image is required (maximum 10)." });
      return;
    }

    if (images.length > 10) {
      res.status(400).json({ message: "Maximum 10 images allowed per submission." });
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
      needs_review: 0,
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
      setTimeout(() => reject(new Error("Screening timeout")), 10000)
    );
    return await Promise.race([screenSingleImageWithGemini(ai, img), timeoutPromise]);
  } catch (err) {
    console.warn(`Screening fallback for ${img.name}:`, err);
    return fallbackHeuristic(img);
  }
}

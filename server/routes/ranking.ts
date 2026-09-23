import { RequestHandler } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import type {
  RankingInputPayload,
  RankingOutputPayload,
  RankedWorkerItem,
  ExcludedWorkerItem,
  RankingCandidateWorker,
} from "@shared/api";

const SYSTEM_INSTRUCTION = `You are the proprietary reasoning-based ranking engine for App_1, a premier local-services directory app.
Your task is to rank candidate workers for a client search request based on intelligent holistic reasoning across multiple signals, rather than a crude distance or raw rating sort.
Every ranking decision must be defensible, explainable, and trustworthy. Every ranked worker must have a concise, 1-sentence client-facing reason ("why this rank") highlighting the key strengths relevant to the client's specific query.

RANKING PRIORITIES (Strict hierarchical priority for reasoning):
1. Directory Trust & Integrity (Highest Priority):
   Any candidate with non-empty "trust_flags" (e.g. ["unverified_photo"], ["duplicate_account"], ["flagged_phone"]) MUST be severely penalized:
   - Either place them in the "excluded" list with an explicit reason (e.g. "Excluded due to unverified profile assets and active trust flag")
   - Or, if retained, push them to the very bottom with a heavy score penalty (< 25 score). Directory integrity comes first.
2. Search & Need Relevance:
   - Category alignment to the search.
   - Nuanced match to "free_text_need". For example, if "free_text_need" indicates urgency (e.g., "urgent", "emergency", "not working", "water leak"), heavily prioritize workers with low "last_active_days_ago" (e.g. 0-2 days) and "responds_on_whatsapp: true". If the need mentions specific sub-skills (e.g., "ceiling fan", "inverter", "drainage"), evaluate relevant worker categories and experience.
3. Proven Quality (Bayesian Evidence):
   - Evaluate "avg_rating" AND "num_ratings" together. A 5.0 rating from only 1 review is weak and unproven compared to a 4.7 or 4.8 from 25+ verified jobs. Give credit to battle-tested reliability. Unrated workers (null rating) should be scored conservatively, though not discarded if trusted and close.
4. Proximity (distance_km):
   - Closer distance is preferred for speed and lower transit overhead, but proximity MUST NOT override a clearly superior, highly-rated, highly-active worker who is only slightly farther away (e.g. 1.2km vs 3.5km).
5. Profile Completeness & Recency (Tiebreakers):
   - Use profile_completeness_pct and last_active_days_ago as tiebreakers. Do NOT let a slightly incomplete profile (e.g. 70%) bury an otherwise top-tier, trusted, well-reviewed worker.

OUTPUT REQUIREMENTS:
- Return strictly JSON matching the specified schema.
- "ranked": Ordered list starting with rank 1 (best). Include "score" (integer 0-100) reflecting holistic fit, and "reason" (single client-facing sentence explaining why this rank).
- "excluded": Array of workers deliberately disqualified or excluded (primarily due to trust flags, complete category mismatch, or severe red flags) with explicit reasons.`;

function deterministicFallbackRanking(
  input: RankingInputPayload,
): RankingOutputPayload {
  const { search, candidates } = input;
  const needText = (search.free_text_need || "").toLowerCase();
  const isUrgent =
    needText.includes("urgent") ||
    needText.includes("emergency") ||
    needText.includes("immediately") ||
    needText.includes("leak") ||
    needText.includes("broken") ||
    needText.includes("fast");

  const excluded: ExcludedWorkerItem[] = [];
  const validCandidates: {
    worker: RankingCandidateWorker;
    rawScore: number;
    reasonParts: string[];
  }[] = [];

  for (const c of candidates) {
    // 1. Trust check: if trust flags exist, exclude or severely penalize
    if (c.trust_flags && c.trust_flags.length > 0) {
      excluded.push({
        worker_id: c.worker_id,
        reason: `Flagged for directory review: ${c.trust_flags.join(", ")}. Suspended from immediate client ranking.`,
      });
      continue;
    }

    // Base scoring logic
    let score = 50;
    const reasons: string[] = [];

    // Category match
    const categoryMatch = c.categories.some(
      (cat) =>
        cat.toLowerCase().includes(search.category.toLowerCase()) ||
        search.category.toLowerCase().includes(cat.toLowerCase()),
    );
    if (categoryMatch) {
      score += 15;
    } else {
      score -= 10;
    }

    // Urgent / Recency & WhatsApp response
    if (isUrgent) {
      if (c.responds_on_whatsapp) {
        score += 12;
        reasons.push("instant WhatsApp response");
      }
      if (c.last_active_days_ago <= 1) {
        score += 10;
        reasons.push("active today");
      } else if (c.last_active_days_ago <= 3) {
        score += 5;
      } else {
        score -= 8;
      }
    } else {
      if (c.last_active_days_ago <= 2) score += 5;
    }

    // Proven Quality (Bayesian rating balance)
    if (c.avg_rating !== null && c.num_ratings > 0) {
      const ratingWeight = Math.min(c.num_ratings / 15, 1);
      const effectiveRating =
        c.avg_rating * ratingWeight + 3.8 * (1 - ratingWeight);
      score += (effectiveRating - 3.5) * 8;
      if (c.num_ratings >= 10 && c.avg_rating >= 4.6) {
        reasons.push(
          `proven ${c.avg_rating}★ quality across ${c.num_ratings} jobs`,
        );
      } else if (c.avg_rating >= 4.8) {
        reasons.push(`high ${c.avg_rating}★ rating`);
      }
    } else {
      score -= 2;
    }

    // Distance impact
    if (c.distance_km <= 2.0) {
      score += 14;
      reasons.push(`very close (${c.distance_km}km)`);
    } else if (c.distance_km <= 5.0) {
      score += 8;
      reasons.push(`${c.distance_km}km away`);
    } else if (c.distance_km <= 10.0) {
      score += 2;
    } else {
      score -= 10;
    }

    // Experience
    if (c.years_experience >= 6) {
      score += 5;
    }

    // Completeness tiebreaker
    score += (c.profile_completeness_pct / 100) * 4;

    const boundedScore = Math.min(99, Math.max(15, Math.round(score)));

    // Generate readable client-facing reason
    const reasonText =
      reasons.length > 0
        ? `Top match: ${reasons.join(", ")}.`
        : `Qualified ${c.categories[0] || "technician"} within service area.`;

    validCandidates.push({
      worker: c,
      rawScore: boundedScore,
      reasonParts: [reasonText],
    });
  }

  // Sort descending by raw score
  validCandidates.sort((a, b) => b.rawScore - a.rawScore);

  const ranked: RankedWorkerItem[] = validCandidates.map((item, idx) => ({
    worker_id: item.worker.worker_id,
    rank: idx + 1,
    score: item.rawScore,
    reason: item.reasonParts[0],
  }));

  return {
    ranked,
    excluded,
  };
}

export const handleEvaluateRanking: RequestHandler = async (req, res) => {
  try {
    const input = req.body as RankingInputPayload;

    if (!input || !input.search || !Array.isArray(input.candidates)) {
      res
        .status(400)
        .json({
          message: "Invalid payload: 'search' and 'candidates' array required.",
        });
      return;
    }

    if (input.candidates.length === 0) {
      res.json({ ranked: [], excluded: [] });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "GEMINI_API_KEY not set; using deterministic fallback ranking logic.",
      );
      const fallbackResult = deterministicFallbackRanking(input);
      res.json(fallbackResult);
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const userPrompt = `Evaluate and rank these candidate workers for the client's search.
Client Search:
${JSON.stringify(input.search, null, 2)}

Candidate Workers (${input.candidates.length} candidates):
${JSON.stringify(input.candidates, null, 2)}

Apply the 5 hierarchical ranking priorities. Produce strict JSON matching the schema.`;

    // Evaluate candidates using gemini-2.5-pro (as specified for reasoning-based ranking) with fallback models
    let responseText = "";
    const schema = {
      type: Type.OBJECT,
      properties: {
        ranked: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              worker_id: { type: Type.STRING },
              rank: { type: Type.INTEGER },
              score: { type: Type.NUMBER },
              reason: { type: Type.STRING },
            },
            required: ["worker_id", "rank", "score", "reason"],
          },
        },
        excluded: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              worker_id: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ["worker_id", "reason"],
          },
        },
      },
      required: ["ranked", "excluded"],
    };

    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
    ];
    let succeeded = false;

    for (const modelName of candidateModels) {
      try {
        const promise = ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout waiting for ${modelName}`)),
            4000,
          ),
        );

        const response = await Promise.race([promise, timeoutPromise]);
        const textCandidate = response.text?.trim() || "";
        if (textCandidate) {
          responseText = textCandidate;
          succeeded = true;
          break;
        }
      } catch (err: unknown) {
        // Continue silently to next fallback model or deterministic fallback
      }
    }

    if (!succeeded || !responseText) {
      console.info(
        "Gemini APIs unavailable/timed out; activating deterministic rule-based ranking engine.",
      );
      const fallbackResult = deterministicFallbackRanking(input);
      res.json(fallbackResult);
      return;
    }

    const text = responseText;
    const parsed: RankingOutputPayload = JSON.parse(text);

    // Sanity-check that ranks are sequential and valid
    if (Array.isArray(parsed.ranked)) {
      parsed.ranked.forEach((item, idx) => {
        item.rank = idx + 1;
        item.score = Math.round(Number(item.score) || 50);
      });
    } else {
      parsed.ranked = [];
    }

    if (!Array.isArray(parsed.excluded)) {
      parsed.excluded = [];
    }

    res.json(parsed);
  } catch (err: unknown) {
    console.info(
      "Gemini ranking call falling back to deterministic heuristic ranker:",
      err instanceof Error ? err.message : err,
    );
    try {
      const fallbackResult = deterministicFallbackRanking(
        req.body as RankingInputPayload,
      );
      res.json(fallbackResult);
    } catch (fallbackErr) {
      const message =
        err instanceof Error ? err.message : "Ranking evaluation error";
      res.status(500).json({ message });
    }
  }
};

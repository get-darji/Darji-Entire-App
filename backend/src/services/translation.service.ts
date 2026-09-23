import { createHash } from "node:crypto";
import { env } from "../env.js";
import { TranslationCacheModel } from "../models.js";

export type SupportedLanguage = "en" | "hi";

export type TranslateInput = {
  text: string;
  sourceLanguage?: SupportedLanguage | "auto";
  targetLanguage: SupportedLanguage;
  context?: string;
};

export type TranslateResult = {
  translatedText: string;
  cached: boolean;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
};

const supportedLanguages = new Set(["en", "hi"]);

export function normalizeTranslationText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function detectLanguage(text: string): SupportedLanguage {
  return /[\u0900-\u097F]/.test(text) ? "hi" : "en";
}

function cacheKey(sourceLanguage: SupportedLanguage, targetLanguage: SupportedLanguage, normalizedText: string, context: string) {
  return createHash("sha256")
    .update([sourceLanguage, targetLanguage, context, normalizedText].join("\n"))
    .digest("hex");
}

async function translateWithGoogle(text: string, sourceLanguage: SupportedLanguage, targetLanguage: SupportedLanguage) {
  if (!env.GOOGLE_TRANSLATE_API_KEY) {
    throw new Error("Google Translation is not configured");
  }

  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(env.GOOGLE_TRANSLATE_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: sourceLanguage,
      target: targetLanguage,
      format: "text"
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error?.message === "string" ? body.error.message : "Google Translation request failed");
  }
  const translatedText = body.data?.translations?.[0]?.translatedText;
  if (typeof translatedText !== "string") throw new Error("Google Translation response was missing translated text");
  return translatedText;
}

async function translateWithBhashini(text: string, sourceLanguage: SupportedLanguage, targetLanguage: SupportedLanguage) {
  if (!env.BHASHINI_INFERENCE_API_KEY) throw new Error("Bhashini Translation is not configured");

  const response = await fetch("https://dhruva-api.bhashini.gov.in/services/inference/pipeline", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: env.BHASHINI_INFERENCE_API_KEY
    },
    body: JSON.stringify({
      pipelineTasks: [{
        taskType: "translation",
        config: {
          serviceId: env.BHASHINI_TRANSLATION_SERVICE_ID,
          language: { sourceLanguage, targetLanguage }
        }
      }],
      inputData: { input: [{ source: text }] }
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Bhashini Translation failed: HTTP ${response.status}`);
  const body = await response.json() as {
    pipelineResponse?: Array<{ output?: Array<{ target?: string }> }>;
  };
  const translatedText = body.pipelineResponse?.[0]?.output?.[0]?.target;
  if (!translatedText) throw new Error("Bhashini Translation returned no translated text");
  return translatedText;
}

async function translateWithConfiguredProvider(text: string, sourceLanguage: SupportedLanguage, targetLanguage: SupportedLanguage) {
  if (env.BHASHINI_INFERENCE_API_KEY) {
    try {
      return await translateWithBhashini(text, sourceLanguage, targetLanguage);
    } catch (error) {
      console.error("Bhashini translation failed", error);
      if (!env.GOOGLE_TRANSLATE_API_KEY) throw error;
    }
  }
  return translateWithGoogle(text, sourceLanguage, targetLanguage);
}

export async function translateDynamicText(input: TranslateInput): Promise<TranslateResult> {
  const normalizedText = normalizeTranslationText(input.text);
  const targetLanguage = input.targetLanguage;
  if (!supportedLanguages.has(targetLanguage)) throw new Error("Unsupported target language");

  const sourceLanguage = input.sourceLanguage && input.sourceLanguage !== "auto"
    ? input.sourceLanguage
    : detectLanguage(normalizedText);
  if (!supportedLanguages.has(sourceLanguage)) throw new Error("Unsupported source language");

  if (!normalizedText || sourceLanguage === targetLanguage) {
    return { translatedText: normalizedText, cached: true, sourceLanguage, targetLanguage };
  }

  const context = normalizeTranslationText(input.context ?? "general").slice(0, 80) || "general";
  const translationKey = cacheKey(sourceLanguage, targetLanguage, normalizedText, context);
  const cached = await TranslationCacheModel.findOneAndUpdate(
    { translationKey },
    { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (cached) {
    return { translatedText: cached.translatedText, cached: true, sourceLanguage, targetLanguage };
  }

  const translatedText = await translateWithConfiguredProvider(normalizedText, sourceLanguage, targetLanguage);
  await TranslationCacheModel.create({
    translationKey,
    sourceLanguage,
    targetLanguage,
    sourceText: input.text,
    normalizedText,
    translatedText,
    context,
    usageCount: 1,
    lastUsedAt: new Date()
  });

  return { translatedText, cached: false, sourceLanguage, targetLanguage };
}

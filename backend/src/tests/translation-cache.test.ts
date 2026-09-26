import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "../env.js";
import { TranslationCacheModel } from "../models.js";
import { translateDynamicText } from "../services/translation.service.js";

test("dynamic translations deduplicate requests and reuse persistent cache", async () => {
  const original = { fetch: globalThis.fetch, find: TranslationCacheModel.findOneAndUpdate, update: TranslationCacheModel.updateOne, key: env.BHASHINI_INFERENCE_API_KEY, service: env.BHASHINI_TRANSLITERATION_SERVICE_ID };
  const records = new Map<string, { translatedText: string }>();
  let calls = 0;
  try {
    env.BHASHINI_INFERENCE_API_KEY = "test-only";
    env.BHASHINI_TRANSLITERATION_SERVICE_ID = "test-name-service";
    TranslationCacheModel.findOneAndUpdate = ((filter: { translationKey: string }) => Promise.resolve(records.get(filter.translationKey))) as unknown as typeof TranslationCacheModel.findOneAndUpdate;
    TranslationCacheModel.updateOne = ((filter: { translationKey: string }, update: { $setOnInsert: { translatedText: string } }) => {
      records.set(filter.translationKey, update.$setOnInsert);
      return Promise.resolve({});
    }) as unknown as typeof TranslationCacheModel.updateOne;
    globalThis.fetch = async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      const name = body.pipelineTasks[0].taskType === "transliteration";
      if (name) assert.equal(body.pipelineTasks[0].config.serviceId, "test-name-service");
      return new Response(JSON.stringify({ pipelineResponse: [{ output: [{ target: name ? ["अमन"] : "नमस्ते" }] }] }));
    };
    const input = { text: "Hello", sourceLanguage: "en", targetLanguage: "hi" } as const;
    const results = await Promise.all([translateDynamicText(input), translateDynamicText(input)]);
    assert.equal(calls, 1);
    assert.equal(results[0].translatedText, "नमस्ते");
    assert.equal((await translateDynamicText(input)).cached, true);
    assert.equal(calls, 1);
    const name = await translateDynamicText({ ...input, text: "Aman", context: "profile-name-transliteration-v1" });
    assert.equal(name.translatedText, "अमन");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original.fetch;
    TranslationCacheModel.findOneAndUpdate = original.find;
    TranslationCacheModel.updateOne = original.update;
    env.BHASHINI_INFERENCE_API_KEY = original.key;
    env.BHASHINI_TRANSLITERATION_SERVICE_ID = original.service;
  }
});

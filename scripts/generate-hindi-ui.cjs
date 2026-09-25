const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { missing } = require("./audit-hindi-ui.cjs");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "shared/src/generated-hindi-ui.json");
const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : {};
const candidates = missing.map(([text]) => text).filter((text) => !/^#[\da-f]{3,8}$/i.test(text) && !/^data:|^https?:/i.test(text));

if (!process.argv.includes("--apply")) {
  console.log(`${candidates.length} static UI strings need Hindi translations. Run with --apply to generate them.`);
  process.exit(0);
}

dotenv.config({ path: path.join(root, "backend/.env") });
const apiKey = process.env.BHASHINI_INFERENCE_API_KEY;
if (!apiKey) throw new Error("BHASHINI_INFERENCE_API_KEY is missing from backend/.env");
const serviceId = process.env.BHASHINI_TRANSLATION_SERVICE_ID || "ai4bharat/indictrans-v2-all-gpu--t4";

async function translateBatch(batch) {
  const response = await fetch("https://dhruva-api.bhashini.gov.in/services/inference/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: "translation", config: { serviceId, language: { sourceLanguage: "en", targetLanguage: "hi" } } }],
      inputData: { input: batch.map((source) => ({ source })) }
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Bhashini returned HTTP ${response.status}`);
  const body = await response.json();
  const outputs = body.pipelineResponse?.[0]?.output;
  if (!Array.isArray(outputs) || outputs.length !== batch.length) throw new Error("Unexpected Bhashini batch response");
  return outputs.map((output) => output.target?.trim() || "");
}

(async () => {
  const translated = { ...existing };
  const skipped = [];
  for (let offset = 0; offset < candidates.length; offset += 12) {
    const batch = candidates.slice(offset, offset + 12);
    const outputs = await translateBatch(batch);
    batch.forEach((english, index) => {
      const hindi = outputs[index];
      if (!/[\u0900-\u097F]/.test(hindi) || /\?{3,}|\uFFFD/.test(hindi)) skipped.push(english);
      else translated[english] = hindi;
    });
    console.log(`Processed ${Math.min(offset + batch.length, candidates.length)}/${candidates.length}`);
  }
  fs.writeFileSync(target, `${JSON.stringify(Object.fromEntries(Object.entries(translated).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
  console.log(`Saved ${Object.keys(translated).length} Hindi UI translations; skipped ${skipped.length}.`);
  if (skipped.length) console.log(`Still needs review: ${skipped.slice(0, 30).join(" | ")}`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

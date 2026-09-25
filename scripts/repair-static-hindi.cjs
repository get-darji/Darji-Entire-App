const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const dotenv = require("dotenv");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "shared", "src", "static-translations.ts");
const source = fs.readFileSync(target, "utf8");
const file = ts.createSourceFile(target, source, ts.ScriptTarget.Latest, true);
const entries = [];

function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === "staticText" && node.initializer && ts.isAsExpression(node.initializer)) {
    for (const property of node.initializer.expression.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name) || !ts.isStringLiteral(property.initializer)) continue;
      if (/\?{3,}|\uFFFD/.test(property.initializer.text)) {
        entries.push({ english: property.name.text, start: property.initializer.getStart(file), end: property.initializer.getEnd() });
      }
    }
  }
  ts.forEachChild(node, visit);
}
visit(file);

if (!process.argv.includes("--apply")) {
  console.log(`${entries.length} corrupted static Hindi entries. Run with --apply to translate and replace them.`);
  process.exit(0);
}

dotenv.config({ path: path.join(root, "backend", ".env") });
const apiKey = process.env.BHASHINI_INFERENCE_API_KEY;
if (!apiKey) throw new Error("BHASHINI_INFERENCE_API_KEY is missing from backend/.env");
const serviceId = process.env.BHASHINI_TRANSLATION_SERVICE_ID || "ai4bharat/indictrans-v2-all-gpu--t4";

async function translateBatch(batch) {
  const response = await fetch("https://dhruva-api.bhashini.gov.in/services/inference/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: "translation", config: { serviceId, language: { sourceLanguage: "en", targetLanguage: "hi" } } }],
      inputData: { input: batch.map((entry) => ({ source: entry.english })) }
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Bhashini returned HTTP ${response.status}`);
  const body = await response.json();
  const outputs = body.pipelineResponse?.[0]?.output;
  if (!Array.isArray(outputs) || outputs.length !== batch.length) throw new Error("Unexpected Bhashini batch response");
  return outputs.map((output, index) => {
    const translated = output.target?.trim();
    if (!translated || !/[\u0900-\u097F]/.test(translated) || /\?{3,}|\uFFFD/.test(translated)) {
      throw new Error(`Invalid Hindi translation for ${batch[index].english}`);
    }
    return translated;
  });
}

(async () => {
  const replacements = [];
  for (let offset = 0; offset < entries.length; offset += 12) {
    const batch = entries.slice(offset, offset + 12);
    const translations = await translateBatch(batch);
    batch.forEach((entry, index) => replacements.push({ ...entry, translated: translations[index] }));
    console.log(`Translated ${replacements.length}/${entries.length}`);
  }
  let updated = source;
  for (const entry of replacements.reverse()) {
    updated = updated.slice(0, entry.start) + JSON.stringify(entry.translated) + updated.slice(entry.end);
  }
  fs.writeFileSync(target, updated);
  console.log(`Repaired ${entries.length} static Hindi entries.`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

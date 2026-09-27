const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const known = new Set();
const occurrences = new Map();
const mixedHindi = [];
const mixedDirect = [];
const corrupted = [];
// Language-switch labels and valid identifier examples must remain recognizable.
const intentionalLatin = new Set(["EN", "English", "ABCDE1234F", "username@bank..."]);

function parse(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function walk(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => walk(child, callback));
}

function addKnown(filePath, variableName, keyName) {
  const file = parse(filePath);
  walk(file, (node) => {
    if (!ts.isVariableDeclaration(node) || node.name.getText(file) !== variableName || !node.initializer) return;
    const initializer = ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer;
    if (!ts.isObjectLiteralExpression(initializer)) return;
    for (const property of initializer.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      if (keyName === "name" && ts.isStringLiteral(property.name)) {
        known.add(property.name.text);
        if (ts.isStringLiteral(property.initializer) && /\?{3,}|\uFFFD/.test(property.initializer.text)) corrupted.push(property.name.text);
        if (ts.isStringLiteral(property.initializer) && /[A-Za-z]/.test(property.initializer.text)) mixedHindi.push([property.name.text, property.initializer.text]);
      }
      if (keyName === "en" && ts.isObjectLiteralExpression(property.initializer)) {
        const english = property.initializer.properties.find((item) => ts.isPropertyAssignment(item) && item.name.getText(file) === "en");
        if (english && ts.isPropertyAssignment(english) && ts.isStringLiteral(english.initializer)) known.add(english.initializer.text);
        const hindi = property.initializer.properties.find((item) => ts.isPropertyAssignment(item) && item.name.getText(file) === "hi");
        if (hindi && ts.isPropertyAssignment(hindi) && ts.isStringLiteral(hindi.initializer) && /[A-Za-z]/.test(hindi.initializer.text)) mixedHindi.push([english?.initializer?.text, hindi.initializer.text]);
      }
    }
  });
}

addKnown(path.join(root, "shared/src/static-translations.ts"), "staticText", "name");
addKnown(path.join(root, "shared/src/customer-hindi.ts"), "customerHindi", "name");
addKnown(path.join(root, "shared/src/reviewed-hindi-ui.ts"), "reviewedHindiUi", "name");
addKnown(path.join(root, "shared/src/localization.ts"), "translations", "en");
const generatedPath = path.join(root, "shared/src/generated-hindi-ui.json");
if (fs.existsSync(generatedPath)) {
  for (const [key, value] of Object.entries(JSON.parse(fs.readFileSync(generatedPath, "utf8")))) {
    known.add(key);
    if (typeof value !== "string" || /\?{3,}|\uFFFD/.test(value)) corrupted.push(key);
  }
}

function filesUnder(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(folder, entry.name);
    return entry.isDirectory() ? (["node_modules", "android", "ios", "dist", ".expo", ".git"].includes(entry.name) ? [] : filesUnder(target)) : /\.tsx?$/.test(entry.name) ? [target] : [];
  });
}

function record(value, file, node) {
  const text = value.replace(/\s+/g, " ").trim();
  if (intentionalLatin.has(text)) return;
  if (!/[A-Za-z]/.test(text) || known.has(text) || /^(https?:|data:|[a-z0-9-]+-outline$|#[a-f0-9]{3,8}$|\S+@\S+\.\S+$)/i.test(text)) return;
  const location = `${path.relative(root, file.fileName)}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`;
  const existing = occurrences.get(text) ?? [];
  existing.push(location);
  occurrences.set(text, existing);
}

const visibleAttributes = new Set(["placeholder", "title", "label", "helper", "subtitle", "copy", "message", "buttonText", "accessibilityLabel", "loadingLabel"]);
const visibleProperties = new Set(["title", "label", "helper", "subtitle", "copy", "message", "placeholder", "text", "question", "answer", "description", "refund", "charges", "reason"]);
function visibleExpression(node, file) {
  if (!node) return;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) record(node.text, file, node);
  else if (ts.isConditionalExpression(node)) {
    visibleExpression(node.whenTrue, file);
    visibleExpression(node.whenFalse, file);
  } else if (ts.isParenthesizedExpression(node)) visibleExpression(node.expression, file);
  else if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.PlusToken].includes(node.operatorToken.kind)) {
    visibleExpression(node.left, file);
    visibleExpression(node.right, file);
  }
}
for (const app of ["customer-app", "tailor-app", "delivery-app"]) {
  for (const filePath of filesUnder(path.join(root, "apps", app))) {
    const file = parse(filePath);
    walk(file, (node) => {
      if (ts.isJsxText(node) && ts.isJsxElement(node.parent) && /^(Text|RNText)$/.test(node.parent.openingElement.tagName.getText(file))) record(node.getText(file), file, node);
      if (ts.isJsxAttribute(node) && visibleAttributes.has(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) record(node.initializer.text, file, node);
      if (ts.isJsxAttribute(node) && visibleAttributes.has(node.name.text) && node.initializer && ts.isJsxExpression(node.initializer)) visibleExpression(node.initializer.expression, file);
      if (ts.isJsxExpression(node) && ts.isJsxElement(node.parent) && /^(Text|RNText)$/.test(node.parent.openingElement.tagName.getText(file))) visibleExpression(node.expression, file);
      if (ts.isPropertyAssignment(node) && visibleProperties.has(node.name.getText(file)) && ts.isStringLiteral(node.initializer)) record(node.initializer.text, file, node);
      if (ts.isPropertyAssignment(node) && node.name.getText(file) === "details" && ts.isArrayLiteralExpression(node.initializer)) node.initializer.elements.forEach((item) => visibleExpression(item, file));
      if (ts.isCallExpression(node) && node.expression.getText(file) === "localize" && node.arguments.length >= 3) {
        const hindi = node.arguments[2];
        const text = ts.isStringLiteral(hindi) || ts.isNoSubstitutionTemplateLiteral(hindi)
          ? hindi.text
          : ts.isTemplateExpression(hindi)
            ? [hindi.head.text, ...hindi.templateSpans.map((span) => span.literal.text)].join(" ")
            : "";
        if (/[A-Za-z]/.test(text)) mixedDirect.push([text, `${path.relative(root, filePath)}:${file.getLineAndCharacterOfPosition(hindi.getStart(file)).line + 1}`]);
        if (/\?{3,}|\uFFFD/.test(text)) corrupted.push(`${path.relative(root, filePath)}:${file.getLineAndCharacterOfPosition(hindi.getStart(file)).line + 1}`);
      }
    });
  }
}

for (const filePath of filesUnder(path.join(root, "backend/src"))) {
  const file = parse(filePath);
  walk(file, (node) => {
    if (ts.isNewExpression(node) && node.expression.getText(file) === "AppError" && node.arguments?.length >= 2 && ts.isStringLiteral(node.arguments[1])) {
      record(node.arguments[1].text, file, node.arguments[1]);
    }
  });
}

const missing = [...occurrences.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
module.exports = { missing, mixedHindi, mixedDirect, corrupted };
if (require.main === module) {
  console.log(`${known.size} known strings; ${missing.length} potentially untranslated static UI strings.`);
  console.log(`${corrupted.length} corrupted Hindi translations.`);
  console.log(`${mixedHindi.length} translations contain Latin letters.`);
  console.log(`${mixedDirect.length} direct Hindi strings contain Latin letters.`);
  const limit = Number(process.argv.find((argument) => /^\d+$/.test(argument)) ?? 80);
  for (const [text, locations] of missing.slice(0, limit)) {
    console.log(`${locations.length}\t${text}\t${locations[0]}`);
  }
  if (process.argv.includes("--check") && (missing.length || corrupted.length)) process.exitCode = 1;
}

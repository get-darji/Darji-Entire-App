const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const replacements = [
  [/Darji/g, "दर्जी"],
  [/2Factor/g, "टूफैक्टर"],
  [/OTP/g, "ओटीपी"],
  [/SMS/g, "एसएमएस"]
];

for (const app of ["customer-app", "tailor-app", "delivery-app"]) {
  const target = path.join(root, "apps", app, "App.tsx");
  const source = fs.readFileSync(target, "utf8");
  const file = ts.createSourceFile(target, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];

  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === "localize" && node.arguments.length >= 3) {
      const hindi = node.arguments[2];
      if (ts.isStringLiteral(hindi) || ts.isNoSubstitutionTemplateLiteral(hindi) || ts.isTemplateExpression(hindi)) {
        const start = hindi.getStart(file);
        const end = hindi.getEnd();
        const before = source.slice(start, end);
        const after = replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), before);
        if (before !== after) edits.push({ start, end, after });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);

  let updated = source;
  for (const edit of edits.reverse()) updated = updated.slice(0, edit.start) + edit.after + updated.slice(edit.end);
  if (updated !== source) fs.writeFileSync(target, updated);
  console.log(`${app}: normalized ${edits.length} Hindi strings`);
}

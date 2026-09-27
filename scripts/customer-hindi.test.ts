import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { translateStaticText } from "../shared/src/static-translations";
import { reviewedHindiUi } from "../shared/src/reviewed-hindi-ui";

test("reviewed mobile UI is bundled Hindi and ratings retain their meaning", () => {
  for (const [english, hindi] of Object.entries(reviewedHindiUi)) {
    assert.ok(!/[A-Za-z]/.test(hindi), english);
    assert.equal(translateStaticText("hi", english), hindi, english);
    assert.equal(translateStaticText("en", english), english);
  }
  for (const label of ["Rate Darji", "Rate Darji app", "Receive & Rate", "Rate your tailor", "Rate your delivery partner"]) {
    assert.match(translateStaticText("hi", label), /रेट/);
    assert.doesNotMatch(translateStaticText("hi", label), /(^|\s)दर(\s|$)/);
  }
  assert.equal(translateStaticText("hi", "Interest rate"), "ब्याज दर");
  assert.equal(translateStaticText("hi", "  Rate Darji  "), "  दर्जी को रेटिंग दें  ");
  assert.equal(translateStaticText("hi", "English"), "English");
  assert.equal(translateStaticText("hi", "EN"), "EN");
});

test("customer help and cancellation data has bundled Hindi", () => {
  const source = ts.createSourceFile("App.tsx", readFileSync(new URL("../apps/customer-app/App.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const sections = new Set(["helpTopics", "faqItems", "cancellationPolicySections", "cancellationSpecialCases"]);
  const missing: string[] = [];
  let checked = 0;
  function inspect(node: ts.Node) {
    if (ts.isStringLiteral(node) && /[A-Za-z]/.test(node.text) && /\s/.test(node.text)) {
      checked++;
      if (/[A-Za-z]/.test(translateStaticText("hi", node.text))) missing.push(node.text);
    }
    ts.forEachChild(node, inspect);
  }
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && sections.has(node.name.getText(source)) && node.initializer) inspect(node.initializer);
    else ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(checked > 40);
  assert.deepEqual(missing, []);
  assert.equal(translateStaticText("hi", "English"), "English");
  assert.equal(translateStaticText("hi", "EN"), "EN");
});

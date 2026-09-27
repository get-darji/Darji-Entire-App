import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { restoreLanguagePreference } from "../shared/src/language-preference";

const requireModule = createRequire(import.meta.url);
for (const app of ["customer", "tailor", "delivery"]) {
  test(`${app} store preserves explicit language on login and profile refresh`, async () => {
    const source = readFileSync(new URL(`../apps/${app}-app/src/store.ts`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports: Record<string, any> = {};
    runInNewContext(compiled, {
      exports,
      require: (id: string) => {
        if (id.includes("async-storage")) return { default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } };
        if (id.includes("language-preference")) return { restoreLanguagePreference };
        return requireModule(id);
      }
    });
    const store = exports.useAppStore;
    await store.persist.rehydrate();
    store.getState().setSession("test-token", { id: "test", phone: "test", role: "CUSTOMER", preferredLanguage: "hi" }, "refresh");
    assert.equal(store.getState().language, "en");
    store.getState().setLanguagePreference("hi");
    store.getState().setSession("test-token", { preferredLanguage: "en" }, "refresh");
    store.getState().setUser?.({ preferredLanguage: "en" });
    assert.equal(store.getState().language, "hi");
    store.getState().signOut();
    assert.equal(store.getState().language, "hi");
  });
}

test("English is the default, including old server-selected Hindi", () => {
  for (const state of [undefined, {}, { language: "hi" }, { language: "hi", hasSelectedLanguage: false }]) {
    assert.deepEqual(restoreLanguagePreference(state), { language: "en", hasSelectedLanguage: false });
  }
});

test("explicit choices survive hydration without using the server preference", () => {
  for (const language of ["en", "hi"] as const) {
    assert.deepEqual(restoreLanguagePreference({ language, hasSelectedLanguage: true, user: { preferredLanguage: language === "en" ? "hi" : "en" } }),
      { language, hasSelectedLanguage: true });
  }
  assert.equal(restoreLanguagePreference({ language: "invalid", hasSelectedLanguage: true }).language, "en");
});

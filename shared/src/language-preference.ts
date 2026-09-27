import type { AppLanguage } from "./localization";

// Server profile refreshes must not overwrite an explicit device preference.
export function restoreLanguagePreference(value: unknown): { language: AppLanguage; hasSelectedLanguage: boolean } {
  const saved = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const selected = saved.hasSelectedLanguage === true && (saved.language === "en" || saved.language === "hi");
  return { language: selected ? saved.language as AppLanguage : "en", hasSelectedLanguage: selected };
}

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translateStaticText } from "../../../../../shared/src/static-translations";
import { webHindi } from "./web-hindi";

type Preferences = {
  language: "en" | "hi";
  favorites: Record<string, string[]>;
  setLanguage: (language: "en" | "hi") => void;
  toggleFavorite: (userId: string, tailorId: string) => void;
};

export const useCustomerPreferences = create<Preferences>()(persist((set) => ({
  language: "en",
  favorites: {},
  setLanguage: (language) => set({ language }),
  toggleFavorite: (userId, tailorId) => set((state) => {
    const current = state.favorites[userId] ?? [];
    return { favorites: { ...state.favorites, [userId]: current.includes(tailorId) ? current.filter((id) => id !== tailorId) : [...current, tailorId] } };
  })
}), { name: "darji.customer-web.preferences.v1" }));

export function uiText(text: string) {
  const language = useCustomerPreferences.getState().language;
  return language === "hi" ? webHindi[text] ?? translateStaticText(language, text) : text;
}

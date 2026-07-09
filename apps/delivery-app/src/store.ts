import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppLanguage } from "../../../shared/src/localization";

type User = { id: string; phone: string; name?: string; role: string };

type Store = {
  token?: string;
  refreshToken?: string;
  user?: User;
  language: AppLanguage;
  hasSelectedLanguage: boolean;
  setSession: (token: string, user: User, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  setLanguagePreference: (language: AppLanguage) => void;
  signOut: () => void;
};

export const useAppStore = create<Store>()(persist((set) => ({
  language: "en",
  hasSelectedLanguage: false,
  setSession: (token, user, refreshToken) => set({ token, user, refreshToken }),
  setAccessToken: (token) => set({ token }),
  setLanguagePreference: (language) => set({ language, hasSelectedLanguage: true }),
  signOut: () => set({ token: undefined, refreshToken: undefined, user: undefined })
}), {
  name: "darzi-delivery-session",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken, user: state.user, language: state.language, hasSelectedLanguage: state.hasSelectedLanguage })
}));

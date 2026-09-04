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
  deliveryOnline: boolean;
  sessionNotice?: string;
  setSession: (token: string, user: User, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  setLanguagePreference: (language: AppLanguage) => void;
  setDeliveryOnline: (online: boolean) => void;
  signOut: () => void;
  invalidateSession: (message: string) => void;
  clearSessionNotice: () => void;
};

export const useAppStore = create<Store>()(persist((set) => ({
  language: "en",
  hasSelectedLanguage: false,
  deliveryOnline: false,
  setSession: (token, user, refreshToken) => set({ token, user, refreshToken, deliveryOnline: false, sessionNotice: undefined }),
  setAccessToken: (token) => set({ token }),
  setLanguagePreference: (language) => set({ language, hasSelectedLanguage: true }),
  setDeliveryOnline: (deliveryOnline) => set({ deliveryOnline }),
  signOut: () => set({ token: undefined, refreshToken: undefined, user: undefined, deliveryOnline: false }),
  invalidateSession: (sessionNotice) => set({ token: undefined, refreshToken: undefined, user: undefined, deliveryOnline: false, sessionNotice }),
  clearSessionNotice: () => set({ sessionNotice: undefined })
}), {
  name: "darzi-delivery-session",
  version: 2,
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken, user: state.user, language: state.language, hasSelectedLanguage: state.hasSelectedLanguage, deliveryOnline: state.deliveryOnline }),
  migrate: (persistedState, version) => {
    const persisted = (persistedState ?? {}) as Partial<Store>;
    if (version < 1) {
      return {
        language: persisted.language ?? "en",
        hasSelectedLanguage: persisted.hasSelectedLanguage ?? false
      } as Store;
    }
    return { ...persisted, deliveryOnline: persisted.deliveryOnline ?? false } as Store;
  }
}));

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppLanguage } from "../../../shared/src/localization";
import { restoreLanguagePreference } from "../../../shared/src/language-preference";
import type { ServiceItem } from "./shared";

type User = { id: string; phone: string; name?: string; role: string; email?: string; gender?: string; dateOfBirth?: string; avatarUri?: string; avatarUrl?: string; avatarPreset?: string; preferredLanguage?: AppLanguage };
type CartItem = { service: ServiceItem; quantity: number; instructions?: string };

type Store = {
  token?: string;
  refreshToken?: string;
  user?: User;
  cart: CartItem[];
  language: AppLanguage;
  hasSelectedLanguage: boolean;
  hasHydrated: boolean;
  sessionNotice?: string;
  favoriteTailorIds?: string[];
  setSession: (token: string, user: User, refreshToken?: string) => void;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  setLanguagePreference: (language: AppLanguage) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  signOut: () => void;
  invalidateSession: (message: string) => void;
  clearSessionNotice: () => void;
  addToCart: (service: ServiceItem) => void;
  clearCart: () => void;
  toggleFavoriteTailor: (tailorId: string) => void;
};

export const useAppStore = create<Store>()(persist((set) => ({
  cart: [],
  language: "en",
  hasSelectedLanguage: false,
  hasHydrated: false,
  favoriteTailorIds: [],
  setSession: (token, user, refreshToken) => set((state) => ({ token, user, refreshToken, sessionNotice: undefined })),
  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ token }),
  setLanguagePreference: (language) => set({ language, hasSelectedLanguage: true }),
  setHasHydrated: (hasHydrated) => set({ hasHydrated }),
  signOut: () => set({ token: undefined, refreshToken: undefined, user: undefined, cart: [], favoriteTailorIds: [] }),
  invalidateSession: (sessionNotice) => set({ token: undefined, refreshToken: undefined, user: undefined, cart: [], sessionNotice }),
  clearSessionNotice: () => set({ sessionNotice: undefined }),
  addToCart: (service) =>
    set((state) => {
      const existing = state.cart.find((item) => item.service.id === service.id);
      if (existing) {
        return { cart: state.cart.map((item) => (item.service.id === service.id ? { ...item, quantity: item.quantity + 1 } : item)) };
      }
      return { cart: [...state.cart, { service, quantity: 1 }] };
    }),
  clearCart: () => set({ cart: [] }),
  toggleFavoriteTailor: (tailorId) =>
    set((state) => {
      const ids = state.favoriteTailorIds ?? [];
      const nextIds = ids.includes(tailorId)
        ? ids.filter((id) => id !== tailorId)
        : [...ids, tailorId];
      return { favoriteTailorIds: nextIds };
    })
}), {
  name: "darji-customer-session",
  storage: createJSONStorage(() => AsyncStorage),
  merge: (persisted, current) => ({ ...current, ...(persisted as Partial<Store>), ...restoreLanguagePreference(persisted) }),
  partialize: (state) => ({
    token: state.token,
    refreshToken: state.refreshToken,
    user: state.user,
    language: state.language,
    hasSelectedLanguage: state.hasSelectedLanguage,
    favoriteTailorIds: state.favoriteTailorIds
  }),
  onRehydrateStorage: () => (state) => {
    state?.setHasHydrated(true);
  }
}));

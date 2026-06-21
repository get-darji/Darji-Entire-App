import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ServiceItem } from "./shared";

type User = { id: string; phone: string; name?: string; role: string };
type CartItem = { service: ServiceItem; quantity: number; instructions?: string };

type Store = {
  token?: string;
  refreshToken?: string;
  user?: User;
  cart: CartItem[];
  setSession: (token: string, user: User, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  signOut: () => void;
  addToCart: (service: ServiceItem) => void;
  clearCart: () => void;
};

export const useAppStore = create<Store>()(persist((set) => ({
  cart: [],
  setSession: (token, user, refreshToken) => set({ token, user, refreshToken }),
  setAccessToken: (token) => set({ token }),
  signOut: () => set({ token: undefined, refreshToken: undefined, user: undefined, cart: [] }),
  addToCart: (service) =>
    set((state) => {
      const existing = state.cart.find((item) => item.service.id === service.id);
      if (existing) {
        return { cart: state.cart.map((item) => (item.service.id === service.id ? { ...item, quantity: item.quantity + 1 } : item)) };
      }
      return { cart: [...state.cart, { service, quantity: 1 }] };
    }),
  clearCart: () => set({ cart: [] })
}), {
  name: "darzi-customer-session",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken, user: state.user })
}));

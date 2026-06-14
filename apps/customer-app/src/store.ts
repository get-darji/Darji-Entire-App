import { create } from "zustand";
import type { ServiceItem } from "@darzi/shared";

type User = { id: string; phone: string; name?: string; role: string };
type CartItem = { service: ServiceItem; quantity: number; instructions?: string };

type Store = {
  token?: string;
  user?: User;
  cart: CartItem[];
  setSession: (token: string, user: User) => void;
  signOut: () => void;
  addToCart: (service: ServiceItem) => void;
  clearCart: () => void;
};

export const useAppStore = create<Store>((set) => ({
  cart: [],
  setSession: (token, user) => set({ token, user }),
  signOut: () => set({ token: undefined, user: undefined, cart: [] }),
  addToCart: (service) =>
    set((state) => {
      const existing = state.cart.find((item) => item.service.id === service.id);
      if (existing) {
        return { cart: state.cart.map((item) => (item.service.id === service.id ? { ...item, quantity: item.quantity + 1 } : item)) };
      }
      return { cart: [...state.cart, { service, quantity: 1 }] };
    }),
  clearCart: () => set({ cart: [] })
}));

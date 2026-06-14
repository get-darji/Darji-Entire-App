import { create } from "zustand";

type User = { id: string; phone: string; name?: string; role: string; tailorProfile?: { id: string; earnings: string; isAvailable: boolean } };

type Store = {
  token?: string;
  user?: User;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  signOut: () => void;
};

export const useAppStore = create<Store>((set) => ({
  setSession: (token, user) => set({ token, user }),
  setUser: (user) => set({ user }),
  signOut: () => set({ token: undefined, user: undefined })
}));

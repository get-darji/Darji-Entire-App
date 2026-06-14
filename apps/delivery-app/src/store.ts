import { create } from "zustand";

type User = { id: string; phone: string; name?: string; role: string };

type Store = {
  token?: string;
  user?: User;
  setSession: (token: string, user: User) => void;
  signOut: () => void;
};

export const useAppStore = create<Store>((set) => ({
  setSession: (token, user) => set({ token, user }),
  signOut: () => set({ token: undefined, user: undefined })
}));

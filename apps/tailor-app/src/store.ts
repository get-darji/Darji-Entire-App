import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";

type User = { id: string; phone: string; name?: string; role: string; tailorProfile?: { id: string; earnings: string; isAvailable: boolean } };

type Store = {
  token?: string;
  refreshToken?: string;
  user?: User;
  setSession: (token: string, user: User, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  signOut: () => void;
};

export const useAppStore = create<Store>()(persist((set) => ({
  setSession: (token, user, refreshToken) => set({ token, user, refreshToken }),
  setAccessToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  signOut: () => set({ token: undefined, refreshToken: undefined, user: undefined })
}), {
  name: "darzi-tailor-session",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken, user: state.user })
}));

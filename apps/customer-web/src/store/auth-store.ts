"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CustomerUser = {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role: string;
  gender?: string;
  dateOfBirth?: string;
  avatarUri?: string;
  avatarPreset?: string;
  wallet?: { balance?: number };
};

type AuthState = {
  accessToken?: string;
  refreshToken?: string;
  user?: CustomerUser;
  setSession: (session: { accessToken: string; refreshToken: string; user: CustomerUser }) => void;
  setAccessToken: (token?: string) => void;
  setUser: (user: CustomerUser) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      setSession: (session) => set({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      signOut: () => set({ accessToken: undefined, refreshToken: undefined, user: undefined })
    }),
    {
      name: "darji.customer-web.auth.v1",
      partialize: (state) => ({ accessToken: state.accessToken, refreshToken: state.refreshToken, user: state.user })
    }
  )
);

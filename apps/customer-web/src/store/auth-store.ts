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
  sessionNotice?: string;
  setSession: (session: { accessToken: string; refreshToken: string; user: CustomerUser }) => void;
  setAccessToken: (token?: string) => void;
  setUser: (user: CustomerUser) => void;
  signOut: () => void;
  invalidateSession: (message: string) => void;
  clearSessionNotice: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      setSession: (session) => set({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user, sessionNotice: undefined }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      signOut: () => set({ accessToken: undefined, refreshToken: undefined, user: undefined }),
      invalidateSession: (sessionNotice) => set({ accessToken: undefined, refreshToken: undefined, user: undefined, sessionNotice }),
      clearSessionNotice: () => set({ sessionNotice: undefined })
    }),
    {
      name: "darji.customer-web.auth.v1",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        sessionNotice: state.sessionNotice
      })
    }
  )
);

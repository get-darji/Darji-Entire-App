"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type SectionId =
  | "dashboard"
  | "orders"
  | "tailoring"
  | "delivery"
  | "tailors"
  | "partners"
  | "users"
  | "payments"
  | "coupons"
  | "support"
  | "settings";

type AdminStore = {
  activeSection: SectionId;
  hydrated: boolean;
  sidebarOpen: boolean;
  theme: ThemeMode;
  token: string | null;
  logout: () => void;
  setActiveSection: (section: SectionId) => void;
  setHydrated: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
  setToken: (token: string | null) => void;
  toggleTheme: () => void;
};

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      activeSection: "dashboard",
      hydrated: false,
      sidebarOpen: false,
      theme: "light",
      token: null,
      logout: () => set({ token: null, activeSection: "dashboard", sidebarOpen: false }),
      setActiveSection: (activeSection) => set({ activeSection }),
      setHydrated: (hydrated) => set({ hydrated }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setToken: (token) => set({ token }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" }))
    }),
    {
      name: "darzi-admin-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeSection: state.activeSection,
        theme: state.theme,
        token: state.token
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true)
    }
  )
);

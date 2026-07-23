"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type SectionId =
  | "dashboard"
  | "orders"
  | "tailoring"
  | "delivery"
  | "batches"
  | "tailors"
  | "partners"
  | "users"
  | "payments"
  | "coupons"
  | "support"
  | "reviews"
  | "notifications"
  | "analytics"
  | "activity"
  | "roles"
  | "health"
  | "exports"
  | "platform"
  | "settings";

type AdminStore = {
  activeSection: SectionId;
  hydrated: boolean;
  sidebarOpen: boolean;
  theme: ThemeMode;
  token: string | null;
  sessionNotice: string | null;
  supportSubTab: "customer" | "tailor" | "delivery" | "bugs";
  logout: () => void;
  invalidateSession: (message: string) => void;
  clearSessionNotice: () => void;
  setActiveSection: (section: SectionId) => void;
  setHydrated: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
  setToken: (token: string | null) => void;
  toggleTheme: () => void;
  setSupportSubTab: (tab: "customer" | "tailor" | "delivery" | "bugs") => void;
};

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      activeSection: "dashboard",
      hydrated: false,
      sidebarOpen: false,
      theme: "light",
      token: null,
      sessionNotice: null,
      supportSubTab: "customer",
      logout: () => set({ token: null, activeSection: "dashboard", sidebarOpen: false, supportSubTab: "customer" }),
      invalidateSession: (sessionNotice) => set({ token: null, sessionNotice, activeSection: "dashboard", sidebarOpen: false }),
      clearSessionNotice: () => set({ sessionNotice: null }),
      setActiveSection: (activeSection) => set({ activeSection }),
      setHydrated: (hydrated) => set({ hydrated }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setToken: (token) => set({ token, sessionNotice: null }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      setSupportSubTab: (supportSubTab) => set({ supportSubTab })
    }),
    {
      name: "darzi-admin-store",
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AdminStore>;
        const retiredSection = persisted.activeSection === ("serviceAreas" as SectionId) || persisted.activeSection === ("launchRequests" as SectionId);
        return {
          ...currentState,
          ...persisted,
          activeSection: retiredSection ? "dashboard" : persisted.activeSection ?? currentState.activeSection
        };
      },
      partialize: (state) => ({
        activeSection: state.activeSection,
        theme: state.theme,
        token: state.token,
        supportSubTab: state.supportSubTab
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true)
    }
  )
);

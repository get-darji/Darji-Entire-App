"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useAdminStore } from "@/src/store/admin-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000
          }
        }
      })
  );
  const setHydrated = useAdminStore((state) => state.setHydrated);

  useEffect(() => {
    useAdminStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  const theme = useAdminStore((state) => state.theme);
  const hydrated = useAdminStore((state) => state.hydrated);

  useEffect(() => {
    if (hydrated) {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme, hydrated]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" theme={theme} />
    </QueryClientProvider>
  );
}

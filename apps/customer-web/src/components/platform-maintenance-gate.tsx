"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiBaseUrl } from "@/src/lib/api";
import { defaultPlatformStatus, isAppUnderMaintenance, normalizePlatformStatus, type PlatformStatus } from "@darji/shared";

export function PlatformMaintenanceGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PlatformStatus>(defaultPlatformStatus);
  const [checked, setChecked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch(`${apiBaseUrl}/platform-status`, { headers: { "x-darji-client": "customer-web" }, cache: "no-store" });
      if (!response.ok) throw new Error("Platform status unavailable");
      const body = await response.json() as { data?: unknown };
      setStatus(normalizePlatformStatus(body.data));
    } catch {
      // Fail open if the status service itself is unavailable, so customers are
      // never permanently locked out because a status check failed.
    } finally {
      setChecked(true);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (checked && isAppUnderMaintenance(status, "CUSTOMER_WEB")) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-6 py-12 text-[#10213a]"><section className="w-full max-w-xl rounded-[32px] border border-[#e2e8f0] bg-white p-8 text-center shadow-[0_24px_70px_rgba(16,33,58,0.10)] sm:p-12"><div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-[#f2cf86] bg-[#fff4dc] p-4"><div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-white"><img alt="Darji" className="max-h-14 max-w-[72px] object-contain" src="/darji-logo-cropped.png" /></div></div><div className="mt-7 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold tracking-[0.14em] text-rose-800"><span className="h-2 w-2 rounded-full bg-rose-600" />MAINTENANCE MODE</div><h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">{status.title}</h1><p className="mx-auto mt-3 max-w-md text-base font-medium leading-7 text-slate-500">{status.description}</p><div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="font-bold">The Darji website is being improved.</p><p className="mt-2 text-sm leading-6 text-slate-500">Browsing, sign-in, bookings, and order access will be available again shortly.</p>{status.showEstimatedCompletion && status.estimatedCompletion ? <p className="mt-4 border-t border-slate-200 pt-4 text-sm font-bold text-[#e88900]">Estimated completion: {status.estimatedCompletion}</p> : null}</div><button className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#10213a] px-6 font-bold text-white shadow-lg transition hover:bg-[#1b3356] disabled:cursor-wait disabled:opacity-70" disabled={refreshing} onClick={() => void refresh(true)} type="button"><span className={refreshing ? "animate-spin" : ""}>↻</span>{refreshing ? "Checking status..." : "Refresh status"}</button><p className="mt-5 text-xs font-semibold text-slate-400">Your account and data remain safe.</p></section></main>;
  }

  return <>{children}</>;
}

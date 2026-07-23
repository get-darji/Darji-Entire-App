"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { ArrowLeft, LocateFixed, RefreshCw, Radio, Users, Scissors, PackageCheck } from "lucide-react";
import { API_URL, extractError, getAdminMapSnapshot } from "@/src/lib/api";
import { useAdminStore } from "@/src/store/admin-store";
import type { AdminMapLocation, AdminMapSnapshot } from "@/src/types/admin";
import type { OperationsMapFilters } from "./operations-map-canvas";

const OperationsMapCanvas = dynamic(() => import("./operations-map-canvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#111827]" />
});

const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

const filterConfig = [
  { key: "deliveryPartners", label: "Delivery Partners", icon: LocateFixed, color: "#f59e0b" },
  { key: "customers", label: "Customers", icon: Users, color: "#0ea5e9" },
  { key: "tailors", label: "Tailors", icon: Scissors, color: "#8b5cf6" },
  { key: "activeOrders", label: "Active Orders", icon: PackageCheck, color: "#ef4444" }
] as const;

export function OperationsMap({ onExit }: { onExit: () => void }) {
  const token = useAdminStore((state) => state.token);
  const [socketStatus, setSocketStatus] = useState<"connected" | "reconnecting" | "offline">("offline");
  const [liveSnapshot, setLiveSnapshot] = useState<AdminMapSnapshot>();
  const [filters, setFilters] = useState<OperationsMapFilters>({
    deliveryPartners: true,
    customers: false,
    tailors: false,
    activeOrders: true
  });
  const snapshotQuery = useQuery({
    queryKey: ["admin-map-snapshot"],
    queryFn: getAdminMapSnapshot,
    refetchInterval: 60_000
  });

  useEffect(() => {
    if (snapshotQuery.data) setLiveSnapshot(snapshotQuery.data);
  }, [snapshotQuery.data]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true
    });
    socket.on("connect", () => setSocketStatus("connected"));
    socket.io.on("reconnect_attempt", () => setSocketStatus("reconnecting"));
    socket.on("disconnect", () => setSocketStatus("offline"));
    socket.on("map:delivery_partner_location", (payload: {
      partnerId?: string;
      location?: AdminMapLocation;
      requestId?: string;
      orderId?: string;
      updatedAt?: string;
    }) => {
      if (!payload.partnerId || !payload.location) return;
      setLiveSnapshot((current) => {
        if (!current) return current;
        const partnerExists = current.deliveryPartners.some((partner) => partner.id === payload.partnerId);
        const orderExists = current.activeOrders.some((order) => order.id === payload.orderId);
        const updatedPartner = {
          id: payload.partnerId!,
          name: "Delivery partner",
          online: true,
          currentOrder: payload.orderId,
          lastUpdated: payload.updatedAt,
          location: payload.location!
        };
        const updatedOrder = payload.orderId && payload.requestId
          ? {
              id: payload.orderId,
              taskId: payload.requestId,
              status: "active",
              type: "delivery",
              location: payload.location!
            }
          : undefined;
        return {
          ...current,
          generatedAt: payload.updatedAt ?? new Date().toISOString(),
          deliveryPartners: partnerExists
            ? current.deliveryPartners.map((partner) =>
                partner.id === payload.partnerId
                  ? {
                      ...partner,
                      online: true,
                      currentOrder: payload.orderId ?? partner.currentOrder,
                      lastUpdated: payload.updatedAt,
                      location: payload.location!
                    }
                  : partner
              )
            : [...current.deliveryPartners, updatedPartner],
          activeOrders: orderExists
            ? current.activeOrders.map((order) =>
                order.id === payload.orderId ? { ...order, location: payload.location! } : order
              )
            : updatedOrder
              ? [...current.activeOrders, updatedOrder]
              : current.activeOrders
        };
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [token]);

  const visibleCount = useMemo(() => {
    if (!liveSnapshot) return 0;
    return (filters.deliveryPartners ? liveSnapshot.deliveryPartners.length : 0)
      + (filters.customers ? liveSnapshot.customers.length : 0)
      + (filters.tailors ? liveSnapshot.tailors.length : 0)
      + (filters.activeOrders ? liveSnapshot.activeOrders.length : 0);
  }, [filters, liveSnapshot]);

  return (
    <section className="fixed inset-0 z-[9999] flex min-w-0 flex-col overflow-hidden bg-[#111827]">
      <header className="z-[1000] flex shrink-0 flex-col gap-2 border-b border-white/10 bg-[#111827]/95 p-2 text-white backdrop-blur sm:p-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <button
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold transition hover:border-[#f59e0b]"
            onClick={onExit}
            type="button"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Exit Map</span>
            <span className="sm:hidden">Exit</span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black sm:text-lg">Live Operations Map</h1>
            <p className="truncate text-[10px] text-slate-400 sm:text-xs">{visibleCount} visible markers · OpenStreetMap</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto lg:justify-center">
          {filterConfig.map(({ key, label, icon: Icon, color }) => {
            const selected = filters[key];
            const count = liveSnapshot?.[key].length ?? 0;
            return (
              <button
                key={key}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  selected ? "border-white/20 bg-white text-[#111827]" : "border-white/10 bg-white/5 text-slate-300"
                }`}
                onClick={() => setFilters((current) => ({ ...current, [key]: !current[key] }))}
                type="button"
              >
                <Icon size={14} style={{ color }} />
                {label}
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-slate-300">
            <Radio className={socketStatus === "connected" ? "text-emerald-400" : "text-amber-400"} size={13} />
            {socketStatus}
          </div>
          <button
            aria-label="Refresh map data"
            className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-200 disabled:opacity-50"
            disabled={snapshotQuery.isFetching}
            onClick={() => void snapshotQuery.refetch()}
            type="button"
          >
            <RefreshCw className={snapshotQuery.isFetching ? "animate-spin" : ""} size={15} />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {liveSnapshot ? <OperationsMapCanvas filters={filters} snapshot={liveSnapshot} /> : (
          <div className="flex h-full items-center justify-center bg-[#111827] text-sm font-bold text-slate-300">
            {snapshotQuery.isLoading ? "Loading live map…" : extractError(snapshotQuery.error)}
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[900] rounded-2xl border border-white/15 bg-[#111827]/90 px-3 py-2 text-[10px] font-semibold text-slate-300 backdrop-blur">
          Live rider markers update automatically. No page refresh required.
        </div>
      </div>
    </section>
  );
}

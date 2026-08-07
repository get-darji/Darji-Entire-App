"use client";
// RiderLiveMap — Admin-only live rider location map
// Uses plain Leaflet (no react-leaflet) to avoid React Strict Mode double-invocation crash.
// Loaded with dynamic(..., { ssr: false }) in admin-portal.tsx.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { io, type Socket } from "socket.io-client";
import type { DeliveryPartnerProfile } from "../types/admin";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://backend-production-5a7e4.up.railway.app/api";
const SOCKET_URL = API_URL.replace(/\/api$/, "");
const STALE_MS = 5 * 60 * 1000;

type RiderLocationEvent = {
  partnerId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  lastLocationUpdatedAt: string;
};

function getMarkerColor(partner: DeliveryPartnerProfile): string {
  if (!partner.lastLocationUpdatedAt) return "#94a3b8";
  const age = Date.now() - new Date(partner.lastLocationUpdatedAt).getTime();
  if (age > STALE_MS) return "#f97316";
  return partner.isAvailable ? "#22c55e" : "#94a3b8";
}

function makeIcon(color: string): L.DivIcon {
  const dot = [
    "width:14px", "height:14px", "border-radius:50%",
    "background:" + color,
    "border:2.5px solid white",
    "box-shadow:0 1px 5px rgba(0,0,0,0.35)",
  ].join(";");
  return L.divIcon({
    className: "",
    html: "<div style=\"" + dot + "\"></div>",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function formatAge(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return min + "m ago";
  return Math.floor(min / 60) + "h " + (min % 60) + "m ago";
}

function buildPopup(partner: DeliveryPartnerProfile, lat: number, lng: number, updatedAt?: string): string {
  const name = partner.user?.name ?? partner.darjiPartnerId ?? partner.id;
  const status = partner.isAvailable ? "&#x1F7E2; Online" : "&#x26AB; Offline";
  const updAt = updatedAt ?? partner.lastLocationUpdatedAt ?? null;
  const acc = partner.lastLocationAccuracy != null ? " &middot; &plusmn;" + Math.round(partner.lastLocationAccuracy) + "m" : "";
  return (
    "<div style=\"font-size:13px;line-height:1.6;min-width:180px\">" +
    "<strong style=\"font-size:14px\">" + name + "</strong><br/>" +
    "<span style=\"color:#64748b\">" + (partner.darjiPartnerId ?? "No partner ID") + "</span><br/>" +
    status + "<br/>" +
    "&#x1F4CD; " + lat.toFixed(5) + ", " + lng.toFixed(5) + "<br/>" +
    "&#x1F550; " + formatAge(updAt) + acc +
    "</div>"
  );
}

export default function RiderLiveMap({
  partners,
  token,
}: {
  partners: DeliveryPartnerProfile[];
  token: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const hasAnyLocation = partners.some((p) => p.currentLocation?.coordinates);
  const [showOverlay, setShowOverlay] = useState(!hasAnyLocation);

  // Initialize Leaflet map once via DOM ref — guards against Strict Mode double-invocation
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [28.6139, 77.209],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    partners.forEach((partner) => {
      const loc = partner.currentLocation;
      if (!loc?.coordinates || loc.coordinates.length < 2) return;
      const [lng, lat] = loc.coordinates;
      const marker = L.marker([lat, lng], { icon: makeIcon(getMarkerColor(partner)) })
        .bindPopup(buildPopup(partner, lat, lng))
        .addTo(map);
      markersRef.current.set(partner.id, marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket.IO — only the affected marker moves, zero React re-renders
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("rider:location_updated", (data: RiderLocationEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const { partnerId, latitude, longitude, lastLocationUpdatedAt } = data;
      const partner = partners.find((p) => p.id === partnerId);
      const age = Date.now() - new Date(lastLocationUpdatedAt).getTime();
      const color = age > STALE_MS ? "#f97316" : (partner?.isAvailable ? "#22c55e" : "#94a3b8");

      if (markersRef.current.has(partnerId)) {
        const marker = markersRef.current.get(partnerId)!;
        marker.setLatLng([latitude, longitude]);
        marker.setIcon(makeIcon(color));
        if (partner) marker.setPopupContent(buildPopup(partner, latitude, longitude, lastLocationUpdatedAt));
      } else {
        const marker = L.marker([latitude, longitude], { icon: makeIcon(color) })
          .bindPopup(partner ? buildPopup(partner, latitude, longitude, lastLocationUpdatedAt) : "<strong>" + partnerId + "</strong>")
          .addTo(map);
        markersRef.current.set(partnerId, marker);
        setShowOverlay(false);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-slate-200"
      style={{ height: 420, isolation: "isolate" }}
    >
      {/* Plain div — Leaflet attaches here, no react-leaflet needed */}
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />

      {/* Legend */}
      <div
        style={{
          position: "absolute", bottom: 24, right: 12, zIndex: 1000,
          background: "white", borderRadius: 8, padding: "8px 12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontSize: 12,
          lineHeight: "1.8", pointerEvents: "none",
        }}
      >
        <div><span style={{ color: "#22c55e", fontWeight: 700 }}>&#9679; </span>Online &amp; recent</div>
        <div><span style={{ color: "#f97316", fontWeight: 700 }}>&#9679; </span>Stale (&gt;5 min)</div>
        <div><span style={{ color: "#94a3b8", fontWeight: 700 }}>&#9679; </span>Offline / no data</div>
      </div>

      {/* Empty-state overlay */}
      {showOverlay && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.75)", fontSize: 14,
            color: "#64748b", pointerEvents: "none",
          }}
        >
          No riders have shared their location yet. They will appear here when online.
        </div>
      )}
    </div>
  );
}

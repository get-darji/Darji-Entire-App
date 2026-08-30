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
const addressCache = new Map<string, string>();

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
  const pin = [
    "width:26px", "height:26px", "border-radius:50% 50% 50% 0",
    "background:" + color,
    "border:3px solid white",
    "box-shadow:0 4px 12px rgba(15,23,42,0.32)",
    "transform:rotate(-45deg)",
    "display:flex", "align-items:center", "justify-content:center",
  ].join(";");
  const center = ["width:8px", "height:8px", "border-radius:50%", "background:white", "display:block"].join(";");
  return L.divIcon({
    className: "",
    html: "<div style=\"" + pin + "\"><span style=\"" + center + "\"></span></div>",
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -28],
  });
}

function formatAge(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return min + "m ago";
  return Math.floor(min / 60) + "h " + (min % 60) + "m ago";
}

function buildPopup(partner: DeliveryPartnerProfile, lat: number, lng: number, updatedAt?: string, address?: string): string {
  const name = partner.user?.name ?? partner.darjiPartnerId ?? partner.id;
  const status = partner.isAvailable ? "Online" : "Offline";
  const updAt = updatedAt ?? partner.lastLocationUpdatedAt ?? null;
  const acc = partner.lastLocationAccuracy != null ? " &middot; &plusmn;" + Math.round(partner.lastLocationAccuracy) + "m" : "";
  return (
    "<div style=\"font-size:13px;line-height:1.6;min-width:220px\">" +
    "<strong style=\"font-size:14px\">" + name + "</strong><br/>" +
    "<span style=\"color:#64748b\">" + (partner.darjiPartnerId ?? "No partner ID") + "</span><br/>" +
    status + "<br/>" +
    "<div style=\"margin-top:6px;padding:8px;border-radius:8px;background:#f8fafc;color:#0f172a\"><strong>Exact location</strong><br/>" + (address || "Finding exact address...") + "</div>" +
    "<span style=\"color:#64748b\">Coordinates: " + lat.toFixed(5) + ", " + lng.toFixed(5) + "</span><br/>" +
    "<span style=\"color:#64748b\">Updated " + formatAge(updAt) + acc + "</span>" +
    "</div>"
  );
}

async function reverseAddress(lat: number, lng: number, token?: string | null): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = addressCache.get(key);
  if (cached) return cached;
  if (token) {
    const backendResponse = await fetch(`${API_URL}/location/reverse-geocode?lat=${lat}&lng=${lng}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (backendResponse.ok) {
      const body = await backendResponse.json() as { data?: { formattedAddress?: string } };
      const backendAddress = body.data?.formattedAddress;
      if (backendAddress) {
        addressCache.set(key, backendAddress);
        return backendAddress;
      }
    }
  }
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
  if (!response.ok) throw new Error("Reverse geocode failed");
  const data = await response.json() as { display_name?: string };
  const address = data.display_name || key;
  addressCache.set(key, address);
  return address;
}

function bindPopupWithAddress(marker: L.Marker, partner: DeliveryPartnerProfile, lat: number, lng: number, updatedAt?: string, token?: string | null) {
  marker.bindPopup(buildPopup(partner, lat, lng, updatedAt));
  void reverseAddress(lat, lng, token)
    .then((address) => marker.setPopupContent(buildPopup(partner, lat, lng, updatedAt, address)))
    .catch(() => marker.setPopupContent(buildPopup(partner, lat, lng, updatedAt, "Address unavailable. Check saved partner/customer address.")));
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
  const partnersRef = useRef(partners);
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

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Partner data is loaded after the map mounts. Keep the marker collection in
  // sync with every API refresh so offline riders retain their last real phone
  // location and newly loaded riders are not omitted.
  useEffect(() => {
    partnersRef.current = partners;
    const map = mapRef.current;
    if (!map) return;
    const locatedPartnerIds = new Set<string>();
    const bounds: L.LatLngExpression[] = [];

    partners.forEach((partner) => {
      const coordinates = partner.currentLocation?.coordinates;
      if (!coordinates || coordinates.length < 2) return;
      const [lng, lat] = coordinates.map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
      locatedPartnerIds.add(partner.id);
      bounds.push([lat, lng]);
      const existing = markersRef.current.get(partner.id);
      if (existing) {
        existing.setLatLng([lat, lng]);
        existing.setIcon(makeIcon(getMarkerColor(partner)));
        bindPopupWithAddress(existing, partner, lat, lng, partner.lastLocationUpdatedAt ?? undefined, token);
      } else {
        const marker = L.marker([lat, lng], { icon: makeIcon(getMarkerColor(partner)) }).addTo(map);
        bindPopupWithAddress(marker, partner, lat, lng, partner.lastLocationUpdatedAt ?? undefined, token);
        markersRef.current.set(partner.id, marker);
      }
    });

    markersRef.current.forEach((marker, partnerId) => {
      if (locatedPartnerIds.has(partnerId)) return;
      marker.remove();
      markersRef.current.delete(partnerId);
    });
    setShowOverlay(bounds.length === 0);
    if (bounds.length === 1) map.setView(bounds[0], 15);
    else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 });
  }, [partners, token]);

  // Socket.IO — only the affected marker moves, zero React re-renders
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("rider:location_updated", (data: RiderLocationEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const { partnerId, latitude, longitude, lastLocationUpdatedAt } = data;
      const partner = partnersRef.current.find((p) => p.id === partnerId);
      const age = Date.now() - new Date(lastLocationUpdatedAt).getTime();
      const color = age > STALE_MS ? "#f97316" : (partner?.isAvailable ? "#22c55e" : "#94a3b8");

      if (markersRef.current.has(partnerId)) {
        const marker = markersRef.current.get(partnerId)!;
        marker.setLatLng([latitude, longitude]);
        marker.setIcon(makeIcon(color));
        if (partner) bindPopupWithAddress(marker, partner, latitude, longitude, lastLocationUpdatedAt, token);
      } else {
        const marker = L.marker([latitude, longitude], { icon: makeIcon(color) })
          .addTo(map);
        if (partner) bindPopupWithAddress(marker, partner, latitude, longitude, lastLocationUpdatedAt, token);
        else marker.bindPopup("<strong>" + partnerId + "</strong>");
        markersRef.current.set(partnerId, marker);
        setShowOverlay(false);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
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
        <div><span style={{ color: "#22c55e", fontWeight: 700 }}>&#9670; </span>Online &amp; recent</div>
        <div><span style={{ color: "#f97316", fontWeight: 700 }}>&#9670; </span>Stale (&gt;5 min)</div>
        <div><span style={{ color: "#94a3b8", fontWeight: 700 }}>&#9670; </span>Offline / no data</div>
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
          No verified rider has shared phone GPS yet. Location permission and an internet connection are required.
        </div>
      )}
      <div style={{ position: "absolute", top: 12, left: 52, zIndex: 1000, background: "white", borderRadius: 8, padding: "7px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontSize: 12, fontWeight: 700, pointerEvents: "none" }}>
        Showing {partners.filter((partner) => partner.currentLocation?.coordinates).length} of {partners.length} partners with real phone GPS
      </div>
    </div>
  );
}

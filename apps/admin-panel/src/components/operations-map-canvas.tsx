"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";
import type { AdminMapSnapshot } from "@/src/types/admin";

export type OperationsMapFilters = {
  deliveryPartners: boolean;
  customers: boolean;
  tailors: boolean;
  activeOrders: boolean;
};

function markerIcon(color: string, label: string, pulse = false) {
  return divIcon({
    className: "",
    html: `<div style="
      width:38px;height:38px;border-radius:50% 50% 50% 12px;
      transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
      background:${color};border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.28);
      ${pulse ? "animation:darji-map-pulse 1.8s infinite;" : ""}
    "><span style="transform:rotate(45deg);color:white;font:800 12px/1 sans-serif">${label}</span></div>`,
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
    iconSize: [38, 38]
  });
}

function value(value: unknown, fallback = "—") {
  return value == null || value === "" ? fallback : String(value);
}

export default function OperationsMapCanvas({
  snapshot,
  filters
}: {
  snapshot: AdminMapSnapshot;
  filters: OperationsMapFilters;
}) {
  const firstLocation =
    snapshot.deliveryPartners[0]?.location
    ?? snapshot.activeOrders[0]?.location
    ?? snapshot.customers[0]?.location
    ?? snapshot.tailors[0]?.location;
  const center: [number, number] = firstLocation
    ? [firstLocation.latitude, firstLocation.longitude]
    : [28.6219, 77.075];

  return (
    <MapContainer
      center={center}
      className="h-full w-full"
      preferCanvas
      scrollWheelZoom
      zoom={12}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />

      {filters.deliveryPartners ? snapshot.deliveryPartners.map((partner) => (
        <Marker
          key={`partner:${partner.id}`}
          icon={markerIcon(partner.online ? "#f59e0b" : "#64748b", "DP", partner.online)}
          position={[partner.location.latitude, partner.location.longitude]}
        >
          <Popup>
            <div className="min-w-[220px] space-y-1.5 text-sm">
              <strong className="block text-base">{partner.name}</strong>
              <div>Phone: {value(partner.phone)}</div>
              <div>Current order: {value(partner.currentOrder, "No active order")}</div>
              <div>Status: <strong>{partner.online ? "Online" : "Offline"}</strong></div>
              <div>Last updated: {partner.lastUpdated ? new Date(partner.lastUpdated).toLocaleString() : "Not reported"}</div>
            </div>
          </Popup>
        </Marker>
      )) : null}

      {filters.customers ? snapshot.customers.map((customer) => (
        <Marker
          key={`customer:${customer.id}`}
          icon={markerIcon("#0ea5e9", "C")}
          position={[customer.location.latitude, customer.location.longitude]}
        >
          <Popup>
            <div className="min-w-[220px] space-y-1.5 text-sm">
              <strong className="block text-base">{customer.name}</strong>
              <div>Address: {customer.address}</div>
              <div>Current order: {value(customer.currentOrder, "No active order")}</div>
            </div>
          </Popup>
        </Marker>
      )) : null}

      {filters.tailors ? snapshot.tailors.map((tailor) => (
        <Marker
          key={`tailor:${tailor.id}`}
          icon={markerIcon("#8b5cf6", "T")}
          position={[tailor.location.latitude, tailor.location.longitude]}
        >
          <Popup>
            <div className="min-w-[220px] space-y-1.5 text-sm">
              <strong className="block text-base">{tailor.shopName ?? tailor.name ?? "Tailor"}</strong>
              <div>Pending orders: {tailor.pendingOrders}</div>
              <div>Rating: {Number(tailor.rating ?? 0).toFixed(1)}</div>
            </div>
          </Popup>
        </Marker>
      )) : null}

      {filters.activeOrders ? snapshot.activeOrders.map((order) => (
        <Marker
          key={`order:${order.taskId}`}
          icon={markerIcon("#ef4444", "O")}
          position={[order.location.latitude, order.location.longitude]}
        >
          <Popup>
            <div className="min-w-[220px] space-y-1.5 text-sm">
              <strong className="block text-base">Order {order.id.slice(0, 8).toUpperCase()}</strong>
              <div>Status: {order.status.replaceAll("_", " ")}</div>
              <div>Customer: {value(order.customerName)}</div>
              <div>Tailor: {value(order.tailorName)}</div>
            </div>
          </Popup>
        </Marker>
      )) : null}
    </MapContainer>
  );
}

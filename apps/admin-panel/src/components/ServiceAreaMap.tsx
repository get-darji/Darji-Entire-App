"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

type MapArea = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  enabled: boolean;
};

export default function ServiceAreaMap({
  areas,
  selectedIndex,
  onSelectPoint,
  onSelectArea
}: {
  areas: MapArea[];
  selectedIndex: number;
  onSelectPoint: (latitude: number, longitude: number) => void;
  onSelectArea: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const onSelectPointRef = useRef(onSelectPoint);
  const onSelectAreaRef = useRef(onSelectArea);

  useEffect(() => {
    onSelectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    onSelectAreaRef.current = onSelectArea;
  }, [onSelectArea]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const map = L.map(container, { center: [28.6139, 77.209], zoom: 10 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      onSelectPointRef.current(event.latlng.lat, event.latlng.lng);
    });
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    areas.forEach((area, index) => {
      if (!Number.isFinite(area.latitude) || !Number.isFinite(area.longitude)) return;
      const selected = index === selectedIndex;
      const color = area.enabled ? (selected ? "#f59e0b" : "#16a34a") : "#94a3b8";
      const center: L.LatLngExpression = [area.latitude, area.longitude];
      bounds.push(center);
      const circle = L.circle(center, {
        radius: Math.max(100, area.radiusKm * 1000),
        color,
        fillColor: color,
        fillOpacity: selected ? 0.2 : 0.1,
        weight: selected ? 3 : 2,
        dashArray: area.enabled ? undefined : "6 6"
      }).bindTooltip(`${area.name} · ${area.radiusKm} km`, { permanent: selected, direction: "top" }).addTo(layers);
      circle.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        onSelectAreaRef.current(index);
      });
      L.circleMarker(center, {
        radius: selected ? 7 : 5,
        color: "#ffffff",
        fillColor: color,
        fillOpacity: 1,
        weight: 2
      }).addTo(layers);
    });
    const selected = areas[selectedIndex];
    if (selected && Number.isFinite(selected.latitude) && Number.isFinite(selected.longitude)) {
      map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 11));
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 11);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 11 });
    }
    requestAnimationFrame(() => map.invalidateSize());
  }, [areas, selectedIndex]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)]">
      <div ref={containerRef} className="h-[360px] w-full bg-slate-100" aria-label="OpenStreetMap service-area selector" />
      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow">
        Click the map to move the selected area centre
      </div>
    </div>
  );
}

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
  shape: "circle" | "polygon";
  polygon: Array<{ latitude: number; longitude: number }>;
  enabled: boolean;
};

function dragHandleIcon(color: string, selected: boolean) {
  const size = selected ? 22 : 16;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(15,23,42,.4);cursor:grab"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

export default function ServiceAreaMap({
  areas,
  selectedIndex,
  onSelectPoint,
  onSelectArea,
  onDragPoint
}: {
  areas: MapArea[];
  selectedIndex: number;
  onSelectPoint: (latitude: number, longitude: number) => void;
  onSelectArea: (index: number) => void;
  onDragPoint: (areaIndex: number, pointIndex: number | undefined, latitude: number, longitude: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const focusedAreaKeyRef = useRef<string | undefined>(undefined);
  const onSelectPointRef = useRef(onSelectPoint);
  const onSelectAreaRef = useRef(onSelectArea);
  const onDragPointRef = useRef(onDragPoint);

  useEffect(() => {
    onSelectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    onSelectAreaRef.current = onSelectArea;
  }, [onSelectArea]);

  useEffect(() => {
    onDragPointRef.current = onDragPoint;
  }, [onDragPoint]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const map = L.map(container, { center: [28.6139, 77.209], zoom: 10, doubleClickZoom: false });
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
      if (area.shape === "polygon") {
        const points = area.polygon.map((point) => [point.latitude, point.longitude] as L.LatLngExpression);
        bounds.push(...points);
        const boundary = points.length >= 3
          ? L.polygon(points, { color, fillColor: color, fillOpacity: selected ? 0.2 : 0.1, weight: selected ? 3 : 2, dashArray: area.enabled ? undefined : "6 6" })
          : points.length >= 2
            ? L.polyline(points, { color, weight: selected ? 3 : 2, dashArray: "6 5" })
            : undefined;
        boundary?.bindTooltip(`${area.name} · custom boundary`, { permanent: selected && points.length >= 3, direction: "top" }).addTo(layers);
        boundary?.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          onSelectAreaRef.current(index);
        });
        points.forEach((point, pointIndex) => {
          const marker = L.marker(point, { icon: dragHandleIcon(color, selected), draggable: true }).addTo(layers);
          marker.on("dragstart", () => onSelectAreaRef.current(index));
          marker.on("click", (event) => {
            L.DomEvent.stopPropagation(event);
            onSelectAreaRef.current(index);
          });
          marker.on("dragend", () => {
            const next = marker.getLatLng();
            onDragPointRef.current(index, pointIndex, next.lat, next.lng);
          });
        });
        if (!points.length) bounds.push(center);
      } else {
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
        const marker = L.marker(center, { icon: dragHandleIcon(color, selected), draggable: true }).addTo(layers);
        marker.on("dragstart", () => onSelectAreaRef.current(index));
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          onSelectAreaRef.current(index);
        });
        marker.on("dragend", () => {
          const next = marker.getLatLng();
          onDragPointRef.current(index, undefined, next.lat, next.lng);
        });
      }
    });
    const selected = areas[selectedIndex];
    const focusKey = selected ? `${selected.id}:${selected.latitude.toFixed(6)}:${selected.longitude.toFixed(6)}` : undefined;
    if (selected && focusKey !== focusedAreaKeyRef.current && Number.isFinite(selected.latitude) && Number.isFinite(selected.longitude)) {
      focusedAreaKeyRef.current = focusKey;
      map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 11));
    } else if (!selected && bounds.length === 1) {
      map.setView(bounds[0], 11);
    } else if (!selected && bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 11 });
    }
    requestAnimationFrame(() => map.invalidateSize());
  }, [areas, selectedIndex]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)]">
      <div ref={containerRef} className="h-[360px] w-full bg-slate-100" aria-label="OpenStreetMap service-area selector" />
      <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[280px] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow">
        {areas[selectedIndex]?.shape === "polygon" ? "Click to add boundary dots. Drag any dot to refine the shape." : "Drag the centre dot to move the circle, or click a new centre."}
      </div>
    </div>
  );
}

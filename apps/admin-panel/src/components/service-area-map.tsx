"use client";

import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import type { ServiceArea } from "@/src/types/admin";

type Point = [number, number];

function ClickToDraw({ onAdd }: { onAdd: (point: Point) => void }) {
  useMapEvents({ click: (event) => onAdd([event.latlng.lng, event.latlng.lat]) });
  return null;
}

export default function ServiceAreaMap({ points, onChange, existingAreas = [] }: { points: Point[]; onChange: (points: Point[]) => void; existingAreas?: ServiceArea[] }) {
  const latLngs = points.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
  return (
    <div className="relative z-0 min-w-0 isolate overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={[28.6219, 77.075]} zoom={13} scrollWheelZoom style={{ height: 430, width: "100%" }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToDraw onAdd={(point) => onChange([...points, point])} />
        {existingAreas.map((area) => (
          <Polygon key={area.id} positions={area.polygon.map(([longitude, latitude]) => [latitude, longitude])} pathOptions={{ color: area.isActive ? "#15803d" : "#94a3b8", fillOpacity: 0.1 }}>
            <Tooltip sticky>{area.name}</Tooltip>
          </Polygon>
        ))}
        {latLngs.length >= 3 ? <Polygon positions={latLngs} pathOptions={{ color: "#f28c00", fillColor: "#f6a313", fillOpacity: 0.24 }} /> : <Polyline positions={latLngs} pathOptions={{ color: "#f28c00" }} />}
        {latLngs.map((position, index) => (
          <CircleMarker key={`${position[0]}-${position[1]}-${index}`} center={position} radius={7} pathOptions={{ color: "#0b2241", fillColor: "#f6a313", fillOpacity: 1 }} eventHandlers={{ click: () => onChange(points.filter((_, pointIndex) => pointIndex !== index)) }}>
            <Tooltip permanent direction="top">{index + 1}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span>Click the map to add boundary points. Click a numbered point to remove it.</span>
        <div className="flex gap-2"><button className="rounded-lg border bg-white px-3 py-1.5 font-semibold" onClick={() => onChange(points.slice(0, -1))}>Undo</button><button className="rounded-lg border bg-white px-3 py-1.5 font-semibold" onClick={() => onChange([])}>Clear</button></div>
      </div>
    </div>
  );
}

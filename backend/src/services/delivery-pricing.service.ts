export type DeliveryMode = "STANDARD" | "EXPRESS" | "INSTANT";
export type LatLng = { lat: number; lng: number };

export const DELIVERY_PRICING = {
  customer: {
    STANDARD: { base: 49, per100m: 0.5 },
    EXPRESS: { base: 59, per100m: 0.5 },
    INSTANT: { base: 69, per100m: 1 }
  },
  batchPayout: {
    base: 20,
    perKm: 5,
    perCompletedJob: 5
  },
  instantPayout: {
    minimum: 15,
    base: 10,
    per100m: 0.75
  }
} as const;

const OSRM_URL = process.env.OSRM_URL ?? "https://router.project-osrm.org";

export function deliveryModeFromUrgency(urgency?: string | null): DeliveryMode {
  const value = String(urgency ?? "").toLowerCase();
  if (value.includes("instant")) return "INSTANT";
  if (value.includes("express") || value.includes("urgent")) return "EXPRESS";
  return "STANDARD";
}

export function customerDeliveryCharge(mode: DeliveryMode, oneWayDistanceMeters: number) {
  const oneWay = Math.max(0, Number(oneWayDistanceMeters) || 0);
  const totalDistanceMeters = oneWay * 2;
  const config = DELIVERY_PRICING.customer[mode];
  const deliveryFee = Math.round(config.base + (totalDistanceMeters / 100) * config.per100m);
  return {
    oneWayDistanceMeters: Math.round(oneWay),
    totalChargeableDistanceMeters: Math.round(totalDistanceMeters),
    deliveryFee
  };
}

export function instantDeliveryPayout(distanceMeters: number) {
  const distance = Math.max(0, Number(distanceMeters) || 0);
  return Number(Math.max(DELIVERY_PRICING.instantPayout.minimum, DELIVERY_PRICING.instantPayout.base + (distance / 100) * DELIVERY_PRICING.instantPayout.per100m).toFixed(2));
}

export function batchDeliveryPayout(payableDistanceMeters: number, completedJobs: number) {
  const km = Math.max(0, Number(payableDistanceMeters) || 0) / 1000;
  return Number((DELIVERY_PRICING.batchPayout.base + km * DELIVERY_PRICING.batchPayout.perKm + Math.max(0, completedJobs) * DELIVERY_PRICING.batchPayout.perCompletedJob).toFixed(2));
}

export function pointFrom(value: unknown): LatLng | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const lat = Number(source.lat ?? source.latitude);
  const lng = Number(source.lng ?? source.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
}

function haversineMeters(a?: LatLng, b?: LatLng) {
  if (!a || !b) return 0;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

export async function roadDistanceMeters(origin?: LatLng, destination?: LatLng) {
  if (!origin || !destination) return 0;
  try {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const response = await fetch(`${OSRM_URL}/route/v1/driving/${coords}?overview=false`);
    if (!response.ok) throw new Error("OSRM route failed");
    const data = await response.json() as { routes?: Array<{ distance?: number }> };
    const distance = Number(data.routes?.[0]?.distance);
    if (Number.isFinite(distance)) return distance;
  } catch {
    // Keep delivery flows available if OSRM is temporarily unavailable.
  }
  return haversineMeters(origin, destination);
}

export async function roadDistanceMatrix(points: LatLng[]) {
  if (points.length === 0) return [];
  try {
    const coords = points.map((point) => `${point.lng},${point.lat}`).join(";");
    const response = await fetch(`${OSRM_URL}/table/v1/driving/${coords}?annotations=distance,duration`);
    if (!response.ok) throw new Error("OSRM matrix failed");
    const data = await response.json() as { distances?: number[][]; durations?: number[][] };
    if (Array.isArray(data.distances)) {
      return data.distances.map((row, i) => row.map((distance, j) => ({
        distance: Number.isFinite(Number(distance)) ? Number(distance) : haversineMeters(points[i], points[j]),
        duration: Number(data.durations?.[i]?.[j] ?? 0)
      })));
    }
  } catch {
    // Fallback below.
  }
  return points.map((from) => points.map((to) => ({ distance: haversineMeters(from, to), duration: 0 })));
}

export function extractTailorPoint(tailor: Record<string, unknown> | null | undefined) {
  const verification = tailor?.verification as Record<string, any> | undefined;
  return pointFrom(verification?.shop?.location)
    ?? pointFrom(verification?.shop)
    ?? pointFrom(verification?.personal?.location)
    ?? pointFrom(verification?.personal);
}

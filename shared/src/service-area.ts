export type GeoPoint = [longitude: number, latitude: number];

export type ServiceArea = {
  id: string;
  name: string;
  isActive: boolean;
  polygon: GeoPoint[];
  edgeToleranceMeters: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceAreaCheck = {
  available: boolean;
  serviceArea: ServiceArea | null;
  checkedAt: string;
};

const EARTH_RADIUS_METERS = 6_371_000;

function toLocalMeters(point: GeoPoint, origin: GeoPoint) {
  const radians = Math.PI / 180;
  const latitude = origin[1] * radians;
  return {
    x: (point[0] - origin[0]) * radians * EARTH_RADIUS_METERS * Math.cos(latitude),
    y: (point[1] - origin[1]) * radians * EARTH_RADIUS_METERS
  };
}

function distanceToSegmentMeters(point: GeoPoint, start: GeoPoint, end: GeoPoint) {
  const p = toLocalMeters(point, point);
  const a = toLocalMeters(start, point);
  const b = toLocalMeters(end, point);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]) {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [x, y] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const crosses = y > point[1] !== previousY > point[1]
      && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y || Number.EPSILON) + x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function isPointInsideServiceArea(point: GeoPoint, polygon: GeoPoint[], toleranceMeters = 0) {
  if (isPointInPolygon(point, polygon)) return true;
  if (polygon.length < 2) return false;
  const acceptedDistanceMeters = Math.max(0.05, toleranceMeters);
  return polygon.some((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    return distanceToSegmentMeters(point, start, end) <= acceptedDistanceMeters;
  });
}

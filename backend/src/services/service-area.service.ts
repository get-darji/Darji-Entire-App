import { isPointInsideServiceArea, type GeoPoint, type ServiceArea } from "@darzi/shared";
import { ServiceAreaModel } from "../models.js";

type ServiceAreaDocument = {
  id: string;
  name: string;
  isActive: boolean;
  polygon: Array<{ longitude: number; latitude: number }>;
  edgeToleranceMeters: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export function serializeServiceArea(area: ServiceAreaDocument): ServiceArea {
  return {
    id: String(area.id),
    name: area.name,
    isActive: Boolean(area.isActive),
    polygon: area.polygon.map((point) => [Number(point.longitude), Number(point.latitude)]),
    edgeToleranceMeters: Number(area.edgeToleranceMeters ?? 0),
    createdAt: area.createdAt?.toISOString(),
    updatedAt: area.updatedAt?.toISOString()
  };
}

export async function checkServiceArea(latitude: number, longitude: number) {
  const areas = await ServiceAreaModel.find({ isActive: true }).sort({ name: 1 });
  const point: GeoPoint = [longitude, latitude];
  const matching = areas.find((area) => {
    const polygon = area.polygon.map((coordinate) => [Number(coordinate.longitude), Number(coordinate.latitude)] as GeoPoint);
    return isPointInsideServiceArea(point, polygon, Number(area.edgeToleranceMeters ?? 0));
  });
  return matching ? serializeServiceArea(matching) : null;
}

export function launchRequestLocationKey(latitude: number, longitude: number) {
  // Approximately 1.1 km cells. This is used only for demand analytics, never eligibility.
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

export async function ensureDefaultServiceAreas() {
  if (await ServiceAreaModel.exists({})) return;
  await ServiceAreaModel.insertMany([
    {
      name: "Janakpuri",
      isActive: true,
      edgeToleranceMeters: 150,
      polygon: [
        { longitude: 77.066, latitude: 28.596 },
        { longitude: 77.111, latitude: 28.596 },
        { longitude: 77.116, latitude: 28.642 },
        { longitude: 77.069, latitude: 28.646 }
      ]
    },
    {
      name: "Uttam Nagar",
      isActive: true,
      edgeToleranceMeters: 150,
      polygon: [
        { longitude: 77.032, latitude: 28.599 },
        { longitude: 77.072, latitude: 28.598 },
        { longitude: 77.073, latitude: 28.643 },
        { longitude: 77.034, latitude: 28.644 }
      ]
    }
  ]);
}

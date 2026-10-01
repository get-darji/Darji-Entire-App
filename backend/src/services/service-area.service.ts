import {
  SERVICE_AREA_SETTING_KEY,
  defaultServiceAreaConfig,
  normalizeServiceAreaConfig,
  serviceAreaConfigSchema,
  type ServiceAreaConfig,
  type ServiceAreaZone
} from "@darzi/shared";
import { SettingModel } from "../models.js";

const SERVICE_AREA_CACHE_MS = 30_000;
let cachedConfig: { value: ServiceAreaConfig; expiresAt: number } | undefined;

export type ServiceAvailability = {
  filteringEnabled: boolean;
  serviceable: boolean;
  matchedArea?: Pick<ServiceAreaZone, "id" | "name">;
  title?: string;
  message?: string;
};

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const deltaLat = radians(b.latitude - a.latitude);
  const deltaLng = radians(b.longitude - a.longitude);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function pointInPolygon(point: { latitude: number; longitude: number }, polygon: Array<{ latitude: number; longitude: number }>) {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const dx = currentPoint.longitude - previousPoint.longitude;
    const dy = currentPoint.latitude - previousPoint.latitude;
    const cross = (x - previousPoint.longitude) * dy - (y - previousPoint.latitude) * dx;
    const onSegment = Math.abs(cross) < 1e-10
      && x >= Math.min(previousPoint.longitude, currentPoint.longitude)
      && x <= Math.max(previousPoint.longitude, currentPoint.longitude)
      && y >= Math.min(previousPoint.latitude, currentPoint.latitude)
      && y <= Math.max(previousPoint.latitude, currentPoint.latitude);
    if (onSegment) return true;
    const intersects = (currentPoint.latitude > y) !== (previousPoint.latitude > y)
      && x < ((previousPoint.longitude - currentPoint.longitude) * (y - currentPoint.latitude))
        / (previousPoint.latitude - currentPoint.latitude) + currentPoint.longitude;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function serviceAreaContainsPoint(area: ServiceAreaZone, point: { latitude: number; longitude: number }) {
  if (area.shape === "polygon") return area.polygon.length >= 3 && pointInPolygon(point, area.polygon);
  return distanceKm(point, { latitude: area.latitude, longitude: area.longitude }) <= area.radiusKm;
}

export async function getServiceAreaConfig(): Promise<ServiceAreaConfig> {
  if (cachedConfig && cachedConfig.expiresAt > Date.now()) return cachedConfig.value;
  const setting = await SettingModel.findOne({ key: SERVICE_AREA_SETTING_KEY }).select("value").lean();
  const value = setting ? normalizeServiceAreaConfig(setting.value) : defaultServiceAreaConfig();
  cachedConfig = { value, expiresAt: Date.now() + SERVICE_AREA_CACHE_MS };
  return value;
}

export async function saveServiceAreaConfig(value: unknown): Promise<ServiceAreaConfig> {
  const config = serviceAreaConfigSchema.parse(value);
  await SettingModel.findOneAndUpdate(
    { key: SERVICE_AREA_SETTING_KEY },
    { key: SERVICE_AREA_SETTING_KEY, value: config },
    { upsert: true, returnDocument: "after" }
  );
  // Retire the old delivery-only switch so there is only one area control.
  await SettingModel.deleteOne({ key: "enable_area_filtering" });
  cachedConfig = { value: config, expiresAt: Date.now() + SERVICE_AREA_CACHE_MS };
  return config;
}

export async function checkServiceAvailability(latitude: number, longitude: number): Promise<ServiceAvailability> {
  const config = await getServiceAreaConfig();
  if (!config.enabled) return { filteringEnabled: false, serviceable: true };
  const matched = config.areas.find((area) => area.enabled && serviceAreaContainsPoint(area, { latitude, longitude }));
  if (matched) {
    return {
      filteringEnabled: true,
      serviceable: true,
      matchedArea: { id: matched.id, name: matched.name }
    };
  }
  return {
    filteringEnabled: true,
    serviceable: false,
    title: config.unavailableTitle,
    message: config.unavailableMessage
  };
}

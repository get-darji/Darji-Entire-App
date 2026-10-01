import { z } from "zod";

export const SERVICE_AREA_SETTING_KEY = "service_area_config";

export const serviceAreaPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const serviceAreaZoneSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().positive().max(100),
  shape: z.enum(["circle", "polygon"]).default("circle"),
  polygon: z.array(serviceAreaPointSchema).max(60).default([]),
  enabled: z.boolean().default(true)
}).superRefine((area, context) => {
  if (area.shape === "polygon" && area.polygon.length < 3) {
    context.addIssue({ code: "custom", path: ["polygon"], message: "A custom boundary needs at least three map points" });
  }
});

export const serviceAreaConfigSchema = z.object({
  enabled: z.boolean().default(false),
  unavailableTitle: z.string().trim().min(2).max(120).default("Darji is not in your area yet"),
  unavailableMessage: z.string().trim().min(2).max(500).default("We are launching area by area. Request Darji here and we will let you know when service reaches you."),
  areas: z.array(serviceAreaZoneSchema).max(100).default([])
});

export type ServiceAreaZone = z.infer<typeof serviceAreaZoneSchema>;
export type ServiceAreaPoint = z.infer<typeof serviceAreaPointSchema>;
export type ServiceAreaConfig = z.infer<typeof serviceAreaConfigSchema>;

export function defaultServiceAreaConfig(): ServiceAreaConfig {
  return serviceAreaConfigSchema.parse({});
}

export function normalizeServiceAreaConfig(value: unknown): ServiceAreaConfig {
  const parsed = serviceAreaConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultServiceAreaConfig();
}

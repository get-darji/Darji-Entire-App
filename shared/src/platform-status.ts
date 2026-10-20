import { z } from "zod";

export const PLATFORM_STATUS_SETTING_KEY = "platform_status";

export const maintenanceAppSchema = z.enum(["CUSTOMER_APP", "TAILOR_APP", "DELIVERY_APP", "CUSTOMER_WEB"]);
export type MaintenanceApp = z.infer<typeof maintenanceAppSchema>;
export const allMaintenanceApps: MaintenanceApp[] = ["CUSTOMER_APP", "TAILOR_APP", "DELIVERY_APP", "CUSTOMER_WEB"];

export const platformStatusSchema = z.object({
  maintenanceMode: z.boolean().default(false),
  title: z.string().trim().min(2).max(120).default("We'll Be Back Soon"),
  description: z.string().trim().min(2).max(600).default("We're improving Darji to serve you better. Please check back shortly."),
  estimatedCompletion: z.string().trim().max(160).nullable().default(null).transform((value) => value || null),
  showEstimatedCompletion: z.boolean().default(false),
  maintenanceApps: z.array(maintenanceAppSchema).default([]),
  allowAdminAccess: z.literal(true).default(true)
});

export type PlatformStatus = z.infer<typeof platformStatusSchema>;

export function defaultPlatformStatus(): PlatformStatus {
  return platformStatusSchema.parse({});
}

export function normalizePlatformStatus(value: unknown): PlatformStatus {
  const parsed = platformStatusSchema.safeParse(value);
  if (!parsed.success) return defaultPlatformStatus();
  // A pre-targeting maintenance record meant the whole platform. Keep that
  // safe interpretation until an admin saves an explicit app selection.
  if (parsed.data.maintenanceMode && parsed.data.maintenanceApps.length === 0) {
    return { ...parsed.data, maintenanceApps: allMaintenanceApps };
  }
  return parsed.data;
}

export function isAppUnderMaintenance(status: PlatformStatus, app: MaintenanceApp) {
  return status.maintenanceApps.includes(app);
}

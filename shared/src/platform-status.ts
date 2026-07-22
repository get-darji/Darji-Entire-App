import { z } from "zod";

export const PLATFORM_STATUS_SETTING_KEY = "platform_status";

export const platformStatusSchema = z.object({
  maintenanceMode: z.boolean().default(false),
  title: z.string().trim().min(2).max(120).default("We'll Be Back Soon"),
  description: z.string().trim().min(2).max(600).default("We're improving Darji to serve you better. Please check back shortly."),
  estimatedCompletion: z.string().trim().max(160).nullable().default(null).transform((value) => value || null),
  showEstimatedCompletion: z.boolean().default(false),
  allowAdminAccess: z.literal(true).default(true)
});

export type PlatformStatus = z.infer<typeof platformStatusSchema>;

export function defaultPlatformStatus(): PlatformStatus {
  return platformStatusSchema.parse({});
}

export function normalizePlatformStatus(value: unknown): PlatformStatus {
  const parsed = platformStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultPlatformStatus();
}

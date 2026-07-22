import {
  PLATFORM_STATUS_SETTING_KEY,
  defaultPlatformStatus,
  normalizePlatformStatus,
  platformStatusSchema,
  type PlatformStatus
} from "@darzi/shared";
import { SettingModel } from "../models.js";

export async function getPlatformStatus(): Promise<PlatformStatus> {
  const setting = await SettingModel.findOne({ key: PLATFORM_STATUS_SETTING_KEY }).select("value").lean();
  return setting ? normalizePlatformStatus(setting.value) : defaultPlatformStatus();
}

export async function savePlatformStatus(value: unknown): Promise<PlatformStatus> {
  const status = platformStatusSchema.parse({
    ...(value && typeof value === "object" ? value : {}),
    allowAdminAccess: true
  });
  await SettingModel.findOneAndUpdate(
    { key: PLATFORM_STATUS_SETTING_KEY },
    { key: PLATFORM_STATUS_SETTING_KEY, value: status },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  return status;
}

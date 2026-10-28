import {
  FESTIVAL_THEME_SETTING_KEY,
  defaultFestivalTheme,
  festivalThemeSchema,
  festivalThemeState,
  normalizeFestivalTheme,
  type FestivalThemeConfig,
  type FestivalThemeState
} from "@darji/shared";
import { SettingModel } from "../models.js";

export async function getFestivalThemeConfig(): Promise<FestivalThemeConfig> {
  const setting = await SettingModel.findOne({ key: FESTIVAL_THEME_SETTING_KEY }).select("value").lean();
  return setting ? normalizeFestivalTheme(setting.value) : defaultFestivalTheme();
}

export async function getFestivalThemeState(): Promise<FestivalThemeState> {
  return festivalThemeState(await getFestivalThemeConfig());
}

export async function saveFestivalTheme(value: unknown, updatedBy: string): Promise<FestivalThemeState> {
  const config = festivalThemeSchema.parse({
    ...(value && typeof value === "object" ? value : {}),
    updatedAt: new Date().toISOString(),
    updatedBy
  });
  await SettingModel.findOneAndUpdate(
    { key: FESTIVAL_THEME_SETTING_KEY },
    { key: FESTIVAL_THEME_SETTING_KEY, value: config },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
  return festivalThemeState(config);
}

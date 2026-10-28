import { z } from "zod";

export const FESTIVAL_THEME_SETTING_KEY = "festival_theme";
export const FESTIVAL_THEME_TIMEZONE = "Asia/Kolkata" as const;

const optionalDateTime = z.string().datetime({ offset: true }).nullable().default(null);

export const festivalPaletteSchema = z.object({
  page: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFF9EE"),
  hero: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#2C1708"),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#F6A500"),
  fabric: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6B1016")
});

export const festivalThemeSchema = z.object({
  themeId: z.string().trim().regex(/^[a-z][a-z0-9-]{1,31}$/).default("diwali"),
  enabled: z.boolean().default(false),
  title: z.string().trim().min(2).max(80).default("Diwali Darji Edition"),
  greetingTemplate: z.string().trim().min(2).max(120).default("Happy Diwali, {firstName}!"),
  startAt: optionalDateTime,
  endAt: optionalDateTime,
  timezone: z.literal(FESTIVAL_THEME_TIMEZONE).default(FESTIVAL_THEME_TIMEZONE),
  assetVersion: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{1,63}$/).default("diwali-v1"),
  palette: festivalPaletteSchema.default({ page: "#FFF9EE", hero: "#2C1708", accent: "#F6A500", fabric: "#6B1016" }),
  updatedAt: z.string().datetime({ offset: true }).optional(),
  updatedBy: z.string().trim().max(120).optional()
}).superRefine((value, context) => {
  if (value.startAt && value.endAt && new Date(value.startAt).getTime() >= new Date(value.endAt).getTime()) {
    context.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time" });
  }
});

export type FestivalThemeConfig = z.infer<typeof festivalThemeSchema>;
export type FestivalThemeStatus = "Active" | "Scheduled" | "Inactive" | "Expired";
export type FestivalThemeState = FestivalThemeConfig & {
  active: boolean;
  status: FestivalThemeStatus;
  serverNow: string;
};

export function defaultFestivalTheme(): FestivalThemeConfig {
  return festivalThemeSchema.parse({});
}

export function normalizeFestivalTheme(value: unknown): FestivalThemeConfig {
  const parsed = festivalThemeSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultFestivalTheme();
}

export function festivalThemeStatus(config: FestivalThemeConfig, now = new Date()): FestivalThemeStatus {
  if (!config.enabled) return "Inactive";
  const current = now.getTime();
  if (config.startAt && new Date(config.startAt).getTime() > current) return "Scheduled";
  if (config.endAt && new Date(config.endAt).getTime() <= current) return "Expired";
  return "Active";
}

export function festivalThemeState(value: unknown, now = new Date()): FestivalThemeState {
  const config = normalizeFestivalTheme(value);
  const status = festivalThemeStatus(config, now);
  return { ...config, active: status === "Active", status, serverNow: now.toISOString() };
}

export function festivalGreeting(config: FestivalThemeConfig, name?: string) {
  const firstName = name?.trim().split(/\s+/)[0] || "there";
  return config.greetingTemplate.replaceAll("{firstName}", firstName);
}

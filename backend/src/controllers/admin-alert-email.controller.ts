import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../env.js";
import { SettingModel } from "../models.js";
import {
  LIVE_ALERT_CATEGORIES,
  OPERATIONAL_ALERT_EMAIL_SETTINGS_KEY
} from "../services/email-alert.service.js";

const settingsSchema = z.object({
  recipients: z.array(z.object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    mode: z.enum(["ALL", "SELECTED"]),
    categories: z.array(z.enum(LIVE_ALERT_CATEGORIES)).max(LIVE_ALERT_CATEGORIES.length)
  }).strict().superRefine((recipient, context) => {
    if (recipient.mode === "SELECTED" && !recipient.categories.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["categories"], message: "Select at least one alert category" });
    }
  })).max(50)
}).strict().superRefine((settings, context) => {
  const emails = settings.recipients.map((recipient) => recipient.email);
  if (new Set(emails).size !== emails.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["recipients"], message: "Recipient emails must be unique" });
  }
});

export async function getAdminLiveAlertEmailSettingsController(_req: Request, res: Response) {
  const setting = await SettingModel.findOne({ key: OPERATIONAL_ALERT_EMAIL_SETTINGS_KEY }).select("value").lean();
  if (setting) {
    res.json({ data: setting.value });
    return;
  }
  const recipients = (env.ADMIN_ALERT_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"))
    .map((email) => ({ email, mode: "ALL" as const, categories: [...LIVE_ALERT_CATEGORIES] }));
  res.json({ data: { recipients } });
}

export async function updateAdminLiveAlertEmailSettingsController(req: Request, res: Response) {
  const value = settingsSchema.parse(req.body);
  const setting = await SettingModel.findOneAndUpdate(
    { key: OPERATIONAL_ALERT_EMAIL_SETTINGS_KEY },
    { key: OPERATIONAL_ALERT_EMAIL_SETTINGS_KEY, value },
    { upsert: true, returnDocument: "after" }
  );
  res.json({ data: setting.value });
}

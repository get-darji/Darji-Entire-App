import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../env.js";
import { AppError } from "../middleware/error.js";
import { OperationalAlertModel, SettingModel } from "../models.js";
import {
  LIVE_ALERT_CATEGORIES,
  OPERATIONAL_ALERT_EMAIL_SETTINGS_KEY,
  isOperationalAlertEmailReady,
  sendOperationalAlertEmailTest
} from "../services/email-alert.service.js";
import { emitToAdmins } from "../services/socket.service.js";

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

export async function createAdminLiveAlertEmailTestController(_req: Request, res: Response) {
  if (!await isOperationalAlertEmailReady()) {
    throw new AppError(503, "Gmail API OAuth is not configured or connected. Connect Gmail in Admin Settings.");
  }

  const testToken = randomUUID();
  const title = "TEST: Live alert email verification";
  const description = "This synthetic alert was created from Admin Settings to verify Darji live alert email delivery. It is not linked to a customer or order.";
  const alert = await OperationalAlertModel.create({
    type: "EMAIL_TEST",
    status: "OPEN",
    severity: "INFO",
    title,
    message: description,
    dedupeKey: `EMAIL_TEST:${testToken}`,
    entityType: "system_test",
    entityId: testToken,
    metadata: { test: true, source: "admin_panel_alert_email_settings" }
  });

  const delivery = await sendOperationalAlertEmailTest({
    incidentKey: `operational-${alert.id}`,
    category: "other",
    title,
    description,
    severity: "info",
    source: "Admin Panel Email Test",
    detectedAt: new Date(alert.createdAt ?? Date.now()).toISOString()
  });

  if (delivery.sent === 0) {
    await OperationalAlertModel.updateOne(
      { _id: alert.id },
      { $set: { status: "RESOLVED", emailError: delivery.failed ? "The email provider rejected the test message" : "No configured email recipients" } }
    );
    if (delivery.recipients === 0) {
      throw new AppError(409, "No alert email recipients are configured. Add a recipient in Alert Emails and try again.");
    }
    throw new AppError(502, "Gmail API did not accept the test message. Check the Gmail connection and try again.");
  }

  await OperationalAlertModel.updateOne(
    { _id: alert.id },
    { $set: { emailSentAt: new Date() }, $unset: { emailError: 1 } }
  );
  const savedAlert = await OperationalAlertModel.findById(alert.id).lean();
  emitToAdmins("operational_alert:new", savedAlert);
  res.status(202).json({ data: { alert: savedAlert, delivery } });
}

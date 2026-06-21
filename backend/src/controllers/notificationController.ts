import type { Request, Response } from "express";
import { z } from "zod";
import { saveDeviceTokens } from "../services/push.service.js";
import { sendOtpNotification } from "../services/notificationService.js";

const deviceTokenSchema = z.object({
  fcmToken: z.string().trim().min(20).optional(),
  expoPushToken: z.string().trim().regex(/^ExponentPushToken\[[^\]]+\]$/).optional(),
  platform: z.enum(["android", "ios"]).optional(),
  app: z.string().trim().max(80).optional()
}).refine((input) => Boolean(input.fcmToken || input.expoPushToken), "At least one push token is required");

const testNotificationSchema = z.object({
  title: z.string().trim().min(1).max(120).default("Darji notification test"),
  body: z.string().trim().min(1).max(500).default("Push notifications are configured correctly.")
});

export async function registerDeviceTokenController(req: Request, res: Response) {
  const input = deviceTokenSchema.parse(req.body);
  await saveDeviceTokens(req.user!.id, input);
  res.json({ data: { ok: true } });
}

export async function sendTestNotificationController(req: Request, res: Response) {
  const input = testNotificationSchema.parse(req.body ?? {});
  await sendOtpNotification({
    userId: req.user!.id,
    title: input.title,
    body: input.body,
    data: { type: "NOTIFICATION_TEST", screen: "notifications" }
  });
  res.json({ data: { ok: true } });
}

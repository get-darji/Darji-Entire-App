import type { Request, Response } from "express";
import { z } from "zod";
import { NotificationCampaignModel, UserModel } from "../models.js";
import { removeDeviceTokens, saveDeviceTokens, sendPushToUsers } from "../services/push.service.js";
import { sendOtpNotification } from "../services/notificationService.js";
import { AppError } from "../middleware/error.js";

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

const adminSendNotificationSchema = z.object({
  channel: z.literal("push").default("push"),
  target: z.enum(["everyone", "customers", "tailors", "delivery"]),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  sendMode: z.enum(["now", "schedule"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable()
});

const notificationPreferencesSchema = z.object({
  notifications: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  offersPromotions: z.boolean().optional(),
  pickupReminders: z.boolean().optional(),
  deliveryUpdates: z.boolean().optional(),
  quietHours: z.boolean().optional(),
  receivingNotifications: z.boolean().optional()
});

export async function registerDeviceTokenController(req: Request, res: Response) {
  const input = deviceTokenSchema.parse(req.body);
  await saveDeviceTokens(req.user!.id, input);
  res.json({ data: { ok: true } });
}

export async function unregisterDeviceTokenController(req: Request, res: Response) {
  const input = deviceTokenSchema.parse(req.body);
  await removeDeviceTokens(req.user!.id, input);
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

async function deliverCampaign(campaign: { target: "everyone" | "customers" | "tailors" | "delivery"; title: string; body: string }) {
  const roleQuery =
    campaign.target === "customers" ? { role: "CUSTOMER" as const } :
    campaign.target === "tailors" ? { role: "TAILOR" as const } :
    campaign.target === "delivery" ? { role: "DELIVERY_PARTNER" as const } :
    { role: { $in: ["CUSTOMER", "TAILOR", "DELIVERY_PARTNER"] as const } };
  const users = await UserModel.find(roleQuery).select("_id role");
  const userIds = users.map((user) => String(user._id));
  const targetApps = campaign.target === "customers"
    ? ["customer"]
    : campaign.target === "tailors"
      ? ["tailor"]
      : campaign.target === "delivery"
        ? ["delivery"]
        : ["customer", "tailor", "delivery"];
  const delivery = await sendPushToUsers(userIds, {
    title: campaign.title,
    body: campaign.body,
    data: {
      type: "ADMIN_BROADCAST",
      target: campaign.target,
      screen: "notifications"
    },
    channelId: campaign.target === "delivery" ? "delivery-updates-v2" : campaign.target === "tailors" ? "tailor-pickup-updates-v2" : "customer-orders-v2",
    sound: "ding.mp3",
    targetApps
  });
  return { audienceCount: userIds.length, delivery };
}

async function completeCampaign(campaign: any) {
  try {
    const { audienceCount, delivery } = await deliverCampaign(campaign);
    campaign.recipientCount = audienceCount;
    campaign.eligibleRecipientCount = delivery.eligibleRecipientCount;
    campaign.deviceCount = delivery.deviceCount;
    campaign.deliveredCount = delivery.successCount;
    campaign.failedCount = delivery.failureCount;
    if (delivery.successCount < 1) {
      throw new Error(delivery.error ?? `No push notifications were accepted for ${audienceCount} matching user${audienceCount === 1 ? "" : "s"}.`);
    }
    campaign.status = "SENT";
    campaign.sentAt = new Date();
    campaign.error = delivery.error ?? (delivery.failureCount > 0 ? `${delivery.failureCount} device deliver${delivery.failureCount === 1 ? "y" : "ies"} failed.` : undefined);
    await campaign.save();
    return delivery;
  } catch (error) {
    campaign.status = "FAILED";
    campaign.error = error instanceof Error ? error.message.slice(0, 500) : "Notification provider failed";
    await campaign.save();
    throw error;
  }
}

export async function sendAdminNotificationController(req: Request, res: Response) {
  const input = adminSendNotificationSchema.parse(req.body ?? {});
  const sendMode = input.sendMode ?? (input.scheduledAt ? "schedule" : "now");
  const scheduledAt = sendMode === "schedule" && input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (sendMode === "schedule" && (!scheduledAt || scheduledAt.getTime() <= Date.now() + 5000)) {
    throw new AppError(400, "Choose a schedule time at least a few seconds in the future.");
  }
  const scheduled = sendMode === "schedule";
  const campaign = await NotificationCampaignModel.create({
    channel: input.channel,
    target: input.target,
    title: input.title,
    body: input.body,
    scheduledAt: scheduledAt ?? new Date(),
    status: scheduled ? "SCHEDULED" : "SENDING",
    createdBy: req.user!.id
  });
  if (scheduled) {
    res.status(202).json({ data: { ok: true, recipients: 0, campaign } });
    return;
  }
  try {
    const delivery = await completeCampaign(campaign);
    res.json({ data: { ok: true, recipients: delivery.successCount, delivery, campaign } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Notification provider failed";
    throw new AppError(502, `Push campaign failed: ${reason}`);
  }
}

export async function listAdminNotificationCampaignsController(_req: Request, res: Response) {
  const campaigns = await NotificationCampaignModel.find().sort({ createdAt: -1 }).limit(200);
  res.json({ data: campaigns });
}

export async function processDueNotificationCampaigns() {
  for (let index = 0; index < 20; index += 1) {
    const campaign = await NotificationCampaignModel.findOneAndUpdate(
      { status: "SCHEDULED", scheduledAt: { $lte: new Date() } },
      { $set: { status: "SENDING" } },
      { sort: { scheduledAt: 1 }, returnDocument: "after" }
    );
    if (!campaign) break;
    try {
      await completeCampaign(campaign);
    } catch (error) {
      console.error("Scheduled notification campaign failed", error);
    }
  }
}

export async function updateNotificationPreferencesController(req: Request, res: Response) {
  const input = notificationPreferencesSchema.parse(req.body ?? {});
  const $set = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [`notificationPreferences.customer.${key}`, value])
  );
  const user = await UserModel.findByIdAndUpdate(req.user!.id, { $set }, { returnDocument: "after" }).select("notificationPreferences");
  res.json({ data: user?.toJSON().notificationPreferences?.customer ?? input });
}

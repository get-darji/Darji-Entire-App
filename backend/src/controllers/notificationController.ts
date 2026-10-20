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

const notificationCategorySchema = z.enum(["GENERAL_ANNOUNCEMENT", "ORDER_UPDATE", "TAILORING_UPDATE", "DELIVERY_UPDATE", "PAYMENT_UPDATE", "PROMOTIONAL", "CUSTOM"]);
const notificationStyleSchema = z.enum(["STANDARD", "BIG_TEXT", "LARGE_ICON", "BIG_PICTURE", "ACTION"]);
const richBodySchema = z.object({
  blocks: z.array(z.object({
    type: z.enum(["paragraph", "bullet"]),
    text: z.string().trim().min(1).max(500),
    marks: z.array(z.enum(["bold", "italic", "underline"])).max(3).optional()
  })).min(1).max(12)
}).strict();
const httpsUrlSchema = z.string().url().refine((value) => new URL(value).protocol === "https:", "Image URL must use HTTPS");
const actionTypeSchema = z.enum(["OPEN_APP", "VIEW_ORDER", "TRACK_DELIVERY", "VIEW_PAYMENT", "VIEW_ASSIGNED_WORK", "VIEW_MEASUREMENT_VISIT", "VIEW_TAILORING_REQUEST", "VIEW_DELIVERY_TASK", "VIEW_BATCH", "VIEW_ANNOUNCEMENT"]);
const richActionSchema = z.object({ type: actionTypeSchema, entityId: z.string().trim().min(1).max(120).optional() }).strict();
const targetSchema = z.enum(["everyone", "customers", "tailors", "delivery", "customer", "tailor", "delivery_partner"]);

const adminSendNotificationSchema = z.object({
  channel: z.literal("push").default("push"),
  target: targetSchema,
  targetUserId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  payloadVersion: z.literal(1).optional(),
  category: notificationCategorySchema.optional(),
  bodyFormat: z.enum(["PLAIN_TEXT", "RESTRICTED_RICH_TEXT"]).optional(),
  richBody: richBodySchema.optional(),
  style: notificationStyleSchema.optional(),
  largeIconUrl: httpsUrlSchema.optional().nullable(),
  imageUrl: httpsUrlSchema.optional().nullable(),
  action: richActionSchema.optional().nullable(),
  isTest: z.boolean().optional(),
  sendMode: z.enum(["now", "schedule"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable()
}).superRefine((input, context) => {
  if (["customer", "tailor", "delivery_partner"].includes(input.target) && !input.targetUserId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetUserId"], message: "Choose a recipient" });
  }
  if (input.bodyFormat === "RESTRICTED_RICH_TEXT" && !input.richBody) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["richBody"], message: "Rich text content is required" });
  }
  const entityActions = new Set(["VIEW_ORDER", "TRACK_DELIVERY", "VIEW_PAYMENT", "VIEW_ASSIGNED_WORK", "VIEW_MEASUREMENT_VISIT", "VIEW_TAILORING_REQUEST", "VIEW_DELIVERY_TASK", "VIEW_BATCH"]);
  if (input.action && entityActions.has(input.action.type) && !input.action.entityId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["action", "entityId"], message: "This action requires a record ID" });
  }
  const allowedByAudience: Record<string, string[]> = {
    customers: ["OPEN_APP", "VIEW_ORDER", "TRACK_DELIVERY", "VIEW_PAYMENT", "VIEW_ANNOUNCEMENT"], customer: ["OPEN_APP", "VIEW_ORDER", "TRACK_DELIVERY", "VIEW_PAYMENT", "VIEW_ANNOUNCEMENT"],
    tailors: ["OPEN_APP", "VIEW_ASSIGNED_WORK", "VIEW_MEASUREMENT_VISIT", "VIEW_TAILORING_REQUEST"], tailor: ["OPEN_APP", "VIEW_ASSIGNED_WORK", "VIEW_MEASUREMENT_VISIT", "VIEW_TAILORING_REQUEST"],
    delivery: ["OPEN_APP", "VIEW_DELIVERY_TASK", "VIEW_BATCH"], delivery_partner: ["OPEN_APP", "VIEW_DELIVERY_TASK", "VIEW_BATCH"],
    everyone: ["OPEN_APP", "VIEW_ANNOUNCEMENT"]
  };
  if (input.action && !allowedByAudience[input.target].includes(input.action.type)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["action", "type"], message: "This action is not supported by the selected audience" });
  }
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

const devicePermissionStatusSchema = z.enum(["granted", "denied", "undetermined", "limited", "unavailable"]);
const devicePermissionsSchema = z.object({
  platform: z.enum(["android", "ios", "web"]),
  permissions: z.object({
    notifications: devicePermissionStatusSchema,
    location: devicePermissionStatusSchema,
    camera: devicePermissionStatusSchema,
    mediaLibrary: devicePermissionStatusSchema,
    microphone: devicePermissionStatusSchema
  })
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

function actionScreen(action: { type: z.infer<typeof actionTypeSchema> } | undefined, app: string) {
  if (!action || action.type === "OPEN_APP" || action.type === "VIEW_ANNOUNCEMENT") return "notifications";
  if (app === "customer") return action.type === "VIEW_ORDER" || action.type === "TRACK_DELIVERY" || action.type === "VIEW_PAYMENT" ? "orderDetails" : "notifications";
  if (app === "tailor") return action.type === "VIEW_TAILORING_REQUEST" ? "requestDetails" : action.type === "VIEW_ASSIGNED_WORK" || action.type === "VIEW_MEASUREMENT_VISIT" ? "orderDetails" : "notifications";
  return action.type === "VIEW_DELIVERY_TASK" || action.type === "VIEW_BATCH" ? "pickupDetails" : "notifications";
}

function channelFor(app: string, category: string) {
  if (app === "customer") return category === "PROMOTIONAL" ? "customer-offers-v2" : category === "PAYMENT_UPDATE" ? "customer-payments-v2" : "customer-orders-v2";
  if (app === "tailor") return category === "TAILORING_UPDATE" ? "tailor-new-requests-v2" : "tailor-pickup-updates-v2";
  return category === "DELIVERY_UPDATE" ? "delivery-updates-v2" : "delivery-pickup-assigned-v2";
}

async function deliverCampaign(campaign: any) {
  const roleQuery: Record<string, unknown> =
    ["customer", "tailor", "delivery_partner"].includes(campaign.target) ? { _id: campaign.targetUserId! } :
    campaign.target === "customers" ? { $or: [{ role: "CUSTOMER" }, { "fcmTokens.app": "customer" }, { "expoPushTokens.app": "customer" }] } :
    campaign.target === "tailors" ? { $or: [{ role: "TAILOR" }, { "fcmTokens.app": "tailor" }, { "expoPushTokens.app": "tailor" }] } :
    campaign.target === "delivery" ? { $or: [{ role: "DELIVERY_PARTNER" }, { "fcmTokens.app": "delivery" }, { "expoPushTokens.app": "delivery" }] } :
    { $or: [{ "fcmTokens.0": { $exists: true } }, { "expoPushTokens.0": { $exists: true } }] };
  const users = await UserModel.find(roleQuery).select("_id role");
  const userIds = users.map((user) => String(user._id));
  const targetApps = campaign.target === "customers" || campaign.target === "customer"
    ? ["customer"]
    : campaign.target === "tailors" || campaign.target === "tailor"
      ? ["tailor"]
      : campaign.target === "delivery" || campaign.target === "delivery_partner"
        ? ["delivery"]
        : ["customer", "tailor", "delivery"];
  const appDeliveries = await Promise.all(targetApps.map((app) => sendPushToUsers(userIds, {
    title: campaign.title,
    body: campaign.body,
    data: {
      type: "ADMIN_BROADCAST",
      target: campaign.target,
      screen: actionScreen(campaign.action, app),
      actionType: campaign.action?.type ?? "OPEN_APP",
      entityId: campaign.action?.entityId ?? "",
      orderId: ["VIEW_ORDER", "TRACK_DELIVERY", "VIEW_PAYMENT"].includes(campaign.action?.type) ? campaign.action?.entityId ?? "" : ""
    },
    channelId: channelFor(app, campaign.category ?? "GENERAL_ANNOUNCEMENT"),
    sound: "ding.mp3",
    targetApps: [app],
    imageUrl: campaign.imageUrl ?? undefined,
    largeIconUrl: campaign.largeIconUrl ?? undefined,
    notificationStyle: campaign.style ?? "STANDARD",
    richBody: campaign.bodyFormat === "RESTRICTED_RICH_TEXT" ? campaign.richBody : undefined
  })));
  const delivery = appDeliveries.reduce((total, item) => ({
    requestedRecipientCount: total.requestedRecipientCount + item.requestedRecipientCount,
    eligibleRecipientCount: total.eligibleRecipientCount + item.eligibleRecipientCount,
    deviceCount: total.deviceCount + item.deviceCount,
    successCount: total.successCount + item.successCount,
    failureCount: total.failureCount + item.failureCount,
    error: [total.error, item.error].filter(Boolean).join("; ") || undefined
  }), { requestedRecipientCount: 0, eligibleRecipientCount: 0, deviceCount: 0, successCount: 0, failureCount: 0, error: undefined as string | undefined });
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
  if (["customer", "tailor", "delivery_partner"].includes(input.target)) {
    const recipient = await UserModel.findById(input.targetUserId).select("role");
    const expectedRole = input.target === "customer" ? "CUSTOMER" : input.target === "tailor" ? "TAILOR" : "DELIVERY_PARTNER";
    if (!recipient || recipient.role !== expectedRole) throw new AppError(400, "The selected recipient does not belong to that audience.");
  }
  const sendMode = input.sendMode ?? (input.scheduledAt ? "schedule" : "now");
  const scheduledAt = sendMode === "schedule" && input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (sendMode === "schedule" && (!scheduledAt || scheduledAt.getTime() <= Date.now() + 5000)) {
    throw new AppError(400, "Choose a schedule time at least a few seconds in the future.");
  }
  const scheduled = sendMode === "schedule";
  const campaign = await NotificationCampaignModel.create({
    channel: input.channel,
    target: input.target,
    targetUserId: input.targetUserId,
    title: input.title,
    body: input.body,
    payloadVersion: input.payloadVersion ?? 1,
    category: input.category ?? "GENERAL_ANNOUNCEMENT",
    bodyFormat: input.bodyFormat ?? "PLAIN_TEXT",
    richBody: input.richBody,
    style: input.style ?? "STANDARD",
    largeIconUrl: input.largeIconUrl ?? undefined,
    imageUrl: input.imageUrl ?? undefined,
    action: input.action ?? undefined,
    isTest: input.isTest ?? false,
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
  const creatorIds = [...new Set(campaigns.map((campaign) => String(campaign.createdBy)).filter(Boolean))];
  const creators = creatorIds.length ? await UserModel.find({ _id: { $in: creatorIds } }).select("name phone email") : [];
  const creatorNames = new Map(creators.map((user) => [String(user._id), user.name || user.email || user.phone || "Administrator"]));
  res.json({ data: campaigns.map((campaign) => ({ ...campaign.toJSON(), createdByName: creatorNames.get(String(campaign.createdBy)) ?? "Administrator" })) });
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

export async function updateDevicePermissionsController(req: Request, res: Response) {
  const input = devicePermissionsSchema.parse(req.body ?? {});
  const snapshot = { ...input, reportedAt: new Date() };
  const user = await UserModel.findByIdAndUpdate(
    req.user!.id,
    { $set: { "devicePermissions.customer": snapshot } },
    { returnDocument: "after" }
  ).select("devicePermissions");
  res.json({ data: user?.toJSON().devicePermissions?.customer ?? snapshot });
}

import { NotificationModel } from "../models.js";
import { sendPushToUsers, type PushPayload } from "./push.service.js";

export type NotificationEventInput = {
  userId: string;
  title: string;
  body: string;
  data: Record<string, string | number | boolean | undefined>;
  imageUrl?: string;
  sound?: string;
};

type NotificationDefaults = Pick<PushPayload, "channelId" | "categoryId" | "actions" | "targetApps">;

async function sendEventNotification(input: NotificationEventInput, defaults: NotificationDefaults) {
  const orderId = typeof input.data.orderId === "string" ? input.data.orderId : undefined;
  const notification = await NotificationModel.create({
    userId: input.userId,
    orderId,
    title: input.title,
    body: input.body
  });
  await sendPushToUsers([input.userId], {
    title: input.title,
    body: input.body,
    imageUrl: input.imageUrl,
    data: input.data,
    sound: input.sound ?? "ding.mp3",
    ...defaults
  });
  return notification;
}

export function sendNewRequestNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "darji-incoming-orders-v3",
    categoryId: "TAILOR_NEW_REQUEST",
    actions: ["Send Quote", "Reject", "View Details"],
    targetApps: ["tailor"]
  });
}

export function sendQuoteReceivedNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "customer-orders-v2",
    categoryId: "DARJI_ORDER",
    actions: ["View Order"]
  });
}

export function sendOrderConfirmedNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "tailor-new-requests-v2",
    categoryId: "TAILOR_QUOTE_ACCEPTED",
    actions: ["View Quote"]
  });
}

export function sendPickupAssignedNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "darji-incoming-orders-v3",
    categoryId: "DELIVERY_PICKUP_REQUEST",
    actions: ["Accept", "Reject", "View Details"],
    targetApps: ["delivery"]
  });
}

export function sendDeliveryBatchReadyNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "darji-incoming-orders-v3",
    categoryId: "DELIVERY_PICKUP_REQUEST",
    actions: ["Accept", "Reject", "View Details"],
    targetApps: ["delivery"]
  });
}

export function sendOrderCompletedNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "customer-orders-v2",
    categoryId: "CUSTOMER_ORDER_COMPLETED",
    actions: ["View Order"]
  });
}

export function sendPaymentSuccessNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "customer-payments-v2",
    categoryId: "DARJI_ORDER",
    actions: ["View"]
  });
}

export function sendOtpNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "customer-orders-v2",
    categoryId: "DARJI_ORDER",
    actions: ["View"]
  });
}

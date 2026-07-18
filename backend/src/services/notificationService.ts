import { NotificationModel } from "../models.js";
import { sendPushToUsers, type PushPayload } from "./push.service.js";

export type NotificationEventInput = {
  userId: string;
  title: string;
  body: string;
  data: Record<string, string | number | boolean | undefined>;
  imageUrl?: string;
};

type NotificationDefaults = Pick<PushPayload, "channelId" | "categoryId" | "actions">;

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
    sound: "ding.mp3",
    ...defaults
  });
  return notification;
}

export function sendNewRequestNotification(input: NotificationEventInput) {
  return sendEventNotification(input, {
    channelId: "tailor-new-requests-v2",
    categoryId: "TAILOR_NEW_REQUEST",
    actions: ["Send Quote", "View Details"]
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
    channelId: input.data.taskType === "tailor_to_customer" ? "delivery-updates-v2" : "delivery-pickup-assigned-v2",
    categoryId: "DELIVERY_PICKUP_REQUEST",
    actions: ["Accept", "View Details"]
  });
}

export function sendDeliveryBatchReadyNotification(input: NotificationEventInput) {
  const isDropBatch = String(input.data.deliveryType ?? "").toUpperCase() === "DROP";
  return sendEventNotification(input, {
    channelId: isDropBatch ? "delivery-updates-v2" : "delivery-pickup-assigned-v2",
    categoryId: "DELIVERY_PICKUP_REQUEST",
    actions: ["Accept", "View Details"]
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

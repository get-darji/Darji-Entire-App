import type { DarjiApp } from "../notifications/channels";

export type NotificationData = Record<string, unknown> & {
  type?: string;
  screen?: string;
  orderId?: string;
  requestId?: string;
  taskId?: string;
  pickupId?: string;
};

export type NotificationDestination = {
  screen: string;
  entityId?: string;
  actionIdentifier?: string;
  data: NotificationData;
};

const customerOrderTypes = new Set([
  "ORDER_CONFIRMED",
  "QUOTE_RECEIVED",
  "PICKUP_ASSIGNED",
  "PICKUP_COMPLETED",
  "ORDER_COMPLETED",
  "PAYMENT_SUCCESS",
  "OTP_VERIFICATION",
  "TAILOR_ACCEPTED",
  "TAILORING_WORK_STATUS",
  "DELIVERY_REQUEST_ACCEPTED"
]);

export function resolveNotificationDestination(
  app: DarjiApp,
  data: NotificationData,
  actionIdentifier?: string
): NotificationDestination {
  const entityId = data.orderId ?? data.requestId ?? data.taskId ?? data.pickupId;
  if (typeof data.screen === "string") {
    return { screen: data.screen, entityId, actionIdentifier, data };
  }
  if (["support", "bug"].includes(String(data.type))) {
    return { screen: "support_center", entityId, actionIdentifier, data };
  }

  if (app === "customer") {
    return { screen: customerOrderTypes.has(String(data.type)) ? "orderDetails" : "notifications", entityId, actionIdentifier, data };
  }
  if (app === "tailor") {
    const isRequest = ["NEW_REQUEST", "TAILORING_REQUEST_CREATED"].includes(String(data.type));
    return { screen: isRequest ? "requestDetails" : "orderDetails", entityId, actionIdentifier, data };
  }
  return { screen: "pickupDetails", entityId, actionIdentifier, data };
}

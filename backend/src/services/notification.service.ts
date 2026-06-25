import { NotificationModel } from "../models.js";
import { sendPushToUsers } from "./push.service.js";

import { emitToCustomer } from "./socket.service.js";

export async function notifyUser(input: { userId: string; orderId?: string; title: string; body: string; data?: Record<string, string | number | boolean | undefined>; imageUrl?: string; actions?: string[] }) {
  const notification = await NotificationModel.create(input);
  await sendPushToUsers([input.userId], {
    title: input.title,
    body: input.body,
    imageUrl: input.imageUrl,
    actions: input.actions,
    channelId: "customer-orders-v2",
    categoryId: "DARJI_ORDER",
    data: {
      orderId: input.orderId,
      ...(input.data ?? {})
    }
  });

  emitToCustomer(input.userId, "notification:new", {
    title: input.title,
    body: input.body,
    orderId: input.orderId
  });

  return notification;
}

export function orderStatusMessage(status: string) {
  const messages: Record<string, string> = {
    ORDER_PLACED: "Your order has been placed.",
    PICKUP_ASSIGNED: "A delivery partner has been assigned for pickup.",
    STITCHING_COMPLETED: "Your garment stitching is complete.",
    OUT_FOR_DELIVERY: "Your order is out for delivery.",
    DELIVERED: "Your order has been delivered."
  };
  return messages[status] ?? `Order status updated to ${status}.`;
}

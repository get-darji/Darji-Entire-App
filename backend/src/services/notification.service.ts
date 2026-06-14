import { prisma } from "../prisma.js";

export async function notifyUser(input: { userId: string; orderId?: string; title: string; body: string }) {
  const notification = await prisma.notification.create({ data: input });
  // FCM dispatch belongs here once Firebase credentials are configured.
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

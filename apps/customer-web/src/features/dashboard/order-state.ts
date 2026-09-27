import type { TailoringRequest } from "@/src/lib/types";

export function isFinishedOrder(order: Pick<TailoringRequest, "orderStatus" | "status">) {
  return ["completed", "delivered"].includes(String(order.orderStatus ?? order.status).toLowerCase());
}

export function orderStatusLabel(order: Pick<TailoringRequest, "orderStatus" | "status" | "paymentStatus">) {
  if (order.status === "CANCELLED" || order.orderStatus?.toLowerCase() === "cancelled") return "Cancelled";
  if (isFinishedOrder(order)) return "Completed";
  if (order.orderStatus) return order.orderStatus.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  if (order.status === "TAILOR_SELECTED") return "Confirmed";
  return order.status === "QUOTE_REQUESTED" ? "Awaiting quotes" : "Payment pending";
}

export const measurementSlots = ["08:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM", "06:00 PM - 08:00 PM", "08:00 PM - 10:00 PM"];

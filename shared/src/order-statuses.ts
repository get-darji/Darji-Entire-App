export const orderStatuses = [
  "ORDER_PLACED",
  "PICKUP_ASSIGNED",
  "CLOTH_PICKED",
  "AT_TAILOR",
  "CUTTING",
  "STITCHING_STARTED",
  "FINISHING",
  "STITCHING_COMPLETED",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED"
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusTransitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  ORDER_PLACED: ["PICKUP_ASSIGNED", "CANCELLED"],
  PICKUP_ASSIGNED: ["CLOTH_PICKED", "CANCELLED"],
  CLOTH_PICKED: ["AT_TAILOR", "CANCELLED"],
  AT_TAILOR: ["CUTTING", "STITCHING_STARTED", "CANCELLED"],
  CUTTING: ["STITCHING_STARTED", "FINISHING", "CANCELLED"],
  STITCHING_STARTED: ["FINISHING", "STITCHING_COMPLETED", "CANCELLED"],
  FINISHING: ["STITCHING_COMPLETED", "READY", "CANCELLED"],
  STITCHING_COMPLETED: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: []
};

export function allowedOrderStatusTransitions(status: string): readonly OrderStatus[] {
  return orderStatusTransitions[status as OrderStatus] ?? [];
}

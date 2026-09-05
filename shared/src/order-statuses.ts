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

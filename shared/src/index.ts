import { z } from "zod";
import { orderStatuses } from "./order-statuses.js";

export { allowedOrderStatusTransitions, orderStatuses, orderStatusTransitions } from "./order-statuses.js";
export type { OrderStatus } from "./order-statuses.js";

export const roles = ["CUSTOMER", "TAILOR", "DELIVERY_PARTNER", "ADMIN", "SUPER_ADMIN"] as const;

export const paymentMethods = ["UPI", "COD", "ONLINE"] as const;
export const paymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export const supportStatuses = ["OPEN", "WAITING_FOR_CUSTOMER", "WAITING_FOR_ADMIN", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;

export type Role = (typeof roles)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit Indian mobile number");

export const requestOtpSchema = z.object({
  phone: phoneSchema,
  role: z.enum(roles).optional(),
  mode: z.enum(["default", "twofactor"]).optional().default("twofactor")
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().regex(/^\d{4,6}$/),
  role: z.enum(roles).default("CUSTOMER")
});

export const addressSchema = z.object({
  name: z.string().min(2),
  phone: phoneSchema,
  line1: z.string().min(5),
  line2: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  landmark: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isDefault: z.boolean().default(false)
});

export const measurementSchema = z.object({
  label: z.string().min(2),
  fields: z.record(z.string(), z.union([z.string(), z.number()])),
  imageUrl: z.string().url().optional().nullable()
});

export const orderItemSchema = z.object({
  serviceId: z.string(),
  quantity: z.number().int().positive().default(1),
  referenceImageUrl: z.string().url().optional().nullable(),
  measurement: measurementSchema.optional(),
  instructions: z.string().max(1000).optional().nullable()
});

export const createOrderSchema = z.object({
  addressId: z.string(),
  pickupScheduledAt: z.string().datetime(),
  paymentMethod: z.enum(paymentMethods),
  couponCode: z.string().optional().nullable(),
  instructions: z.string().max(1000).optional().nullable(),
  items: z.array(orderItemSchema).min(1)
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatuses),
  note: z.string().optional(),
  imageUrl: z.string().url().optional()
});

export const couponSchema = z.object({
  code: z.string().min(3).max(24).toUpperCase(),
  description: z.string().min(3),
  benefitType: z.enum(["ORDER_FLAT", "ORDER_PERCENTAGE", "FREE_DELIVERY", "DELIVERY_PERCENTAGE", "WAIVE_PLATFORM_FEE", "WAIVE_SMALL_ORDER_FEE", "FREE_MEASUREMENT"]).optional(),
  discountType: z.enum(["FLAT", "PERCENTAGE"]),
  discountValue: z.number().nonnegative(),
  minOrderValue: z.number().nonnegative().default(0),
  maxDiscount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perCustomerLimit: z.number().int().positive().optional().nullable(),
  maxCampaignDiscount: z.number().positive().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  orderEligibilityType: z.enum(["ANY", "FIRST", "EXACT", "RANGE"]).default("ANY"),
  orderNumber: z.number().int().positive().optional().nullable(),
  orderNumberFrom: z.number().int().positive().optional().nullable(),
  orderNumberTo: z.number().int().positive().optional().nullable(),
  audienceType: z.enum(["EVERYONE", "SELECTED_CUSTOMERS", "NEW_CUSTOMERS", "INACTIVE_CUSTOMERS", "REGISTERED_BETWEEN"]).default("EVERYONE"),
  selectedCustomerIds: z.array(z.string().min(1)).max(10000).default([]),
  inactiveDays: z.number().int().positive().optional().nullable(),
  registeredAfter: z.string().datetime().optional().nullable(),
  registeredBefore: z.string().datetime().optional().nullable(),
  orderScope: z.enum(["BOTH", "CATALOG", "TAILORING"]).default("BOTH"),
  allowedDeliveryModes: z.array(z.enum(["STANDARD", "EXPRESS", "INSTANT"])).default([]),
  allowedPaymentMethods: z.array(z.enum(paymentMethods)).default([]),
  isActive: z.boolean().default(true)
}).superRefine((coupon, context) => {
  const benefitType = coupon.benefitType ?? (coupon.discountType === "PERCENTAGE" ? "ORDER_PERCENTAGE" : "ORDER_FLAT");
  if (["ORDER_PERCENTAGE", "DELIVERY_PERCENTAGE"].includes(benefitType) && coupon.discountValue > 100) {
    context.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discount cannot exceed 100" });
  }
  if (["ORDER_FLAT", "ORDER_PERCENTAGE", "DELIVERY_PERCENTAGE"].includes(benefitType) && coupon.discountValue <= 0) {
    context.addIssue({ code: "custom", path: ["discountValue"], message: "Discount value must be greater than zero" });
  }
  if (coupon.orderEligibilityType === "EXACT" && !coupon.orderNumber) context.addIssue({ code: "custom", path: ["orderNumber"], message: "Exact order number is required" });
  if (coupon.orderEligibilityType === "RANGE" && (!coupon.orderNumberFrom || !coupon.orderNumberTo || coupon.orderNumberFrom > coupon.orderNumberTo)) context.addIssue({ code: "custom", path: ["orderNumberFrom"], message: "A valid order-number range is required" });
  if (coupon.audienceType === "SELECTED_CUSTOMERS" && !coupon.selectedCustomerIds.length) context.addIssue({ code: "custom", path: ["selectedCustomerIds"], message: "Select at least one customer" });
});

export const supportMessageSchema = z.object({
  sender: z.enum(["client", "admin", "system"]),
  senderId: z.string().optional().nullable(),
  senderName: z.string().optional().nullable(),
  text: z.string(),
  attachments: z.array(z.string()).optional(),
  type: z.enum(["text", "voice", "image", "video", "system"]).default("text"),
  createdAt: z.string().optional().nullable()
});

export type SupportMessage = z.infer<typeof supportMessageSchema>;

export const supportTicketSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
  orderId: z.string().optional().nullable(),
  adminResponse: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assignedTo: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional(),
  messages: z.array(supportMessageSchema).optional()
});

export const bugReportSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  screenshot: z.string().optional().nullable(),
  deviceInfo: z.string(),
  appVersion: z.string().default("0.1.0"),
  status: z.enum(["NEW", "INVESTIGATING", "IN_PROGRESS", "FIXED", "CLOSED"]).default("NEW"),
  assignedTo: z.string().optional().nullable(),
  messages: z.array(supportMessageSchema).optional()
});

export const accountChangeRequestSchema = z.object({
  type: z.enum([
    "ShopName",
    "ShopDetails",
    "BankAccount",
    "UPI",
    "PaymentDetails",
    "Address",
    "ContactNumber",
    "Vehicle",
    "RC",
    "DrivingLicense",
    "IdentityDocument",
    "Address",
    "AccountDeletion"
  ]),
  requestedValues: z.record(z.string(), z.any()),
  documents: z.array(z.string()).optional(),
  messages: z.array(supportMessageSchema).optional()
});

export const serviceCatalog = [
  {
    category: "Men",
    items: [
      ["Shirt", 699, "3-5 days", "Custom stitched formal and casual shirts."],
      ["Pant", 799, "3-5 days", "Tailored trousers with fit preferences."],
      ["Kurta", 899, "4-6 days", "Daily and festive kurtas."],
      ["Blazer", 2499, "7-10 days", "Structured blazer tailoring."],
      ["Suit", 3999, "8-12 days", "Two piece and three piece suits."],
      ["Sherwani", 5499, "10-14 days", "Wedding and occasion sherwanis."]
    ]
  },
  {
    category: "Women",
    items: [
      ["Blouse", 599, "3-5 days", "Saree blouse stitching and alterations."],
      ["Suit", 1299, "5-7 days", "Salwar, anarkali, and straight suit stitching."],
      ["Gown", 2999, "8-12 days", "Party and evening gowns."],
      ["Lehenga", 4999, "10-14 days", "Custom lehenga stitching and finishing."]
    ]
  },
  {
    category: "Kids",
    items: [["Kids Wear", 599, "3-5 days", "Comfortable custom wear for children."]]
  },
  {
    category: "Alteration",
    items: [["Alteration", 199, "1-2 days", "Fit corrections, hemming, and repairs."]]
  }
] as const;

export type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

export type ServiceItem = {
  id: string;
  category: string;
  name: string;
  price: number;
  estimatedDelivery: string;
  description: string;
  imageUrl: string;
};

export function getPlatformFee(orderValue: number) {
  if (orderValue <= 0) return 0;
  if (orderValue <= 199) return 5;
  if (orderValue <= 499) return 8;
  if (orderValue <= 999) return 10;
  if (orderValue <= 1999) return 15;
  return 20;
}

export function getSmallOrderFee(orderValue: number) {
  if (orderValue <= 0) return 0;
  if (orderValue < 99) return 19;
  return 0;
}

export const HOME_MEASUREMENT_FEE = 99;
export const MEASUREMENT_VISIT_BASE_PAYOUT = 30;
export const MEASUREMENT_VISIT_PER_KM = 10;

export function measurementVisitChargeableDistanceMeters(distanceMeters?: number | null) {
  const oneWayDistanceMeters = Math.max(0, Number(distanceMeters) || 0);
  return oneWayDistanceMeters * 2;
}

export function measurementVisitFee(_distanceMeters?: number | null) {
  return HOME_MEASUREMENT_FEE;
}

export function measurementVisitPayout(distanceMeters?: number | null) {
  const km = measurementVisitChargeableDistanceMeters(distanceMeters) / 1000;
  return Math.round(MEASUREMENT_VISIT_BASE_PAYOUT + km * MEASUREMENT_VISIT_PER_KM);
}

export function calculateCouponDiscount(
  coupon: { discountType?: unknown; discountValue?: unknown; maxDiscount?: unknown },
  subtotal: number
) {
  const value = Number(coupon.discountValue ?? 0);
  const raw = coupon.discountType === "PERCENTAGE" ? subtotal * value / 100 : value;
  const capped = coupon.maxDiscount != null ? Math.min(raw, Number(coupon.maxDiscount)) : raw;
  return Number(Math.max(0, Math.min(capped, subtotal)).toFixed(2));
}

export type CouponPricingBreakdown = {
  orderSubtotal: number;
  deliveryFee?: number;
  platformFee?: number;
  smallOrderFee?: number;
  homeMeasurementFee?: number;
};

export function calculateCouponBenefit(
  coupon: { benefitType?: unknown; discountType?: unknown; discountValue?: unknown; maxDiscount?: unknown },
  pricing: CouponPricingBreakdown
) {
  const normalized = {
    orderSubtotal: Math.max(0, Number(pricing.orderSubtotal ?? 0)),
    deliveryFee: Math.max(0, Number(pricing.deliveryFee ?? 0)),
    platformFee: Math.max(0, Number(pricing.platformFee ?? 0)),
    smallOrderFee: Math.max(0, Number(pricing.smallOrderFee ?? 0)),
    homeMeasurementFee: Math.max(0, Number(pricing.homeMeasurementFee ?? 0))
  };
  const totalBeforeDiscount = Object.values(normalized).reduce((sum, value) => sum + value, 0);
  const legacyType = coupon.discountType === "PERCENTAGE" ? "ORDER_PERCENTAGE" : "ORDER_FLAT";
  const benefitType = String(coupon.benefitType ?? legacyType);
  const value = Math.max(0, Number(coupon.discountValue ?? 0));
  let raw = 0;
  if (benefitType === "ORDER_PERCENTAGE") raw = totalBeforeDiscount * value / 100;
  else if (benefitType === "ORDER_FLAT") raw = value;
  else if (benefitType === "FREE_DELIVERY") raw = normalized.deliveryFee;
  else if (benefitType === "DELIVERY_PERCENTAGE") raw = normalized.deliveryFee * value / 100;
  else if (benefitType === "WAIVE_PLATFORM_FEE") raw = normalized.platformFee;
  else if (benefitType === "WAIVE_SMALL_ORDER_FEE") raw = normalized.smallOrderFee;
  else if (benefitType === "FREE_MEASUREMENT") raw = normalized.homeMeasurementFee;
  const capped = coupon.maxDiscount != null ? Math.min(raw, Number(coupon.maxDiscount)) : raw;
  const discount = Number(Math.max(0, Math.min(capped, totalBeforeDiscount)).toFixed(2));
  return {
    benefitType,
    discount,
    totalBeforeDiscount: Number(totalBeforeDiscount.toFixed(2)),
    affectedComponent: benefitType.includes("DELIVERY") ? "DELIVERY" : benefitType === "WAIVE_PLATFORM_FEE" ? "PLATFORM_FEE" : benefitType === "WAIVE_SMALL_ORDER_FEE" ? "SMALL_ORDER_FEE" : benefitType === "FREE_MEASUREMENT" ? "MEASUREMENT" : "ORDER"
  };
}

export * from "./localization.js";
export * from "./platform-status.js";
export * from "./service-area.js";
export * from "./flow-back-navigation.js";
export * from "./customer-website-slider.js";
export * from "./festival-theme.js";

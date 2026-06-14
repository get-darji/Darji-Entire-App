import { z } from "zod";

export const roles = ["CUSTOMER", "TAILOR", "DELIVERY_PARTNER", "ADMIN"] as const;
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

export const paymentMethods = ["UPI", "COD", "ONLINE"] as const;
export const paymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export const supportStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export type Role = (typeof roles)[number];
export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit Indian mobile number");

export const requestOtpSchema = z.object({
  phone: phoneSchema,
  role: z.enum(roles).optional()
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6),
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
  discountType: z.enum(["FLAT", "PERCENTAGE"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().nonnegative().default(0),
  maxDiscount: z.number().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true)
});

export const supportTicketSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
  orderId: z.string().optional().nullable()
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

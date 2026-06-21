import { z } from "zod";

export const roles = ["CUSTOMER", "TAILOR", "DELIVERY_PARTNER", "ADMIN"] as const;

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

export type ServiceItem = {
  id: string;
  category: string;
  name: string;
  price: number;
  estimatedDelivery: string;
  description: string;
  imageUrl: string;
};

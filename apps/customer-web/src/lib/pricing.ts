import type { Coupon } from "./types";
import { calculateCouponDiscount } from "@darzi/shared";

export const HOME_MEASUREMENT_FEE = 30;

export function deliveryFeeForUrgency(urgency: string) {
  if (/instant/i.test(urgency)) return 50;
  if (/urgent|express/i.test(urgency)) return 40;
  return 30; // Normal or same day
}

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

export function quoteEta(quote?: { estimatedDays?: number; estimatedHours?: number }) {
  if (!quote) return "Awaiting tailor quote";
  if (quote.estimatedHours) return `${quote.estimatedHours} hours`;
  return `${quote.estimatedDays ?? 1} days`;
}

export function couponDiscount(coupon: Coupon | undefined, subtotal: number) {
  if (!coupon?.isActive) return 0;
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return 0;
  if (subtotal < Number(coupon.minOrderValue ?? 0)) return 0;
  return calculateCouponDiscount(coupon, subtotal);
}

export function couponLabel(coupon: Coupon) {
  if (coupon.discountType === "PERCENTAGE") {
    return `${Number(coupon.discountValue).toFixed(0)}% off${coupon.maxDiscount ? ` up to Rs${Number(coupon.maxDiscount).toFixed(0)}` : ""}`;
  }
  return `Rs${Number(coupon.discountValue).toFixed(0)} off`;
}

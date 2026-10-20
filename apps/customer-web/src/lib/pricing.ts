import type { Coupon } from "./types";
import { calculateCouponBenefit, type CouponPricingBreakdown } from "@darji/shared";

export const HOME_MEASUREMENT_FEE = 99;

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

export function couponDiscount(coupon: Coupon | undefined, pricing: number | CouponPricingBreakdown) {
  if (!coupon?.isActive) return 0;
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return 0;
  const breakdown = typeof pricing === "number" ? { orderSubtotal: pricing } : pricing;
  if (breakdown.orderSubtotal < Number(coupon.minOrderValue ?? 0)) return 0;
  return calculateCouponBenefit(coupon, breakdown).discount;
}

export function couponLabel(coupon: Coupon) {
  if (coupon.benefitType === "FREE_DELIVERY") return "Free delivery";
  if (coupon.benefitType === "WAIVE_PLATFORM_FEE") return "No platform fee";
  if (coupon.benefitType === "WAIVE_SMALL_ORDER_FEE") return "No small-order fee";
  if (coupon.benefitType === "FREE_MEASUREMENT") return "Free home measurement";
  if (coupon.benefitType === "DELIVERY_PERCENTAGE") return `${Number(coupon.discountValue).toFixed(0)}% off delivery`;
  if (coupon.benefitType === "ORDER_PERCENTAGE" || (!coupon.benefitType && coupon.discountType === "PERCENTAGE")) {
    return `${Number(coupon.discountValue).toFixed(0)}% off${coupon.maxDiscount ? ` up to Rs${Number(coupon.maxDiscount).toFixed(0)}` : ""}`;
  }
  return `Rs${Number(coupon.discountValue).toFixed(0)} off`;
}

import type { Coupon } from "./types";

export const PLATFORM_FEE = 19;
export const HOME_MEASUREMENT_FEE = 99;

export function deliveryFeeForUrgency(urgency: string) {
  if (/instant/i.test(urgency)) return 149;
  if (/same day/i.test(urgency)) return 99;
  if (/express/i.test(urgency)) return 69;
  return 39;
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
  const raw = coupon.discountType === "PERCENTAGE" ? (subtotal * Number(coupon.discountValue ?? 0)) / 100 : Number(coupon.discountValue ?? 0);
  const capped = coupon.maxDiscount != null ? Math.min(raw, Number(coupon.maxDiscount)) : raw;
  return Math.min(Math.max(0, Math.round(capped)), subtotal);
}

export function couponLabel(coupon: Coupon) {
  if (coupon.discountType === "PERCENTAGE") {
    return `${Number(coupon.discountValue).toFixed(0)}% off${coupon.maxDiscount ? ` up to Rs${Number(coupon.maxDiscount).toFixed(0)}` : ""}`;
  }
  return `Rs${Number(coupon.discountValue).toFixed(0)} off`;
}

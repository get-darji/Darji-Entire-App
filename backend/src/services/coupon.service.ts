import { AppError } from "../middleware/error.js";
import { CouponModel, CouponRedemptionModel } from "../models.js";
import { calculateCouponDiscount } from "@darzi/shared";

export async function validateCoupon(code: string, subtotal: number, customerId?: string) {
  const coupon = await CouponModel.findOne({ code: code.trim().toUpperCase() });
  if (!coupon || !coupon.isActive) throw new AppError(400, "Coupon is invalid or inactive");
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) throw new AppError(400, "Coupon has expired");
  if (subtotal < Number(coupon.minOrderValue ?? 0)) throw new AppError(400, `Coupon requires minimum cart value of ₹${Number(coupon.minOrderValue ?? 0).toFixed(0)}`);
  if (coupon.usageLimit != null && Number(coupon.usedCount ?? 0) >= Number(coupon.usageLimit)) throw new AppError(400, "Coupon usage limit has been reached");
  if (customerId && coupon.perCustomerLimit != null) {
    const redemption = await CouponRedemptionModel.findOne({ couponId: coupon.id, customerId }).select("count").lean();
    if (Number(redemption?.count ?? 0) >= Number(coupon.perCustomerLimit)) throw new AppError(400, "You have already used this coupon the maximum number of times");
  }
  return { coupon, discount: calculateCouponDiscount(coupon, subtotal) };
}

export async function reserveCouponUsage(couponId: string, customerId: string, orderId: string) {
  const coupon = await CouponModel.findById(couponId);
  if (!coupon) throw new AppError(400, "Coupon no longer exists");
  const existing = await CouponRedemptionModel.findOne({ couponId, customerId, orderIds: orderId }).select("_id").lean();
  if (existing) return;

  const customerLimit = coupon.perCustomerLimit == null ? null : Number(coupon.perCustomerLimit);
  try {
    const redemption = await CouponRedemptionModel.findOneAndUpdate(
      {
        couponId,
        customerId,
        ...(customerLimit == null ? {} : { count: { $lt: customerLimit } })
      },
      { $inc: { count: 1 }, $addToSet: { orderIds: orderId }, $setOnInsert: { couponId, customerId } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    if (!redemption) throw new AppError(400, "Customer coupon usage limit has been reached");
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    if (error?.code === 11000) throw new AppError(400, "Customer coupon usage limit has been reached");
    throw error;
  }

  const couponClaim = await CouponModel.findOneAndUpdate(
    {
      _id: couponId,
      isActive: true,
      ...(coupon.usageLimit == null ? {} : { usedCount: { $lt: Number(coupon.usageLimit) } })
    },
    { $inc: { usedCount: 1 } },
    { returnDocument: "after" }
  );
  if (!couponClaim) {
    await CouponRedemptionModel.updateOne({ couponId, customerId, orderIds: orderId }, { $inc: { count: -1 }, $pull: { orderIds: orderId } });
    throw new AppError(400, "Coupon usage limit has been reached");
  }
}

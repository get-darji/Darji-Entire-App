import { calculateCouponBenefit, type CouponPricingBreakdown } from "@darji/shared";
import { AppError } from "../middleware/error.js";
import { CouponModel, CouponRedemptionModel, OrderModel, TailoringRequestModel, UserModel } from "../models.js";

export type CouponOrderType = "CATALOG" | "TAILORING";

export type CouponValidationContext = {
  customerId: string;
  currentOrderId?: string;
  orderType: CouponOrderType;
  pricing: CouponPricingBreakdown;
  paymentMethod?: "UPI" | "COD" | "ONLINE";
  deliveryMode?: "STANDARD" | "EXPRESS" | "INSTANT";
};

function normalizedBenefitType(coupon: any) {
  return coupon.benefitType ?? (coupon.discountType === "PERCENTAGE" ? "ORDER_PERCENTAGE" : "ORDER_FLAT");
}

async function confirmedCustomerOrders(customerId: string) {
  const [catalogCount, tailoringCount, latestCatalog, latestTailoring] = await Promise.all([
    OrderModel.countDocuments({
      customerId,
      status: { $ne: "CANCELLED" },
      $or: [{ paymentStatus: "PAID" }, { paymentMethod: "COD" }]
    }),
    TailoringRequestModel.countDocuments({
      customerId,
      status: "TAILOR_SELECTED",
      orderStatus: { $ne: "cancelled" },
      $or: [{ paymentStatus: "PAID" }, { paymentMethod: "COD" }]
    }),
    OrderModel.findOne({ customerId, status: { $ne: "CANCELLED" }, $or: [{ paymentStatus: "PAID" }, { paymentMethod: "COD" }] }).sort({ createdAt: -1 }).select("createdAt").lean(),
    TailoringRequestModel.findOne({ customerId, status: "TAILOR_SELECTED", orderStatus: { $ne: "cancelled" }, $or: [{ paymentStatus: "PAID" }, { paymentMethod: "COD" }] }).sort({ createdAt: -1 }).select("createdAt").lean()
  ]);
  const latestDates = [latestCatalog?.createdAt, latestTailoring?.createdAt].filter(Boolean).map((value) => new Date(value as Date).getTime());
  return { count: catalogCount + tailoringCount, lastOrderAt: latestDates.length ? new Date(Math.max(...latestDates)) : null };
}

async function assertCouponEligibility(coupon: any, context: CouponValidationContext) {
  const existingOrderRedemption = context.currentOrderId
    ? await CouponRedemptionModel.findOne({ couponId: coupon.id, customerId: context.customerId, orderIds: context.currentOrderId }).select("_id").lean()
    : null;
  const now = new Date();
  if (!coupon?.isActive) throw new AppError(400, "Coupon is invalid or inactive");
  if (coupon.startsAt && new Date(coupon.startsAt) > now) throw new AppError(400, "Coupon is not active yet");
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) throw new AppError(400, "Coupon has expired");
  if (!existingOrderRedemption && coupon.usageLimit != null && Number(coupon.usedCount ?? 0) >= Number(coupon.usageLimit)) throw new AppError(400, "Coupon usage limit has been reached");

  const scope = coupon.orderScope ?? "BOTH";
  if (scope !== "BOTH" && scope !== context.orderType) throw new AppError(400, `Coupon is only valid for ${scope.toLowerCase()} orders`);
  if (coupon.allowedPaymentMethods?.length && (!context.paymentMethod || !coupon.allowedPaymentMethods.includes(context.paymentMethod))) throw new AppError(400, "Coupon is not valid for this payment method");
  if (coupon.allowedDeliveryModes?.length && (!context.deliveryMode || !coupon.allowedDeliveryModes.includes(context.deliveryMode))) throw new AppError(400, "Coupon is not valid for this delivery speed");

  const orderSubtotal = Number(context.pricing.orderSubtotal ?? 0);
  if (orderSubtotal < Number(coupon.minOrderValue ?? 0)) throw new AppError(400, `Coupon requires minimum order value of ₹${Number(coupon.minOrderValue ?? 0).toFixed(0)}`);

  const redemption = await CouponRedemptionModel.findOne({ couponId: coupon.id, customerId: context.customerId }).select("count").lean();
  if (!existingOrderRedemption && coupon.perCustomerLimit != null && Number(redemption?.count ?? 0) >= Number(coupon.perCustomerLimit)) throw new AppError(400, "You have already used this coupon the maximum number of times");

  const orderHistory = await confirmedCustomerOrders(context.customerId);
  const nextOrderNumber = orderHistory.count + 1;
  const orderRule = coupon.orderEligibilityType ?? "ANY";
  if (orderRule === "FIRST" && nextOrderNumber !== 1) throw new AppError(400, "Coupon is only valid on your first order");
  if (orderRule === "EXACT" && nextOrderNumber !== Number(coupon.orderNumber)) throw new AppError(400, `Coupon is only valid on order number ${coupon.orderNumber}`);
  if (orderRule === "RANGE" && (nextOrderNumber < Number(coupon.orderNumberFrom) || nextOrderNumber > Number(coupon.orderNumberTo))) throw new AppError(400, `Coupon is only valid from order ${coupon.orderNumberFrom} to ${coupon.orderNumberTo}`);

  const audience = coupon.audienceType ?? "EVERYONE";
  let customer: any;
  if (audience === "SELECTED_CUSTOMERS" && !coupon.selectedCustomerIds?.includes(context.customerId)) throw new AppError(400, "Coupon is not available for this account");
  if (audience === "NEW_CUSTOMERS" && orderHistory.count > 0) throw new AppError(400, "Coupon is only available to new customers");
  if (audience === "INACTIVE_CUSTOMERS") {
    const inactiveDays = Number(coupon.inactiveDays ?? 0);
    const inactiveSince = new Date(now.getTime() - inactiveDays * 86_400_000);
    if (orderHistory.lastOrderAt && orderHistory.lastOrderAt > inactiveSince) throw new AppError(400, `Coupon is only available after ${inactiveDays} days without an order`);
  }
  if (audience === "REGISTERED_BETWEEN") {
    customer = await UserModel.findById(context.customerId).select("createdAt").lean();
    const registeredAt = customer?.createdAt ? new Date(customer.createdAt) : null;
    if (!registeredAt || (coupon.registeredAfter && registeredAt < new Date(coupon.registeredAfter)) || (coupon.registeredBefore && registeredAt > new Date(coupon.registeredBefore))) throw new AppError(400, "Coupon is not available for your registration date");
  }

  return { nextOrderNumber, alreadyReserved: Boolean(existingOrderRedemption) };
}

export async function validateCoupon(code: string, context: CouponValidationContext) {
  const coupon = await CouponModel.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) throw new AppError(400, "Coupon is invalid or inactive");
  const { nextOrderNumber, alreadyReserved } = await assertCouponEligibility(coupon, context);
  const couponValue = typeof coupon.toObject === "function" ? coupon.toObject() : coupon;
  const benefit = calculateCouponBenefit({ ...couponValue, benefitType: normalizedBenefitType(coupon) }, context.pricing);
  if (benefit.discount <= 0) throw new AppError(400, "This coupon does not apply to any charge in this order");
  if (!alreadyReserved && coupon.maxCampaignDiscount != null && Number(coupon.totalDiscountIssued ?? 0) + benefit.discount > Number(coupon.maxCampaignDiscount)) throw new AppError(400, "Coupon campaign budget has been used");
  return { coupon, discount: benefit.discount, benefit, nextOrderNumber };
}

export async function couponsVisibleToCustomer(coupons: any[], customerId: string) {
  const [orderHistory, customer] = await Promise.all([
    confirmedCustomerOrders(customerId),
    UserModel.findById(customerId).select("createdAt").lean()
  ]);
  const nextOrderNumber = orderHistory.count + 1;
  const now = new Date();
  return coupons.filter((coupon) => {
    const orderRule = coupon.orderEligibilityType ?? "ANY";
    if (orderRule === "FIRST" && nextOrderNumber !== 1) return false;
    if (orderRule === "EXACT" && nextOrderNumber !== Number(coupon.orderNumber)) return false;
    if (orderRule === "RANGE" && (nextOrderNumber < Number(coupon.orderNumberFrom) || nextOrderNumber > Number(coupon.orderNumberTo))) return false;
    const audience = coupon.audienceType ?? "EVERYONE";
    if (audience === "SELECTED_CUSTOMERS" && !coupon.selectedCustomerIds?.includes(customerId)) return false;
    if (audience === "NEW_CUSTOMERS" && orderHistory.count > 0) return false;
    if (audience === "INACTIVE_CUSTOMERS") {
      const inactiveSince = new Date(now.getTime() - Number(coupon.inactiveDays ?? 0) * 86_400_000);
      if (orderHistory.lastOrderAt && orderHistory.lastOrderAt > inactiveSince) return false;
    }
    if (audience === "REGISTERED_BETWEEN") {
      const registeredAt = customer?.createdAt ? new Date(customer.createdAt) : null;
      if (!registeredAt || (coupon.registeredAfter && registeredAt < new Date(coupon.registeredAfter)) || (coupon.registeredBefore && registeredAt > new Date(coupon.registeredBefore))) return false;
    }
    return true;
  });
}

export async function reserveCouponUsage(input: {
  couponId: string;
  customerId: string;
  orderId: string;
  orderType: CouponOrderType;
  discountAmount: number;
  benefitType: string;
  affectedComponent: string;
}) {
  const coupon = await CouponModel.findById(input.couponId);
  if (!coupon) throw new AppError(400, "Coupon no longer exists");
  const existing = await CouponRedemptionModel.findOne({ couponId: input.couponId, customerId: input.customerId, orderIds: input.orderId }).select("_id").lean();
  if (existing) return;

  const customerLimit = coupon.perCustomerLimit == null ? null : Number(coupon.perCustomerLimit);
  try {
    const redemption = await CouponRedemptionModel.findOneAndUpdate(
      { couponId: input.couponId, customerId: input.customerId, ...(customerLimit == null ? {} : { count: { $lt: customerLimit } }) },
      {
        $inc: { count: 1 },
        $addToSet: { orderIds: input.orderId },
        $push: { redemptions: { orderId: input.orderId, orderType: input.orderType, discountAmount: input.discountAmount, benefitType: input.benefitType, affectedComponent: input.affectedComponent, redeemedAt: new Date() } },
        $setOnInsert: { couponId: input.couponId, customerId: input.customerId }
      },
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
      _id: input.couponId,
      isActive: true,
      ...(coupon.usageLimit == null ? {} : { usedCount: { $lt: Number(coupon.usageLimit) } }),
      ...(coupon.maxCampaignDiscount == null ? {} : { $expr: { $lte: [{ $add: [{ $ifNull: ["$totalDiscountIssued", 0] }, input.discountAmount] }, coupon.maxCampaignDiscount] } })
    },
    { $inc: { usedCount: 1, totalDiscountIssued: input.discountAmount } },
    { returnDocument: "after" }
  );
  if (!couponClaim) {
    await CouponRedemptionModel.updateOne(
      { couponId: input.couponId, customerId: input.customerId, orderIds: input.orderId },
      { $inc: { count: -1 }, $pull: { orderIds: input.orderId, redemptions: { orderId: input.orderId } } }
    );
    throw new AppError(400, "Coupon usage limit or campaign budget has been reached");
  }
}

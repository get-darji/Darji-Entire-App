import {
  DeliveryPartnerModel,
  DeliveryRequestModel,
  OrderModel,
  PaymentModel,
  TailorModel,
  TailorQuoteModel,
  TailoringRequestModel,
  UserModel,
  WalletModel,
  WalletTransactionModel
} from "../models.js";

const PACKAGING_COST_PER_ORDER = 8;

type OrderCategory = "pending" | "active" | "completed" | "cancelled";
type PeriodBounds = { start: Date; endExclusive: Date };
type NormalizedOrder = {
  id: string;
  source: "ORDER" | "TAILORING_REQUEST";
  customerId: string;
  tailorId?: string;
  createdAt: Date;
  category: OrderCategory;
  stage: string;
};

function validDate(value: unknown, fallback: Date) {
  const date = value ? new Date(value as string | number | Date) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function parseDashboardPeriod(startValue?: unknown, endValue?: unknown) {
  const now = new Date();
  const defaultEnd = new Date(now);
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 29);
  defaultStart.setHours(0, 0, 0, 0);
  defaultEnd.setHours(23, 59, 59, 999);

  const start = validDate(startValue, defaultStart);
  const suppliedEnd = validDate(endValue, defaultEnd);
  const endExclusive = new Date(suppliedEnd);
  if (endExclusive <= start) endExclusive.setTime(start.getTime() + 24 * 60 * 60 * 1000);
  const duration = endExclusive.getTime() - start.getTime();
  return {
    current: { start, endExclusive },
    previous: {
      start: new Date(start.getTime() - duration),
      endExclusive: new Date(start)
    }
  };
}

function inPeriod(date: Date, bounds: PeriodBounds) {
  return date >= bounds.start && date < bounds.endExclusive;
}

export function classifyLegacyOrder(statusValue: unknown): OrderCategory {
  const status = String(statusValue ?? "").toUpperCase();
  if (status === "DELIVERED") return "completed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "ORDER_PLACED") return "pending";
  return "active";
}

export function classifyTailoringRequest(request: { status?: unknown; orderStatus?: unknown }): OrderCategory {
  const status = String(request.status ?? "").toUpperCase();
  const orderStatus = String(request.orderStatus ?? "").toLowerCase();
  if (status === "CANCELLED" || orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "completed") return "completed";
  if (status === "QUOTE_REQUESTED" || status === "PAYMENT_PENDING" || orderStatus === "payment_pending") return "pending";
  return "active";
}

function legacyStage(statusValue: unknown) {
  const status = String(statusValue ?? "").toUpperCase();
  if (status === "ORDER_PLACED") return "Payment / confirmation pending";
  if (status === "PICKUP_ASSIGNED") return "Pickup pending";
  if (status === "CLOTH_PICKED") return "Picked up";
  if (["AT_TAILOR", "CUTTING", "STITCHING_STARTED", "FINISHING"].includes(status)) return "With tailor";
  if (["STITCHING_COMPLETED", "READY"].includes(status)) return "Ready";
  if (status === "OUT_FOR_DELIVERY") return "Drop pending";
  if (status === "DELIVERED") return "Delivered";
  if (status === "CANCELLED") return "Cancelled";
  return "Customer confirmed";
}

function tailoringStage(request: any, quoteCount: number) {
  const status = String(request.status ?? "").toUpperCase();
  const orderStatus = String(request.orderStatus ?? "").toLowerCase();
  const workStatus = String(request.workStatus ?? "").toUpperCase();
  if (status === "CANCELLED" || orderStatus === "cancelled") return "Cancelled";
  if (orderStatus === "completed") return "Delivered";
  if (status === "PAYMENT_PENDING" || orderStatus === "payment_pending") return "Payment / confirmation pending";
  if (status === "QUOTE_REQUESTED") return quoteCount > 0 ? "Quote received" : "Waiting for quote";
  if (orderStatus === "out_for_delivery" || orderStatus === "delivery_retry_scheduled" || orderStatus === "delivery_issue") return "Drop pending";
  if (orderStatus === "ready_for_delivery" || workStatus === "READY") return "Ready";
  if (orderStatus === "received_by_tailor" || workStatus === "WORKING") return "With tailor";
  if (orderStatus === "picked_up_from_customer") return "Picked up";
  if (orderStatus === "pickup_started") return "Pickup pending";
  return "Customer confirmed";
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

function orderCounts(orders: NormalizedOrder[], bounds: PeriodBounds) {
  const selected = orders.filter((order) => inPeriod(order.createdAt, bounds));
  const counts = { total: selected.length, pending: 0, active: 0, completed: 0, cancelled: 0 };
  selected.forEach((order) => { counts[order.category] += 1; });
  const resolved = counts.completed + counts.cancelled;
  return {
    ...counts,
    completionRate: resolved ? Number(((counts.completed / resolved) * 100).toFixed(1)) : 0,
    cancellationRate: resolved ? Number(((counts.cancelled / resolved) * 100).toFixed(1)) : 0
  };
}

function paymentDate(payment: any) {
  return validDate(payment.paidAt ?? payment.updatedAt ?? payment.createdAt, new Date(0));
}

function collectedPayments(payments: any[], bounds: PeriodBounds) {
  return payments.filter((payment) => String(payment.status).toUpperCase() === "PAID" && inPeriod(paymentDate(payment), bounds));
}

function transactionDate(transaction: any) {
  return validDate(transaction.createdAt, new Date(0));
}

function financeSummary(payments: any[], earnings: any[], bounds: PeriodBounds) {
  const paid = collectedPayments(payments, bounds);
  const paidOrderIds = new Set(paid.map((payment) => String(payment.orderId)));
  const grossPaid = paid.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const periodEarnings = earnings.filter((transaction) => inPeriod(transactionDate(transaction), bounds));
  const tailorCost = periodEarnings
    .filter((transaction) => transaction.userType === "TAILOR")
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const deliveryCost = periodEarnings
    .filter((transaction) => transaction.userType === "DELIVERY_PARTNER")
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const partnerCost = tailorCost + deliveryCost;
  const packagingCost = paidOrderIds.size * PACKAGING_COST_PER_ORDER;
  return {
    grossPaid: Number(grossPaid.toFixed(2)),
    paidOrders: paidOrderIds.size,
    tailorCost: Number(tailorCost.toFixed(2)),
    deliveryCost: Number(deliveryCost.toFixed(2)),
    partnerCost: Number(partnerCost.toFixed(2)),
    packagingCost,
    packagingCostPerOrder: PACKAGING_COST_PER_ORDER,
    netRevenue: Number((grossPaid - partnerCost - packagingCost).toFixed(2)),
    averageOrderValue: paidOrderIds.size ? Number((grossPaid / paidOrderIds.size).toFixed(2)) : 0
  };
}

function bucketMode(bounds: PeriodBounds) {
  const days = (bounds.endExclusive.getTime() - bounds.start.getTime()) / 86_400_000;
  return days <= 31 ? "day" : "month";
}

function bucketKey(date: Date, mode: "day" | "month") {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return mode === "day" ? `${year}-${month}-${String(date.getUTCDate()).padStart(2, "0")}` : `${year}-${month}`;
}

function buildSeries(orders: NormalizedOrder[], payments: any[], earnings: any[], bounds: PeriodBounds) {
  const mode = bucketMode(bounds);
  const slots: Array<{ key: string; label: string }> = [];
  const cursor = new Date(bounds.start);
  while (cursor < bounds.endExclusive && slots.length < 400) {
    const key = bucketKey(cursor, mode);
    slots.push({
      key,
      label: new Intl.DateTimeFormat("en-IN", mode === "day" ? { day: "numeric", month: "short", timeZone: "UTC" } : { month: "short", year: "2-digit", timeZone: "UTC" }).format(cursor)
    });
    if (mode === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
  }
  const orderMap = new Map(slots.map((slot) => [slot.key, { completed: 0, active: 0, pending: 0, cancelled: 0 }]));
  orders.filter((order) => inPeriod(order.createdAt, bounds)).forEach((order) => {
    const bucket = orderMap.get(bucketKey(order.createdAt, mode));
    if (bucket) bucket[order.category] += 1;
  });
  const revenueMap = new Map(slots.map((slot) => [slot.key, { grossPaid: 0, partnerCost: 0, packagingCost: 0, netRevenue: 0 }]));
  const packagedOrdersByBucket = new Set<string>();
  collectedPayments(payments, bounds).forEach((payment) => {
    const key = bucketKey(paymentDate(payment), mode);
    const bucket = revenueMap.get(key);
    if (!bucket) return;
    bucket.grossPaid += Number(payment.amount ?? 0);
    const packagedOrderKey = `${key}:${String(payment.orderId)}`;
    if (!packagedOrdersByBucket.has(packagedOrderKey)) {
      bucket.packagingCost += PACKAGING_COST_PER_ORDER;
      packagedOrdersByBucket.add(packagedOrderKey);
    }
  });
  earnings.filter((transaction) => inPeriod(transactionDate(transaction), bounds)).forEach((transaction) => {
    const bucket = revenueMap.get(bucketKey(transactionDate(transaction), mode));
    if (bucket) bucket.partnerCost += Number(transaction.amount ?? 0);
  });
  return {
    orders: slots.map((slot) => ({ label: slot.label, ...orderMap.get(slot.key)! })),
    revenue: slots.map((slot) => {
      const value = revenueMap.get(slot.key)!;
      return { label: slot.label, ...value, netRevenue: value.grossPaid - value.partnerCost - value.packagingCost };
    })
  };
}

export async function getDashboardAnalytics(startValue?: unknown, endValue?: unknown) {
  const { current, previous } = parseDashboardPeriod(startValue, endValue);
  const [legacyOrders, tailoringRequests, payments, earnings, wallets, tailors, partners] = await Promise.all([
    OrderModel.find().select("_id customerId tailorId status createdAt").lean(),
    TailoringRequestModel.find().select("_id customerId assignedTailorId selectedQuoteId status orderStatus workStatus createdAt").lean(),
    PaymentModel.find().select("_id orderId amount status paidAt createdAt updatedAt").lean(),
    WalletTransactionModel.find({ transactionType: "CREDIT", category: "ORDER_EARNING" }).select("userId userType orderId amount createdAt").lean(),
    WalletModel.find({ userType: { $in: ["TAILOR", "DELIVERY_PARTNER"] }, balance: { $gt: 0 } }).select("balance").lean(),
    TailorModel.find().select("_id userId shopName isAvailable verificationStatus rating createdAt").lean(),
    DeliveryPartnerModel.find().select("_id userId isAvailable verificationStatus rating createdAt").lean()
  ]);

  const requestIds = tailoringRequests.map((request) => String(request._id));
  const quoteCounts = requestIds.length ? await TailorQuoteModel.aggregate<{ _id: string; count: number }>([
    { $match: { requestId: { $in: requestIds } } },
    { $group: { _id: "$requestId", count: { $sum: 1 } } }
  ]) : [];
  const quoteCountMap = new Map(quoteCounts.map((item) => [String(item._id), Number(item.count)]));
  const selectedQuoteIds = tailoringRequests.map((request: any) => request.selectedQuoteId).filter(Boolean);
  const selectedQuotes = selectedQuoteIds.length
    ? await TailorQuoteModel.find({ _id: { $in: selectedQuoteIds } }).select("_id tailorId").lean()
    : [];
  const selectedQuoteTailorMap = new Map(selectedQuotes.map((quote: any) => [String(quote._id), String(quote.tailorId)]));

  const normalizedMap = new Map<string, NormalizedOrder>();
  legacyOrders.forEach((order: any) => {
    const id = String(order._id);
    normalizedMap.set(id, {
      id,
      source: "ORDER",
      customerId: String(order.customerId),
      tailorId: order.tailorId ? String(order.tailorId) : undefined,
      createdAt: validDate(order.createdAt, new Date(0)),
      category: classifyLegacyOrder(order.status),
      stage: legacyStage(order.status)
    });
  });
  tailoringRequests.forEach((request: any) => {
    const id = String(request._id);
    if (normalizedMap.has(id)) return;
    normalizedMap.set(id, {
      id,
      source: "TAILORING_REQUEST",
      customerId: String(request.customerId),
      tailorId: request.assignedTailorId
        ? String(request.assignedTailorId)
        : request.selectedQuoteId
          ? selectedQuoteTailorMap.get(String(request.selectedQuoteId))
          : undefined,
      createdAt: validDate(request.createdAt, new Date(0)),
      category: classifyTailoringRequest(request),
      stage: tailoringStage(request, quoteCountMap.get(id) ?? 0)
    });
  });
  const normalizedOrders = [...normalizedMap.values()];

  const currentOrders = orderCounts(normalizedOrders, current);
  const previousOrders = orderCounts(normalizedOrders, previous);
  const currentFinance = financeSummary(payments, earnings, current);
  const previousFinance = financeSummary(payments, earnings, previous);

  const firstOrderByCustomer = new Map<string, Date>();
  normalizedOrders.forEach((order) => {
    const existing = firstOrderByCustomer.get(order.customerId);
    if (!existing || order.createdAt < existing) firstOrderByCustomer.set(order.customerId, order.createdAt);
  });
  const newCustomers = [...firstOrderByCustomer.values()].filter((date) => inPeriod(date, current)).length;
  const previousNewCustomers = [...firstOrderByCustomer.values()].filter((date) => inPeriod(date, previous)).length;

  const currentTailors = tailors.filter((tailor: any) => inPeriod(validDate(tailor.createdAt, new Date(0)), current)).length;
  const previousTailors = tailors.filter((tailor: any) => inPeriod(validDate(tailor.createdAt, new Date(0)), previous)).length;
  const currentPartners = partners.filter((partner: any) => inPeriod(validDate(partner.createdAt, new Date(0)), current)).length;
  const previousPartners = partners.filter((partner: any) => inPeriod(validDate(partner.createdAt, new Date(0)), previous)).length;

  const currentEarnings = earnings.filter((transaction: any) => inPeriod(transactionDate(transaction), current));
  const earningByUser = (userType: "TAILOR" | "DELIVERY_PARTNER") => {
    const totals = new Map<string, { amount: number; orderIds: Set<string> }>();
    currentEarnings.filter((item: any) => item.userType === userType).forEach((item: any) => {
      const value = totals.get(String(item.userId)) ?? { amount: 0, orderIds: new Set<string>() };
      value.amount += Number(item.amount ?? 0);
      if (item.orderId) value.orderIds.add(String(item.orderId));
      totals.set(String(item.userId), value);
    });
    return totals;
  };
  const tailorEarnings = earningByUser("TAILOR");
  const partnerEarnings = earningByUser("DELIVERY_PARTNER");
  const userIds = [...new Set([...tailorEarnings.keys(), ...partnerEarnings.keys()])];
  const users = userIds.length ? await UserModel.find({ _id: { $in: userIds } }).select("_id name phone avatarUrl").lean() : [];
  const userMap = new Map(users.map((user: any) => [String(user._id), user]));

  const deliveredTasks = await DeliveryRequestModel.find({
    taskStatus: "delivered",
    deliveredAt: { $gte: current.start, $lt: current.endExclusive },
    assignedDeliveryPartnerId: { $exists: true, $ne: "" }
  }).select("assignedDeliveryPartnerId").lean();
  const completedDeliveries = new Map<string, number>();
  deliveredTasks.forEach((task: any) => completedDeliveries.set(String(task.assignedDeliveryPartnerId), (completedDeliveries.get(String(task.assignedDeliveryPartnerId)) ?? 0) + 1));

  const topTailors = tailors.map((tailor: any) => {
    const earning = tailorEarnings.get(String(tailor.userId));
    const user = userMap.get(String(tailor.userId));
    return {
      profileId: String(tailor._id), userId: String(tailor.userId),
      name: tailor.shopName || user?.name || user?.phone || "Tailor",
      avatarUrl: user?.avatarUrl, amount: Number((earning?.amount ?? 0).toFixed(2)),
      completedOrders: earning?.orderIds.size ?? 0, rating: Number(tailor.rating ?? 0)
    };
  }).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount || b.rating - a.rating).slice(0, 5);

  const topDeliveryPartners = partners.map((partner: any) => {
    const earning = partnerEarnings.get(String(partner.userId));
    const user = userMap.get(String(partner.userId));
    return {
      profileId: String(partner._id), userId: String(partner.userId),
      name: user?.name || user?.phone || "Delivery partner", avatarUrl: user?.avatarUrl,
      amount: Number((earning?.amount ?? 0).toFixed(2)),
      completedDeliveries: completedDeliveries.get(String(partner._id)) ?? 0,
      rating: Number(partner.rating ?? 0)
    };
  }).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount || b.rating - a.rating).slice(0, 5);

  const selectedOrders = normalizedOrders.filter((order) => inPeriod(order.createdAt, current));
  const liveStageOrder = ["Waiting for quote", "Quote received", "Payment / confirmation pending", "Customer confirmed", "Pickup pending", "Picked up", "With tailor", "Ready", "Drop pending", "Delivered", "Cancelled"];
  const stageCounts = new Map(liveStageOrder.map((stage) => [stage, 0]));
  selectedOrders.forEach((order) => stageCounts.set(order.stage, (stageCounts.get(order.stage) ?? 0) + 1));

  const series = buildSeries(normalizedOrders, payments, earnings, current);
  const activeTailors = tailors.filter((tailor: any) => tailor.isAvailable && tailor.verificationStatus === "VERIFIED").length;
  const activeDeliveryPartners = partners.filter((partner: any) => partner.isAvailable && partner.verificationStatus === "VERIFIED").length;
  const pendingPayouts = wallets.reduce((sum: number, wallet: any) => sum + Number(wallet.balance ?? 0), 0);

  return {
    period: {
      start: current.start.toISOString(), endExclusive: current.endExclusive.toISOString(),
      previousStart: previous.start.toISOString(), previousEndExclusive: previous.endExclusive.toISOString()
    },
    orders: currentOrders,
    finance: { ...currentFinance, pendingPayouts: Number(pendingPayouts.toFixed(2)) },
    partners: { activeTailors, activeDeliveryPartners },
    growth: { newCustomers, newTailors: currentTailors, newDeliveryPartners: currentPartners },
    comparison: {
      orders: percentageChange(currentOrders.total, previousOrders.total),
      grossPaid: percentageChange(currentFinance.grossPaid, previousFinance.grossPaid),
      netRevenue: percentageChange(currentFinance.netRevenue, previousFinance.netRevenue),
      newCustomers: percentageChange(newCustomers, previousNewCustomers),
      newTailors: percentageChange(currentTailors, previousTailors),
      newDeliveryPartners: percentageChange(currentPartners, previousPartners)
    },
    series,
    liveStages: liveStageOrder.map((stage) => ({ stage, count: stageCounts.get(stage) ?? 0 })).filter((item) => item.count > 0),
    topTailors,
    topDeliveryPartners,
    limitations: [
      "Historical paidAt is unavailable for older payments; updatedAt is used as the collection-date fallback.",
      "Partial refund amounts are not represented by the current payment schema.",
      "Order cancellation status does not currently store the actor, so customer-initiated and admin-initiated cancellations cannot be separated historically.",
      "Packaging and other cost is currently fixed at ₹8 per distinct collected order."
    ]
  };
}

import {
  DeliveryBatchModel,
  DeliveryPartnerModel,
  DeliveryRequestModel,
  MeasurementVisitModel,
  OtpMetricModel,
  OrderModel,
  PaymentModel,
  PaymentHistoryModel,
  TailorModel,
  TailorQuoteModel,
  TailoringRequestModel,
  UserModel,
  WalletModel,
  WalletTransactionModel
} from "../models.js";
import {
  OPERATIONAL_ALLOWANCE_PER_ORDER,
  allocateAmountExactly,
  allocatePayoutsFifo,
  buildPaymentCollections,
  inFinancePeriod,
  reconcilePartnerObligations,
  roundMoney,
  summarizePartnerCosts,
  type FinanceOrder,
  type PartnerObligation
} from "./financial-reporting.logic.js";

const PACKAGING_COST_PER_ORDER = OPERATIONAL_ALLOWANCE_PER_ORDER;

type OrderCategory = "pending" | "active" | "completed" | "cancelled";
type PeriodBounds = { start: Date; endExclusive: Date };
type NormalizedOrder = {
  id: string;
  source: "ORDER" | "TAILORING_REQUEST";
  customerId: string;
  customerName?: string;
  orderNumber?: string;
  status: string;
  tailorId?: string;
  createdAt: Date;
  completedAt?: Date;
  category: OrderCategory;
  stage: string;
  cancellationFee?: number;
};

function validDate(value: unknown, fallback: Date) {
  const date = value ? new Date(value as string | number | Date) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function parseDashboardPeriod(startValue?: unknown, endValue?: unknown, lifetime = false) {
  const now = new Date();
  if (lifetime) {
    return {
      current: { start: new Date(0), endExclusive: new Date(now.getTime() + 1) },
      previous: null
    };
  }
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

function transactionDate(transaction: any) {
  return validDate(transaction.createdAt, new Date(0));
}

type RealizedRecord = {
  orderId: string;
  completedAt: Date;
  grossPaid: number;
  tailorCost: number;
  deliveryCost: number;
};

export function summarizeRealizedRecords(records: RealizedRecord[]) {
  const grossPaid = records.reduce((sum, record) => sum + record.grossPaid, 0);
  const tailorCost = records.reduce((sum, record) => sum + record.tailorCost, 0);
  const deliveryCost = records.reduce((sum, record) => sum + record.deliveryCost, 0);
  const partnerCost = tailorCost + deliveryCost;
  const packagingCost = records.length * PACKAGING_COST_PER_ORDER;
  return {
    completedOrders: records.length,
    grossPaid: Number(grossPaid.toFixed(2)),
    tailorCost: Number(tailorCost.toFixed(2)),
    deliveryCost: Number(deliveryCost.toFixed(2)),
    partnerCost: Number(partnerCost.toFixed(2)),
    packagingCost,
    netRevenue: Number((grossPaid - partnerCost - packagingCost).toFixed(2))
  };
}


function bucketMode(bounds: PeriodBounds) {
  const days = (bounds.endExclusive.getTime() - bounds.start.getTime()) / 86_400_000;
  return days <= 31 ? "day" : days <= 31 * 400 ? "month" : "year";
}

function bucketKey(date: Date, mode: "day" | "month" | "year") {
  const indiaTime = new Date(date.getTime() + 330 * 60_000);
  const year = indiaTime.getUTCFullYear();
  const month = String(indiaTime.getUTCMonth() + 1).padStart(2, "0");
  return mode === "day" ? `${year}-${month}-${String(indiaTime.getUTCDate()).padStart(2, "0")}` : mode === "month" ? `${year}-${month}` : String(year);
}

function nextBucket(date: Date, mode: "day" | "month" | "year") {
  if (mode === "day") return new Date(date.getTime() + 86_400_000);
  const indiaTime = new Date(date.getTime() + 330 * 60_000);
  if (mode === "month") indiaTime.setUTCMonth(indiaTime.getUTCMonth() + 1, 1);
  else indiaTime.setUTCFullYear(indiaTime.getUTCFullYear() + 1, 0, 1);
  indiaTime.setUTCHours(0, 0, 0, 0);
  return new Date(indiaTime.getTime() - 330 * 60_000);
}

function buildSeries(
  orders: NormalizedOrder[],
  realizedRecords: RealizedRecord[],
  firstOrderDates: Date[],
  tailors: any[],
  partners: any[],
  bounds: PeriodBounds
) {
  const slots: Array<{ key: string; label: string }> = [];
  const dates = [
    ...orders.filter((order) => inPeriod(order.createdAt, bounds)).map((order) => order.createdAt),
    ...realizedRecords.filter((record) => inPeriod(record.completedAt, bounds)).map((record) => record.completedAt),
    ...firstOrderDates.filter((date) => inPeriod(date, bounds)),
    ...tailors.map((tailor) => validDate(tailor.createdAt, new Date(0))).filter((date) => inPeriod(date, bounds)),
    ...partners.map((partner) => validDate(partner.createdAt, new Date(0))).filter((date) => inPeriod(date, bounds))
  ];
  const effectiveStart = bounds.start.getTime() === 0 && dates.length
    ? new Date(Math.min(...dates.map((date) => date.getTime())))
    : bounds.start;
  const mode = bucketMode({ start: effectiveStart, endExclusive: bounds.endExclusive });
  let cursor = new Date(effectiveStart);
  while (cursor < bounds.endExclusive && slots.length < 400) {
    const key = bucketKey(cursor, mode);
    slots.push({
      key,
      label: new Intl.DateTimeFormat("en-IN", mode === "day" ? { day: "numeric", month: "short", timeZone: "Asia/Kolkata" } : mode === "month" ? { month: "short", year: "2-digit", timeZone: "Asia/Kolkata" } : { year: "numeric", timeZone: "Asia/Kolkata" }).format(cursor)
    });
    cursor = nextBucket(cursor, mode);
  }
  const orderMap = new Map(slots.map((slot) => [slot.key, { completed: 0, active: 0, pending: 0, cancelled: 0 }]));
  const growthMap = new Map(slots.map((slot) => [slot.key, { customers: 0, tailors: 0, partners: 0 }]));
  orders.filter((order) => inPeriod(order.createdAt, bounds)).forEach((order) => {
    const bucket = orderMap.get(bucketKey(order.createdAt, mode));
    if (bucket) bucket[order.category] += 1;
  });
  firstOrderDates.filter((date) => inPeriod(date, bounds)).forEach((date) => {
    const bucket = growthMap.get(bucketKey(date, mode));
    if (bucket) bucket.customers += 1;
  });
  tailors.forEach((tailor) => {
    const date = validDate(tailor.createdAt, new Date(0));
    const bucket = inPeriod(date, bounds) ? growthMap.get(bucketKey(date, mode)) : undefined;
    if (bucket) bucket.tailors += 1;
  });
  partners.forEach((partner) => {
    const date = validDate(partner.createdAt, new Date(0));
    const bucket = inPeriod(date, bounds) ? growthMap.get(bucketKey(date, mode)) : undefined;
    if (bucket) bucket.partners += 1;
  });
  const revenueMap = new Map(slots.map((slot) => [slot.key, { grossPaid: 0, partnerCost: 0, packagingCost: 0, netRevenue: 0 }]));
  realizedRecords.filter((record) => inPeriod(record.completedAt, bounds)).forEach((record) => {
    const key = bucketKey(record.completedAt, mode);
    const bucket = revenueMap.get(key);
    if (!bucket) return;
    bucket.grossPaid += record.grossPaid;
    bucket.partnerCost += record.tailorCost + record.deliveryCost;
    bucket.packagingCost += PACKAGING_COST_PER_ORDER;
  });
  return {
    orders: slots.map((slot) => ({ label: slot.label, ...orderMap.get(slot.key)! })),
    growth: slots.map((slot) => ({ label: slot.label, ...growthMap.get(slot.key)! })),
    revenue: slots.map((slot) => {
      const value = revenueMap.get(slot.key)!;
      return { label: slot.label, ...value, netRevenue: value.grossPaid - value.partnerCost - value.packagingCost };
    })
  };
}

export async function getDashboardAnalytics(startValue?: unknown, endValue?: unknown, lifetime = false) {
  const { current, previous } = parseDashboardPeriod(startValue, endValue, lifetime);
  const [legacyOrders, tailoringRequests, payments, earnings, walletCredits, payoutHistory, wallets, tailors, partners, deliveryRequests, deliveryBatches, measurementVisits, otpMetric] = await Promise.all([
    OrderModel.find().select("_id orderNumber customerId tailorId status totalAmount createdAt timelineEvents").lean(),
    TailoringRequestModel.find().select("_id customerId assignedTailorId selectedQuoteId status orderStatus workStatus cancellationFee quoteAmount homeMeasurementBooked homeMeasurementFee createdAt timelineEvents").lean(),
    PaymentModel.find().select("_id orderId method amount status providerRef paidAt refundedAt createdAt updatedAt").lean(),
    WalletTransactionModel.find({ transactionType: "CREDIT", category: "ORDER_EARNING" }).select("_id userId userType orderId amount createdAt").lean(),
    WalletTransactionModel.find({ transactionType: "CREDIT" }).select("_id userId userType orderId category amount createdAt").lean(),
    PaymentHistoryModel.find({ status: "PAID" }).select("_id userId userType amount paidAt status").lean(),
    WalletModel.find({ userType: { $in: ["TAILOR", "DELIVERY_PARTNER"] }, balance: { $gt: 0 } }).select("userId userType balance").lean(),
    TailorModel.find({ verificationStatus: { $in: ["PENDING", "VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"] } }).select("_id userId shopName isAvailable verificationStatus verification.personal.name verification.idVerification.facePhotoUrl rating createdAt").lean(),
    DeliveryPartnerModel.find({ verificationStatus: { $in: ["PENDING", "VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"] } }).select("_id userId isAvailable verificationStatus verification.personal.gender verification.identity.facePhotoUrl rating createdAt").lean(),
    DeliveryRequestModel.find().select("_id taskId orderId type batchId assignedDeliveryPartnerId taskStatus finalPayout deliveredAt").lean(),
    DeliveryBatchModel.find().select("batchId deliveryPartnerId status finalPayout").lean(),
    MeasurementVisitModel.find().select("_id requestId assignedTailorId status visitPayout submittedAt updatedAt").lean(),
    OtpMetricModel.findById("twofactor-successful-sends").lean()
  ]);

  const completionByOrder = new Map<string, Date>();
  deliveryRequests
    .filter((task: any) => String(task.taskStatus) === "delivered" && ["tailor_to_customer", "darji_to_customer"].includes(String(task.type)) && task.deliveredAt)
    .forEach((task: any) => {
      const orderId = String(task.orderId);
      const deliveredAt = validDate(task.deliveredAt, new Date(0));
      const existing = completionByOrder.get(orderId);
      if (!existing || deliveredAt > existing) completionByOrder.set(orderId, deliveredAt);
    });
  legacyOrders.forEach((order: any) => {
    if (completionByOrder.has(String(order._id))) return;
    const deliveredEvent = [...(order.timelineEvents ?? [])].reverse().find((event: any) => String(event.status).toUpperCase() === "DELIVERED");
    if (deliveredEvent?.timestamp) completionByOrder.set(String(order._id), validDate(deliveredEvent.timestamp, new Date(0)));
  });
  tailoringRequests.forEach((request: any) => {
    if (completionByOrder.has(String(request._id))) return;
    const completedEvent = [...(request.timelineEvents ?? [])].reverse().find((event: any) => ["DELIVERED", "COMPLETED"].includes(String(event.status).toUpperCase()));
    if (completedEvent?.timestamp) completionByOrder.set(String(request._id), validDate(completedEvent.timestamp, new Date(0)));
  });

  const requestIds = tailoringRequests.map((request) => String(request._id));
  const quoteCounts = requestIds.length ? await TailorQuoteModel.aggregate<{ _id: string; count: number }>([
    { $match: { requestId: { $in: requestIds } } },
    { $group: { _id: "$requestId", count: { $sum: 1 } } }
  ]) : [];
  const quoteCountMap = new Map(quoteCounts.map((item) => [String(item._id), Number(item.count)]));
  const selectedQuoteIds = tailoringRequests.map((request: any) => request.selectedQuoteId).filter(Boolean);
  const selectedQuotes = selectedQuoteIds.length
    ? await TailorQuoteModel.find({ _id: { $in: selectedQuoteIds } }).select("_id requestId tailorId price status").lean()
    : [];
  const selectedQuoteTailorMap = new Map(selectedQuotes.map((quote: any) => [String(quote._id), String(quote.tailorId)]));

  const normalizedMap = new Map<string, NormalizedOrder>();
  legacyOrders.forEach((order: any) => {
    const id = String(order._id);
    normalizedMap.set(id, {
      id,
      source: "ORDER",
      customerId: String(order.customerId),
      orderNumber: String(order.orderNumber ?? order._id),
      status: String(order.status ?? "UNKNOWN"),
      tailorId: order.tailorId ? String(order.tailorId) : undefined,
      createdAt: validDate(order.createdAt, new Date(0)),
      completedAt: completionByOrder.get(id),
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
      orderNumber: String(request._id),
      status: String(request.orderStatus ?? request.status ?? "UNKNOWN"),
      tailorId: request.assignedTailorId
        ? String(request.assignedTailorId)
        : request.selectedQuoteId
          ? selectedQuoteTailorMap.get(String(request.selectedQuoteId))
          : undefined,
      createdAt: validDate(request.createdAt, new Date(0)),
      completedAt: completionByOrder.get(id),
      category: classifyTailoringRequest(request),
      stage: tailoringStage(request, quoteCountMap.get(id) ?? 0),
      cancellationFee: Number(request.cancellationFee ?? 0)
    });
  });
  const normalizedOrders = [...normalizedMap.values()];

  const financeUserIds = [...new Set([
    ...normalizedOrders.map((order) => order.customerId),
    ...tailors.map((tailor: any) => String(tailor.userId)),
    ...partners.map((partner: any) => String(partner.userId))
  ].filter(Boolean))];
  const financeUsers = financeUserIds.length
    ? await UserModel.find({ _id: { $in: financeUserIds } }).select("_id name phone avatarUrl").lean()
    : [];
  const userMap = new Map(financeUsers.map((user: any) => [String(user._id), user]));
  normalizedOrders.forEach((order) => {
    const customer = userMap.get(order.customerId);
    order.customerName = customer?.name || customer?.phone || "Customer";
  });

  const financeOrdersById = new Map<string, FinanceOrder>(normalizedOrders.map((order) => [order.id, {
    id: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    orderNumber: order.orderNumber,
    status: order.status,
    category: order.category,
    cancellationFee: order.cancellationFee,
    completedAt: order.completedAt
  }]));
  const paymentCollections = buildPaymentCollections(
    payments.map((payment: any) => ({
      id: String(payment._id),
      orderId: String(payment.orderId),
      method: String(payment.method ?? "UNKNOWN"),
      status: String(payment.status ?? "UNKNOWN"),
      amount: Number(payment.amount ?? 0),
      providerRef: payment.providerRef,
      paidAt: payment.paidAt,
      refundedAt: payment.refundedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    })),
    financeOrdersById,
    current
  );

  const earningInputs = walletCredits.map((earning: any) => ({
    id: String(earning._id),
    userId: String(earning.userId),
    userType: earning.userType as "TAILOR" | "DELIVERY_PARTNER",
    amount: Number(earning.amount ?? 0),
    createdAt: validDate(earning.createdAt, new Date(0))
  }));
  const payoutInputs = payoutHistory.map((payout: any) => ({
    id: String(payout._id),
    userId: String(payout.userId),
    userType: payout.userType as "TAILOR" | "DELIVERY_PARTNER",
    amount: Number(payout.amount ?? 0),
    paidAt: validDate(payout.paidAt, new Date(0)),
    status: String(payout.status)
  }));
  const payoutAllocation = allocatePayoutsFifo(earningInputs, payoutInputs);
  const creditBySource = new Map<string, any>();
  earnings.forEach((earning: any) => {
    const key = `${earning.userType}:${String(earning.userId)}:${String(earning.orderId ?? "")}`;
    if (!creditBySource.has(key)) creditBySource.set(key, earning);
  });
  const tailorByProfileId = new Map(tailors.map((tailor: any) => [String(tailor._id), tailor]));
  const partnerByProfileId = new Map(partners.map((partner: any) => [String(partner._id), partner]));
  const selectedQuoteByRequestId = new Map(selectedQuotes.map((quote: any) => [String(quote.requestId), quote]));
  const legacyOrderById = new Map(legacyOrders.map((order: any) => [String(order._id), order]));
  const tailoringRequestById = new Map(tailoringRequests.map((request: any) => [String(request._id), request]));
  const taskById = new Map(deliveryRequests.map((task: any) => [String(task._id), task]));
  const batchById = new Map(deliveryBatches.map((batch: any) => [String(batch.batchId), batch]));
  const obligations: PartnerObligation[] = [];
  const financeExceptions: Array<{ type: string; orderId?: string; sourceId?: string; message: string }> = [];

  const addObligation = (input: Omit<PartnerObligation, "partnerName">) => {
    const partnerUser = userMap.get(input.partnerId);
    obligations.push({ ...input, partnerName: partnerUser?.name || partnerUser?.phone || input.partnerId });
  };
  const creditFor = (userType: "TAILOR" | "DELIVERY_PARTNER", userId: string, sourceId: string) =>
    creditBySource.get(`${userType}:${userId}:${sourceId}`);

  normalizedOrders.forEach((order) => {
    if (order.source === "TAILORING_REQUEST") {
      const request: any = tailoringRequestById.get(order.id);
      const quote: any = selectedQuoteByRequestId.get(order.id);
      const tailorProfile: any = quote?.tailorId ? tailorByProfileId.get(String(quote.tailorId)) : undefined;
      const amount = Number(quote?.price ?? request?.quoteAmount ?? 0);
      if (tailorProfile?.userId && amount > 0) {
        const credit = creditFor("TAILOR", String(tailorProfile.userId), order.id);
        addObligation({
          id: `stitching:${order.id}`,
          orderId: order.id,
          partnerId: String(tailorProfile.userId),
          partnerType: "TAILOR",
          category: "STITCHING",
          sourceId: order.id,
          sourceType: "ORDER",
          amount: roundMoney(amount),
          earningDate: validDate(credit?.createdAt, order.completedAt ?? order.createdAt),
          completionDate: order.completedAt,
          creditId: credit ? String(credit._id) : undefined,
          creditAmount: credit ? Number(credit.amount ?? 0) : undefined
        });
      }
    } else {
      const legacy: any = legacyOrderById.get(order.id);
      const tailorProfile: any = legacy?.tailorId ? tailorByProfileId.get(String(legacy.tailorId)) : undefined;
      const amount = roundMoney(Number(legacy?.totalAmount ?? 0) * 0.45);
      if (tailorProfile?.userId && amount > 0) {
        const credit = creditFor("TAILOR", String(tailorProfile.userId), order.id);
        addObligation({
          id: `stitching:${order.id}`,
          orderId: order.id,
          partnerId: String(tailorProfile.userId),
          partnerType: "TAILOR",
          category: "STITCHING",
          sourceId: order.id,
          sourceType: "ORDER",
          amount,
          earningDate: validDate(credit?.createdAt, order.completedAt ?? order.createdAt),
          completionDate: order.completedAt,
          creditId: credit ? String(credit._id) : undefined,
          creditAmount: credit ? Number(credit.amount ?? 0) : undefined
        });
      }
    }
  });

  measurementVisits.forEach((visit: any) => {
    if (String(visit.status).toUpperCase() !== "SUBMITTED") return;
    const order = normalizedMap.get(String(visit.requestId));
    const tailorProfile: any = visit.assignedTailorId ? tailorByProfileId.get(String(visit.assignedTailorId)) : undefined;
    const amount = Number(visit.visitPayout ?? 0);
    if (!order || !tailorProfile?.userId || amount <= 0) return;
    const credit = creditFor("TAILOR", String(tailorProfile.userId), String(visit._id));
    addObligation({
      id: `measurement:${String(visit._id)}`,
      orderId: order.id,
      partnerId: String(tailorProfile.userId),
      partnerType: "TAILOR",
      category: "MEASUREMENT",
      sourceId: String(visit._id),
      sourceType: "MEASUREMENT_VISIT",
      amount: roundMoney(amount),
      earningDate: validDate(credit?.createdAt ?? visit.submittedAt ?? visit.updatedAt, order.completedAt ?? order.createdAt),
      completionDate: order.completedAt,
      creditId: credit ? String(credit._id) : undefined,
      creditAmount: credit ? Number(credit.amount ?? 0) : undefined
    });
  });

  const batchAllocations = new Map<string, number>();
  deliveryBatches.forEach((batch: any) => {
    if (batch.finalPayout == null) return;
    const activeTaskIds = deliveryRequests
      .filter((task: any) => String(task.batchId ?? "") === String(batch.batchId) && String(task.taskStatus) !== "cancelled")
      .map((task: any) => String(task._id));
    allocateAmountExactly(Number(batch.finalPayout), activeTaskIds).forEach((amount, taskId) => batchAllocations.set(taskId, amount));
  });
  deliveryRequests.filter((task: any) => String(task.taskStatus) !== "cancelled").forEach((task: any) => {
    const order = normalizedMap.get(String(task.orderId));
    if (!order) return;
    const batch: any = task.batchId ? batchById.get(String(task.batchId)) : undefined;
    const partnerProfile: any = batch?.deliveryPartnerId
      ? partnerByProfileId.get(String(batch.deliveryPartnerId))
      : task.assignedDeliveryPartnerId
        ? partnerByProfileId.get(String(task.assignedDeliveryPartnerId))
        : undefined;
    const amount = task.batchId ? batchAllocations.get(String(task._id)) : task.finalPayout;
    if (!partnerProfile?.userId || amount == null) return;
    const sourceId = task.batchId ? String(task.batchId) : String(task._id);
    const credit = creditFor("DELIVERY_PARTNER", String(partnerProfile.userId), sourceId);
    addObligation({
      id: `delivery:${String(task._id)}`,
      orderId: order.id,
      partnerId: String(partnerProfile.userId),
      partnerType: "DELIVERY_PARTNER",
      category: "DELIVERY",
      sourceId,
      sourceType: task.batchId ? "DELIVERY_BATCH" : "DELIVERY_TASK",
      taskId: String(task.taskId ?? task._id),
      batchId: task.batchId ? String(task.batchId) : undefined,
      amount: roundMoney(Number(amount)),
      earningDate: validDate(credit?.createdAt ?? task.deliveredAt, order.completedAt ?? order.createdAt),
      completionDate: order.completedAt,
      creditId: credit ? String(credit._id) : undefined,
      creditAmount: credit ? Number(credit.amount ?? 0) : undefined
    });
  });

  const reconciledObligations = reconcilePartnerObligations(obligations, payoutAllocation.paidByEarningId);
  const completedPartnerRows = reconciledObligations.filter((row) => normalizedMap.get(row.orderId)?.category === "completed" && row.completionDate);
  const currentPartnerRows = completedPartnerRows.filter((row) => row.completionDate && inFinancePeriod(row.completionDate, current));
  const currentPartnerSummary = summarizePartnerCosts(currentPartnerRows);
  const allCompletedPartnerSummary = summarizePartnerCosts(completedPartnerRows);

  const obligationsByOrder = new Map<string, typeof completedPartnerRows>();
  completedPartnerRows.forEach((row) => obligationsByOrder.set(row.orderId, [...(obligationsByOrder.get(row.orderId) ?? []), row]));
  const paymentOrderIds = new Set(paymentCollections.allRows.map((row) => row.orderId));
  const realizedRecords: RealizedRecord[] = [];
  const realizedOrderRows: Array<{
    orderId: string; orderNumber?: string; completionDate: string; collectedAmount: number; stitchingCost: number;
    measurementCost: number; deliveryCost: number; operationalAllowance: number; partnerCost: number; realizedRevenue: number; marginPercentage: number | null;
  }> = [];
  normalizedOrders.filter((order) => order.category === "completed" && order.completedAt).forEach((order) => {
    const rows = obligationsByOrder.get(order.id) ?? [];
    const stitchingRows = rows.filter((row) => row.category === "STITCHING");
    const measurementRows = rows.filter((row) => row.category === "MEASUREMENT");
    const deliveryRows = rows.filter((row) => row.category === "DELIVERY");
    const request: any = tailoringRequestById.get(order.id);
    const measurementRequired = Boolean(request?.homeMeasurementBooked || Number(request?.homeMeasurementFee ?? 0) > 0);
    const activeTasks = deliveryRequests.filter((task: any) => String(task.orderId) === order.id && String(task.taskStatus) !== "cancelled");
    const missing: string[] = [];
    if (!paymentOrderIds.has(order.id)) missing.push("customer collection");
    if (!stitchingRows.length) missing.push("stitching cost");
    if (measurementRequired && !measurementRows.length) missing.push("measurement cost");
    if (!activeTasks.length || deliveryRows.length !== activeTasks.length) missing.push("finalized delivery cost");
    if (missing.length) {
      financeExceptions.push({ type: "INCOMPLETE_ORDER_FINANCE", orderId: order.id, message: `Excluded from realized revenue: missing ${missing.join(", ")}.` });
      return;
    }
    rows.filter((row) => !row.creditId).forEach((row) => financeExceptions.push({
      type: "MISSING_WALLET_CREDIT", orderId: order.id, sourceId: row.sourceId,
      message: `${row.category.toLowerCase()} liability is finalized but has no matching wallet earning credit.`
    }));
    const grossPaid = roundMoney(paymentCollections.allTimeNetByOrder.get(order.id) ?? 0);
    const stitchingCost = roundMoney(stitchingRows.reduce((sum, row) => sum + row.amount, 0));
    const measurementCost = roundMoney(measurementRows.reduce((sum, row) => sum + row.amount, 0));
    const deliveryCost = roundMoney(deliveryRows.reduce((sum, row) => sum + row.amount, 0));
    const tailorCost = roundMoney(stitchingCost + measurementCost);
    const realizedRevenue = roundMoney(grossPaid - tailorCost - deliveryCost - OPERATIONAL_ALLOWANCE_PER_ORDER);
    realizedRecords.push({ orderId: order.id, completedAt: order.completedAt!, grossPaid, tailorCost, deliveryCost });
    realizedOrderRows.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      completionDate: order.completedAt!.toISOString(),
      collectedAmount: grossPaid,
      stitchingCost,
      measurementCost,
      deliveryCost,
      operationalAllowance: OPERATIONAL_ALLOWANCE_PER_ORDER,
      partnerCost: roundMoney(tailorCost + deliveryCost),
      realizedRevenue,
      marginPercentage: grossPaid ? roundMoney((realizedRevenue / grossPaid) * 100) : null
    });
  });
  if (payoutAllocation.unallocatedPaidAmount > 0) financeExceptions.push({
    type: "UNALLOCATED_PARTNER_PAYOUT",
    message: `${payoutAllocation.unallocatedPaidAmount.toFixed(2)} of successful partner payouts cannot be matched to order-earning credits.`
  });
  reconciledObligations.filter((row) => normalizedMap.get(row.orderId)?.category !== "completed").forEach((row) => {
    if (row.amountPaid > 0) financeExceptions.push({
      type: "PAYOUT_FOR_UNFINISHED_ORDER", orderId: row.orderId, sourceId: row.sourceId,
      message: `${row.amountPaid.toFixed(2)} was paid against an earning whose order is not completed; it is excluded from completed-order Partner Cost.`
    });
  });

  const currentOrders = orderCounts(normalizedOrders, current);
  const previousOrders = previous ? orderCounts(normalizedOrders, previous) : null;
  const currentPaidPayments = paymentCollections.periodRows;
  const currentFinance = {
    ...paymentCollections.summary,
    tailorCost: currentPartnerSummary.stitchingCost + currentPartnerSummary.measurementCost,
    deliveryCost: currentPartnerSummary.deliveryCost,
    partnerCost: currentPartnerSummary.partnerCost,
    paidPartnerCost: currentPartnerSummary.paidPartnerCost,
    pendingPartnerCost: currentPartnerSummary.pendingPartnerCost,
    packagingCost: 0,
    packagingCostPerOrder: OPERATIONAL_ALLOWANCE_PER_ORDER,
    netRevenue: 0,
    averageOrderValue: paymentCollections.summary.paidOrders ? roundMoney(paymentCollections.summary.grossPaid / paymentCollections.summary.paidOrders) : 0
  };
  const previousPaymentCollections = previous ? buildPaymentCollections(
    payments.map((payment: any) => ({
      id: String(payment._id), orderId: String(payment.orderId), method: String(payment.method ?? "UNKNOWN"), status: String(payment.status ?? "UNKNOWN"),
      amount: Number(payment.amount ?? 0), providerRef: payment.providerRef, paidAt: payment.paidAt, refundedAt: payment.refundedAt,
      createdAt: payment.createdAt, updatedAt: payment.updatedAt
    })), financeOrdersById, previous
  ) : null;
  const previousFinance = previousPaymentCollections?.summary ?? null;
  const currentRealizedRecords = realizedRecords.filter((record) => inPeriod(record.completedAt, current));
  const previousRealizedRecords = previous ? realizedRecords.filter((record) => inPeriod(record.completedAt, previous)) : [];
  const currentRealized = summarizeRealizedRecords(currentRealizedRecords);
  const previousRealized = previous ? summarizeRealizedRecords(previousRealizedRecords) : null;
  const completedInCurrentPeriod = normalizedOrders.filter((order) => order.category === "completed" && order.completedAt && inPeriod(order.completedAt, current)).length;

  const firstOrderByCustomer = new Map<string, Date>();
  normalizedOrders.forEach((order) => {
    const existing = firstOrderByCustomer.get(order.customerId);
    if (!existing || order.createdAt < existing) firstOrderByCustomer.set(order.customerId, order.createdAt);
  });
  const newCustomerIds = [...firstOrderByCustomer.entries()].filter(([, date]) => inPeriod(date, current)).map(([customerId]) => customerId);
  const newCustomers = newCustomerIds.length;
  const previousNewCustomers = previous ? [...firstOrderByCustomer.values()].filter((date) => inPeriod(date, previous)).length : 0;

  const newTailorRecords = tailors.filter((tailor: any) => inPeriod(validDate(tailor.createdAt, new Date(0)), current));
  const currentTailors = newTailorRecords.length;
  const previousTailors = previous ? tailors.filter((tailor: any) => inPeriod(validDate(tailor.createdAt, new Date(0)), previous)).length : 0;
  const newPartnerRecords = partners.filter((partner: any) => inPeriod(validDate(partner.createdAt, new Date(0)), current));
  const currentPartners = newPartnerRecords.length;
  const previousPartners = previous ? partners.filter((partner: any) => inPeriod(validDate(partner.createdAt, new Date(0)), previous)).length : 0;

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
      avatarSeed: user?.name || tailor.verification?.personal?.name || tailor.shopName || "Tailor",
      avatarUrl: user?.avatarUrl || tailor.verification?.idVerification?.facePhotoUrl,
      amount: Number((earning?.amount ?? 0).toFixed(2)),
      completedOrders: earning?.orderIds.size ?? 0, rating: Number(tailor.rating ?? 0)
    };
  }).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount || b.rating - a.rating).slice(0, 5);

  const topDeliveryPartners = partners.map((partner: any) => {
    const earning = partnerEarnings.get(String(partner.userId));
    const user = userMap.get(String(partner.userId));
    return {
      profileId: String(partner._id), userId: String(partner.userId),
      name: user?.name || user?.phone || "Delivery partner",
      avatarUrl: user?.avatarUrl || partner.verification?.identity?.facePhotoUrl,
      avatarGender: partner.verification?.personal?.gender,
      amount: Number((earning?.amount ?? 0).toFixed(2)),
      completedDeliveries: completedDeliveries.get(String(partner._id)) ?? 0,
      rating: Number(partner.rating ?? 0)
    };
  }).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount || b.rating - a.rating).slice(0, 5);

  const selectedOrders = normalizedOrders.filter((order) => inPeriod(order.createdAt, current));
  const liveStageOrder = ["Waiting for quote", "Quote received", "Payment / confirmation pending", "Customer confirmed", "Pickup pending", "Picked up", "With tailor", "Ready", "Drop pending", "Delivered", "Cancelled"];
  const stageCounts = new Map(liveStageOrder.map((stage) => [stage, 0]));
  selectedOrders.forEach((order) => stageCounts.set(order.stage, (stageCounts.get(order.stage) ?? 0) + 1));

  const series = buildSeries(normalizedOrders, realizedRecords, [...firstOrderByCustomer.values()], tailors, partners, current);
  const activeTailorRecords = tailors.filter((tailor: any) => tailor.isAvailable && tailor.verificationStatus === "VERIFIED");
  const activePartnerRecords = partners.filter((partner: any) => partner.isAvailable && partner.verificationStatus === "VERIFIED");
  const activeTailors = activeTailorRecords.length;
  const activeDeliveryPartners = activePartnerRecords.length;
  const pendingPayouts = allCompletedPartnerSummary.pendingPartnerCost;
  const rawWalletLiability = roundMoney(wallets.reduce((sum: number, wallet: any) => sum + Number(wallet.balance ?? 0), 0));

  return {
    period: {
      start: current.start.toISOString(), endExclusive: current.endExclusive.toISOString(),
      previousStart: previous?.start.toISOString() ?? null, previousEndExclusive: previous?.endExclusive.toISOString() ?? null,
      lifetime
    },
    orders: currentOrders,
    finance: {
      ...currentFinance,
      netRevenue: currentRealized.netRevenue,
      realizedGrossPaid: currentRealized.grossPaid,
      realizedTailorCost: currentRealized.tailorCost,
      realizedDeliveryCost: currentRealized.deliveryCost,
      realizedPartnerCost: currentRealized.partnerCost,
      realizedPackagingCost: currentRealized.packagingCost,
      realizedCompletedOrders: currentRealized.completedOrders,
      unrealizedCompletedOrders: Math.max(0, completedInCurrentPeriod - currentRealized.completedOrders),
      pendingPayouts: roundMoney(pendingPayouts),
      pendingPayoutAsOf: new Date().toISOString(),
      onlineCollections: paymentCollections.summary.onlineCollections,
      codCollections: paymentCollections.summary.codCollections,
      refunds: paymentCollections.summary.refunds,
      completedCollections: paymentCollections.summary.completedCollections,
      incompleteCollections: paymentCollections.summary.incompleteCollections,
      cancelledCollections: paymentCollections.summary.cancelledCollections,
      duplicatePaymentRecordsIgnored: paymentCollections.summary.duplicatePaymentRecordsIgnored,
      paidPartnerCost: currentPartnerSummary.paidPartnerCost,
      pendingPartnerCost: currentPartnerSummary.pendingPartnerCost,
      pendingStitching: allCompletedPartnerSummary.pendingStitching,
      pendingMeasurement: allCompletedPartnerSummary.pendingMeasurement,
      pendingDelivery: allCompletedPartnerSummary.pendingDelivery,
      rawWalletLiability
    },
    financeDetails: {
      grossPaid: {
        summary: paymentCollections.summary,
        rows: paymentCollections.periodRows
      },
      partnerCost: {
        summary: currentPartnerSummary,
        rows: currentPartnerRows
      },
      pendingPayouts: {
        asOf: new Date().toISOString(),
        summary: allCompletedPartnerSummary,
        rows: completedPartnerRows.filter((row) => row.amountPending > 0)
      },
      realizedRevenue: {
        summary: currentRealized,
        rows: realizedOrderRows.filter((row) => inPeriod(validDate(row.completionDate, new Date(0)), current))
      },
      reconciliation: {
        collectedInPeriod: paymentCollections.summary.grossPaid,
        completedOrderCollectionsInPeriod: currentRealized.grossPaid,
        advanceOrOtherCollectionsInPeriod: roundMoney(paymentCollections.summary.grossPaid - paymentCollections.summary.completedCollections),
        eligibleCompletedPartnerCost: currentPartnerSummary.partnerCost,
        currentEligiblePendingPayouts: allCompletedPartnerSummary.pendingPartnerCost,
        rawWalletLiability,
        exceptions: financeExceptions
      }
    },
    partners: { activeTailors, activeDeliveryPartners },
    otp: {
      successfulSends: Number(otpMetric?.successfulSendCount ?? 0),
      lastSentAt: otpMetric?.lastSentAt ? new Date(otpMetric.lastSentAt).toISOString() : null
    },
    growth: { newCustomers, newTailors: currentTailors, newDeliveryPartners: currentPartners },
    drilldowns: {
      orders: {
        total: selectedOrders.map((order) => order.id),
        pending: selectedOrders.filter((order) => order.category === "pending").map((order) => order.id),
        active: selectedOrders.filter((order) => order.category === "active").map((order) => order.id),
        completed: selectedOrders.filter((order) => order.category === "completed").map((order) => order.id),
        cancelled: selectedOrders.filter((order) => order.category === "cancelled").map((order) => order.id),
        resolved: selectedOrders.filter((order) => order.category === "completed" || order.category === "cancelled").map((order) => order.id),
        realized: currentRealizedRecords.map((record) => record.orderId)
      },
      finance: {
        paidPaymentIds: currentPaidPayments.map((payment: any) => String(payment.paymentId)),
        partnerCostUserIds: [...new Set(currentPartnerRows.map((row) => row.partnerId))],
        pendingPayoutUserIds: [...new Set(completedPartnerRows.filter((row) => row.amountPending > 0).map((row) => row.partnerId))]
      },
      partners: {
        activeTailorIds: activeTailorRecords.map((tailor: any) => String(tailor._id)),
        activeDeliveryPartnerIds: activePartnerRecords.map((partner: any) => String(partner._id))
      },
      growth: {
        newCustomerIds,
        newTailorIds: newTailorRecords.map((tailor: any) => String(tailor._id)),
        newDeliveryPartnerIds: newPartnerRecords.map((partner: any) => String(partner._id))
      }
    },
    comparison: {
      orders: previousOrders ? percentageChange(currentOrders.total, previousOrders.total) : null,
      grossPaid: previousFinance ? percentageChange(currentFinance.grossPaid, previousFinance.grossPaid) : null,
      netRevenue: previousRealized ? percentageChange(currentRealized.netRevenue, previousRealized.netRevenue) : null,
      newCustomers: previous ? percentageChange(newCustomers, previousNewCustomers) : null,
      newTailors: previous ? percentageChange(currentTailors, previousTailors) : null,
      newDeliveryPartners: previous ? percentageChange(currentPartners, previousPartners) : null
    },
    series,
    liveStages: liveStageOrder.map((stage) => ({ stage, count: stageCounts.get(stage) ?? 0 })).filter((item) => item.count > 0),
    topTailors,
    topDeliveryPartners,
    limitations: [
      "Historical paidAt is unavailable for older payments; updatedAt is used as the collection-date fallback.",
      "The current payment schema supports full refunded status only; partial refund amounts are not represented.",
      "COD payment status confirms collection by a delivery partner, not remittance to Darji; COD rows remain collected-unreconciled.",
      "Order cancellation status does not currently store the actor, so customer-initiated and admin-initiated cancellations cannot be separated historically.",
      "Realized revenue excludes delivered orders that lack a completion timestamp, collected payment, recorded tailor earning, or finalized delivery payout; no estimated delivery cost is substituted.",
      "Finalized batch payout is allocated equally across non-cancelled tasks in paise, with deterministic remainder assignment by task ID.",
      "The operational allowance is fixed at ₹16 once per eligible completed order."
    ]
  };
}

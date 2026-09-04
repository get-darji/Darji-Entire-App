import {
  DeliveryBatchModel,
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
  completedAt?: Date;
  category: OrderCategory;
  stage: string;
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

function actualDeliveryCostByOrder(deliveryRequests: any[], deliveryBatches: any[], earnings: any[]) {
  const batchById = new Map(deliveryBatches.map((batch) => [String(batch.batchId), batch]));
  const deliveryLedgerBySource = new Map<string, number>();
  earnings.filter((transaction) => transaction.userType === "DELIVERY_PARTNER").forEach((transaction) => {
    const sourceId = String(transaction.orderId ?? "");
    if (sourceId) deliveryLedgerBySource.set(sourceId, (deliveryLedgerBySource.get(sourceId) ?? 0) + Number(transaction.amount ?? 0));
  });
  const activeTaskCountByBatch = new Map<string, number>();
  deliveryRequests.forEach((task) => {
    const batchId = String(task.batchId ?? "");
    if (batchId && String(task.taskStatus) !== "cancelled") {
      activeTaskCountByBatch.set(batchId, (activeTaskCountByBatch.get(batchId) ?? 0) + 1);
    }
  });

  const tasksByOrder = new Map<string, any[]>();
  deliveryRequests.forEach((task) => {
    if (String(task.taskStatus) === "cancelled") return;
    const orderId = String(task.orderId);
    const tasks = tasksByOrder.get(orderId) ?? [];
    tasks.push(task);
    tasksByOrder.set(orderId, tasks);
  });

  const result = new Map<string, number | null>();
  tasksByOrder.forEach((tasks, orderId) => {
    let total = 0;
    let finalized = tasks.length > 0;
    tasks.forEach((task) => {
      const batchId = String(task.batchId ?? "");
      if (!batchId) {
        const actualPayout = task.finalPayout ?? deliveryLedgerBySource.get(String(task._id));
        if (actualPayout == null) finalized = false;
        else total += Number(actualPayout);
        return;
      }
      const batch = batchById.get(batchId);
      const activeTaskCount = activeTaskCountByBatch.get(batchId) ?? 0;
      const actualPayout = batch?.finalPayout ?? deliveryLedgerBySource.get(batchId);
      if (actualPayout == null || activeTaskCount <= 0) finalized = false;
      else total += Number(actualPayout) / activeTaskCount;
    });
    result.set(orderId, finalized ? Number(total.toFixed(2)) : null);
  });
  return result;
}

function buildRealizedRecords(
  orders: NormalizedOrder[],
  payments: any[],
  earnings: any[],
  deliveryRequests: any[],
  deliveryBatches: any[]
) {
  const paidByOrder = new Map<string, number>();
  payments.filter((payment) => String(payment.status).toUpperCase() === "PAID").forEach((payment) => {
    const orderId = String(payment.orderId);
    paidByOrder.set(orderId, (paidByOrder.get(orderId) ?? 0) + Number(payment.amount ?? 0));
  });
  const tailorCostByOrder = new Map<string, number>();
  earnings.filter((transaction) => transaction.userType === "TAILOR").forEach((transaction) => {
    const orderId = String(transaction.orderId ?? "");
    if (orderId) tailorCostByOrder.set(orderId, (tailorCostByOrder.get(orderId) ?? 0) + Number(transaction.amount ?? 0));
  });
  const deliveryCostByOrder = actualDeliveryCostByOrder(deliveryRequests, deliveryBatches, earnings);

  const records: RealizedRecord[] = [];
  orders.filter((order) => order.category === "completed" && order.completedAt).forEach((order) => {
    const grossPaid = paidByOrder.get(order.id);
    const tailorCost = tailorCostByOrder.get(order.id);
    const deliveryCost = deliveryCostByOrder.get(order.id);
    if (grossPaid == null || tailorCost == null || deliveryCost == null) {
      return;
    }
    records.push({ orderId: order.id, completedAt: order.completedAt!, grossPaid, tailorCost, deliveryCost });
  });
  return { records };
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
  const [legacyOrders, tailoringRequests, payments, earnings, wallets, tailors, partners, deliveryRequests, deliveryBatches] = await Promise.all([
    OrderModel.find().select("_id customerId tailorId status createdAt timelineEvents").lean(),
    TailoringRequestModel.find().select("_id customerId assignedTailorId selectedQuoteId status orderStatus workStatus createdAt timelineEvents").lean(),
    PaymentModel.find().select("_id orderId amount status paidAt createdAt updatedAt").lean(),
    WalletTransactionModel.find({ transactionType: "CREDIT", category: "ORDER_EARNING" }).select("userId userType orderId amount createdAt").lean(),
    WalletModel.find({ userType: { $in: ["TAILOR", "DELIVERY_PARTNER"] }, balance: { $gt: 0 } }).select("balance").lean(),
    TailorModel.find().select("_id userId shopName isAvailable verificationStatus rating createdAt").lean(),
    DeliveryPartnerModel.find().select("_id userId isAvailable verificationStatus rating createdAt").lean(),
    DeliveryRequestModel.find().select("_id orderId type batchId taskStatus finalPayout deliveredAt").lean(),
    DeliveryBatchModel.find().select("batchId status finalPayout").lean()
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
      tailorId: request.assignedTailorId
        ? String(request.assignedTailorId)
        : request.selectedQuoteId
          ? selectedQuoteTailorMap.get(String(request.selectedQuoteId))
          : undefined,
      createdAt: validDate(request.createdAt, new Date(0)),
      completedAt: completionByOrder.get(id),
      category: classifyTailoringRequest(request),
      stage: tailoringStage(request, quoteCountMap.get(id) ?? 0)
    });
  });
  const normalizedOrders = [...normalizedMap.values()];

  const currentOrders = orderCounts(normalizedOrders, current);
  const previousOrders = previous ? orderCounts(normalizedOrders, previous) : null;
  const currentFinance = financeSummary(payments, earnings, current);
  const previousFinance = previous ? financeSummary(payments, earnings, previous) : null;
  const { records: realizedRecords } = buildRealizedRecords(normalizedOrders, payments, earnings, deliveryRequests, deliveryBatches);
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
  const newCustomers = [...firstOrderByCustomer.values()].filter((date) => inPeriod(date, current)).length;
  const previousNewCustomers = previous ? [...firstOrderByCustomer.values()].filter((date) => inPeriod(date, previous)).length : 0;

  const currentTailors = tailors.filter((tailor: any) => inPeriod(validDate(tailor.createdAt, new Date(0)), current)).length;
  const previousTailors = previous ? tailors.filter((tailor: any) => inPeriod(validDate(tailor.createdAt, new Date(0)), previous)).length : 0;
  const currentPartners = partners.filter((partner: any) => inPeriod(validDate(partner.createdAt, new Date(0)), current)).length;
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

  const series = buildSeries(normalizedOrders, realizedRecords, [...firstOrderByCustomer.values()], tailors, partners, current);
  const activeTailors = tailors.filter((tailor: any) => tailor.isAvailable && tailor.verificationStatus === "VERIFIED").length;
  const activeDeliveryPartners = partners.filter((partner: any) => partner.isAvailable && partner.verificationStatus === "VERIFIED").length;
  const pendingPayouts = wallets.reduce((sum: number, wallet: any) => sum + Number(wallet.balance ?? 0), 0);

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
      pendingPayouts: Number(pendingPayouts.toFixed(2))
    },
    partners: { activeTailors, activeDeliveryPartners },
    growth: { newCustomers, newTailors: currentTailors, newDeliveryPartners: currentPartners },
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
      "Partial refund amounts are not represented by the current payment schema.",
      "Order cancellation status does not currently store the actor, so customer-initiated and admin-initiated cancellations cannot be separated historically.",
      "Realized revenue excludes delivered orders that lack a completion timestamp, collected payment, recorded tailor earning, or finalized delivery payout; no estimated delivery cost is substituted.",
      "Finalized batch payout is allocated across its non-cancelled delivery tasks using the existing per-task allocation approach.",
      "Packaging and other cost is currently fixed at ₹8 per realized completed order."
    ]
  };
}

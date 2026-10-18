export const OPERATIONAL_ALLOWANCE_PER_ORDER = 16;

export type FinanceBounds = { start: Date; endExclusive: Date };

export type FinanceOrder = {
  id: string;
  customerId?: string;
  customerName?: string;
  orderNumber?: string;
  status: string;
  category: "pending" | "active" | "completed" | "cancelled";
  cancellationFee?: number;
  completedAt?: Date;
};

export type PaymentInput = {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  providerRef?: string;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PaymentCollectionRow = {
  key: string;
  paymentId: string;
  orderId: string;
  customerId?: string;
  customerName?: string;
  orderNumber?: string;
  paymentMethod: string;
  paymentDate?: string;
  refundDate?: string;
  orderStatus: string;
  completed: boolean;
  cancelled: boolean;
  cancellationFee: number;
  collectedAmount: number;
  refundedAmount: number;
  netCollectedAmount: number;
  duplicateRecords: number;
  codRemittanceStatus: "NOT_APPLICABLE" | "COLLECTED_UNRECONCILED";
};

export type PartnerEarningInput = {
  id: string;
  userId: string;
  userType: "TAILOR" | "DELIVERY_PARTNER";
  amount: number;
  createdAt: Date;
};

export type PartnerPayoutInput = {
  id: string;
  userId: string;
  userType: "TAILOR" | "DELIVERY_PARTNER";
  amount: number;
  paidAt: Date;
  status: string;
};

export type PartnerObligation = {
  id: string;
  orderId: string;
  partnerId: string;
  partnerName: string;
  partnerType: "TAILOR" | "DELIVERY_PARTNER";
  category: "STITCHING" | "MEASUREMENT" | "DELIVERY";
  sourceId: string;
  sourceType: "ORDER" | "MEASUREMENT_VISIT" | "DELIVERY_TASK" | "DELIVERY_BATCH";
  taskId?: string;
  batchId?: string;
  amount: number;
  earningDate: Date;
  completionDate?: Date;
  creditId?: string;
  creditAmount?: number;
};

export type PartnerCostRow = PartnerObligation & {
  amountPaid: number;
  amountPending: number;
  payoutStatus: "PAID" | "PARTIALLY_PAID" | "PENDING";
  recognitionDate: string;
};

export function roundMoney(value: number) {
  return Number((Number(value) || 0).toFixed(2));
}

export function inFinancePeriod(date: Date, bounds: FinanceBounds) {
  return date >= bounds.start && date < bounds.endExclusive;
}

function validDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function paymentDedupeKey(payment: PaymentInput) {
  const providerRef = String(payment.providerRef ?? "").trim().toLowerCase();
  if (providerRef) return `provider:${providerRef}`;
  const method = String(payment.method ?? "").toUpperCase();
  if (method === "COD") return `cod:${payment.orderId}`;
  return `fallback:${payment.orderId}:${method}:${roundMoney(payment.amount)}`;
}

export function buildPaymentCollections(
  payments: PaymentInput[],
  ordersById: Map<string, FinanceOrder>,
  bounds: FinanceBounds
) {
  const groups = new Map<string, PaymentInput[]>();
  payments.forEach((payment) => {
    const status = String(payment.status).toUpperCase();
    if (status !== "PAID" && status !== "REFUNDED") return;
    const key = paymentDedupeKey(payment);
    groups.set(key, [...(groups.get(key) ?? []), payment]);
  });

  const allRows: PaymentCollectionRow[] = [];
  groups.forEach((group, key) => {
    const sorted = [...group].sort((a, b) => {
      const aDate = validDate(a.paidAt ?? a.createdAt)?.getTime() ?? 0;
      const bDate = validDate(b.paidAt ?? b.createdAt)?.getTime() ?? 0;
      return aDate - bDate || a.id.localeCompare(b.id);
    });
    const canonical = sorted[0];
    const paidRecord = sorted.find((payment) => String(payment.status).toUpperCase() === "PAID") ?? canonical;
    const refundedRecord = sorted.find((payment) => String(payment.status).toUpperCase() === "REFUNDED");
    const collectionDate = validDate(paidRecord.paidAt ?? paidRecord.updatedAt ?? paidRecord.createdAt);
    const refundDate = refundedRecord
      ? validDate(refundedRecord.refundedAt ?? refundedRecord.updatedAt ?? refundedRecord.createdAt)
      : undefined;
    const collectedAmount = roundMoney(Math.max(...sorted.map((payment) => Number(payment.amount) || 0)));
    const refundedAmount = refundedRecord ? roundMoney(Math.min(collectedAmount, Number(refundedRecord.amount) || collectedAmount)) : 0;
    const order = ordersById.get(String(canonical.orderId));
    allRows.push({
      key,
      paymentId: canonical.id,
      orderId: canonical.orderId,
      customerId: order?.customerId,
      customerName: order?.customerName,
      orderNumber: order?.orderNumber,
      paymentMethod: String(canonical.method).toUpperCase(),
      paymentDate: collectionDate?.toISOString(),
      refundDate: refundDate?.toISOString(),
      orderStatus: order?.status ?? "UNKNOWN",
      completed: order?.category === "completed",
      cancelled: order?.category === "cancelled",
      cancellationFee: order?.category === "cancelled" ? roundMoney(order.cancellationFee ?? 0) : 0,
      collectedAmount,
      refundedAmount,
      netCollectedAmount: roundMoney(collectedAmount - refundedAmount),
      duplicateRecords: Math.max(0, group.length - 1),
      codRemittanceStatus: String(canonical.method).toUpperCase() === "COD" ? "COLLECTED_UNRECONCILED" : "NOT_APPLICABLE"
    });
  });

  const periodRows = allRows.flatMap((row) => {
    const paymentDate = validDate(row.paymentDate);
    const refundDate = validDate(row.refundDate);
    const collectedAmount = paymentDate && inFinancePeriod(paymentDate, bounds) ? row.collectedAmount : 0;
    const refundedAmount = refundDate && inFinancePeriod(refundDate, bounds) ? row.refundedAmount : 0;
    if (!collectedAmount && !refundedAmount) return [];
    return [{ ...row, collectedAmount, refundedAmount, netCollectedAmount: roundMoney(collectedAmount - refundedAmount) }];
  });

  const sum = (rows: PaymentCollectionRow[], selector: (row: PaymentCollectionRow) => number) =>
    roundMoney(rows.reduce((total, row) => total + selector(row), 0));
  const grossPaid = sum(periodRows, (row) => row.netCollectedAmount);
  const onlineCollections = sum(periodRows.filter((row) => row.paymentMethod !== "COD"), (row) => row.collectedAmount);
  const codCollections = sum(periodRows.filter((row) => row.paymentMethod === "COD"), (row) => row.collectedAmount);
  const refunds = sum(periodRows, (row) => row.refundedAmount);
  const completedCollections = sum(periodRows.filter((row) => row.completed), (row) => row.netCollectedAmount);
  const cancelledCollections = sum(periodRows.filter((row) => row.cancelled), (row) => row.netCollectedAmount);
  const cancellationFees = sum(periodRows.filter((row) => row.cancelled), (row) => Math.min(row.cancellationFee, Math.max(0, row.netCollectedAmount)));
  const unrefundedCancelledCollections = roundMoney(Math.max(0, cancelledCollections - cancellationFees));
  const incompleteCollections = roundMoney(grossPaid - completedCollections - cancelledCollections);
  const allTimeNetByOrder = new Map<string, number>();
  allRows.forEach((row) => allTimeNetByOrder.set(row.orderId, roundMoney((allTimeNetByOrder.get(row.orderId) ?? 0) + row.netCollectedAmount)));

  return {
    allRows,
    periodRows,
    allTimeNetByOrder,
    summary: {
      grossPaid,
      onlineCollections,
      codCollections,
      refunds,
      completedCollections,
      incompleteCollections,
      cancelledCollections,
      cancellationFees,
      unrefundedCancelledCollections,
      paidOrders: new Set(periodRows.filter((row) => row.netCollectedAmount !== 0).map((row) => row.orderId)).size,
      duplicatePaymentRecordsIgnored: periodRows.reduce((total, row) => total + row.duplicateRecords, 0)
    }
  };
}

export function allocateAmountExactly(amount: number, ids: string[]) {
  const uniqueIds = [...new Set(ids)].sort();
  const allocations = new Map<string, number>();
  if (!uniqueIds.length) return allocations;
  const totalPaise = Math.round(roundMoney(amount) * 100);
  const base = Math.floor(totalPaise / uniqueIds.length);
  let remainder = totalPaise - base * uniqueIds.length;
  uniqueIds.forEach((id) => {
    const paise = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    allocations.set(id, paise / 100);
  });
  return allocations;
}

export function allocatePayoutsFifo(earnings: PartnerEarningInput[], payouts: PartnerPayoutInput[]) {
  const paidByEarningId = new Map<string, number>();
  const payoutGroups = new Map<string, PartnerPayoutInput[]>();
  payouts.filter((payout) => String(payout.status).toUpperCase() === "PAID").forEach((payout) => {
    const key = `${payout.userType}:${payout.userId}`;
    payoutGroups.set(key, [...(payoutGroups.get(key) ?? []), payout]);
  });
  const earningGroups = new Map<string, PartnerEarningInput[]>();
  earnings.forEach((earning) => {
    const key = `${earning.userType}:${earning.userId}`;
    earningGroups.set(key, [...(earningGroups.get(key) ?? []), earning]);
  });

  let unallocatedPaidAmount = 0;
  payoutGroups.forEach((groupPayouts, key) => {
    const groupEarnings = [...(earningGroups.get(key) ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    let availablePaid = roundMoney(groupPayouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0));
    groupEarnings.forEach((earning) => {
      const paid = roundMoney(Math.min(Number(earning.amount) || 0, availablePaid));
      paidByEarningId.set(earning.id, paid);
      availablePaid = roundMoney(availablePaid - paid);
    });
    unallocatedPaidAmount = roundMoney(unallocatedPaidAmount + availablePaid);
  });
  return { paidByEarningId, unallocatedPaidAmount };
}

export function reconcilePartnerObligations(
  obligations: PartnerObligation[],
  paidByEarningId: Map<string, number>
) {
  const byCredit = new Map<string, PartnerObligation[]>();
  obligations.forEach((obligation) => {
    if (!obligation.creditId) return;
    byCredit.set(obligation.creditId, [...(byCredit.get(obligation.creditId) ?? []), obligation]);
  });
  const paidByObligation = new Map<string, number>();
  byCredit.forEach((rows, creditId) => {
    let remaining = roundMoney(paidByEarningId.get(creditId) ?? 0);
    [...rows].sort((a, b) => a.id.localeCompare(b.id)).forEach((row) => {
      const paid = roundMoney(Math.min(row.amount, remaining));
      paidByObligation.set(row.id, paid);
      remaining = roundMoney(remaining - paid);
    });
  });
  return obligations.map<PartnerCostRow>((obligation) => {
    const amountPaid = roundMoney(Math.min(obligation.amount, paidByObligation.get(obligation.id) ?? 0));
    const amountPending = roundMoney(Math.max(0, obligation.amount - amountPaid));
    return {
      ...obligation,
      amountPaid,
      amountPending,
      payoutStatus: amountPending <= 0 ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "PENDING",
      recognitionDate: (obligation.completionDate ?? obligation.earningDate).toISOString()
    };
  });
}

export function summarizePartnerCosts(rows: PartnerCostRow[]) {
  const total = (filter: (row: PartnerCostRow) => boolean, field: "amount" | "amountPaid" | "amountPending" = "amount") =>
    roundMoney(rows.filter(filter).reduce((sum, row) => sum + Number(row[field] ?? 0), 0));
  return {
    partnerCost: total(() => true),
    stitchingCost: total((row) => row.category === "STITCHING"),
    measurementCost: total((row) => row.category === "MEASUREMENT"),
    deliveryCost: total((row) => row.category === "DELIVERY"),
    paidPartnerCost: total(() => true, "amountPaid"),
    pendingPartnerCost: total(() => true, "amountPending"),
    pendingStitching: total((row) => row.category === "STITCHING", "amountPending"),
    pendingMeasurement: total((row) => row.category === "MEASUREMENT", "amountPending"),
    pendingDelivery: total((row) => row.category === "DELIVERY", "amountPending")
  };
}

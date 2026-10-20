import {
  OrderModel,
  PaymentHistoryModel,
  TailorModel,
  TailorQuoteModel,
  TailoringRequestModel,
  WalletModel,
  WalletTransactionModel
} from "../models.js";
import { AppError } from "../middleware/error.js";

export type WalletUserType = "TAILOR" | "DELIVERY_PARTNER";
export type WalletTransactionType = "CREDIT" | "DEBIT";
export type WalletCategory = "ORDER_EARNING" | "WEEKLY_PAYOUT" | "BONUS" | "PENALTY" | "ADJUSTMENT";
export type PayoutSourceType = "STITCHING" | "MEASUREMENT" | "DELIVERY_TASK" | "DELIVERY_BATCH" | "BONUS" | "ADJUSTMENT";

export type PayoutAllocationSnapshot = {
  earningTransactionId: string;
  sourceId?: string;
  sourceType: PayoutSourceType;
  amount: number;
  originalAmount: number;
  label: string;
  earnedAt?: Date;
};

export type WalletTransactionInput = {
  userId: string;
  userType: WalletUserType;
  orderId?: string | null;
  transactionType: WalletTransactionType;
  category: WalletCategory;
  amount: number;
  remarks?: string;
  receiptUrl?: string;
  referenceNumber?: string;
  weekStart?: Date;
  weekEnd?: Date;
  createdBy?: string;
};

export function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfWeek(date = new Date()) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setMilliseconds(-1);
  return end;
}

export async function ensureWallet(userId: string, userType: WalletUserType) {
  return WalletModel.findOneAndUpdate(
    { userId, userType },
    { $setOnInsert: { userId, userType, balance: 0 } },
    { upsert: true, returnDocument: "after" }
  );
}

export async function createWalletTransaction(input: WalletTransactionInput) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Wallet transaction amount must be positive");

  const wallet = await ensureWallet(input.userId, input.userType);
  const signedAmount = input.transactionType === "CREDIT" ? amount : -amount;
  const balanceAfterTransaction = Number((Number(wallet.balance ?? 0) + signedAmount).toFixed(2));

  if (balanceAfterTransaction < -0.001) {
    throw new Error("Wallet balance cannot go negative");
  }

  try {
    const transaction = await WalletTransactionModel.create({
      walletId: wallet.id,
      userId: input.userId,
      userType: input.userType,
      orderId: input.orderId || undefined,
      transactionType: input.transactionType,
      category: input.category,
      amount,
      balanceAfterTransaction,
      remarks: input.remarks,
      receiptUrl: input.receiptUrl,
      referenceNumber: input.referenceNumber,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      createdBy: input.createdBy
    });

    wallet.balance = balanceAfterTransaction;
    wallet.userType = input.userType;
    await wallet.save();
    return transaction;
  } catch (error: any) {
    if (error?.code === 11000 && input.orderId && input.category === "ORDER_EARNING" && input.transactionType === "CREDIT") {
      return WalletTransactionModel.findOne({
        userId: input.userId,
        userType: input.userType,
        orderId: input.orderId,
        category: "ORDER_EARNING",
        transactionType: "CREDIT"
      });
    }
    throw error;
  }
}

export async function creditOrderEarning(input: {
  userId: string;
  userType: WalletUserType;
  orderId: string;
  amount: number;
  remarks?: string;
  createdBy?: string;
}) {
  return createWalletTransaction({
    ...input,
    transactionType: "CREDIT",
    category: "ORDER_EARNING"
  });
}

function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sourceTypeForTransaction(transaction: any): PayoutSourceType {
  const remarks = String(transaction.remarks ?? "").toLowerCase();
  if (transaction.category === "BONUS") return "BONUS";
  if (transaction.category === "ADJUSTMENT") return "ADJUSTMENT";
  if (transaction.userType === "DELIVERY_PARTNER") {
    return remarks.includes("batch") ? "DELIVERY_BATCH" : "DELIVERY_TASK";
  }
  return remarks.includes("measurement visit") ? "MEASUREMENT" : "STITCHING";
}

function allocationFor(transaction: any, amount: number): PayoutAllocationSnapshot {
  const sourceType = sourceTypeForTransaction(transaction);
  const fallbackLabels: Record<PayoutSourceType, string> = {
    STITCHING: "Stitching earning",
    MEASUREMENT: "Measurement visit earning",
    DELIVERY_TASK: "Delivery task earning",
    DELIVERY_BATCH: "Delivery batch earning",
    BONUS: "Bonus",
    ADJUSTMENT: "Wallet adjustment"
  };
  return {
    earningTransactionId: String(transaction._id ?? transaction.id),
    sourceId: transaction.orderId ? String(transaction.orderId) : undefined,
    sourceType,
    amount: roundMoney(amount),
    originalAmount: roundMoney(Number(transaction.amount ?? 0)),
    label: String(transaction.remarks || fallbackLabels[sourceType]),
    earnedAt: transaction.createdAt ? new Date(transaction.createdAt) : undefined
  };
}

/**
 * Replays the wallet chronologically. Every debit consumes the oldest credit,
 * while weekly payout debits additionally retain the source allocation. This
 * keeps legacy payouts explainable without rewriting their original records.
 */
export function replayWalletAllocations(transactions: any[]) {
  const creditQueue: Array<{ transaction: any; remaining: number }> = [];
  const allocationsByPayoutTransactionId = new Map<string, PayoutAllocationSnapshot[]>();
  const ordered = [...transactions].sort((left, right) => {
    const dateDiff = new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime();
    return dateDiff || String(left._id ?? left.id).localeCompare(String(right._id ?? right.id));
  });

  for (const transaction of ordered) {
    if (transaction.transactionType === "CREDIT") {
      creditQueue.push({ transaction, remaining: roundMoney(Number(transaction.amount ?? 0)) });
      continue;
    }
    if (transaction.transactionType !== "DEBIT") continue;
    let debitRemaining = roundMoney(Number(transaction.amount ?? 0));
    const payoutAllocations: PayoutAllocationSnapshot[] = [];
    for (const credit of creditQueue) {
      if (debitRemaining <= 0) break;
      if (credit.remaining <= 0) continue;
      const consumed = roundMoney(Math.min(credit.remaining, debitRemaining));
      credit.remaining = roundMoney(credit.remaining - consumed);
      debitRemaining = roundMoney(debitRemaining - consumed);
      if (transaction.category === "WEEKLY_PAYOUT") payoutAllocations.push(allocationFor(credit.transaction, consumed));
    }
    if (transaction.category === "WEEKLY_PAYOUT") {
      allocationsByPayoutTransactionId.set(String(transaction._id ?? transaction.id), payoutAllocations);
    }
  }

  return {
    allocationsByPayoutTransactionId,
    outstanding: creditQueue.filter((credit) => credit.remaining > 0).map((credit) => allocationFor(credit.transaction, credit.remaining))
  };
}

export function payoutBreakdown(allocations: PayoutAllocationSnapshot[]) {
  return allocations.reduce<Record<PayoutSourceType, number>>((totals, allocation) => {
    totals[allocation.sourceType] = roundMoney(totals[allocation.sourceType] + allocation.amount);
    return totals;
  }, { STITCHING: 0, MEASUREMENT: 0, DELIVERY_TASK: 0, DELIVERY_BATCH: 0, BONUS: 0, ADJUSTMENT: 0 });
}

function serializePaymentHistory(payment: any, reconstructed: PayoutAllocationSnapshot[]) {
  const value = typeof payment.toJSON === "function" ? payment.toJSON() : { ...payment, id: payment._id ?? payment.id };
  const exact = Array.isArray(value.allocations) && value.allocations.length > 0;
  return {
    ...value,
    allocations: exact ? value.allocations : reconstructed,
    allocationMode: exact ? "EXACT" : "RECONSTRUCTED"
  };
}

async function reconcileTailorOrderEarnings(userId: string) {
  const tailor = await TailorModel.findOne({ userId }).select("_id");
  if (!tailor) return;

  const [acceptedQuotes, completedOrders] = await Promise.all([
    TailorQuoteModel.find({ tailorId: tailor.id, status: "ACCEPTED" }).select("_id price").lean(),
    OrderModel.find({
      tailorId: tailor.id,
      status: { $in: ["READY", "DELIVERED", "STITCHING_COMPLETED"] }
    }).select("_id orderNumber totalAmount").lean()
  ]);
  const quoteIds = acceptedQuotes.map((quote) => quote._id);
  const completedRequests = quoteIds.length
    ? await TailoringRequestModel.find({
        selectedQuoteId: { $in: quoteIds },
        status: "TAILOR_SELECTED",
        workStatus: "READY"
      }).select("_id selectedQuoteId quoteAmount").lean()
    : [];

  const sourceIds = [
    ...completedRequests.map((request) => String(request._id)),
    ...completedOrders.map((order) => String(order._id))
  ];
  if (!sourceIds.length) return;

  const existingTransactions = await WalletTransactionModel.find({
    userId,
    userType: "TAILOR",
    orderId: { $in: sourceIds },
    transactionType: "CREDIT",
    category: "ORDER_EARNING"
  }).select("orderId").lean();
  const creditedOrderIds = new Set(existingTransactions.map((transaction) => String(transaction.orderId)));
  const quoteAmounts = new Map(acceptedQuotes.map((quote) => [String(quote._id), Number(quote.price ?? 0)]));

  // Accepted-request prices are submitted by the tailor and are therefore
  // credited in full once stitching is ready.
  for (const request of completedRequests) {
    const orderId = String(request._id);
    if (creditedOrderIds.has(orderId)) continue;
    const amount = Number(request.quoteAmount ?? quoteAmounts.get(String(request.selectedQuoteId)) ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    await creditOrderEarning({
      userId,
      userType: "TAILOR",
      orderId,
      amount,
      remarks: `Tailor earning for order ${orderId.slice(0, 8).toUpperCase()}`,
      createdBy: "system-reconciliation"
    });
  }

  // Catalog orders use the existing 45% tailor payout rule. This also repairs
  // old completed orders created before wallet transactions were introduced.
  for (const order of completedOrders) {
    const orderId = String(order._id);
    if (creditedOrderIds.has(orderId)) continue;
    const amount = Number((Number(order.totalAmount ?? 0) * 0.45).toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    await creditOrderEarning({
      userId,
      userType: "TAILOR",
      orderId,
      amount,
      remarks: `Tailor earning for order ${order.orderNumber ?? orderId.slice(0, 8).toUpperCase()}`,
      createdBy: "system-reconciliation"
    });
  }
}

export async function createWeeklyPayout(input: {
  userId: string;
  userType: WalletUserType;
  amount: number;
  receiptUrl: string;
  notes?: string;
  paidBy: string;
  weekStart?: Date;
  weekEnd?: Date;
  referenceNumber?: string;
}) {
  const weekStart = input.weekStart ?? startOfWeek();
  const weekEnd = input.weekEnd ?? endOfWeek(weekStart);
  const amount = roundMoney(input.amount);
  const wallet = await ensureWallet(input.userId, input.userType);
  const walletBalance = roundMoney(Number(wallet.balance ?? 0));
  if (walletBalance <= 0) throw new AppError(409, "This partner has no pending balance to pay");
  if (amount !== walletBalance) {
    throw new AppError(409, `The wallet balance changed. Refresh and pay the full pending balance of ${walletBalance.toFixed(2)}`);
  }

  const existingTransactions = await WalletTransactionModel.find({ userId: input.userId, userType: input.userType }).sort({ createdAt: 1 }).lean();
  const { outstanding } = replayWalletAllocations(existingTransactions);
  const allocations: PayoutAllocationSnapshot[] = [];
  let remaining = amount;
  for (const credit of outstanding) {
    if (remaining <= 0) break;
    const allocated = roundMoney(Math.min(credit.amount, remaining));
    allocations.push({ ...credit, amount: allocated });
    remaining = roundMoney(remaining - allocated);
  }
  if (remaining > 0.001) throw new AppError(409, "The wallet ledger is out of balance. Refresh the partner wallet before paying");

  const updatedWallet = await WalletModel.findOneAndUpdate(
    { _id: wallet.id, userId: input.userId, userType: input.userType, balance: { $gte: amount - 0.001, $lte: amount + 0.001 } },
    { $set: { balance: 0 } },
    { returnDocument: "after" }
  );
  if (!updatedWallet) throw new AppError(409, "The wallet balance changed while this payout was being recorded. Refresh and try again");

  let transaction: any;
  try {
    transaction = await WalletTransactionModel.create({
      walletId: wallet.id,
      userId: input.userId,
      userType: input.userType,
      transactionType: "DEBIT",
      category: "WEEKLY_PAYOUT",
      amount,
      balanceAfterTransaction: 0,
      remarks: input.notes,
      receiptUrl: input.receiptUrl,
      referenceNumber: input.referenceNumber,
      weekStart,
      weekEnd,
      createdBy: input.paidBy
    });
    return await PaymentHistoryModel.create({
      userId: input.userId,
      userType: input.userType,
      walletTransactionId: transaction.id,
      amount,
      receiptUrl: input.receiptUrl,
      notes: input.notes,
      paidBy: input.paidBy,
      weekStart,
      weekEnd,
      referenceNumber: input.referenceNumber,
      allocations,
      allocationMode: "EXACT",
      status: "PAID"
    });
  } catch (error) {
    if (transaction?.id) await WalletTransactionModel.findByIdAndDelete(transaction.id).catch(() => undefined);
    await WalletModel.findByIdAndUpdate(wallet.id, { $inc: { balance: amount } }).catch(() => undefined);
    throw error;
  }
}

export async function walletSummary(userId: string, userType: WalletUserType) {
  if (userType === "TAILOR") await reconcileTailorOrderEarnings(userId);
  const wallet = await ensureWallet(userId, userType);
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek(weekStart);
  const [transactions, payments] = await Promise.all([
    WalletTransactionModel.find({ userId, userType }).sort({ createdAt: 1 }),
    PaymentHistoryModel.find({ userId, userType }).sort({ paidAt: -1, createdAt: -1 }).limit(100)
  ]);

  const currentWeekEarnings = transactions.reduce((sum, transaction: any) => {
    const createdAt = new Date(transaction.createdAt ?? 0);
    if (transaction.transactionType !== "CREDIT" || transaction.category !== "ORDER_EARNING") return sum;
    return createdAt >= weekStart && createdAt <= weekEnd ? sum + Number(transaction.amount ?? 0) : sum;
  }, 0);

  const replay = replayWalletAllocations(transactions);
  const serializedPayments = payments.map((payment: any) => serializePaymentHistory(
    payment,
    replay.allocationsByPayoutTransactionId.get(String(payment.walletTransactionId)) ?? []
  ));
  return {
    wallet,
    balance: Number(wallet.balance ?? 0),
    currentWeekEarnings,
    pendingAmount: Number(wallet.balance ?? 0),
    pendingBreakdown: payoutBreakdown(replay.outstanding),
    unpaidItemCount: replay.outstanding.length,
    oldestUnpaidAt: replay.outstanding[0]?.earnedAt ?? null,
    outstandingAllocations: replay.outstanding,
    lastPayment: serializedPayments[0] ?? null,
    transactions: [...transactions].reverse().slice(0, 200),
    payments: serializedPayments
  };
}

import {
  PaymentHistoryModel,
  WalletModel,
  WalletTransactionModel
} from "../models.js";

export type WalletUserType = "TAILOR" | "DELIVERY_PARTNER";
export type WalletTransactionType = "CREDIT" | "DEBIT";
export type WalletCategory = "ORDER_EARNING" | "WEEKLY_PAYOUT" | "BONUS" | "PENALTY" | "ADJUSTMENT";

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
    { userId },
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
  const transaction = await createWalletTransaction({
    userId: input.userId,
    userType: input.userType,
    transactionType: "DEBIT",
    category: "WEEKLY_PAYOUT",
    amount: input.amount,
    remarks: input.notes,
    receiptUrl: input.receiptUrl,
    referenceNumber: input.referenceNumber,
    weekStart,
    weekEnd,
    createdBy: input.paidBy
  });
  if (!transaction) throw new Error("Unable to create payout transaction");

  return PaymentHistoryModel.create({
    userId: input.userId,
    userType: input.userType,
    walletTransactionId: transaction.id,
    amount: input.amount,
    receiptUrl: input.receiptUrl,
    notes: input.notes,
    paidBy: input.paidBy,
    weekStart,
    weekEnd,
    referenceNumber: input.referenceNumber,
    status: "PAID"
  });
}

export async function walletSummary(userId: string, userType: WalletUserType) {
  const wallet = await ensureWallet(userId, userType);
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek(weekStart);
  const [transactions, payments] = await Promise.all([
    WalletTransactionModel.find({ userId }).sort({ createdAt: -1 }).limit(200),
    PaymentHistoryModel.find({ userId }).sort({ paidAt: -1, createdAt: -1 }).limit(100)
  ]);

  const currentWeekEarnings = transactions.reduce((sum, transaction: any) => {
    const createdAt = new Date(transaction.createdAt ?? 0);
    if (transaction.transactionType !== "CREDIT" || transaction.category !== "ORDER_EARNING") return sum;
    return createdAt >= weekStart && createdAt <= weekEnd ? sum + Number(transaction.amount ?? 0) : sum;
  }, 0);

  return {
    wallet,
    balance: Number(wallet.balance ?? 0),
    currentWeekEarnings,
    pendingAmount: Number(wallet.balance ?? 0),
    lastPayment: payments[0] ?? null,
    transactions,
    payments
  };
}

export type PartnerWalletTransaction = {
  id: string;
  orderId?: string;
  transactionType: "CREDIT" | "DEBIT";
  category: "ORDER_EARNING" | "WEEKLY_PAYOUT" | "BONUS" | "PENALTY" | "ADJUSTMENT";
  amount: number;
  balanceAfterTransaction?: number;
  remarks?: string;
  receiptUrl?: string;
  referenceNumber?: string;
  weekStart?: string;
  weekEnd?: string;
  createdAt?: string;
};

export type PartnerPaymentHistory = {
  id: string;
  amount: number;
  receiptUrl: string;
  notes?: string;
  referenceNumber?: string;
  weekStart?: string;
  weekEnd?: string;
  paidAt?: string;
  createdAt?: string;
  status?: "PAID" | "VOID";
};

export type PartnerWalletSummary = {
  balance: number;
  currentWeekEarnings: number;
  pendingAmount: number;
  lastPayment?: PartnerPaymentHistory | null;
  transactions: PartnerWalletTransaction[];
  payments: PartnerPaymentHistory[];
};

export function emptyPartnerWallet(): PartnerWalletSummary {
  return { balance: 0, currentWeekEarnings: 0, pendingAmount: 0, transactions: [], payments: [] };
}

export function partnerTransactionDate(transaction: PartnerWalletTransaction) {
  if (!transaction.createdAt) return undefined;
  const value = new Date(transaction.createdAt);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

export function partnerWalletMetrics(wallet: PartnerWalletSummary) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const earnings = wallet.transactions.filter(
    (transaction) => transaction.transactionType === "CREDIT" && transaction.category === "ORDER_EARNING"
  );
  const monthlyEarned = earnings.reduce((total, transaction) => {
    const createdAt = partnerTransactionDate(transaction);
    return total + (createdAt && createdAt >= monthStart ? Number(transaction.amount ?? 0) : 0);
  }, 0);
  const uniqueOrders = new Set(earnings.map((transaction) => transaction.orderId).filter(Boolean));
  const completedJobs = uniqueOrders.size || earnings.length;
  const totalEarned = earnings.reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0);
  return {
    balance: Number(wallet.balance ?? 0),
    pendingAmount: Number(wallet.pendingAmount ?? wallet.balance ?? 0),
    currentWeekEarnings: Number(wallet.currentWeekEarnings ?? 0),
    monthlyEarned,
    completedJobs,
    totalEarned,
    averagePerJob: completedJobs ? totalEarned / completedJobs : 0,
    lastPayment: wallet.lastPayment ?? wallet.payments[0] ?? null
  };
}

export function proofForPartnerTransaction(
  transaction: PartnerWalletTransaction,
  payments: PartnerPaymentHistory[]
) {
  if (transaction.receiptUrl) return transaction.receiptUrl;
  if (transaction.transactionType !== "CREDIT" || transaction.category !== "ORDER_EARNING") return undefined;
  const createdAt = partnerTransactionDate(transaction);
  if (!createdAt) return undefined;
  const payment = payments.find((item) => {
    if (item.status === "VOID" || !item.receiptUrl) return false;
    const start = item.weekStart ? new Date(item.weekStart) : undefined;
    const end = item.weekEnd ? new Date(item.weekEnd) : undefined;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return createdAt >= start && createdAt <= end;
  });
  if (payment?.receiptUrl) return payment.receiptUrl;

  // Payouts settle the full pending wallet. An earning can therefore have
  // been carried over from an earlier week; use the first later payout as
  // its proof when it is outside the payout's reporting week.
  const laterPayment = payments
    .filter((item) => {
      if (item.status === "VOID" || !item.receiptUrl) return false;
      const paidAt = item.paidAt ?? item.createdAt;
      if (!paidAt) return false;
      const value = new Date(paidAt);
      return !Number.isNaN(value.getTime()) && value >= createdAt;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.paidAt ?? left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.paidAt ?? right.createdAt ?? 0).getTime();
      return leftTime - rightTime;
    })[0];
  return laterPayment?.receiptUrl;
}

export function partnerTransactionLabel(transaction: PartnerWalletTransaction) {
  if (transaction.category === "ORDER_EARNING") return "Order earning";
  if (transaction.category === "WEEKLY_PAYOUT") return "Weekly payout";
  if (transaction.category === "BONUS") return "Bonus";
  if (transaction.category === "PENALTY") return "Penalty";
  return "Wallet adjustment";
}

export function isSameLocalDate(value: Date | undefined, selected?: Date) {
  if (!selected) return true;
  return Boolean(
    value &&
      value.getFullYear() === selected.getFullYear() &&
      value.getMonth() === selected.getMonth() &&
      value.getDate() === selected.getDate()
  );
}

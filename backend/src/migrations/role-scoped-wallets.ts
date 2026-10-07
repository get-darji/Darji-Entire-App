import { PaymentHistoryModel, WalletModel, WalletTransactionModel } from "../models.js";

type WalletRole = "TAILOR" | "DELIVERY_PARTNER";

function roleKey(userId: string, userType: WalletRole) {
  return `${userId}:${userType}`;
}

function isLegacyWalletIndex(index: { key?: Record<string, number>; unique?: boolean }) {
  return index.unique === true && JSON.stringify(index.key) === JSON.stringify({ userId: 1 });
}

function isLegacyOrderEarningIndex(index: { key?: Record<string, number>; unique?: boolean }) {
  return index.unique === true && JSON.stringify(index.key) === JSON.stringify({ userId: 1, orderId: 1, category: 1, transactionType: 1 });
}

/**
 * Splits the legacy one-wallet-per-user ledger into one wallet per app role.
 * Transaction.userType has always been recorded, so it is the authoritative
 * source for rebuilding each role's balance. The migration is safe to run on
 * every startup and also repairs interrupted/partially migrated ledgers.
 */
export async function migrateRoleScopedWallets() {
  const [walletIndexes, transactionIndexes] = await Promise.all([
    WalletModel.collection.indexes().catch(() => []),
    WalletTransactionModel.collection.indexes().catch(() => [])
  ]);

  for (const index of walletIndexes) {
    if (index.name && isLegacyWalletIndex(index as any)) await WalletModel.collection.dropIndex(index.name);
  }
  for (const index of transactionIndexes) {
    if (index.name && isLegacyOrderEarningIndex(index as any)) await WalletTransactionModel.collection.dropIndex(index.name);
  }

  const [wallets, transactions, paymentRoles] = await Promise.all([
    WalletModel.find().sort({ createdAt: 1 }).lean(),
    WalletTransactionModel.find().sort({ createdAt: 1, _id: 1 }).lean(),
    PaymentHistoryModel.find().select("userId userType").lean()
  ]);

  const rolesByUser = new Map<string, Set<WalletRole>>();
  const addRole = (userId: unknown, userType: unknown) => {
    if (userType !== "TAILOR" && userType !== "DELIVERY_PARTNER") return;
    const id = String(userId);
    const roles = rolesByUser.get(id) ?? new Set<WalletRole>();
    roles.add(userType);
    rolesByUser.set(id, roles);
  };
  wallets.forEach((wallet: any) => addRole(wallet.userId, wallet.userType));
  transactions.forEach((transaction: any) => addRole(transaction.userId, transaction.userType));
  paymentRoles.forEach((payment: any) => addRole(payment.userId, payment.userType));

  const walletByRole = new Map<string, any>();
  const duplicateWalletIds: string[] = [];
  for (const wallet of wallets as any[]) {
    const key = roleKey(String(wallet.userId), wallet.userType as WalletRole);
    if (walletByRole.has(key)) duplicateWalletIds.push(String(wallet._id));
    else walletByRole.set(key, wallet);
  }

  for (const [userId, roles] of rolesByUser) {
    for (const userType of roles) {
      const key = roleKey(userId, userType);
      let wallet = walletByRole.get(key);
      if (!wallet) {
        wallet = await WalletModel.create({ userId, userType, balance: 0 });
        walletByRole.set(key, wallet.toObject());
      }

      const roleTransactions = (transactions as any[]).filter(
        (transaction) => String(transaction.userId) === userId && transaction.userType === userType
      );
      let balance = roleTransactions.length ? 0 : Number(wallet.balance ?? 0);
      const operations = roleTransactions.map((transaction) => {
        const signedAmount = transaction.transactionType === "CREDIT" ? Number(transaction.amount ?? 0) : -Number(transaction.amount ?? 0);
        balance = Number((balance + signedAmount).toFixed(2));
        return {
          updateOne: {
            filter: { _id: transaction._id },
            update: { $set: { walletId: String(wallet._id), balanceAfterTransaction: balance } }
          }
        };
      });
      if (operations.length) await WalletTransactionModel.bulkWrite(operations);
      await WalletModel.updateOne({ _id: wallet._id }, { $set: { userId, userType, balance } });
    }
  }

  if (duplicateWalletIds.length) await WalletModel.deleteMany({ _id: { $in: duplicateWalletIds } });

  await Promise.all([
    WalletModel.collection.createIndex({ userId: 1, userType: 1 }, { unique: true }),
    WalletTransactionModel.collection.createIndex(
      { userId: 1, userType: 1, orderId: 1, category: 1, transactionType: 1 },
      {
        unique: true,
        partialFilterExpression: { orderId: { $exists: true }, category: "ORDER_EARNING", transactionType: "CREDIT" }
      }
    )
  ]);
}

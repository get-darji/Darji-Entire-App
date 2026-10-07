import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { WalletModel, WalletTransactionModel } from "../models.js";
import { migrateRoleScopedWallets } from "../migrations/role-scoped-wallets.js";

const memory = await MongoMemoryServer.create();

try {
  await mongoose.connect(memory.getUri(), { autoIndex: false });
  const userId = "shared-role-user";
  const legacyWallet = await WalletModel.create({ userId, userType: "TAILOR", balance: 140 });
  await WalletModel.collection.createIndex({ userId: 1 }, { unique: true });
  await WalletTransactionModel.create([
    { walletId: legacyWallet.id, userId, userType: "TAILOR", orderId: "tailor-order", transactionType: "CREDIT", category: "ORDER_EARNING", amount: 100, balanceAfterTransaction: 100 },
    { walletId: legacyWallet.id, userId, userType: "DELIVERY_PARTNER", orderId: "delivery-order", transactionType: "CREDIT", category: "ORDER_EARNING", amount: 40, balanceAfterTransaction: 140 }
  ]);

  await migrateRoleScopedWallets();

  const wallets = await WalletModel.find({ userId }).sort({ userType: 1 }).lean();
  assert.equal(wallets.length, 2);
  assert.equal(wallets.find((wallet) => wallet.userType === "TAILOR")?.balance, 100);
  assert.equal(wallets.find((wallet) => wallet.userType === "DELIVERY_PARTNER")?.balance, 40);

  const transactions = await WalletTransactionModel.find({ userId }).lean();
  for (const transaction of transactions) {
    const roleWallet = wallets.find((wallet) => wallet.userType === transaction.userType);
    assert.equal(transaction.walletId, String(roleWallet?._id));
    assert.equal(transaction.balanceAfterTransaction, transaction.amount);
  }

  console.log("Role-scoped wallet migration smoke test passed");
} finally {
  await mongoose.disconnect();
  await memory.stop();
}

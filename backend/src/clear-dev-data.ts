import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { connectDatabase, disconnectDatabase } from "./db.js";
import {
  DeliveryPartnerModel,
  DeliveryBatchModel,
  DeliveryRequestModel,
  NotificationModel,
  OrderModel,
  PaymentModel,
  ReviewModel,
  SupportTicketModel,
  TailorModel,
  TailorQuoteModel,
  TailoringRequestModel,
  TransactionModel,
  WalletModel
} from "./models.js";

loadEnv({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)) });
loadEnv();

const modelsToClear = [
  DeliveryBatchModel.collection,
  DeliveryRequestModel.collection,
  TailorQuoteModel.collection,
  TailoringRequestModel.collection,
  OrderModel.collection,
  PaymentModel.collection,
  NotificationModel.collection,
  ReviewModel.collection,
  SupportTicketModel.collection,
  TransactionModel.collection
];

await connectDatabase();

try {
  for (const collection of modelsToClear) {
    const result = await collection.deleteMany({});
    console.log(`${collection.collectionName}: ${result.deletedCount}`);
  }
  const [tailors, deliveryPartners, wallets] = await Promise.all([
    TailorModel.updateMany({}, { $set: { earnings: 0 } }),
    DeliveryPartnerModel.updateMany({}, { $set: { dailyEarnings: 0, weeklyEarnings: 0, monthlyEarnings: 0 } }),
    WalletModel.updateMany({}, { $set: { balance: 0 } })
  ]);
  console.log(`tailors reset: ${tailors.modifiedCount}`);
  console.log(`delivery partners reset: ${deliveryPartners.modifiedCount}`);
  console.log(`wallets reset: ${wallets.modifiedCount}`);
} finally {
  await disconnectDatabase();
}
